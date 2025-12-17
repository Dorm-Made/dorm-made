from .user import UserModel
from .event import EventModel
from .event_participant import EventParticipantModel
from .meal import MealModel
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import MetaData

__all__ = ["UserModel", "EventModel", "EventParticipantModel", "MealModel"]

# Define the base and metadata once
convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_label)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_label)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

metadata = MetaData(naming_convention=convention)
Base = declarative_base(metadata=metadata)
