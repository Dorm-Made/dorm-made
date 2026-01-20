from fastapi import HTTPException, UploadFile
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy import desc
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import uuid
import stripe
import logging

from models.event import EventModel
from models.event_participant import EventParticipantModel
from models.user import UserModel
from schemas.event import Event, EventCreate, EventUpdate
from schemas.event_participant import EventParticipant, EventParticipantUser
from schemas.refund import RefundResponse
from utils.converters import event_model_to_schema, event_participant_models_to_schemas
from utils.supabase import supabase
from .user_service import get_user
from .meal_service import get_meal_name
from .gateways.stripe_service import capture_payment_intent
from .gateways.stripe_service import retrieve_connected_account

logger = logging.getLogger(__name__)


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
    """Upload an event image to Supabase Storage and return the public URL"""
    try:
        # Validate file type
        allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
        if image.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Only JPEG, PNG, and WebP images are allowed.",
            )

        # Validate file size (5MB max)
        contents = await image.read()
        if len(contents) > 5 * 1024 * 1024:  # 5MB in bytes
            raise HTTPException(status_code=400, detail="File size exceeds 5MB limit.")

        # Generate unique filename
        file_extension = image.filename.split(".")[-1] if image.filename else "jpg"
        unique_filename = (
            f"{uuid.uuid4()}_{int(datetime.now().timestamp())}.{file_extension}"
        )

        # Upload to Supabase Storage
        result = supabase.storage.from_("event-images").upload(
            unique_filename, contents, {"content-type": image.content_type}
        )

        # Get public URL
        public_url = supabase.storage.from_("event-images").get_public_url(
            unique_filename
        )

        return public_url
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error uploading image: {str(e)}")


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

    if event.event_date <= datetime.now(timezone.utc):
        logger.warning(f"User {foodie_id} tried to join a past event")
        raise HTTPException(status_code=400, detail="Cannot join a past event")

    existing_participation = (
        db.query(EventParticipantModel)
        .filter(
            EventParticipantModel.event_id == event_id,
            EventParticipantModel.participant_id == foodie_id,
            EventParticipantModel.status == "confirmed",
        )
        .first()
    )

    if existing_participation:
        logger.warning(f"User {foodie_id} attempted to join event {event_id} again")
        raise HTTPException(status_code=400, detail="Already joined this event")

    confirmed_count = (
        db.query(EventParticipantModel)
        .filter(
            EventParticipantModel.event_id == event_id,
            EventParticipantModel.status == "confirmed",
        )
        .count()
    )

    if confirmed_count >= event.max_participants:
        logger.warning(
            f"Event {event_id} is full ({confirmed_count}/{event.max_participants})"
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


async def list_events(db: Session) -> List[Event]:
    """List all available events (excluding deleted ones)"""
    try:
        event_models = (
            db.query(EventModel)
            .filter(EventModel.is_deleted == False)
            .order_by(desc(EventModel.event_date))
            .all()
        )
        # Convert each event with its meal name
        events = []
        for event_model in event_models:
            meal_name = get_meal_name(event_model.meal_id, db)
            events.append(event_model_to_schema(event_model, meal_name))
        return events
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
        event_models = (
            db.query(EventModel)
            .filter(EventModel.host_user_id == user_id, EventModel.is_deleted == False)
            .order_by(desc(EventModel.event_date))
            .all()
        )
        # Convert each event with its meal name
        events = []
        for event_model in event_models:
            meal_name = get_meal_name(event_model.meal_id, db)
            events.append(event_model_to_schema(event_model, meal_name))
        return events
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Error fetching user events: {str(e)}"
        )


async def get_user_joined_events(user_id: str, db: Session) -> List[Event]:
    """Get all events that a user has joined (excluding deleted ones)"""
    try:
        # First get all event IDs that the user has joined
        participant_models = (
            db.query(EventParticipantModel)
            .filter(
                EventParticipantModel.participant_id == user_id,
                EventParticipantModel.refunded_at == None,
            )
            .all()
        )

        if not participant_models:
            return []

        event_ids = [participant.event_id for participant in participant_models]

        # Then get the full event details for those events (excluding deleted ones)
        event_models = (
            db.query(EventModel)
            .filter(EventModel.id.in_(event_ids), EventModel.is_deleted == False)
            .order_by(desc(EventModel.event_date))
            .all()
        )
        # Convert each event with its meal name
        events = []
        for event_model in event_models:
            meal_name = get_meal_name(event_model.meal_id, db)
            events.append(event_model_to_schema(event_model, meal_name))
        return events
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

    try:
        # Soft delete: set is_deleted to True
        event_model.is_deleted = True
        db.commit()
        logger.info(f"Event {event_id} soft deleted by user {user_id}")
        return {"message": "Event successfully deleted", "event_id": event_id}
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting event {event_id}: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Error deleting event: {str(e)}")


async def refund_event_participation(
    event_id: str, user_id: str, db: Session
) -> RefundResponse:
    """Process a refund for a user's event participation"""
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
                EventParticipantModel.status == "confirmed",
            )
            .first()
        )

        if not participation:
            logger.warning(f"User {user_id} not registered for event {event_id}")
            raise HTTPException(status_code=400, detail="Not registered for this event")

        if not participation.payment_intent_id:
            logger.error(
                f"No payment intent found for participation: event {event_id}, user {user_id}"
            )
            raise HTTPException(status_code=400, detail="Payment not found")

        if participation.refunded_at is not None:
            logger.warning(
                f"User {user_id} attempted duplicate refund for event {event_id}"
            )
            raise HTTPException(status_code=400, detail="Already refunded")

        now = datetime.now(timezone.utc)

        hours_since_reservation = (now - participation.joined_at).total_seconds() / 3600
        within_reservation_window = hours_since_reservation <= 12

        if not within_reservation_window:
            logger.warning(
                f"Refund window expired for user {user_id}, event {event_id} ({hours_since_reservation:.1f}h)"
            )
            raise HTTPException(status_code=400, detail="Refund window has expired")

        hours_until_event = (event_model.event_date - now).total_seconds() / 3600
        before_event_window = hours_until_event >= 24

        if not before_event_window:
            logger.warning(
                f"Refund too close to event time for user {user_id}, event {event_id} ({hours_until_event:.1f}h)"
            )
            raise HTTPException(status_code=400, detail="Too close to event time")

        refund_amount_cents = (event_model.price * 70) // 100

        try:
            refund = stripe.Refund.create(
                payment_intent=participation.payment_intent_id,
                amount=refund_amount_cents,
                reverse_transfer=True,
            )
            logger.info(
                f"Stripe refund created: {refund.id} for event {event_id}, user {user_id}"
            )
        except stripe.error.InvalidRequestError as e:
            logger.error(
                f"Stripe invalid request for refund: event {event_id}, user {user_id}: {e}"
            )
            raise HTTPException(status_code=400, detail="Refund not available")
        except stripe.error.StripeError as e:
            logger.error(
                f"Stripe error during refund: event {event_id}, user {user_id}: {e}"
            )
            raise HTTPException(status_code=500, detail="Refund failed")

        try:
            participation.status = "cancelled"
            participation.refunded_at = datetime.now(timezone.utc)
            event_model.current_participants -= 1
            db.commit()
            logger.info(
                f"Refund processed successfully: event {event_id}, user {user_id}, amount ${refund_amount_cents/100:.2f}"
            )
        except Exception as e:
            db.rollback()
            logger.error(
                f"Database error during refund: event {event_id}, user {user_id}: {e}",
                exc_info=True,
            )
            raise HTTPException(status_code=500, detail="Refund failed")

        return RefundResponse(
            refund_amount_cents=refund_amount_cents,
            message="Refund processed successfully",
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(
            f"Unexpected error during refund: event {event_id}, user {user_id}: {e}",
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="Refund failed")


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
            raise HTTPException(status_code=400, detail="User is not host")

        existing_participation = (
            db.query(EventParticipantModel)
            .filter(
                EventParticipantModel.event_id == event_id,
                EventParticipantModel.participant_id == user_id,
                EventParticipantModel.status == "booked",
            )
            .first()
        )
        existing_participation.status = "confirmed"
        await capture_payment_intent(existing_participation.payment_intent_id)
        db.commit()
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Error accepting user participation: {str(e)}"
        )
