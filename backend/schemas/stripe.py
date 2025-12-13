from pydantic import BaseModel
from typing import Optional


class StripeConnectResponse(BaseModel):
    onboarding_url: str
    account_id: str


class StripeStatusResponse(BaseModel):
    connected: bool
    charges_enabled: bool
    onboarding_complete: bool
    account_id: Optional[str] = None


class StripeLoginLinkResponse(BaseModel):
    account_url: str


class WebhookResponse(BaseModel):
    received: bool
    message: str
