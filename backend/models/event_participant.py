from sqlalchemy import String, DateTime, ForeignKey, Text, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from utils.database import Base
from typing import Optional
from datetime import datetime
import uuid


class EventParticipantModel(Base):
    __tablename__ = "events_participants"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    event_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("events.id"), nullable=False, index=True
    )
    participant_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    payment_intent_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True, index=True)
    status: Mapped[str] = mapped_column(String, nullable=False, default="booked", server_default="booked")
    refunded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "status IN ('confirmed', 'cancelled', 'booked')", name="valid_status"
        ),
    )
