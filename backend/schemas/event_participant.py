from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from datetime import datetime
from typing import Optional

CamelConfig = ConfigDict(
    from_attributes=True,
    alias_generator=to_camel,
    populate_by_name=True,
)


class EventParticipantBase(BaseModel):
    event_id: str
    participant_id: str

    model_config = CamelConfig


class EventParticipantCreate(EventParticipantBase):
    payment_intent_id: Optional[str] = None
    status: str = "confirmed"


class EventParticipant(EventParticipantBase):
    id: str
    joined_at: datetime
    payment_intent_id: Optional[str] = None
    status: str

    model_config = CamelConfig


class AcceptParticipationRequest(BaseModel):
    event_id: str
    user_id: str

    model_config = CamelConfig


class EventParticipantUser(BaseModel):
    id: str
    name: str
    profile_picture: Optional[str] = None
    status: str

    model_config = CamelConfig
