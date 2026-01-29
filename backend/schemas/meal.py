from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from datetime import datetime
from typing import Optional


class MealBase(BaseModel):
    title: str
    description: str
    ingredients: str


class MealCreate(MealBase):
    """Schema for creating a meal (used with FormData)"""

    pass


class MealUpdate(BaseModel):
    """Schema for updating a meal"""

    title: Optional[str] = None
    description: Optional[str] = None
    ingredients: Optional[str] = None


class Meal(MealBase):
    """Schema for returning meal data"""

    id: str
    user_id: str
    image_url: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=to_camel,
        populate_by_name=True,
    )
