from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from datetime import datetime
from typing import Optional


class EventBase(BaseModel):
    meal_id: str
    title: str
    description: str
    max_participants: int
    location: str
    price: int
    currency: str


class EventCreate(EventBase):
    event_date: str  # Accept as string from frontend


class EventUpdate(BaseModel):
    title: str
    description: str
    max_participants: int
    location: str
    event_date: str
    price: int


class Event(EventBase):
    id: str
    host_user_id: str
    meal_name: str
    current_participants: int
    event_date: datetime  # Store as datetime
    created_at: datetime
    image_url: Optional[str] = None

    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=to_camel,
        populate_by_name=True,
    )
