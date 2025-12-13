from sqlalchemy import Column, String, DateTime, ForeignKey, Text, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from utils.database import Base
import uuid


class EventParticipantModel(Base):
    __tablename__ = "events_participants"

    id = Column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    event_id = Column(
        UUID(as_uuid=False), ForeignKey("events.id"), nullable=False, index=True
    )
    participant_id = Column(
        UUID(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True
    )
    joined_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    payment_intent_id = Column(Text, nullable=True, index=True)
    status = Column(
        String,
        nullable=False,
        default='confirmed',
        server_default='confirmed'
    )
    refunded_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "status IN ('confirmed', 'cancelled')",
            name='valid_status'
        ),
    )
