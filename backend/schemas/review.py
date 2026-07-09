from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel
from datetime import datetime
from typing import List, Optional


CamelConfig = ConfigDict(
    from_attributes=True,
    alias_generator=to_camel,
    populate_by_name=True,
)


# ---------------------------------------------------------------------------
# Foodie -> Chef (3-layer event review, each layer 1-5 stars, total /15)
# ---------------------------------------------------------------------------


class EventReviewCreate(BaseModel):
    """Payload a foodie submits after attending an event.

    A comment is required for any layer rated 3 stars or below.
    """

    food_stars: int = Field(ge=1, le=5)
    space_stars: int = Field(ge=1, le=5)
    host_stars: int = Field(ge=1, le=5)
    food_comment: Optional[str] = None
    space_comment: Optional[str] = None
    host_comment: Optional[str] = None

    model_config = CamelConfig

    @model_validator(mode="after")
    def comment_required_for_low_ratings(self):
        checks = [
            ("food", self.food_stars, self.food_comment),
            ("space", self.space_stars, self.space_comment),
            ("host", self.host_stars, self.host_comment),
        ]
        for layer, stars, comment in checks:
            if stars <= 3 and not (comment and comment.strip()):
                raise ValueError(
                    f"A comment is required for the '{layer}' rating when it is 3 stars or below"
                )
        return self


class EventReview(BaseModel):
    id: str
    event_id: str
    reviewer_id: str
    reviewer_name: str
    reviewer_profile_picture: Optional[str] = None
    host_user_id: str
    food_stars: int
    space_stars: int
    host_stars: int
    food_comment: Optional[str] = None
    space_comment: Optional[str] = None
    host_comment: Optional[str] = None
    total_stars: int  # out of 15
    created_at: datetime

    model_config = CamelConfig


class HostRatingSummary(BaseModel):
    """Aggregate chef/host score shown on a profile."""

    user_id: str
    review_count: int
    average_total: Optional[float] = None  # out of 15
    average_food: Optional[float] = None
    average_space: Optional[float] = None
    average_host: Optional[float] = None

    model_config = CamelConfig


# ---------------------------------------------------------------------------
# Host -> Foodie (2 criteria, each 1-5 stars, total /10)
# ---------------------------------------------------------------------------


class GuestReviewCreate(BaseModel):
    guest_id: str
    sociability_stars: int = Field(ge=1, le=5)
    etiquette_stars: int = Field(ge=1, le=5)
    comment: Optional[str] = None

    model_config = CamelConfig


class GuestReview(BaseModel):
    id: str
    event_id: str
    host_id: str
    host_name: str
    guest_id: str
    sociability_stars: int
    etiquette_stars: int
    comment: Optional[str] = None
    total_stars: int  # out of 10
    created_at: datetime

    model_config = CamelConfig


class GuestRatingSummary(BaseModel):
    """Aggregate foodie/guest score shown on a profile."""

    user_id: str
    review_count: int
    average_total: Optional[float] = None  # out of 10
    average_sociability: Optional[float] = None
    average_etiquette: Optional[float] = None

    model_config = CamelConfig


# ---------------------------------------------------------------------------
# Pending reviews (nudges/gates before the next booking)
# ---------------------------------------------------------------------------


class PendingEventReview(BaseModel):
    """A past event the user attended but hasn't reviewed yet (foodie side)."""

    event_id: str
    event_title: str
    event_date: datetime
    host_name: str

    model_config = CamelConfig


class UnratedGuest(BaseModel):
    id: str
    name: str

    model_config = CamelConfig


class PendingGuestReviewEvent(BaseModel):
    """A past event the user hosted with confirmed guests not yet rated (chef side)."""

    event_id: str
    event_title: str
    event_date: datetime
    unrated_guests: List["UnratedGuest"]

    model_config = CamelConfig


class PendingReviews(BaseModel):
    pending_event_reviews: List[PendingEventReview]
    pending_guest_reviews: List[PendingGuestReviewEvent]

    model_config = CamelConfig
