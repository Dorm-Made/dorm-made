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
    # All optional: this is a partial-update (PATCH-style) payload
    title: Optional[str] = None
    description: Optional[str] = None
    max_participants: Optional[int] = None
    location: Optional[str] = None
    event_date: Optional[str] = None
    price: Optional[int] = None

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


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
