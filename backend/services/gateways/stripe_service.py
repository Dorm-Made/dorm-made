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


async def create_account_link(
    stripe_account_id: str, user_id: str, link_type: str
) -> str:
    try:
        account_link = stripe.AccountLink.create(
            account=stripe_account_id,
            refresh_url=f"{config.FRONTEND_URL}/profile/{user_id}?stripe=refresh",
            return_url=f"{config.FRONTEND_URL}/profile/{user_id}?stripe=complete",
            type=link_type,
            collection_options={
                "fields": "eventually_due",
                "future_requirements": "include",
            },
        )
        return account_link.url
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe API error: {str(e)}")


def validate_webhook_signature(
    payload: bytes, signature: str, use_connect: bool = False
) -> Dict[str, Any]:
    try:
        event = stripe.Webhook.construct_event(
            payload,
            signature,
            (
                config.STRIPE_CONNECT_WEBHOOK_SECRET
                if use_connect
                else config.STRIPE_WEBHOOK_SECRET
            ),
        )
        return event
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")


async def create_checkout_session(
    event_id: str,
    event_title: str,
    event_description: str,
    price_cents: int,
    chef_stripe_account_id: str,
    foodie_id: str,
    chef_id: str,
) -> Dict[str, Any]:
    try:
        chef_amount = (price_cents * 84) // 100

        session = stripe.checkout.Session.create(
            ui_mode="embedded",
            mode="payment",
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "usd",
                        "product_data": {
                            "name": event_title,
                            "description": event_description,
                        },
                        "unit_amount": price_cents,
                    },
                    "quantity": 1,
                }
            ],
            payment_intent_data={
                "transfer_data": {
                    "destination": chef_stripe_account_id,
                    "amount": chef_amount,
                },
            },
            metadata={
                "event_id": event_id,
                "foodie_id": foodie_id,
                "chef_id": chef_id,
            },
            return_url=f"{config.FRONTEND_URL}/explore?session_id={{CHECKOUT_SESSION_ID}}",
        )

        return {"client_secret": session.client_secret}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe API error: {str(e)}")


async def retrieve_checkout_session(session_id: str) -> Dict[str, Any]:
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        return {
            "status": session.status,
            "payment_status": session.payment_status,
        }
    except stripe.error.InvalidRequestError:
        raise HTTPException(status_code=400, detail="Invalid session")
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe API error: {str(e)}")


async def retrieve_connected_account(stripe_account_id: str) -> Dict[str, Any]:
    return await get_stripe_account_status(stripe_account_id)


async def generate_login_link(stripe_account_id: str) -> str:
    login_link = await stripe.Account.create_login_link_async(stripe_account_id)
    return login_link.url
