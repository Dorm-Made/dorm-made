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

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: User
