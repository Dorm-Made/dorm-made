from pydantic import BaseModel, ConfigDict
from datetime import datetime


class EventParticipantBase(BaseModel):
    event_id: str
    participant_id: str


class EventParticipantCreate(EventParticipantBase):
    pass


class EventParticipant(EventParticipantBase):
    id: str
    joined_at: datetime

    model_config = ConfigDict(
        from_attributes=True, json_encoders={datetime: lambda v: v.isoformat()}
    )
