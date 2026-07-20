from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from typing import Optional

CamelConfig = ConfigDict(
    from_attributes=True,
    alias_generator=to_camel,
    populate_by_name=True,
)


class StripeConnectResponse(BaseModel):
    onboarding_url: str
    account_id: str

    model_config = CamelConfig


class StripeStatusResponse(BaseModel):
    connected: bool
    charges_enabled: bool
    onboarding_complete: bool
    account_id: Optional[str] = None

    model_config = CamelConfig


class StripeLoginLinkResponse(BaseModel):
    account_url: str

    model_config = CamelConfig


class WebhookResponse(BaseModel):
    received: bool
    message: str

    model_config = CamelConfig
