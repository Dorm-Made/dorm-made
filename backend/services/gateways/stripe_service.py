import stripe
from typing import Dict, Any
from fastapi import HTTPException
from utils.config import config

stripe.api_key = config.STRIPE_SECRET_KEY


async def create_stripe_connect_account(
    user_email: str, user_id: str
) -> Dict[str, Any]:
    try:
        account = stripe.Account.create(
            type="express",
            email=user_email,
            metadata={"dorm_made_user_id": user_id},
            capabilities={
                "card_payments": {"requested": True},
                "transfers": {"requested": True},
            },
        )

        account_link = stripe.AccountLink.create(
            account=account.id,
            refresh_url=f"{config.FRONTEND_URL}/profile/{user_id}?stripe=refresh",
            return_url=f"{config.FRONTEND_URL}/profile/{user_id}?stripe=complete",
            type="account_onboarding",
            collection_options={
                "fields": "eventually_due",
                "future_requirements": "include",
            },
        )

        return {"account_id": account.id, "onboarding_url": account_link.url}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe API error: {str(e)}")


async def get_stripe_account_status(stripe_account_id: str) -> Dict[str, Any]:
    try:
        account = stripe.Account.retrieve(stripe_account_id)

        return {
            "charges_enabled": account.charges_enabled,
            "onboarding_complete": account.details_submitted,
            "payouts_enabled": account.payouts_enabled,
        }
    except stripe.error.InvalidRequestError:
        raise HTTPException(status_code=404, detail="Stripe account not found")
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe API error: {str(e)}")


async def create_account_link(stripe_account_id: str, user_id: str) -> str:
    try:
        account_link = stripe.AccountLink.create(
            account=stripe_account_id,
            refresh_url=f"{config.FRONTEND_URL}/profile/{user_id}?stripe=refresh",
            return_url=f"{config.FRONTEND_URL}/profile/{user_id}?stripe=complete",
            type="account_onboarding",
            collection_options={
                "fields": "eventually_due",
                "future_requirements": "include",
            },
        )
        return account_link.url
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe API error: {str(e)}")


def validate_webhook_signature(payload: bytes, signature: str) -> Dict[str, Any]:
    try:
        event = stripe.Webhook.construct_event(
            payload, signature, config.STRIPE_WEBHOOK_SECRET
        )
        return event
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
