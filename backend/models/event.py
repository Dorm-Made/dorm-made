from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, Boolean, INTEGER
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from utils.database import Base
import uuid


class EventModel(Base):
    __tablename__ = "events"

    id = Column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    host_user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True)
    meal_id = Column(UUID(as_uuid=False), ForeignKey("meals.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    max_participants = Column(Integer, nullable=False)
    current_participants = Column(Integer, default=0, nullable=False)
    location = Column(String, nullable=False)
    event_date = Column(DateTime(timezone=True), nullable=False)
    image_url = Column(String, nullable=True)
    price = Column(INTEGER, nullable=False)
    is_deleted = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)