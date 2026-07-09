from fastapi import HTTPException
from typing import List, Optional
from sqlalchemy import desc, func
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import logging
import uuid

from models.event import EventModel
from models.event_participant import EventParticipantModel
from models.event_review import EventReviewModel
from models.guest_review import GuestReviewModel
from models.user import UserModel
from schemas.review import (
    EventReview,
    EventReviewCreate,
    GuestReview,
    GuestReviewCreate,
    GuestRatingSummary,
    HostRatingSummary,
    PendingEventReview,
    PendingGuestReviewEvent,
    PendingReviews,
    UnratedGuest,
)

logger = logging.getLogger(__name__)


def _event_review_to_schema(
    review: EventReviewModel, reviewer: UserModel
) -> EventReview:
    return EventReview(
        id=review.id,
        event_id=review.event_id,
        reviewer_id=review.reviewer_id,
        reviewer_name=reviewer.name,
        reviewer_profile_picture=reviewer.profile_picture,
        host_user_id=review.host_user_id,
        food_stars=review.food_stars,
        space_stars=review.space_stars,
        host_stars=review.host_stars,
        food_comment=review.food_comment,
        space_comment=review.space_comment,
        host_comment=review.host_comment,
        total_stars=review.food_stars + review.space_stars + review.host_stars,
        created_at=review.created_at,
    )


def _guest_review_to_schema(review: GuestReviewModel, host: UserModel) -> GuestReview:
    return GuestReview(
        id=review.id,
        event_id=review.event_id,
        host_id=review.host_id,
        host_name=host.name,
        guest_id=review.guest_id,
        sociability_stars=review.sociability_stars,
        etiquette_stars=review.etiquette_stars,
        comment=review.comment,
        total_stars=review.sociability_stars + review.etiquette_stars,
        created_at=review.created_at,
    )


def _get_active_event(event_id: str, db: Session) -> EventModel:
    event = (
        db.query(EventModel)
        .filter(EventModel.id == event_id, EventModel.is_deleted == False)
        .first()
    )
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


def _is_confirmed_participant(event_id: str, user_id: str, db: Session) -> bool:
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


# ---------------------------------------------------------------------------
# Foodie -> Chef
# ---------------------------------------------------------------------------


async def create_event_review(
    event_id: str, review: EventReviewCreate, reviewer_id: str, db: Session
) -> EventReview:
    """A confirmed participant reviews the event they attended (3 layers, /15).

    Reviews are public immediately and permanent on the chef's profile.
    """
    event = _get_active_event(event_id, db)

    if event.host_user_id == reviewer_id:
        raise HTTPException(status_code=400, detail="Hosts cannot review their own event")

    if not _is_confirmed_participant(event_id, reviewer_id, db):
        logger.warning(
            f"User {reviewer_id} tried to review event {event_id} without confirmed participation"
        )
        raise HTTPException(
            status_code=403, detail="Only confirmed participants can review this event"
        )

    existing = (
        db.query(EventReviewModel)
        .filter(
            EventReviewModel.event_id == event_id,
            EventReviewModel.reviewer_id == reviewer_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="You already reviewed this event")

    try:
        review_model = EventReviewModel(
            id=str(uuid.uuid4()),
            event_id=event_id,
            reviewer_id=reviewer_id,
            host_user_id=event.host_user_id,
            food_stars=review.food_stars,
            space_stars=review.space_stars,
            host_stars=review.host_stars,
            food_comment=(review.food_comment or "").strip() or None,
            space_comment=(review.space_comment or "").strip() or None,
            host_comment=(review.host_comment or "").strip() or None,
        )
        db.add(review_model)
        db.commit()
        db.refresh(review_model)

        reviewer = db.query(UserModel).filter(UserModel.id == reviewer_id).first()
        logger.info(f"Event review created: event {event_id} by user {reviewer_id}")
        return _event_review_to_schema(review_model, reviewer)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating review for event {event_id}: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Error creating review: {str(e)}")


async def get_event_reviews(event_id: str, db: Session) -> List[EventReview]:
    """All public reviews for one event (newest first)."""
    try:
        results = (
            db.query(EventReviewModel, UserModel)
            .join(UserModel, UserModel.id == EventReviewModel.reviewer_id)
            .filter(EventReviewModel.event_id == event_id)
            .order_by(desc(EventReviewModel.created_at))
            .all()
        )
        return [_event_review_to_schema(review, user) for review, user in results]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching reviews: {str(e)}")


async def get_host_rating_summary(user_id: str, db: Session) -> HostRatingSummary:
    """Aggregate chef score across all reviews of events they hosted."""
    try:
        row = (
            db.query(
                func.count(EventReviewModel.id),
                func.avg(
                    EventReviewModel.food_stars
                    + EventReviewModel.space_stars
                    + EventReviewModel.host_stars
                ),
                func.avg(EventReviewModel.food_stars),
                func.avg(EventReviewModel.space_stars),
                func.avg(EventReviewModel.host_stars),
            )
            .filter(EventReviewModel.host_user_id == user_id)
            .one()
        )
        count, avg_total, avg_food, avg_space, avg_host = row
        return HostRatingSummary(
            user_id=user_id,
            review_count=count or 0,
            average_total=round(float(avg_total), 1) if avg_total is not None else None,
            average_food=round(float(avg_food), 1) if avg_food is not None else None,
            average_space=round(float(avg_space), 1) if avg_space is not None else None,
            average_host=round(float(avg_host), 1) if avg_host is not None else None,
        )
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Error fetching host rating: {str(e)}"
        )


# ---------------------------------------------------------------------------
# Host -> Foodie
# ---------------------------------------------------------------------------


async def create_guest_review(
    event_id: str, review: GuestReviewCreate, host_id: str, db: Session
) -> GuestReview:
    """The event host reviews a confirmed guest (2 criteria, /10)."""
    event = _get_active_event(event_id, db)

    if event.host_user_id != host_id:
        raise HTTPException(
            status_code=403, detail="Only the event host can review guests"
        )

    if review.guest_id == host_id:
        raise HTTPException(status_code=400, detail="Hosts cannot review themselves")

    if not _is_confirmed_participant(event_id, review.guest_id, db):
        raise HTTPException(
            status_code=400,
            detail="You can only review confirmed participants of this event",
        )

    existing = (
        db.query(GuestReviewModel)
        .filter(
            GuestReviewModel.event_id == event_id,
            GuestReviewModel.guest_id == review.guest_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400, detail="You already reviewed this guest for this event"
        )

    try:
        review_model = GuestReviewModel(
            id=str(uuid.uuid4()),
            event_id=event_id,
            host_id=host_id,
            guest_id=review.guest_id,
            sociability_stars=review.sociability_stars,
            etiquette_stars=review.etiquette_stars,
            comment=(review.comment or "").strip() or None,
        )
        db.add(review_model)
        db.commit()
        db.refresh(review_model)

        host = db.query(UserModel).filter(UserModel.id == host_id).first()
        logger.info(
            f"Guest review created: guest {review.guest_id} for event {event_id} by host {host_id}"
        )
        return _guest_review_to_schema(review_model, host)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(
            f"Error creating guest review for event {event_id}: {e}", exc_info=True
        )
        raise HTTPException(
            status_code=400, detail=f"Error creating guest review: {str(e)}"
        )


async def get_event_guest_reviews(
    event_id: str, host_id: str, db: Session
) -> List[GuestReview]:
    """Guest reviews the host has already written for one event (host only)."""
    event = _get_active_event(event_id, db)
    if event.host_user_id != host_id:
        raise HTTPException(
            status_code=403, detail="Only the event host can view these reviews"
        )
    try:
        results = (
            db.query(GuestReviewModel, UserModel)
            .join(UserModel, UserModel.id == GuestReviewModel.host_id)
            .filter(GuestReviewModel.event_id == event_id)
            .order_by(desc(GuestReviewModel.created_at))
            .all()
        )
        return [_guest_review_to_schema(review, host) for review, host in results]
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Error fetching guest reviews: {str(e)}"
        )


async def get_guest_reviews_received(user_id: str, db: Session) -> List[GuestReview]:
    """All public reviews a user has received as a guest (newest first)."""
    try:
        results = (
            db.query(GuestReviewModel, UserModel)
            .join(UserModel, UserModel.id == GuestReviewModel.host_id)
            .filter(GuestReviewModel.guest_id == user_id)
            .order_by(desc(GuestReviewModel.created_at))
            .all()
        )
        return [_guest_review_to_schema(review, host) for review, host in results]
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Error fetching guest reviews: {str(e)}"
        )


# ---------------------------------------------------------------------------
# Pending reviews (booking gate + host reminders).
# ---------------------------------------------------------------------------


async def get_pending_reviews(user_id: str, db: Session) -> PendingReviews:
    """Everything the user still owes a rating for.

    - pending_event_reviews: past events they attended (confirmed) but
      haven't reviewed. Used as a hard gate before booking the next event.
    - pending_guest_reviews: past events they hosted with confirmed guests
      not yet rated. Used as a soft reminder (never blocks).
    """
    now = datetime.now(timezone.utc)
    try:
        # --- Foodie side: attended past events without a review by this user
        attended = (
            db.query(EventModel, UserModel.name)
            .join(
                EventParticipantModel,
                EventParticipantModel.event_id == EventModel.id,
            )
            .join(UserModel, UserModel.id == EventModel.host_user_id)
            .filter(
                EventParticipantModel.participant_id == user_id,
                EventParticipantModel.status == "confirmed",
                EventModel.is_deleted == False,
                EventModel.event_date < now,
            )
            .order_by(desc(EventModel.event_date))
            .all()
        )
        reviewed_event_ids = {
            row[0]
            for row in db.query(EventReviewModel.event_id)
            .filter(EventReviewModel.reviewer_id == user_id)
            .all()
        }
        pending_event_reviews = [
            PendingEventReview(
                event_id=event.id,
                event_title=event.title,
                event_date=event.event_date,
                host_name=host_name,
            )
            for event, host_name in attended
            if event.id not in reviewed_event_ids
        ]

        # --- Chef side: hosted past events with confirmed guests not yet rated
        hosted = (
            db.query(EventModel)
            .filter(
                EventModel.host_user_id == user_id,
                EventModel.is_deleted == False,
                EventModel.event_date < now,
            )
            .order_by(desc(EventModel.event_date))
            .all()
        )
        pending_guest_reviews: List[PendingGuestReviewEvent] = []
        for event in hosted:
            guests = (
                db.query(UserModel)
                .join(
                    EventParticipantModel,
                    EventParticipantModel.participant_id == UserModel.id,
                )
                .filter(
                    EventParticipantModel.event_id == event.id,
                    EventParticipantModel.status == "confirmed",
                )
                .all()
            )
            if not guests:
                continue
            rated_guest_ids = {
                row[0]
                for row in db.query(GuestReviewModel.guest_id)
                .filter(GuestReviewModel.event_id == event.id)
                .all()
            }
            unrated = [
                UnratedGuest(id=guest.id, name=guest.name)
                for guest in guests
                if guest.id not in rated_guest_ids
            ]
            if unrated:
                pending_guest_reviews.append(
                    PendingGuestReviewEvent(
                        event_id=event.id,
                        event_title=event.title,
                        event_date=event.event_date,
                        unrated_guests=unrated,
                    )
                )

        return PendingReviews(
            pending_event_reviews=pending_event_reviews,
            pending_guest_reviews=pending_guest_reviews,
        )
    except Exception as e:
        logger.error(
            f"Error fetching pending reviews for user {user_id}: {e}", exc_info=True
        )
        raise HTTPException(
            status_code=400, detail=f"Error fetching pending reviews: {str(e)}"
        )


async def get_guest_rating_summary(user_id: str, db: Session) -> GuestRatingSummary:
    """Aggregate foodie score across all reviews received as a guest."""
    try:
        row = (
            db.query(
                func.count(GuestReviewModel.id),
                func.avg(
                    GuestReviewModel.sociability_stars + GuestReviewModel.etiquette_stars
                ),
                func.avg(GuestReviewModel.sociability_stars),
                func.avg(GuestReviewModel.etiquette_stars),
            )
            .filter(GuestReviewModel.guest_id == user_id)
            .one()
        )
        count, avg_total, avg_soc, avg_eti = row
        return GuestRatingSummary(
            user_id=user_id,
            review_count=count or 0,
            average_total=round(float(avg_total), 1) if avg_total is not None else None,
            average_sociability=round(float(avg_soc), 1) if avg_soc is not None else None,
            average_etiquette=round(float(avg_eti), 1) if avg_eti is not None else None,
        )
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Error fetching guest rating: {str(e)}"
        )
