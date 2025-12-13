from sqlalchemy import Column, String, DateTime, Text, Boolean
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from utils.database import Base
import uuid


class UserModel(Base):
    __tablename__ = "users"

    id = Column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    university = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    profile_picture = Column(String, nullable=True)
    stripe_account_id = Column(String, nullable=True, index=True)
    stripe_onboarding_complete = Column(Boolean, default=False, nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
