from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    name: str
    email: str
    university: Optional[str] = None
    description: Optional[str] = None
    profile_picture: Optional[str] = None
    stripe_account_id: Optional[str] = None
    stripe_onboarding_complete: Optional[bool] = None


class UserCreate(UserBase):
    password: str
    invite_code: Optional[str] = None  # referral code of the user who invited them


class UserLogin(BaseModel):
    email: str
    password: str


class UserUpdate(BaseModel):
    university: Optional[str] = None
    description: Optional[str] = None
    profile_picture: Optional[str] = None


class User(UserBase):
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

    model_config = ConfigDict(from_attributes=True)


class InviteCodeResponse(BaseModel):
    invite_code: str


class TasteQuizSubmission(BaseModel):
    picks: list[str]  # selected image ids, one per question


class TasteProfileResponse(BaseModel):
    taste_archetype: str
    taste_description: str
    onboarding_completed: bool


class Token(BaseModel):
    access_token: str
    token_type: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: User
