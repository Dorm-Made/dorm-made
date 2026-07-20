from fastapi import HTTPException, UploadFile
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy import desc
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import uuid
from stripe import StripeError, InvalidRequestError
import logging

from models.event import EventModel
from models.event_participant import EventParticipantModel
from models.meal import MealModel
from models.user import UserModel
from schemas.event import Event, EventCreate, EventUpdate
from schemas.event_participant import EventParticipant, EventParticipantUser
from schemas.refund import RefundResponse
from utils.converters import event_model_to_schema, event_participant_models_to_schemas
from utils.supabase import supabase
from utils.uploads import upload_image
from .user_service import get_user
from .meal_service import get_meal_name
from .gateways.stripe_service import (
    capture_payment_intent,
    cancel_payment_intent,
    create_refund,
    retrieve_connected_account,
)

logger = logging.getLogger(__name__)

# Statuses that hold (or may hold) a seat. Capacity checks COUNT these rows;
# EventModel.current_participants is only a denormalized mirror.
ACTIVE_STATUSES = ("booked", "confirmed")


def _as_utc(dt: datetime) -> datetime:
    """Treat naive datetimes as UTC (SQLite test dbs return naive values)."""
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


def count_active_participants(event_id: str, db: Session) -> int:
    return (
        db.query(EventParticipantModel)
        .filter(
            EventParticipantModel.event_id == event_id,
            EventParticipantModel.status.in_(ACTIVE_STATUSES),
        )
        .count()
    )


def _events_with_meal_query(db: Session):
    """Base query joining events with meal titles in a single round-trip."""
    return db.query(EventModel, MealModel.title).outerjoin(
        MealModel,
        (MealModel.id == EventModel.meal_id) & (MealModel.is_deleted == False),
    )


def _rows_to_schemas(rows) -> List[Event]:
    return [
        event_model_to_schema(event_model, meal_title or "")
        for event_model, meal_title in rows
    ]


def get_event(event_id: str, db: Session) -> Optional[Event]:
    """Get event by ID from database"""
    try:
        event_model = (
            db.query(EventModel)
            .filter(EventModel.id == event_id, EventModel.is_deleted == False)
            .first()
        )
        if event_model:
            meal_name = get_meal_name(event_model.meal_id, db)
            return event_model_to_schema(event_model, meal_name)
        return None
    except Exception as e:
        logger.error(f"Error getting event {event_id}: {e}", exc_info=True)
        return None


def is_user_participating(event_id: str, user_id: str, db: Session) -> bool:
    """Check if user is already participating in an event"""
    try:
        participant = (
            db.query(EventParticipantModel)
            .filter(
                EventParticipantModel.event_id == event_id,
                EventParticipantModel.participant_id == user_id,
                EventParticipantModel.status == "confirmed",
            )
            .first()
        )
        return participant is not None
    except Exception as e:
        logger.error(
            f"Error checking participation for user {user_id} in event {event_id}: {e}",
            exc_info=True,
        )
        return False


async def upload_event_image(image: UploadFile) -> str:
    """Upload an event image (magic-byte validated) and return the public URL"""
    return await upload_image(image, "event-images")


async def create_event(
    event: EventCreate,
    host_user_id: str,
    db: Session,
    image: Optional[UploadFile] = None,
) -> Event:
    """Create a new culinary event with optional image upload"""
    # Verify host user exists
    host = await get_user(host_user_id, db)
    if not host:
        logger.warning(
            f"Attempt to create event with non-existent host: {host_user_id}"
        )
        raise HTTPException(status_code=404, detail="Host user not found")

    try:
        # Upload image if provided
        image_url = None
        if image and image.filename:
            image_url = await upload_event_image(image)

        # Convert string event_date to datetime if needed
        event_date = event.event_date
        if isinstance(event_date, str):
            event_date = datetime.fromisoformat(event.event_date.replace("Z", "+00:00"))

        # Create new event model
        event_model = EventModel(
            id=str(uuid.uuid4()),
            host_user_id=str(host_user_id),
            meal_id=event.meal_id,
            title=event.title,
            description=event.description,
            max_participants=event.max_participants,
            current_participants=0,
            location=event.location,
            event_date=event_date,
            image_url=image_url,
            price=event.price,
            currency=event.currency,
            is_deleted=False,
        )

        db.add(event_model)
        db.commit()
        db.refresh(event_model)

        logger.info(
            f"Event created successfully: {event_model.id} by host {host_user_id}"
        )
        meal_name = get_meal_name(event_model.meal_id, db)
        return event_model_to_schema(event_model, meal_name)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(
            f"Error creating event for host {host_user_id}: {e}", exc_info=True
        )
        raise HTTPException(status_code=400, detail=f"Error creating event: {str(e)}")


async def validate_checkout_requirements(
    event_id: str, foodie_id: str, db: Session
) -> Tuple[EventModel, UserModel]:
    """Validate all requirements for creating a checkout session"""
    event = (
        db.query(EventModel)
        .filter(EventModel.id == event_id, EventModel.is_deleted == False)
        .first()
    )

    if not event:
        logger.warning(f"Checkout validation failed: Event {event_id} not found")
        raise HTTPException(status_code=404, detail="Event not found")

    if event.host_user_id == foodie_id:
        logger.warning(f"Host {foodie_id} attempted to join their own event {event_id}")
        raise HTTPException(status_code=400, detail="Host cannot join their own event")

    if _as_utc(event.event_date) <= datetime.now(timezone.utc):
        logger.warning(f"User {foodie_id} tried to join a past event")
        raise HTTPException(status_code=400, detail="Cannot join a past event")

    existing_participation = (
        db.query(EventParticipantModel)
        .filter(
            EventParticipantModel.event_id == event_id,
            EventParticipantModel.participant_id == foodie_id,
            EventParticipantModel.status.in_(ACTIVE_STATUSES),
        )
        .first()
    )

    if existing_participation:
        logger.warning(f"User {foodie_id} attempted to join event {event_id} again")
        raise HTTPException(status_code=400, detail="Already joined this event")

    active_count = count_active_participants(event_id, db)

    if active_count >= event.max_participants:
        logger.warning(
            f"Event {event_id} is full ({active_count}/{event.max_participants})"
        )
        raise HTTPException(status_code=400, detail="Event is full")

    chef = db.query(UserModel).filter(UserModel.id == event.host_user_id).first()

    if not chef:
        logger.error(f"Chef {event.host_user_id} not found for event {event_id}")
        raise HTTPException(status_code=404, detail="Chef not found")

    if not chef.stripe_account_id:
        logger.warning(f"Chef {chef.id} has no Stripe account configured")
        raise HTTPException(status_code=400, detail="Chef payment not configured")

    account_status = await retrieve_connected_account(chef.stripe_account_id)

    if not account_status.get("charges_enabled", False):
        logger.warning(f"Chef {chef.id} Stripe account not ready for charges")
        raise HTTPException(status_code=400, detail="Chef payment account not ready")

    logger.info(f"Checkout validation passed for event {event_id}, user {foodie_id}")
    return event, chef


async def list_events(
    db: Session,
    limit: int = 50,
    offset: int = 0,
    include_past: bool = False,
) -> List[Event]:
    """List available events (excluding deleted; upcoming only by default)"""
    try:
        query = _events_with_meal_query(db).filter(EventModel.is_deleted == False)
        if not include_past:
            query = query.filter(EventModel.event_date >= datetime.now(timezone.utc))
        rows = (
            query.order_by(EventModel.event_date.asc())
            .offset(offset)
            .limit(min(limit, 100))
            .all()
        )
        return _rows_to_schemas(rows)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching events: {str(e)}")


async def get_event_details(event_id: str, db: Session) -> Event:
    """Get details of a specific event"""
    event = get_event(event_id, db)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


async def get_event_participants(
    event_id: str, db: Session
) -> List[EventParticipantUser]:
    """Get all participants for an event with their participation status"""
    try:
        results = (
            db.query(UserModel, EventParticipantModel.status)
            .join(
                EventParticipantModel,
                UserModel.id == EventParticipantModel.participant_id,
            )
            .filter(EventParticipantModel.event_id == event_id)
            .all()
        )
        return [
            EventParticipantUser(
                id=str(user.id),
                name=user.name,
                profile_picture=user.profile_picture,
                status=status,
            )
            for user, status in results
        ]
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Error fetching participants: {str(e)}"
        )


async def get_user_events(user_id: str, db: Session) -> List[Event]:
    """Get all events created by a specific user (excluding deleted ones)"""
    try:
        rows = (
            _events_with_meal_query(db)
            .filter(EventModel.host_user_id == user_id, EventModel.is_deleted == False)
            .order_by(desc(EventModel.event_date))
            .all()
        )
        return _rows_to_schemas(rows)
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Error fetching user events: {str(e)}"
        )


async def get_user_joined_events(user_id: str, db: Session) -> List[Event]:
    """Get all events that a user has joined (excluding deleted ones)"""
    try:
        # Only participations that actually hold a seat count as "joined";
        # cancelled and refunded rows are excluded.
        rows = (
            _events_with_meal_query(db)
            .join(
                EventParticipantModel,
                EventParticipantModel.event_id == EventModel.id,
            )
            .filter(
                EventParticipantModel.participant_id == user_id,
                EventParticipantModel.status.in_(ACTIVE_STATUSES),
                EventModel.is_deleted == False,
            )
            .order_by(desc(EventModel.event_date))
            .all()
        )
        return _rows_to_schemas(rows)
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Error fetching joined events: {str(e)}"
        )


async def update_event(
    event_id: str, event_update: EventUpdate, user_id: str, db: Session
) -> Event:
    """Update an existing event (only the host can update)"""
    # Get the event
    event_model = db.query(EventModel).filter(EventModel.id == event_id).first()
    if not event_model:
        raise HTTPException(status_code=404, detail="Event not found")

    # Verify that the user is the host
    if event_model.host_user_id != user_id:
        logger.warning(
            f"User {user_id} attempted to update event {event_id} without permission"
        )
        raise HTTPException(
            status_code=403, detail="Only the event host can update the event"
        )

    try:
        # Update only the fields that are provided
        if event_update.title is not None:
            event_model.title = event_update.title

        if event_update.description is not None:
            event_model.description = event_update.description

        if event_update.max_participants is not None:
            # Validate that new max_participants is not less than current_participants
            if event_update.max_participants < event_model.current_participants:
                logger.warning(
                    f"Cannot reduce max participants for event {event_id}: {event_update.max_participants} < {event_model.current_participants}"
                )
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot reduce max participants to {event_update.max_participants} when there are already {event_model.current_participants} participants",
                )
            event_model.max_participants = event_update.max_participants

        if event_update.location is not None:
            event_model.location = event_update.location

        if event_update.event_date is not None:
            # Convert string to datetime
            event_date = datetime.fromisoformat(
                event_update.event_date.replace("Z", "+00:00")
            )
            event_model.event_date = event_date

        if event_update.price is not None:
            event_model.price = event_update.price

        db.commit()
        db.refresh(event_model)

        logger.info(f"Event {event_id} updated successfully by user {user_id}")
        meal_name = get_meal_name(event_model.meal_id, db)
        return event_model_to_schema(event_model, meal_name)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating event {event_id}: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Error updating event: {str(e)}")


async def soft_delete_event(event_id: str, user_id: str, db: Session) -> Dict[str, str]:
    """Soft delete an event (only the host can delete)"""
    # Get the event (including deleted ones for this operation)
    event_model = db.query(EventModel).filter(EventModel.id == event_id).first()
    if not event_model:
        raise HTTPException(status_code=404, detail="Event not found")

    # Check if already deleted
    if event_model.is_deleted:
        logger.warning(f"Attempt to delete already deleted event: {event_id}")
        raise HTTPException(status_code=400, detail="Event is already deleted")

    # Verify that the user is the host
    if event_model.host_user_id != user_id:
        logger.warning(
            f"User {user_id} attempted to delete event {event_id} without permission"
        )
        raise HTTPException(
            status_code=403, detail="Only the event host can delete the event"
        )

    # Host cancellation policy: every foodie gets their money back.
    # - 'booked' rows: void the uncaptured PaymentIntent (no charge ever made)
    # - 'confirmed' rows: full refund with reverse_transfer (claws back the
    #   chef's share; the platform eats Stripe's processing fee)
    participations = (
        db.query(EventParticipantModel)
        .filter(
            EventParticipantModel.event_id == event_id,
            EventParticipantModel.status.in_(ACTIVE_STATUSES),
        )
        .all()
    )

    refund_failures = []
    for p in participations:
        if not p.payment_intent_id:
            p.status = "cancelled"
            continue
        try:
            if p.status == "booked":
                await cancel_payment_intent(p.payment_intent_id)
            else:  # confirmed
                await create_refund(p.payment_intent_id)  # full refund
            p.status = "cancelled"
            p.refunded_at = datetime.now(timezone.utc)
        except InvalidRequestError as e:
            # Already cancelled/refunded/expired on Stripe's side
            logger.warning(
                f"Payment {p.payment_intent_id} not refundable during event cancel: {e}"
            )
            p.status = "cancelled"
            p.refunded_at = datetime.now(timezone.utc)
        except StripeError as e:
            logger.error(
                f"REFUND FAILED during event {event_id} cancellation: "
                f"participant {p.participant_id}, payment_intent {p.payment_intent_id}: {e}"
            )
            refund_failures.append(p.participant_id)

    if refund_failures:
        # Commit the refunds that DID succeed, keep the event alive, surface the error
        db.commit()
        raise HTTPException(
            status_code=500,
            detail=f"Could not refund {len(refund_failures)} participant(s); event not deleted. Try again.",
        )

    try:
        event_model.is_deleted = True
        event_model.current_participants = 0
        db.commit()
        logger.info(
            f"Event {event_id} cancelled by host {user_id}; "
            f"{len(participations)} participation(s) refunded/voided"
        )
        return {"message": "Event successfully deleted", "event_id": event_id}
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting event {event_id}: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Error deleting event: {str(e)}")


async def refund_event_participation(
    event_id: str, user_id: str, db: Session
) -> RefundResponse:
    """Foodie-initiated cancellation.

    Policy (July 2026):
    - While 'booked' (host has not accepted yet): free cancellation. The
      PaymentIntent is uncaptured, so cancelling voids the hold - no charge,
      no Stripe fees.
    - Once 'confirmed' (host accepted, payment captured): the seat is final,
      no refunds. If the HOST cancels the event, everyone is refunded in full
      via cancel_event_with_refunds.
    """
    try:
        event_model = (
            db.query(EventModel)
            .filter(EventModel.id == event_id, EventModel.is_deleted == False)
            .first()
        )

        if not event_model:
            raise HTTPException(status_code=404, detail="Event not found")

        participation = (
            db.query(EventParticipantModel)
            .filter(
                EventParticipantModel.event_id == event_id,
                EventParticipantModel.participant_id == user_id,
                EventParticipantModel.status.in_(ACTIVE_STATUSES),
            )
            .first()
        )

        if not participation:
            logger.warning(f"User {user_id} not registered for event {event_id}")
            raise HTTPException(status_code=400, detail="Not registered for this event")

        if participation.status == "confirmed":
            logger.info(
                f"Refund denied (seat confirmed): event {event_id}, user {user_id}"
            )
            raise HTTPException(
                status_code=400,
                detail="Your seat was confirmed by the host - bookings are final once confirmed. "
                "If the host cancels the event you will be refunded in full.",
            )

        if not participation.payment_intent_id:
            logger.error(
                f"No payment intent found for participation: event {event_id}, user {user_id}"
            )
            raise HTTPException(status_code=400, detail="Payment not found")

        # status == 'booked': void the uncaptured PaymentIntent (free, no fees)
        try:
            await cancel_payment_intent(participation.payment_intent_id)
        except InvalidRequestError as e:
            # Already cancelled/expired on Stripe's side - safe to release the seat
            logger.warning(
                f"PaymentIntent {participation.payment_intent_id} already not cancellable: {e}"
            )
        except StripeError as e:
            logger.error(
                f"Stripe error cancelling payment: event {event_id}, user {user_id}: {e}"
            )
            raise HTTPException(status_code=500, detail="Cancellation failed")

        try:
            participation.status = "cancelled"
            participation.refunded_at = datetime.now(timezone.utc)
            event_model.current_participants = max(
                count_active_participants(event_id, db) - 1, 0
            )
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(
                f"Database error during cancellation: event {event_id}, user {user_id}: {e}",
                exc_info=True,
            )
            raise HTTPException(status_code=500, detail="Cancellation failed")

        logger.info(f"Booking cancelled: event {event_id}, user {user_id}")
        return RefundResponse(
            refund_amount_cents=event_model.price,
            message="Booking cancelled - your card was never charged",
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(
            f"Unexpected error during cancellation: event {event_id}, user {user_id}: {e}",
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="Cancellation failed")


async def accept_user_participation(
    host_id: str, user_id: str, event_id: str, db: Session
):
    try:
        event_model = (
            db.query(EventModel)
            .filter(EventModel.id == event_id, EventModel.is_deleted == False)
            .first()
        )

        if not event_model:
            raise HTTPException(status_code=404, detail="Event not found")

        if host_id != event_model.host_user_id:
            raise HTTPException(status_code=403, detail="User is not host")

        existing_participation = (
            db.query(EventParticipantModel)
            .filter(
                EventParticipantModel.event_id == event_id,
                EventParticipantModel.participant_id == user_id,
                EventParticipantModel.status == "booked",
            )
            .first()
        )

        if not existing_participation:
            raise HTTPException(
                status_code=404, detail="Pending participation not found"
            )

        if not existing_participation.payment_intent_id:
            raise HTTPException(
                status_code=500,
                detail="Participation has no payment_intent_id",
            )

        payment_intent_id = existing_participation.payment_intent_id

        # Commit the status change FIRST, then capture. If capture then fails
        # we roll the status back; the uncaptured hold simply stays in place.
        # (The reverse order risked captured money with no committed seat.)
        existing_participation.status = "confirmed"
        existing_participation.confirmed_at = datetime.now(timezone.utc)
        db.commit()

        try:
            await capture_payment_intent(payment_intent_id)
        except Exception as capture_error:
            logger.error(
                f"CAPTURE FAILED after confirm: event {event_id}, user {user_id}, "
                f"payment_intent {payment_intent_id}: {capture_error}. Reverting to booked."
            )
            try:
                existing_participation.status = "booked"
                existing_participation.confirmed_at = None
                db.commit()
            except Exception:
                db.rollback()
                logger.critical(
                    f"Could not revert participation after failed capture: "
                    f"event {event_id}, user {user_id}, payment_intent {payment_intent_id}. "
                    f"MANUAL RECONCILIATION REQUIRED."
                )
            raise HTTPException(
                status_code=500,
                detail="Payment capture failed - the booking was not confirmed. Please try again.",
            )

        logger.info(
            f"Participation confirmed and captured: event {event_id}, user {user_id}"
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(
            f"Error accepting participation: event {event_id}, user {user_id}: {e}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=400, detail=f"Error accepting user participation: {str(e)}"
        )
