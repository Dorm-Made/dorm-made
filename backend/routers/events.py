from fastapi import APIRouter, Depends, File, UploadFile, Form, HTTPException
from typing import List, Annotated, Optional, cast
from sqlalchemy.orm import Session

from schemas.event import Event, EventCreate, EventUpdate
from schemas.event_participant import (
    EventParticipant,
    AcceptParticipationRequest,
    EventParticipantUser,
)
from schemas.checkout import CreateCheckoutSessionResponse
from schemas.refund import RefundResponse
from utils.auth import get_current_user_id
from utils.database import get_db
from services import event_service
from services.gateways import stripe_service

router = APIRouter(prefix="/events", tags=["events"])


@router.get("/me", response_model=List[Event], response_model_by_alias=True)
async def get_my_events_endpoint(
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    db: Session = Depends(get_db),
):
    """Get all events created by the authenticated user"""
    return await event_service.get_user_events(current_user_id, db)


@router.get("/me/joined", response_model=List[Event], response_model_by_alias=True)
async def get_my_joined_events_endpoint(
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    db: Session = Depends(get_db),
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
    currency: Annotated[str, Form()],
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    db: Session = Depends(get_db),
    price: Annotated[Optional[str], Form()] = None,
    image: Annotated[Optional[UploadFile], File()] = None,
):
    """Create a new culinary event with optional image upload"""
    # Price is required, in cents. Free ($0) events are not supported:
    # every booking goes through Stripe, which needs at least ~50 cents.
    MIN_PRICE_CENTS = 50
    MAX_PRICE_CENTS = 50000  # $500 - sanity cap for a dorm dinner

    if price is None or not str(price).strip():
        raise HTTPException(status_code=422, detail="Price is required")
    try:
        price_int = int(str(price).strip())
    except (ValueError, TypeError):
        raise HTTPException(status_code=422, detail="Price must be a whole number of cents")

    if price_int < MIN_PRICE_CENTS:
        raise HTTPException(
            status_code=422,
            detail=f"Price must be at least {MIN_PRICE_CENTS} cents ($0.50)",
        )
    if price_int > MAX_PRICE_CENTS:
        raise HTTPException(
            status_code=422,
            detail=f"Price cannot exceed {MAX_PRICE_CENTS} cents ($500)",
        )

    # Construct EventCreate object from form data
    event_data = EventCreate(
        meal_id=meal_id,
        title=title,
        description=description,
        max_participants=max_participants,
        location=location,
        event_date=event_date,
        price=price_int,
        currency=currency,
    )

    return await event_service.create_event(event_data, current_user_id, db, image)


@router.post(
    "/{event_id}/create-checkout-session",
    response_model=CreateCheckoutSessionResponse,
    response_model_by_alias=True,
)
async def create_checkout_session_endpoint(
    event_id: str,
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    db: Session = Depends(get_db),
):
    """Create a Stripe Embedded Checkout Session for event payment"""
    try:
        event, chef = await event_service.validate_checkout_requirements(
            event_id, current_user_id, db
        )

        event_description = (
            f"Event on {event.event_date.strftime('%B %d, %Y at %I:%M %p')}"
        )

        # validate_checkout_requirements ensures stripe_account_id is not None
        result = await stripe_service.create_checkout_session(
            event_id=event_id,
            event_title=event.title,
            event_description=event_description,
            price_cents=event.price,
            chef_stripe_account_id=cast(str, chef.stripe_account_id),
            foodie_id=current_user_id,
            chef_id=chef.id,
            currency=event.currency,
        )

        return CreateCheckoutSessionResponse(client_secret=result["client_secret"])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Error creating checkout session: {str(e)}"
        )


@router.get("/", response_model=List[Event], response_model_by_alias=True)
async def list_events_endpoint(
    user_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    include_past: bool = False,
    db: Session = Depends(get_db),
):
    """List events (upcoming only by default, paginated), optionally filtered by user_id"""
    if user_id:
        return await event_service.get_user_events(user_id, db)
    return await event_service.list_events(
        db, limit=limit, offset=offset, include_past=include_past
    )


@router.get("/{event_id}", response_model=Event, response_model_by_alias=True)
async def get_event_details_endpoint(event_id: str, db: Session = Depends(get_db)):
    """Get details of a specific event"""
    return await event_service.get_event_details(event_id, db)


@router.get("/{event_id}/participants", response_model=List[EventParticipantUser])
async def get_event_participants_endpoint(
    event_id: str,
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    db: Session = Depends(get_db),
):
    """Get all participants for a specific event (authenticated users only)"""
    return await event_service.get_event_participants(event_id, db)


@router.put("/{event_id}", response_model=Event, response_model_by_alias=True)
async def update_event_endpoint(
    event_id: str,
    event_update: EventUpdate,
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    db: Session = Depends(get_db),
):
    """Update an existing event (only the host can update)"""
    return await event_service.update_event(event_id, event_update, current_user_id, db)


@router.delete("/{event_id}")
async def delete_event_endpoint(
    event_id: str,
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    db: Session = Depends(get_db),
):
    """Soft delete an event (only the host can delete)"""
    return await event_service.soft_delete_event(event_id, current_user_id, db)


@router.post("/{event_id}/refund", response_model=RefundResponse)
async def refund_event_endpoint(
    event_id: str,
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    db: Session = Depends(get_db),
):
    """Process a refund for the authenticated user's event participation"""
    return await event_service.refund_event_participation(event_id, current_user_id, db)


@router.post("/accept-participation")
async def accept_participation_endpoint(
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    request: AcceptParticipationRequest,
    db: Session = Depends(get_db),
):
    return await event_service.accept_user_participation(
        current_user_id, request.user_id, request.event_id, db
    )
