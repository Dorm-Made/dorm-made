from sqlalchemy import Column, String, DateTime, ForeignKey
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
