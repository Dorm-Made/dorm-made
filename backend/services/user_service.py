from fastapi import HTTPException, UploadFile
from typing import Optional, List
from sqlalchemy.orm import Session
from datetime import datetime
import uuid
import logging

from models.user import UserModel
from schemas.user import User, UserCreate, UserLogin, UserUpdate, LoginResponse
from utils.password import hash_password, verify_password, create_access_token
from utils.converters import user_model_to_schema, user_models_to_schemas
from utils.supabase import supabase
from utils.uploads import upload_image

logger = logging.getLogger(__name__)


async def get_user(user_id: str, db: Session) -> Optional[User]:
    """Get user by ID from database"""
    try:
        user_model = db.query(UserModel).filter(UserModel.id == user_id).first()
        if user_model:
            referred_by_name = None
            if getattr(user_model, "referred_by_user_id", None):
                referrer = (
                    db.query(UserModel)
                    .filter(UserModel.id == user_model.referred_by_user_id)
                    .first()
                )
                referred_by_name = referrer.name if referrer else None
            return user_model_to_schema(user_model, referred_by_name=referred_by_name)
        return None
    except Exception as e:
        logger.error(f"Error getting user {user_id}: {e}", exc_info=True)
        return None


async def create_user(user: UserCreate, db: Session) -> LoginResponse:
    """Create a new user and log them in immediately (returns token + user).
    Optionally referred by an existing user's invite code."""
    from services import referral_service

    try:
        # Check if user with email already exists
        existing_user = (
            db.query(UserModel).filter(UserModel.email == user.email).first()
        )
        if existing_user:
            logger.warning(f"Attempt to register with existing email: {user.email}")
            raise HTTPException(status_code=400, detail="Email already registered")

        # Resolve referral (validated before creating anything, so a typo'd
        # code fails loudly instead of silently dropping the referral)
        referrer = None
        if user.invite_code and user.invite_code.strip():
            referrer = referral_service.resolve_invite_code(user.invite_code, db)

        # Hash password
        hashed_password = hash_password(user.password)

        # Create new user model with their own invite code ready to share
        user_model = UserModel(
            id=str(uuid.uuid4()),
            name=user.name,
            email=user.email,
            hashed_password=hashed_password,
            university=user.university,
            description=user.description,
            invite_code=referral_service.generate_invite_code(user.name, db),
            referred_by_user_id=referrer.id if referrer else None,
        )

        db.add(user_model)
        db.commit()
        db.refresh(user_model)

        if referrer:
            logger.info(f"User {user_model.id} referred by {referrer.id} ({referrer.invite_code})")
        logger.info(f"User created successfully: {user_model.id}")
        # Log the user straight in - no separate login step after signup
        access_token = create_access_token(data={"userId": user_model.id})
        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user=user_model_to_schema(
                user_model, referred_by_name=referrer.name if referrer else None
            ),
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating user: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Error creating user: {str(e)}")


def get_user_by_email(email: str, db: Session) -> Optional[UserModel]:
    """Get user by email from database - returns model for auth purposes"""
    try:
        return db.query(UserModel).filter(UserModel.email == email).first()
    except Exception as e:
        logger.error(f"Error getting user by email: {e}", exc_info=True)
        return None


def get_user_by_id(user_id: str, db: Session) -> Optional[UserModel]:
    """Get user by ID from database - returns model for auth purposes"""
    try:
        return db.query(UserModel).filter(UserModel.id == user_id).first()
    except Exception as e:
        logger.error(f"Error getting user by ID {user_id}: {e}", exc_info=True)
        return None


async def authenticate_user(login_data: UserLogin, db: Session) -> LoginResponse:
    """Authenticate user and return JWT token"""
    user_model = get_user_by_email(login_data.email, db)
    if not user_model:
        logger.warning(f"Failed login attempt for email: {login_data.email}")
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(login_data.password, user_model.hashed_password):
        logger.warning(f"Invalid password for user: {login_data.email}")
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token(data={"userId": user_model.id})
    logger.info(f"User authenticated successfully: {user_model.id}")

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_model_to_schema(user_model),
    )


async def update_user(user_id: str, user_update: UserUpdate, db: Session) -> User:
    """Update user information"""
    try:
        user_model = db.query(UserModel).filter(UserModel.id == user_id).first()
        if not user_model:
            raise HTTPException(status_code=404, detail="User not found")

        # Update fields if provided
        if user_update.university is not None:
            user_model.university = user_update.university
        if user_update.description is not None:
            user_model.description = user_update.description
        if user_update.profile_picture is not None:
            user_model.profile_picture = user_update.profile_picture

        db.commit()
        db.refresh(user_model)

        logger.info(f"User updated successfully: {user_id}")
        return user_model_to_schema(user_model)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Error updating user: {str(e)}")


async def upload_profile_picture(user_id: str, image: UploadFile, db: Session) -> User:
    """Upload a profile picture to Supabase Storage and update user profile"""
    try:
        # Get current user to check for existing profile picture
        current_user = await get_user(user_id, db)
        if not current_user:
            raise HTTPException(status_code=404, detail="User not found")

        # Delete old profile picture if it exists
        old_picture_url = current_user.profile_picture
        if old_picture_url:
            try:
                # Extract filename from URL
                if "profile-pictures/" in old_picture_url:
                    old_filename = old_picture_url.split("profile-pictures/")[-1].split(
                        "?"
                    )[0]
                    supabase.storage.from_("profile-pictures").remove([old_filename])
            except Exception as e:
                logger.warning(
                    f"Failed to delete old profile picture for user {user_id}: {e}"
                )
                # Continue with upload even if deletion fails

        # Upload new picture (magic-byte validated; JPEG/PNG/WebP)
        public_url = await upload_image(
            image, "profile-pictures", filename_prefix=f"{user_id}_"
        )

        # Update user profile with new picture URL
        updated_user = await update_user(
            user_id, UserUpdate(profile_picture=public_url), db
        )

        logger.info(f"Profile picture uploaded successfully for user: {user_id}")
        return updated_user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error uploading profile picture for user {user_id}: {e}", exc_info=True
        )
        raise HTTPException(
            status_code=400, detail=f"Error uploading profile picture: {str(e)}"
        )


async def update_stripe_account(
    user_id: str, stripe_account_id: str, db: Session
) -> User:
    try:
        user_model = db.query(UserModel).filter(UserModel.id == user_id).first()
        if not user_model:
            raise HTTPException(status_code=404, detail="User not found")

        user_model.stripe_account_id = stripe_account_id
        db.commit()
        db.refresh(user_model)

        logger.info(f"Stripe account linked for user {user_id}: {stripe_account_id}")
        return user_model_to_schema(user_model)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(
            f"Error updating stripe account for user {user_id}: {e}", exc_info=True
        )
        raise HTTPException(status_code=400, detail=f"Error updating user: {str(e)}")


async def update_stripe_status(
    user_id: str, onboarding_complete: bool, db: Session
) -> User:
    try:
        user_model = db.query(UserModel).filter(UserModel.id == user_id).first()
        if not user_model:
            raise HTTPException(status_code=404, detail="User not found")

        user_model.stripe_onboarding_complete = onboarding_complete
        db.commit()
        db.refresh(user_model)

        logger.info(
            f"Stripe onboarding status updated for user {user_id}: {onboarding_complete}"
        )
        return user_model_to_schema(user_model)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(
            f"Error updating stripe status for user {user_id}: {e}", exc_info=True
        )
        raise HTTPException(
            status_code=400, detail=f"Error updating stripe status: {str(e)}"
        )


def get_user_by_stripe_account(
    stripe_account_id: str, db: Session
) -> Optional[UserModel]:
    try:
        return (
            db.query(UserModel)
            .filter(UserModel.stripe_account_id == stripe_account_id)
            .first()
        )
    except Exception as e:
        logger.error(
            f"Error finding user by Stripe account {stripe_account_id}: {e}",
            exc_info=True,
        )
        return None
