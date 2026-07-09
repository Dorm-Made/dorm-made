from sqlalchemy import (
    Integer,
    DateTime,
    ForeignKey,
    Text,
    CheckConstraint,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from utils.database import Base
from typing import Optional
from datetime import datetime
import uuid


class EventReviewModel(Base):
    """A foodie's 3-layer review of an event/meal they attended.

    Layers (each 1-5 stars, no halves):
    - food: taste, quantity, temperature
    - space: the ambience / infrastructure / "third space"
    - host: the chef as a host (social skills, hospitality)

    A comment is required for any layer rated 3 stars or below.
    Reviews are public and permanent on the chef's profile.
    """

    __tablename__ = "event_reviews"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    event_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("events.id"), nullable=False, index=True
    )
    reviewer_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True
    )
    # Denormalized so chef profile aggregates don't need to join events
    host_user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True
    )
    food_stars: Mapped[int] = mapped_column(Integer, nullable=False)
    space_stars: Mapped[int] = mapped_column(Integer, nullable=False)
    host_stars: Mapped[int] = mapped_column(Integer, nullable=False)
    food_comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    space_comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    host_comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("event_id", "reviewer_id", name="uq_event_review_once"),
        CheckConstraint("food_stars BETWEEN 1 AND 5", name="valid_food_stars"),
        CheckConstraint("space_stars BETWEEN 1 AND 5", name="valid_space_stars"),
        CheckConstraint("host_stars BETWEEN 1 AND 5", name="valid_host_stars"),
    )
