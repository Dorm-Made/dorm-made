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


class GuestReviewModel(Base):
    """A host's review of a foodie/guest who attended their event.

    Two criteria (each 1-5 stars, no halves) for a total out of 10:
    - sociability: how pleasant / engaged with the group they were
    - etiquette: respected house rules, arrived/left on time, generally courteous

    Public on the foodie's profile.
    """

    __tablename__ = "guest_reviews"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    event_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("events.id"), nullable=False, index=True
    )
    # The host writing the review
    host_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True
    )
    # The guest being reviewed
    guest_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True
    )
    sociability_stars: Mapped[int] = mapped_column(Integer, nullable=False)
    etiquette_stars: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("event_id", "guest_id", name="uq_guest_review_once"),
        CheckConstraint(
            "sociability_stars BETWEEN 1 AND 5", name="valid_sociability_stars"
        ),
        CheckConstraint("etiquette_stars BETWEEN 1 AND 5", name="valid_etiquette_stars"),
    )
