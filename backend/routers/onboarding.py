from fastapi import APIRouter, Depends
from typing import Annotated, Dict, List
from sqlalchemy.orm import Session

from schemas.user import InviteCodeResponse, TasteProfileResponse, TasteQuizSubmission
from utils.auth import get_current_user_id
from utils.database import get_db
from services import referral_service, taste_quiz_service

router = APIRouter(tags=["onboarding"])


# ---------------------------------------------------------------------------
# Referral system
# ---------------------------------------------------------------------------


@router.get("/users/me/invite-code", response_model=InviteCodeResponse)
async def get_my_invite_code_endpoint(
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    db: Session = Depends(get_db),
):
    """The authenticated user's invite code (generated on first request
    for accounts created before the referral system existed)."""
    code = referral_service.get_or_create_invite_code(current_user_id, db)
    return InviteCodeResponse(invite_code=code)


# ---------------------------------------------------------------------------
# Taste quiz (onboarding)
# ---------------------------------------------------------------------------


@router.get("/taste-quiz/questions")
async def get_taste_quiz_questions_endpoint() -> List[Dict]:
    """The onboarding quiz definition (8 image pairs)."""
    return taste_quiz_service.get_quiz_questions()


@router.post("/users/me/taste-quiz", response_model=TasteProfileResponse)
async def submit_taste_quiz_endpoint(
    submission: TasteQuizSubmission,
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    db: Session = Depends(get_db),
):
    """Submit quiz picks; computes + stores the taste profile and completes onboarding.
    Also used for retakes — simply overwrites the previous profile."""
    return await taste_quiz_service.submit_quiz(current_user_id, submission.picks, db)
