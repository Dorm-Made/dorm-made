from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any
import uuid

from utils.database import get_db
from services.gateways import stripe_service
from services import user_service
from schemas.stripe import WebhookResponse
from models.event import EventModel
from models.event_participant import EventParticipantModel

router = APIRouter(prefix="/webhooks/stripe", tags=["webhooks"])


async def handle_account_updated(event: Dict[str, Any], db: Session) -> WebhookResponse:
    """Handle Stripe account.updated event"""
    account = event["data"]["object"]
    stripe_account_id = account["id"]

    user_model = user_service.get_user_by_stripe_account(stripe_account_id, db)

    if not user_model:
        return WebhookResponse(received=True, message="Account not found in system")

    await user_service.update_stripe_status(
        user_model.id, account.get("details_submitted", False), db
    )

    return WebhookResponse(
        received=True, message=f"Updated Stripe status for user {user_model.id}"
    )


async def handle_checkout_session_completed(event: Dict[str, Any], db: Session) -> WebhookResponse:
    """Handle Stripe checkout.session.completed event"""
    session = event["data"]["object"]

    metadata = session.get("metadata", {})
    event_id = metadata.get("event_id")
    foodie_id = metadata.get("foodie_id")
    payment_intent_id = session.get("payment_intent")

    if not event_id or not foodie_id:
        return WebhookResponse(
            received=True,
            message="Missing required metadata, skipping"
        )

    try:
        existing_participant = db.query(EventParticipantModel).filter(
            EventParticipantModel.event_id == event_id,
            EventParticipantModel.participant_id == foodie_id
        ).first()

        if existing_participant:
            if (existing_participant.status == 'confirmed' and
                existing_participant.payment_intent_id):
                return WebhookResponse(
                    received=True,
                    message="Payment already processed"
                )

            existing_participant.status = 'confirmed'
            existing_participant.payment_intent_id = payment_intent_id
            db.commit()

            return WebhookResponse(
                received=True,
                message=f"Updated participation for event {event_id}"
            )

        participant_model = EventParticipantModel(
            id=str(uuid.uuid4()),
            event_id=event_id,
            participant_id=foodie_id,
            status='confirmed',
            payment_intent_id=payment_intent_id
        )
        db.add(participant_model)

        event_model = db.query(EventModel).filter(
            EventModel.id == event_id
        ).first()

        if event_model:
            event_model.current_participants += 1

        db.commit()

        return WebhookResponse(
            received=True,
            message=f"Created participation for event {event_id}"
        )

    except Exception as e:
        db.rollback()
        return WebhookResponse(
            received=True,
            message=f"Error processing webhook: {str(e)}"
        )


@router.post("", response_model=WebhookResponse)
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Main webhook endpoint that routes events to appropriate handlers"""
    payload = await request.body()
    signature = request.headers.get("stripe-signature")

    if not signature:
        raise HTTPException(status_code=400, detail="Missing stripe-signature header")

    event = stripe_service.validate_webhook_signature(payload, signature)

    event_type = event["type"]

    if event_type == "account.updated":
        return await handle_account_updated(event, db)

    if event_type == "checkout.session.completed":
        return await handle_checkout_session_completed(event, db)

    return WebhookResponse(
        received=True, message=f"Received event type: {event_type}"
    )
