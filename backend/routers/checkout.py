from fastapi import APIRouter, Query, HTTPException
from schemas.checkout import SessionStatusResponse
from services.gateways.stripe_service import retrieve_checkout_session

router = APIRouter(prefix="/checkout", tags=["checkout"])


@router.get(
    "/session-status",
    response_model=SessionStatusResponse,
    response_model_by_alias=True
)
async def get_session_status_endpoint(
    session_id: str = Query(..., description="Stripe checkout session ID")
):
    """Retrieve checkout session status after payment"""
    try:
        result = await retrieve_checkout_session(session_id)
        return SessionStatusResponse(
            status=result["status"],
            payment_status=result["payment_status"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error retrieving session status: {str(e)}"
        )