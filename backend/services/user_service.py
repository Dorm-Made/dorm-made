from fastapi import HTTPException, UploadFile
from typing import Optional, List
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from models.user import UserModel
from schemas.user import User, UserCreate, UserLogin, UserUpdate, LoginResponse
from utils.password import hash_password, verify_password, create_access_token
from utils.converters import user_model_to_schema, user_models_to_schemas
from utils.supabase import supabase


async def get_user(user_id: str, db: Session) -> Optional[User]:
    """Get user by ID from database"""
    try:
        user_model = db.query(UserModel).filter(UserModel.id == user_id).first()
        if user_model:
            return user_model_to_schema(user_model)
        return None
    except Exception as e:
        print(f"Error getting user: {e}")
        import traceback

        traceback.print_exc()
        return None


async def create_user(user: UserCreate, db: Session) -> User:
    """Create a new user"""
    try:
        # Check if user with email already exists
        existing_user = (
            db.query(UserModel).filter(UserModel.email == user.email).first()
        )
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Hash password
        hashed_password = hash_password(user.password)

        # Create new user model
        user_model = UserModel(
            id=str(uuid.uuid4()),
            name=user.name,
            email=user.email,
            hashed_password=hashed_password,
            university=user.university,
            description=user.description,
        )

        db.add(user_model)
        db.commit()
        db.refresh(user_model)

        return user_model_to_schema(user_model)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(str(e))
        raise HTTPException(status_code=400, detail=f"Error creating user: {str(e)}")


def get_user_by_email(email: str, db: Session) -> Optional[UserModel]:
    """Get user by email from database - returns model for auth purposes"""
    try:
        return db.query(UserModel).filter(UserModel.email == email).first()
    except Exception as e:
        print(f"Error getting user by email: {e}")
        return None


def get_user_by_id(user_id: str, db: Session) -> Optional[UserModel]:
    """Get user by ID from database - returns model for auth purposes"""
    try:
        return db.query(UserModel).filter(UserModel.id == user_id).first()
    except Exception as e:
        print(f"Error getting user by ID: {e}")
        return None


async def authenticate_user(login_data: UserLogin, db: Session) -> LoginResponse:
    """Authenticate user and return JWT token"""
    user_model = get_user_by_email(login_data.email, db)
    if not user_model:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(login_data.password, user_model.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    print(f"Creating token with user ID: {user_model.id} (type: {type(user_model.id)})")
    access_token = create_access_token(data={"userId": user_model.id})

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

        return user_model_to_schema(user_model)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error updating user: {e}")
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Error updating user: {str(e)}")


async def search_users(query: str, db: Session, limit: int = 10) -> List[User]:
    """Search users by name"""
    try:
        if not query or len(query.strip()) < 2:
            return []

        # Use ilike for case-insensitive search
        user_models = (
            db.query(UserModel)
            .filter(UserModel.name.ilike(f"%{query.strip()}%"))
            .limit(limit)
            .all()
        )

        return user_models_to_schemas(user_models)
    except Exception as e:
        print(f"Error searching users: {e}")
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Error searching users: {str(e)}")


async def upload_profile_picture(user_id: str, image: UploadFile, db: Session) -> User:
    """Upload a profile picture to Supabase Storage and update user profile"""
    try:
        # Validate file type (only JPEG and PNG)
        allowed_types = ["image/jpeg", "image/jpg", "image/png"]
        if image.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail="Tipo de arquivo inválido. Apenas imagens JPEG e PNG são permitidas.",
            )

        # Validate file size (5MB max)
        contents = await image.read()
        if len(contents) > 5 * 1024 * 1024:  # 5MB in bytes
            raise HTTPException(
                status_code=400, detail="Tamanho do arquivo excede o limite de 5MB."
            )

        # Get current user to check for existing profile picture
        current_user = await get_user(user_id, db)
        if not current_user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

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
                print(f"Error deleting old profile picture: {e}")
                # Continue with upload even if deletion fails

        # Generate unique filename
        file_extension = image.filename.split(".")[-1] if image.filename else "jpg"
        unique_filename = f"{user_id}_{uuid.uuid4()}_{int(datetime.now().timestamp())}.{file_extension}"

        # Upload to Supabase Storage
        result = supabase.storage.from_("profile-pictures").upload(
            unique_filename, contents, {"content-type": image.content_type}
        )

        # Get public URL
        public_url = supabase.storage.from_("profile-pictures").get_public_url(
            unique_filename
        )

        # Update user profile with new picture URL
        updated_user = await update_user(
            user_id, UserUpdate(profile_picture=public_url), db
        )

        return updated_user
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error uploading profile picture: {e}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=400, detail=f"Erro ao fazer upload da foto: {str(e)}"
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

        return user_model_to_schema(user_model)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
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

        return user_model_to_schema(user_model)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=400, detail=f"Error updating stripe status: {str(e)}"
        )


def get_user_by_stripe_account(stripe_account_id: str, db: Session) -> Optional[UserModel]:
    try:
        return (
            db.query(UserModel)
            .filter(UserModel.stripe_account_id == stripe_account_id)
            .first()
        )
    except Exception as e:
        print(f"Error finding user by Stripe account: {e}")
        return None
