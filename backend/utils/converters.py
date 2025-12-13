"""
Model to Schema converters
Eliminates code duplication by providing reusable conversion functions
"""

from typing import List
from models.user import UserModel
from models.event import EventModel
from models.event_participant import EventParticipantModel
from models.meal import MealModel
from schemas.user import User
from schemas.event import Event
from schemas.event_participant import EventParticipant
from schemas.meal import Meal


def user_model_to_schema(user_model: UserModel) -> User:
    """Convert UserModel to User schema"""
    return User(
        id=user_model.id,
        name=user_model.name,
        email=user_model.email,
        university=user_model.university,
        description=user_model.description,
        profile_picture=user_model.profile_picture,
        stripe_account_id=user_model.stripe_account_id,
        stripe_onboarding_complete=user_model.stripe_onboarding_complete,
        created_at=user_model.created_at,
    )


def event_model_to_schema(event_model: EventModel, meal_name: str = "") -> Event:
    """Convert EventModel to Event schema"""
    return Event(
        id=event_model.id,
        host_user_id=event_model.host_user_id,
        meal_id=event_model.meal_id,
        meal_name=meal_name,
        title=event_model.title,
        description=event_model.description,
        max_participants=event_model.max_participants,
        current_participants=event_model.current_participants,
        location=event_model.location,
        event_date=event_model.event_date,
        image_url=event_model.image_url,
        price=event_model.price,
        created_at=event_model.created_at,
    )


def event_participant_model_to_schema(
    participant_model: EventParticipantModel,
) -> EventParticipant:
    """Convert EventParticipantModel to EventParticipant schema"""
    return EventParticipant(
        id=participant_model.id,
        event_id=participant_model.event_id,
        participant_id=participant_model.participant_id,
        joined_at=participant_model.joined_at,
    )


def user_models_to_schemas(user_models: List[UserModel]) -> List[User]:
    """Convert a list of UserModels to User schemas"""
    return [user_model_to_schema(user) for user in user_models]


def event_models_to_schemas(event_models: List[EventModel]) -> List[Event]:
    """Convert a list of EventModels to Event schemas"""
    return [event_model_to_schema(event) for event in event_models]


def event_participant_models_to_schemas(
    participant_models: List[EventParticipantModel],
) -> List[EventParticipant]:
    """Convert a list of EventParticipantModels to EventParticipant schemas"""
    return [
        event_participant_model_to_schema(participant)
        for participant in participant_models
    ]


def meal_model_to_schema(meal_model: MealModel) -> Meal:
    """Convert MealModel to Meal schema"""
    return Meal(
        id=meal_model.id,
        user_id=meal_model.user_id,
        title=meal_model.title,
        description=meal_model.description,
        ingredients=meal_model.ingredients,
        image_url=meal_model.image_url,
        created_at=meal_model.created_at,
    )


def meal_models_to_schemas(meal_models: List[MealModel]) -> List[Meal]:
    """Convert a list of MealModels to Meal schemas"""
    return [meal_model_to_schema(meal) for meal in meal_models]
