from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from typing import List, Annotated
from sqlalchemy.orm import Session
import logging

from schemas.user import User, UserCreate, UserLogin, UserUpdate, LoginResponse
from schemas.stripe import (
    StripeConnectResponse,
    StripeLoginLinkResponse,
    StripeStatusResponse,
)
from utils.auth import get_current_user_id
from utils.database import get_db
from utils.config import config
from services import user_service
from services.gateways import stripe_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/stripe/connect", response_model=StripeConnectResponse)
async def create_stripe_connect(
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    db: Session = Depends(get_db),
):
    user = await user_service.get_user(current_user_id, db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.stripe_account_id:
        onboarding_url = await stripe_service.create_account_link(
            user.stripe_account_id, current_user_id, "account_onboarding"
        )
        return StripeConnectResponse(
            onboarding_url=onboarding_url, account_id=user.stripe_account_id
        )

    result = await stripe_service.create_stripe_connect_account(
        user.email, current_user_id
    )
    await user_service.update_stripe_account(current_user_id, result["account_id"], db)

    return StripeConnectResponse(
        onboarding_url=result["onboarding_url"], account_id=result["account_id"]
    )


@router.get("/stripe/status", response_model=StripeStatusResponse)
async def get_stripe_status(
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    db: Session = Depends(get_db),
):
    user = await user_service.get_user(current_user_id, db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.stripe_account_id:
        return StripeStatusResponse(
            connected=False,
            charges_enabled=False,
            onboarding_complete=False,
            account_id=None,
        )

    status = await stripe_service.get_stripe_account_status(user.stripe_account_id)

    await user_service.update_stripe_status(
        current_user_id, status["onboarding_complete"], db
    )

    return StripeStatusResponse(
        connected=True,
        charges_enabled=status["charges_enabled"],
        onboarding_complete=status["onboarding_complete"],
        account_id=user.stripe_account_id,
    )


@router.get("/stripe/login", response_model=StripeLoginLinkResponse)
async def get_stripe_login_link(
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    db: Session = Depends(get_db),
):
    user = await user_service.get_user(current_user_id, db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.stripe_account_id:
        raise HTTPException(
            status_code=400, detail="Stripe Connect Account not configured"
        )

    url = await stripe_service.generate_login_link(user.stripe_account_id)

    return StripeLoginLinkResponse(account_url=url)


@router.post("/", response_model=User)
async def create_user_endpoint(user: UserCreate, db: Session = Depends(get_db)):
    """Create a new user"""
    return await user_service.create_user(user, db)


@router.post("/login", response_model=LoginResponse)
async def login_endpoint(login_data: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user and return JWT token"""
    return await user_service.authenticate_user(login_data, db)


@router.post("/{user_id}/profile-picture", response_model=User)
async def upload_profile_picture_endpoint(
    user_id: str,
    image: Annotated[UploadFile, File()],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    db: Session = Depends(get_db),
):
    """Upload a profile picture for the user (only the authenticated user can upload their own picture)"""
    if current_user_id != user_id:
        raise HTTPException(
            status_code=403,
            detail="Você só pode fazer upload da sua própria foto de perfil",
        )

    return await user_service.upload_profile_picture(user_id, image, db)


@router.patch("/{user_id}", response_model=User)
async def update_user_profile_endpoint(
    user_id: str,
    user_update: UserUpdate,
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    db: Session = Depends(get_db),
):
    """Update user profile (only the authenticated user can update their own profile)"""
    if current_user_id != user_id:
        raise HTTPException(
            status_code=403, detail="You can only update your own profile"
        )

    return await user_service.update_user(user_id, user_update, db)


@router.get("/{user_id}", response_model=User)
async def get_user_by_id_endpoint(user_id: str, db: Session = Depends(get_db)):
    """Get user by ID"""
    user = await user_service.get_user(user_id, db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
