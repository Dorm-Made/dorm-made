from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any
import uuid

from utils.database import get_db
from services.gateways import stripe_service
from services import user_service
from schemas.stripe import WebhookResponse
from models.event import EventModel
from models.event_participant import EventParticipantModel

router = APIRouter(prefix="/webhooks/stripe-connect", tags=["stripe_connect_webhook"])


async def handle_account_updated(event: Dict[str, Any], db: Session) -> WebhookResponse:
    """Handle Stripe account.updated event"""
    account = event["data"]["object"]
    stripe_account_id = account["id"]

    user_model = user_service.get_user_by_stripe_account(stripe_account_id, db)

    if not user_model:
        return WebhookResponse(received=True, message="Account not found in system")

    await user_service.update_stripe_status(
        user_model.id, account.get("details_submitted", False), db
    )

    return WebhookResponse(
        received=True, message=f"Updated Stripe status for user {user_model.id}"
    )


@router.post("", response_model=WebhookResponse)
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Main webhook endpoint that routes events to appropriate handlers"""
    payload = await request.body()
    signature = request.headers.get("stripe-signature")

    if not signature:
        raise HTTPException(status_code=400, detail="Missing stripe-signature header")

    event = stripe_service.validate_webhook_signature(
        payload, signature, use_connect=True
    )

    event_type = event["type"]

    if event_type == "account.updated":
        return await handle_account_updated(event, db)

    return WebhookResponse(received=True, message=f"Received event type: {event_type}")
