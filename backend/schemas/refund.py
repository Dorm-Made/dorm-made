from pydantic import BaseModel


class RefundResponse(BaseModel):
    refund_amount_cents: int
    message: str