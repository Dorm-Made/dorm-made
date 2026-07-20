"""Shared test fixtures.

Runs the service layer against an in-memory SQLite database with Stripe and
Supabase fully stubbed out - no network, no secrets.
"""

import os
import sys
import uuid
from datetime import datetime, timedelta, timezone

# Env must exist BEFORE importing app modules (they hard-fail on missing vars)
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("SUPABASE_URL", "https://test-project.supabase.co")
# Must LOOK like a JWT - the supabase client validates the format at creation
os.environ.setdefault(
    "SUPABASE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIn0."
    "dGVzdC1zaWduYXR1cmUtbm90LXJlYWw",
)
os.environ.setdefault("STRIPE_KEY", "sk_test_fake")
os.environ.setdefault("STRIPE_WEBHOOK_SECRET", "whsec_fake")
os.environ.setdefault("STRIPE_CONNECT_WEBHOOK_SECRET", "whsec_fake_connect")
os.environ.setdefault("RESEND_API_KEY", "re_fake")
# utils/database.py builds an engine from these at import time (no connection
# is made until first use, so fake values are fine for unit tests)
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASSWORD", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")
os.environ.setdefault("DB_NAME", "test")

# Tests never touch the network; strip proxy vars that can break httpx client
# construction (e.g. socks5h:// ALL_PROXY in CI/sandboxes)
for _proxy_var in (
    "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "FTP_PROXY",
    "http_proxy", "https_proxy", "all_proxy", "ftp_proxy",
):
    os.environ.pop(_proxy_var, None)

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import UUID


# Let the Postgres UUID column type work on SQLite
@compiles(UUID, "sqlite")
def _compile_uuid_sqlite(element, compiler, **kw):
    return "CHAR(36)"


from utils.database import Base
from models.user import UserModel
from models.meal import MealModel
from models.event import EventModel
from models.event_participant import EventParticipantModel
from models.event_review import EventReviewModel
from models.guest_review import GuestReviewModel


@pytest.fixture()
def db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine)
    session = TestSession()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


def make_user(db, name="Chef Carla", email=None, stripe_account="acct_123"):
    user = UserModel(
        id=str(uuid.uuid4()),
        name=name,
        email=email or f"{uuid.uuid4().hex[:8]}@test.edu",
        hashed_password="x",
        stripe_account_id=stripe_account,
    )
    db.add(user)
    db.commit()
    return user


def make_meal(db, user):
    meal = MealModel(
        id=str(uuid.uuid4()),
        user_id=user.id,
        title="Feijoada",
        description="Black bean stew",
        ingredients="beans, pork",
        is_deleted=False,
    )
    db.add(meal)
    db.commit()
    return meal


def make_event(db, host, meal, max_participants=2, price=2000, days_ahead=7):
    event = EventModel(
        id=str(uuid.uuid4()),
        host_user_id=host.id,
        meal_id=meal.id,
        title="Dorm Feijoada Night",
        description="Come hungry",
        max_participants=max_participants,
        current_participants=0,
        location="Dorm 4B",
        event_date=datetime.now(timezone.utc) + timedelta(days=days_ahead),
        price=price,
        currency="usd",
        is_deleted=False,
    )
    db.add(event)
    db.commit()
    return event


def make_participation(db, event, user, status="booked", payment_intent="pi_test_1"):
    p = EventParticipantModel(
        id=str(uuid.uuid4()),
        event_id=event.id,
        participant_id=user.id,
        status=status,
        payment_intent_id=payment_intent,
        joined_at=datetime.now(timezone.utc),
    )
    db.add(p)
    db.commit()
    return p


@pytest.fixture()
def stripe_calls(monkeypatch):
    """Stub every outbound Stripe call and record invocations."""
    calls = {"captured": [], "cancelled": [], "refunded": [], "accounts": []}

    async def fake_capture(pi):
        calls["captured"].append(pi)

    async def fake_cancel(pi):
        calls["cancelled"].append(pi)

    async def fake_refund(pi, amount_cents=None):
        calls["refunded"].append((pi, amount_cents))
        return {"id": "re_test", "status": "succeeded"}

    async def fake_account(acct):
        calls["accounts"].append(acct)
        return {"charges_enabled": True, "onboarding_complete": True, "payouts_enabled": True}

    import services.event_service as es
    import services.gateways.stripe_service as ss

    monkeypatch.setattr(es, "capture_payment_intent", fake_capture)
    monkeypatch.setattr(es, "cancel_payment_intent", fake_cancel)
    monkeypatch.setattr(es, "create_refund", fake_refund)
    monkeypatch.setattr(es, "retrieve_connected_account", fake_account)
    monkeypatch.setattr(ss, "capture_payment_intent", fake_capture)
    monkeypatch.setattr(ss, "cancel_payment_intent", fake_cancel)
    monkeypatch.setattr(ss, "create_refund", fake_refund)
    return calls


@pytest.fixture(autouse=True)
def no_emails(monkeypatch):
    import services.gateways.email_service as email_service

    async def fake_send(**kwargs):
        return None

    monkeypatch.setattr(
        email_service, "send_chef_notification", fake_send, raising=False
    )
