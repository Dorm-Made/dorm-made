from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Dict, Any
import uuid
import logging

from utils.database import get_db
from services.gateways import stripe_service
from services.gateways import email_service
from services import user_service
from schemas.stripe import WebhookResponse
from models.event import EventModel
from models.event_participant import EventParticipantModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks/stripe", tags=["stripe_webhook"])

# Statuses that hold (or may hold) a seat. Capacity decisions always COUNT
# these rows; EventModel.current_participants is a denormalized mirror kept
# in sync here and in event_service, but is never the source of truth.
ACTIVE_STATUSES = ("booked", "confirmed")


def count_active_participants(event_id: str, db: Session) -> int:
    return (
        db.query(EventParticipantModel)
        .filter(
            EventParticipantModel.event_id == event_id,
            EventParticipantModel.status.in_(ACTIVE_STATUSES),
        )
        .count()
    )


async def handle_checkout_session_completed(
    event: Dict[str, Any], db: Session
) -> WebhookResponse:
    """Handle Stripe checkout.session.completed event.

    IMPORTANT: any processing failure must raise (HTTP 5xx) so Stripe retries.
    Returning 200 on failure means a charged customer with no seat and no alert.
    """
    session = event["data"]["object"]

    metadata = session.get("metadata", {})
    event_id = metadata.get("event_id")
    foodie_id = metadata.get("foodie_id")
    payment_intent_id = session.get("payment_intent")

    if not event_id or not foodie_id:
        # Malformed metadata will never succeed on retry; acknowledge and log.
        logger.error("Stripe webhook received with missing metadata: %s", metadata)
        return WebhookResponse(
            received=True, message="Missing required metadata, skipping"
        )

    chef_email = None
    event_title = None

    try:
        event_model = db.query(EventModel).filter(EventModel.id == event_id).first()
        if not event_model:
            raise HTTPException(
                status_code=500,
                detail=f"Event {event_id} not found for webhook event",
            )

        existing_participant = (
            db.query(EventParticipantModel)
            .filter(
                EventParticipantModel.event_id == event_id,
                EventParticipantModel.participant_id == foodie_id,
            )
            .first()
        )

        if existing_participant and existing_participant.status in ACTIVE_STATUSES:
            # Duplicate delivery / retry of an event we already processed.
            logger.info(
                "Payment already processed for event %s, user %s", event_id, foodie_id
            )
            return WebhookResponse(received=True, message="Payment already processed")

        # Re-check capacity at webhook time: two foodies can both pass the
        # checkout-creation check and complete payment for the last seat.
        active_count = count_active_participants(event_id, db)
        if active_count >= event_model.max_participants:
            logger.warning(
                "Event %s full at webhook time; cancelling payment %s for user %s",
                event_id,
                payment_intent_id,
                foodie_id,
            )
            if payment_intent_id:
                # Uncaptured (manual capture) - cancelling voids the hold, no fees.
                await stripe_service.cancel_payment_intent(payment_intent_id)
            return WebhookResponse(
                received=True,
                message="Event full - payment authorization cancelled",
            )

        if existing_participant:
            # Previously cancelled participation being re-booked with a new payment.
            existing_participant.status = "booked"
            existing_participant.payment_intent_id = payment_intent_id
            existing_participant.refunded_at = None
        else:
            db.add(
                EventParticipantModel(
                    id=str(uuid.uuid4()),
                    event_id=event_id,
                    participant_id=foodie_id,
                    status="booked",
                    payment_intent_id=payment_intent_id,
                )
            )

        event_model.current_participants = active_count + 1

        chef_model = user_service.get_user_by_id(event_model.host_user_id, db)
        if chef_model:
            chef_email = chef_model.email
            event_title = event_model.title

        try:
            db.commit()
        except IntegrityError:
            # Unique (event_id, participant_id) hit: concurrent duplicate delivery.
            db.rollback()
            logger.info(
                "Duplicate webhook insert for event %s, user %s - already processed",
                event_id,
                foodie_id,
            )
            return WebhookResponse(received=True, message="Payment already processed")

        logger.info(
            "Created participation request for event %s, user %s", event_id, foodie_id
        )

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(
            "Error processing webhook for event %s, user %s: %s",
            event_id,
            foodie_id,
            e,
            exc_info=True,
        )
        # 500 so Stripe retries; do NOT return 200 here.
        raise HTTPException(status_code=500, detail="Webhook processing failed")

    # Email is best-effort and must never be confused with a booking failure:
    # it runs after the commit and swallows its own errors.
    if chef_email and event_title:
        try:
            await email_service.send_chef_notification(
                chef_email=chef_email, event_name=event_title
            )
        except Exception as e:
            logger.error("Chef notification email failed (booking OK): %s", e)

    return WebhookResponse(
        received=True, message=f"Created participation for event {event_id}"
    )


async def handle_payment_intent_canceled(
    event: Dict[str, Any], db: Session
) -> WebhookResponse:
    """A manual-capture PaymentIntent was cancelled or expired (Stripe releases
    uncaptured holds after ~7 days). Free the seat if it was still pending."""
    payment_intent = event["data"]["object"]
    payment_intent_id = payment_intent.get("id")

    try:
        participation = (
            db.query(EventParticipantModel)
            .filter(
                EventParticipantModel.payment_intent_id == payment_intent_id,
                EventParticipantModel.status == "booked",
            )
            .first()
        )

        if not participation:
            return WebhookResponse(
                received=True, message="No pending participation for this payment"
            )

        participation.status = "cancelled"
        event_model = (
            db.query(EventModel)
            .filter(EventModel.id == participation.event_id)
            .first()
        )
        if event_model:
            active = count_active_participants(participation.event_id, db)
            # participation row is still 'booked' in the DB until commit; the
            # updated status is pending on this session, so recount defensively.
            event_model.current_participants = max(active - 1, 0)
        db.commit()
        logger.info(
            "Released seat for cancelled/expired payment %s (event %s, user %s)",
            payment_intent_id,
            participation.event_id,
            participation.participant_id,
        )
        return WebhookResponse(received=True, message="Pending participation released")
    except Exception as e:
        db.rollback()
        logger.error(
            "Error handling payment_intent.canceled for %s: %s",
            payment_intent_id,
            e,
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="Webhook processing failed")


@router.post("", response_model=WebhookResponse)
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Main webhook endpoint that routes events to appropriate handlers"""
    payload = await request.body()
    signature = request.headers.get("stripe-signature")

    if not signature:
        logger.warning("Webhook received without stripe-signature header")
        raise HTTPException(status_code=400, detail="Missing stripe-signature header")

    event = stripe_service.validate_webhook_signature(
        payload, signature, use_connect=False
    )

    event_type = event["type"]
    logger.info(f"Stripe webhook received: {event_type}")

    if event_type == "checkout.session.completed":
        return await handle_checkout_session_completed(event, db)

    if event_type == "payment_intent.canceled":
        return await handle_payment_intent_canceled(event, db)

    return WebhookResponse(received=True, message=f"Received event type: {event_type}")
