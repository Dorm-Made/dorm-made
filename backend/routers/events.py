from fastapi import APIRouter, Depends, File, UploadFile, Form
from typing import List, Annotated, Optional
from sqlalchemy.orm import Session
from pydantic import BaseModel

from schemas.event import Event, EventCreate, EventUpdate
from schemas.event_participant import EventParticipant
from utils.auth import get_current_user_id
from utils.database import get_db
from services import event_service

router = APIRouter(prefix="/events", tags=["events"])

class JoinEventRequest(BaseModel):
    event_id: str

@router.get("/me", response_model=List[Event], response_model_by_alias=True)
async def get_my_events_endpoint(
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    db: Session = Depends(get_db)
):
    """Get all events created by the authenticated user"""
    return await event_service.get_user_events(current_user_id, db)

@router.get("/me/joined", response_model=List[Event], response_model_by_alias=True)
async def get_my_joined_events_endpoint(
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    db: Session = Depends(get_db)
):
    """Get all events that the authenticated user has joined"""
    return await event_service.get_user_joined_events(current_user_id, db)

@router.post("/", response_model=Event, response_model_by_alias=True)
async def create_event_endpoint(
    title: Annotated[str, Form()],
    description: Annotated[str, Form()],
    max_participants: Annotated[int, Form()],
    location: Annotated[str, Form()],
    event_date: Annotated[str, Form()],
    meal_id: Annotated[str, Form()],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    db: Session = Depends(get_db),
    price: Annotated[Optional[str], Form()] = None,
    image: Annotated[Optional[UploadFile], File()] = None
):
    """Create a new culinary event with optional image upload"""
    # Parse price: convert to int (cents) if provided and not empty, otherwise None
    price_int = None
    if price and str(price).strip():
        try:
            price_int = int(price)
        except (ValueError, TypeError):
            price_int = None

    # Construct EventCreate object from form data
    event_data = EventCreate(
        meal_id=meal_id,
        title=title,
        description=description,
        max_participants=max_participants,
        location=location,
        event_date=event_date,
        price=price_int
    )

    return await event_service.create_event(event_data, current_user_id, db, image)

@router.post("/join/")
async def join_event_endpoint(
    join_request: JoinEventRequest,
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    db: Session = Depends(get_db)
):
    """Join an existing event"""
    # Create the full request with authenticated user ID
    full_request = {
        "user_id": current_user_id,
        "event_id": join_request.event_id
    }
    return await event_service.join_event(full_request, db)

@router.get("/", response_model=List[Event], response_model_by_alias=True)
async def list_events_endpoint(
    user_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all events, optionally filtered by user_id (for public profiles)"""
    if user_id:
        return await event_service.get_user_events(user_id, db)
    return await event_service.list_events(db)

@router.get("/{event_id}", response_model=Event, response_model_by_alias=True)
async def get_event_details_endpoint(event_id: str, db: Session = Depends(get_db)):
    """Get details of a specific event"""
    return await event_service.get_event_details(event_id, db)

@router.get("/{event_id}/participants", response_model=List[EventParticipant])
async def get_event_participants_endpoint(event_id: str, db: Session = Depends(get_db)):
    """Get all participants for a specific event"""
    return await event_service.get_event_participants(event_id, db)

@router.put("/{event_id}", response_model=Event, response_model_by_alias=True)
async def update_event_endpoint(
    event_id: str,
    event_update: EventUpdate,
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    db: Session = Depends(get_db)
):
    """Update an existing event (only the host can update)"""
    return await event_service.update_event(event_id, event_update, current_user_id, db)

@router.delete("/{event_id}")
async def delete_event_endpoint(
    event_id: str,
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    db: Session = Depends(get_db)
):
    """Soft delete an event (only the host can delete)"""
    return await event_service.soft_delete_event(event_id, current_user_id, db)