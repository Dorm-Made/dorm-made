from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class EventParticipantBase(BaseModel):
    event_id: str
    participant_id: str


class EventParticipantCreate(EventParticipantBase):
    payment_intent_id: Optional[str] = None
    status: str = "confirmed"


class EventParticipant(EventParticipantBase):
    id: str
    joined_at: datetime
    payment_intent_id: Optional[str] = None
    status: str

    model_config = ConfigDict(
        from_attributes=True, json_encoders={datetime: lambda v: v.isoformat()}
    )
