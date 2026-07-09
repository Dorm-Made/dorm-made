from sqlalchemy import String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from utils.database import Base
from typing import Optional
from datetime import datetime
import uuid


class UserModel(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    university: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    profile_picture: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    stripe_account_id: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    stripe_onboarding_complete: Mapped[Optional[bool]] = mapped_column(Boolean, default=False, nullable=True)
    # Referral system
    invite_code: Mapped[Optional[str]] = mapped_column(
        String, unique=True, nullable=True, index=True
    )
    referred_by_user_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id"), nullable=True, index=True
    )
    # Taste profile (onboarding quiz)
    taste_archetype: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    taste_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    taste_picks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON list of image ids
    onboarding_completed: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
