from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from typing import Optional
from datetime import datetime

# One config for every user schema: camelCase over the wire (matching the
# event/meal/review schemas), snake_case internally, ORM-friendly.
CamelConfig = ConfigDict(
    from_attributes=True,
    alias_generator=to_camel,
    populate_by_name=True,
)


class UserBase(BaseModel):
    name: str
    email: str
    university: Optional[str] = None
    description: Optional[str] = None
    profile_picture: Optional[str] = None
    stripe_account_id: Optional[str] = None
    stripe_onboarding_complete: Optional[bool] = None

    model_config = CamelConfig


class UserCreate(UserBase):
    password: str
    invite_code: Optional[str] = None  # referral code of the user who invited them

    model_config = CamelConfig


class UserLogin(BaseModel):
    email: str
    password: str

    model_config = CamelConfig


class UserUpdate(BaseModel):
    university: Optional[str] = None
    description: Optional[str] = None
    profile_picture: Optional[str] = None

    model_config = CamelConfig


class User(UserBase):
    """Full user schema - ONLY for the authenticated user themselves.
    Never return this from public endpoints (it carries email, Stripe ids,
    invite/referral data)."""

    id: str
    created_at: datetime
    # Referral system
    invite_code: Optional[str] = None
    referred_by_user_id: Optional[str] = None
    referred_by_name: Optional[str] = None
    # Taste profile (public) + onboarding state
    taste_archetype: Optional[str] = None
    taste_description: Optional[str] = None
    onboarding_completed: bool = False

    model_config = CamelConfig


class PublicUser(BaseModel):
    """Safe subset for public profile pages - no email, no Stripe, no referral
    internals."""

    id: str
    name: str
    university: Optional[str] = None
    description: Optional[str] = None
    profile_picture: Optional[str] = None
    taste_archetype: Optional[str] = None
    taste_description: Optional[str] = None
    created_at: datetime

    model_config = CamelConfig


class InviteCodeResponse(BaseModel):
    invite_code: str

    model_config = CamelConfig


class TasteQuizSubmission(BaseModel):
    picks: list[str]  # selected image ids, one per question

    model_config = CamelConfig


class TasteProfileResponse(BaseModel):
    taste_archetype: str
    taste_description: str
    onboarding_completed: bool

    model_config = CamelConfig


class Token(BaseModel):
    access_token: str
    token_type: str

    model_config = CamelConfig


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: User

    model_config = CamelConfig
