from fastapi import APIRouter, Depends, File, UploadFile, Form
from typing import List, Annotated, Optional
from sqlalchemy.orm import Session

from schemas.meal import Meal, MealUpdate
from utils.auth import get_current_user_id
from utils.database import get_db
from services import meal_service

router = APIRouter(prefix="/meals", tags=["meals"])


@router.get("/me", response_model=List[Meal], response_model_by_alias=True)
async def get_my_meals_endpoint(
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    db: Session = Depends(get_db),
):
    """Get all meals created by the authenticated user"""
    return await meal_service.get_user_meals(current_user_id, db)


@router.post("/", response_model=Meal, status_code=201, response_model_by_alias=True)
async def create_meal_endpoint(
    name: Annotated[str, Form()],
    description: Annotated[str, Form()],
    ingredients: Annotated[str, Form()],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    db: Session = Depends(get_db),
    image: Annotated[Optional[UploadFile], File()] = None,
):
    """Create a new meal with optional image upload"""
    return await meal_service.create_meal(
        name=name,
        description=description,
        ingredients=ingredients,
        user_id=current_user_id,
        db=db,
        image=image,
    )


@router.get("/", response_model=List[Meal], response_model_by_alias=True)
async def list_meals_endpoint(
    user_id: Optional[str] = None, db: Session = Depends(get_db)
):
    """List all meals, optionally filtered by user_id"""
    if user_id:
        return await meal_service.get_user_meals(user_id, db)
    # If you have a list_all_meals service method, use it here
    # For now, returning empty list or you can implement list_all
    return []


@router.get("/{meal_id}", response_model=Meal, response_model_by_alias=True)
async def get_meal_endpoint(meal_id: str, db: Session = Depends(get_db)):
    """Get details of a specific meal"""
    return await meal_service.get_meal(meal_id, db)


@router.put("/{meal_id}", response_model=Meal, response_model_by_alias=True)
async def update_meal_endpoint(
    meal_id: str,
    meal_update: MealUpdate,
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    db: Session = Depends(get_db),
):
    """Update an existing meal (only the creator can update)"""
    return await meal_service.update_meal(meal_id, meal_update, current_user_id, db)


@router.delete("/{meal_id}")
async def delete_meal_endpoint(
    meal_id: str,
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    db: Session = Depends(get_db),
):
    """Soft delete a meal (only the creator can delete)"""
    return await meal_service.soft_delete_meal(meal_id, current_user_id, db)
