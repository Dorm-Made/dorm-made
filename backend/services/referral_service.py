"""Referral system: name-based unique invite codes + referred-by tracking."""

from fastapi import HTTPException
from typing import Optional
from sqlalchemy.orm import Session
import logging
import re
import secrets
import string

from models.user import UserModel

logger = logging.getLogger(__name__)

_SUFFIX_ALPHABET = string.ascii_uppercase + string.digits


def _name_base(name: Optional[str]) -> str:
    """First name, letters only, uppercased, max 8 chars. Falls back to 'CHEF'."""
    first = (name or "").strip().split(" ")[0] if name else ""
    base = re.sub(r"[^A-Za-z]", "", first).upper()[:8]
    return base or "CHEF"


def generate_invite_code(name: Optional[str], db: Session) -> str:
    """Generate a unique, human-friendly invite code like FRANCO-7K2."""
    base = _name_base(name)
    for attempt in range(30):
        suffix_len = 3 if attempt < 20 else 5  # widen if name is very popular
        suffix = "".join(secrets.choice(_SUFFIX_ALPHABET) for _ in range(suffix_len))
        code = f"{base}-{suffix}"
        exists = (
            db.query(UserModel).filter(UserModel.invite_code == code).first()
        )
        if not exists:
            return code
    raise HTTPException(status_code=500, detail="Could not generate invite code")


def get_or_create_invite_code(user_id: str, db: Session) -> str:
    """Return the user's invite code, generating one if they don't have it yet
    (covers users created before the referral system existed)."""
    user_model = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user_model:
        raise HTTPException(status_code=404, detail="User not found")
    if user_model.invite_code:
        return user_model.invite_code
    try:
        code = generate_invite_code(user_model.name, db)
        user_model.invite_code = code
        db.commit()
        db.refresh(user_model)
        logger.info(f"Invite code generated for existing user {user_id}: {code}")
        return code
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error generating invite code for {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail="Error generating invite code")


def resolve_invite_code(code: str, db: Session) -> UserModel:
    """Find the referrer by invite code (case-insensitive). Raises 400 if invalid."""
    normalized = (code or "").strip().upper()
    if not normalized:
        raise HTTPException(status_code=400, detail="Invalid invite code")
    referrer = (
        db.query(UserModel).filter(UserModel.invite_code == normalized).first()
    )
    if not referrer:
        logger.warning(f"Signup attempted with unknown invite code: {normalized}")
        raise HTTPException(
            status_code=400,
            detail="Invite code not found — double-check it or leave it empty",
        )
    return referrer
