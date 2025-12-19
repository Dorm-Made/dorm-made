from fastapi import HTTPException, UploadFile
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from datetime import datetime
import uuid
import logging

from models.meal import MealModel
from schemas.meal import Meal, MealCreate, MealUpdate
from utils.converters import meal_model_to_schema, meal_models_to_schemas
from utils.supabase import supabase
from .user_service import get_user

logger = logging.getLogger(__name__)


async def upload_meal_image(image: UploadFile) -> str:
    """Upload a meal image to Supabase Storage and return the public URL"""
    try:
        # Validate file type
        allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
        if image.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Please select a JPEG, PNG, or WebP image",
            )

        # Validate file size (5MB max)
        contents = await image.read()
        if len(contents) > 5 * 1024 * 1024:  # 5MB in bytes
            raise HTTPException(
                status_code=400, detail="File size must be less than 5MB"
            )

        # Generate unique filename
        file_extension = image.filename.split(".")[-1] if image.filename else "jpg"
        unique_filename = (
            f"{uuid.uuid4()}_{int(datetime.now().timestamp())}.{file_extension}"
        )

        # Upload to Supabase Storage (using meal-images bucket)
        result = supabase.storage.from_("meal-images").upload(
            unique_filename, contents, {"content-type": image.content_type}
        )

        # Get public URL
        public_url = supabase.storage.from_("meal-images").get_public_url(
            unique_filename
        )

        return public_url
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error uploading image: {str(e)}")


async def create_meal(
    name: str,
    description: str,
    ingredients: str,
    user_id: str,
    db: Session,
    image: Optional[UploadFile] = None,
) -> Meal:
    """Create a new meal with optional image upload"""
    # Verify user exists
    user = await get_user(user_id, db)
    if not user:
        logger.warning(f"Attempt to create meal with non-existent user: {user_id}")
        raise HTTPException(status_code=404, detail="User not found")

    try:
        # Upload image if provided
        image_url = None
        if image and image.filename:
            image_url = await upload_meal_image(image)

        # Create new meal model
        meal_model = MealModel(
            id=str(uuid.uuid4()),
            user_id=str(user_id),
            title=name,
            description=description,
            ingredients=ingredients,
            image_url=image_url,
            is_deleted=False,
        )

        db.add(meal_model)
        db.commit()
        db.refresh(meal_model)

        logger.info(f"Meal created successfully: {meal_model.id} by user {user_id}")
        return meal_model_to_schema(meal_model)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating meal for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Error creating meal: {str(e)}")


async def get_user_meals(user_id: str, db: Session) -> List[Meal]:
    """Get all meals created by a specific user (excluding deleted ones)"""
    try:
        meal_models = (
            db.query(MealModel)
            .filter(MealModel.user_id == user_id, MealModel.is_deleted == False)
            .order_by(MealModel.created_at.desc())
            .all()
        )
        return meal_models_to_schemas(meal_models)
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Error fetching user meals: {str(e)}"
        )


async def get_meal(meal_id: str, db: Session) -> Meal:
    """Get a specific meal by ID (excluding deleted ones)"""
    try:
        meal_model = (
            db.query(MealModel)
            .filter(MealModel.id == meal_id, MealModel.is_deleted == False)
            .first()
        )
        if not meal_model:
            raise HTTPException(status_code=404, detail="Meal not found")
        return meal_model_to_schema(meal_model)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching meal: {str(e)}")


def get_meal_name(meal_id: str, db: Session) -> str:
    """Get meal name by ID - returns empty string if not found (excluding deleted ones)"""
    try:
        meal_model = (
            db.query(MealModel)
            .filter(MealModel.id == meal_id, MealModel.is_deleted == False)
            .first()
        )
        return meal_model.title if meal_model else ""
    except Exception:
        return ""


async def update_meal(
    meal_id: str, meal_update: MealUpdate, user_id: str, db: Session
) -> Meal:
    """Update an existing meal (only the creator can update)"""
    from typing import Dict, Any

    # Get the meal
    meal_model = db.query(MealModel).filter(MealModel.id == meal_id).first()
    if not meal_model:
        raise HTTPException(status_code=404, detail="Meal not found")

    # Verify that the user is the creator
    if meal_model.user_id != user_id:
        logger.warning(
            f"User {user_id} attempted to update meal {meal_id} without permission"
        )
        raise HTTPException(
            status_code=403, detail="Only the meal creator can update the meal"
        )

    try:
        # Update only the fields that are provided
        if meal_update.title is not None:
            meal_model.title = meal_update.title

        if meal_update.description is not None:
            meal_model.description = meal_update.description

        if meal_update.ingredients is not None:
            meal_model.ingredients = meal_update.ingredients

        db.commit()
        db.refresh(meal_model)

        logger.info(f"Meal {meal_id} updated successfully by user {user_id}")
        return meal_model_to_schema(meal_model)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating meal {meal_id}: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Error updating meal: {str(e)}")


async def soft_delete_meal(meal_id: str, user_id: str, db: Session) -> Dict[str, str]:
    """Soft delete a meal (only the creator can delete)"""
    from typing import Dict

    # Get the meal (including deleted ones for this operation)
    meal_model = db.query(MealModel).filter(MealModel.id == meal_id).first()
    if not meal_model:
        raise HTTPException(status_code=404, detail="Meal not found")

    # Check if already deleted
    if meal_model.is_deleted:
        logger.warning(f"Attempt to delete already deleted meal: {meal_id}")
        raise HTTPException(status_code=400, detail="Meal is already deleted")

    # Verify that the user is the creator
    if meal_model.user_id != user_id:
        logger.warning(
            f"User {user_id} attempted to delete meal {meal_id} without permission"
        )
        raise HTTPException(
            status_code=403, detail="Only the meal creator can delete the meal"
        )

    try:
        # Soft delete: set is_deleted to True
        meal_model.is_deleted = True
        db.commit()
        logger.info(f"Meal {meal_id} soft deleted by user {user_id}")
        return {"message": "Meal successfully deleted", "meal_id": meal_id}
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting meal {meal_id}: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Error deleting meal: {str(e)}")
