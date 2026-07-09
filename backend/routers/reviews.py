from fastapi import APIRouter, Depends
from typing import List, Annotated
from sqlalchemy.orm import Session

from schemas.review import (
    EventReview,
    EventReviewCreate,
    GuestReview,
    GuestReviewCreate,
    GuestRatingSummary,
    HostRatingSummary,
    PendingReviews,
)
from utils.auth import get_current_user_id
from utils.database import get_db
from services import review_service

router = APIRouter(tags=["reviews"])


@router.get(
    "/users/me/pending-reviews",
    response_model=PendingReviews,
    response_model_by_alias=True,
)
async def get_pending_reviews_endpoint(
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    db: Session = Depends(get_db),
):
    """Reviews the authenticated user still owes.

    Foodie side gates the next booking; chef side is a soft reminder.
    """
    return await review_service.get_pending_reviews(current_user_id, db)


# ---------------------------------------------------------------------------
# Foodie -> Chef (event reviews, 3 layers, /15)
# ---------------------------------------------------------------------------


@router.post(
    "/events/{event_id}/reviews",
    response_model=EventReview,
    response_model_by_alias=True,
)
async def create_event_review_endpoint(
    event_id: str,
    review: EventReviewCreate,
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    db: Session = Depends(get_db),
):
    """Submit a 3-layer review (food, space, host) for an attended event"""
    return await review_service.create_event_review(
        event_id, review, current_user_id, db
    )


@router.get(
    "/events/{event_id}/reviews",
    response_model=List[EventReview],
    response_model_by_alias=True,
)
async def get_event_reviews_endpoint(event_id: str, db: Session = Depends(get_db)):
    """Get all public reviews for an event"""
    return await review_service.get_event_reviews(event_id, db)


@router.get(
    "/users/{user_id}/host-rating",
    response_model=HostRatingSummary,
    response_model_by_alias=True,
)
async def get_host_rating_endpoint(user_id: str, db: Session = Depends(get_db)):
    """Aggregate chef/host score (out of 15) for a user's profile"""
    return await review_service.get_host_rating_summary(user_id, db)


# ---------------------------------------------------------------------------
# Host -> Foodie (guest reviews, 2 criteria, /10)
# ---------------------------------------------------------------------------


@router.post(
    "/events/{event_id}/guest-reviews",
    response_model=GuestReview,
    response_model_by_alias=True,
)
async def create_guest_review_endpoint(
    event_id: str,
    review: GuestReviewCreate,
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    db: Session = Depends(get_db),
):
    """Host reviews a confirmed guest (sociability + etiquette)"""
    return await review_service.create_guest_review(event_id, review, current_user_id, db)


@router.get(
    "/events/{event_id}/guest-reviews",
    response_model=List[GuestReview],
    response_model_by_alias=True,
)
async def get_event_guest_reviews_endpoint(
    event_id: str,
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    db: Session = Depends(get_db),
):
    """Guest reviews the host has already written for this event (host only)"""
    return await review_service.get_event_guest_reviews(event_id, current_user_id, db)


@router.get(
    "/users/{user_id}/guest-rating",
    response_model=GuestRatingSummary,
    response_model_by_alias=True,
)
async def get_guest_rating_endpoint(user_id: str, db: Session = Depends(get_db)):
    """Aggregate foodie/guest score (out of 10) for a user's profile"""
    return await review_service.get_guest_rating_summary(user_id, db)


@router.get(
    "/users/{user_id}/guest-reviews",
    response_model=List[GuestReview],
    response_model_by_alias=True,
)
async def get_guest_reviews_received_endpoint(
    user_id: str, db: Session = Depends(get_db)
):
    """All public reviews a user has received as a guest"""
    return await review_service.get_guest_reviews_received(user_id, db)
