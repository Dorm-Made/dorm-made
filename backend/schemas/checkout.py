from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CreateCheckoutSessionResponse(BaseModel):
    client_secret: str

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )


class SessionStatusResponse(BaseModel):
    status: str
    payment_status: str

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )