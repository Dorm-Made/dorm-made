"""Tests for the money paths: checkout validation, webhook booking,
cancellation/refund policy, and host accept (capture)."""

import pytest
from fastapi import HTTPException

from tests.conftest import make_user, make_meal, make_event, make_participation

import services.event_service as event_service
from routers.gateways.stripe.webhook import (
    handle_checkout_session_completed,
    handle_payment_intent_canceled,
)
from models.event_participant import EventParticipantModel


def checkout_event(payment_intent="pi_new", event_id="", foodie_id=""):
    return {
        "data": {
            "object": {
                "metadata": {"event_id": event_id, "foodie_id": foodie_id},
                "payment_intent": payment_intent,
            }
        }
    }


# ---------- validate_checkout_requirements ----------


async def test_checkout_rejects_host_joining_own_event(db, stripe_calls):
    host = make_user(db)
    event = make_event(db, host, make_meal(db, host))
    with pytest.raises(HTTPException) as e:
        await event_service.validate_checkout_requirements(event.id, host.id, db)
    assert e.value.status_code == 400


async def test_checkout_rejects_double_join_while_booked(db, stripe_calls):
    host, foodie = make_user(db), make_user(db, name="Foodie")
    event = make_event(db, host, make_meal(db, host))
    make_participation(db, event, foodie, status="booked")
    with pytest.raises(HTTPException) as e:
        await event_service.validate_checkout_requirements(event.id, foodie.id, db)
    assert "Already joined" in e.value.detail


async def test_checkout_counts_booked_seats_toward_capacity(db, stripe_calls):
    host = make_user(db)
    event = make_event(db, host, make_meal(db, host), max_participants=1)
    make_participation(db, event, make_user(db, name="F1"), status="booked")
    with pytest.raises(HTTPException) as e:
        await event_service.validate_checkout_requirements(
            event.id, make_user(db, name="F2").id, db
        )
    assert "full" in e.value.detail.lower()


async def test_checkout_rejects_past_event(db, stripe_calls):
    host, foodie = make_user(db), make_user(db, name="Foodie")
    event = make_event(db, host, make_meal(db, host), days_ahead=-1)
    with pytest.raises(HTTPException) as e:
        await event_service.validate_checkout_requirements(event.id, foodie.id, db)
    assert "past" in e.value.detail.lower()


# ---------- webhook: checkout.session.completed ----------


async def test_webhook_creates_booked_participation(db, stripe_calls):
    host, foodie = make_user(db), make_user(db, name="Foodie")
    event = make_event(db, host, make_meal(db, host))
    resp = await handle_checkout_session_completed(
        checkout_event("pi_1", event.id, foodie.id), db
    )
    assert resp.received
    row = db.query(EventParticipantModel).one()
    assert row.status == "booked"
    assert row.payment_intent_id == "pi_1"
    db.refresh(event)
    assert event.current_participants == 1


async def test_webhook_duplicate_delivery_is_idempotent(db, stripe_calls):
    host, foodie = make_user(db), make_user(db, name="Foodie")
    event = make_event(db, host, make_meal(db, host))
    evt = checkout_event("pi_1", event.id, foodie.id)
    await handle_checkout_session_completed(evt, db)
    resp2 = await handle_checkout_session_completed(evt, db)
    assert "already processed" in resp2.message.lower()
    assert db.query(EventParticipantModel).count() == 1
    db.refresh(event)
    assert event.current_participants == 1


async def test_webhook_full_event_cancels_payment(db, stripe_calls):
    host = make_user(db)
    event = make_event(db, host, make_meal(db, host), max_participants=1)
    make_participation(db, event, make_user(db, name="F1"), status="confirmed")
    late_foodie = make_user(db, name="F2")
    resp = await handle_checkout_session_completed(
        checkout_event("pi_late", event.id, late_foodie.id), db
    )
    assert "full" in resp.message.lower()
    assert stripe_calls["cancelled"] == ["pi_late"]
    # No second participation row was created
    assert db.query(EventParticipantModel).count() == 1


async def test_webhook_missing_event_raises_500(db, stripe_calls):
    foodie = make_user(db)
    with pytest.raises(HTTPException) as e:
        await handle_checkout_session_completed(
            checkout_event("pi_x", "00000000-0000-0000-0000-000000000000", foodie.id),
            db,
        )
    assert e.value.status_code == 500


async def test_webhook_payment_canceled_releases_booked_seat(db, stripe_calls):
    host, foodie = make_user(db), make_user(db, name="Foodie")
    event = make_event(db, host, make_meal(db, host))
    make_participation(db, event, foodie, status="booked", payment_intent="pi_exp")
    event.current_participants = 1
    db.commit()
    await handle_payment_intent_canceled(
        {"data": {"object": {"id": "pi_exp"}}}, db
    )
    row = db.query(EventParticipantModel).one()
    assert row.status == "cancelled"
    db.refresh(event)
    assert event.current_participants == 0


# ---------- cancellation / refund policy ----------


async def test_foodie_can_cancel_free_while_booked(db, stripe_calls):
    host, foodie = make_user(db), make_user(db, name="Foodie")
    event = make_event(db, host, make_meal(db, host))
    make_participation(db, event, foodie, status="booked", payment_intent="pi_b")
    event.current_participants = 1
    db.commit()

    resp = await event_service.refund_event_participation(event.id, foodie.id, db)
    assert "cancelled" in resp.message.lower()
    assert stripe_calls["cancelled"] == ["pi_b"]  # voided, not refunded
    assert stripe_calls["refunded"] == []
    row = db.query(EventParticipantModel).one()
    assert row.status == "cancelled"
    db.refresh(event)
    assert event.current_participants == 0


async def test_foodie_cannot_refund_after_confirmation(db, stripe_calls):
    host, foodie = make_user(db), make_user(db, name="Foodie")
    event = make_event(db, host, make_meal(db, host))
    make_participation(db, event, foodie, status="confirmed", payment_intent="pi_c")
    with pytest.raises(HTTPException) as e:
        await event_service.refund_event_participation(event.id, foodie.id, db)
    assert e.value.status_code == 400
    assert "final" in e.value.detail.lower()
    assert stripe_calls["refunded"] == []
    assert stripe_calls["cancelled"] == []


async def test_host_cancel_refunds_confirmed_and_voids_booked(db, stripe_calls):
    host = make_user(db)
    event = make_event(db, host, make_meal(db, host), max_participants=3)
    f1, f2 = make_user(db, name="F1"), make_user(db, name="F2")
    make_participation(db, event, f1, status="confirmed", payment_intent="pi_conf")
    make_participation(db, event, f2, status="booked", payment_intent="pi_book")

    result = await event_service.soft_delete_event(event.id, host.id, db)
    assert "deleted" in result["message"].lower()
    assert ("pi_conf", None) in stripe_calls["refunded"]  # full refund
    assert "pi_book" in stripe_calls["cancelled"]  # voided hold
    statuses = {p.status for p in db.query(EventParticipantModel).all()}
    assert statuses == {"cancelled"}
    db.refresh(event)
    assert event.is_deleted is True


async def test_only_host_can_delete_event(db, stripe_calls):
    host, other = make_user(db), make_user(db, name="Other")
    event = make_event(db, host, make_meal(db, host))
    with pytest.raises(HTTPException) as e:
        await event_service.soft_delete_event(event.id, other.id, db)
    assert e.value.status_code == 403


# ---------- accept participation (capture) ----------


async def test_accept_confirms_and_captures(db, stripe_calls):
    host, foodie = make_user(db), make_user(db, name="Foodie")
    event = make_event(db, host, make_meal(db, host))
    make_participation(db, event, foodie, status="booked", payment_intent="pi_a")

    await event_service.accept_user_participation(host.id, foodie.id, event.id, db)
    row = db.query(EventParticipantModel).one()
    assert row.status == "confirmed"
    assert row.confirmed_at is not None
    assert stripe_calls["captured"] == ["pi_a"]


async def test_accept_reverts_to_booked_if_capture_fails(db, stripe_calls, monkeypatch):
    host, foodie = make_user(db), make_user(db, name="Foodie")
    event = make_event(db, host, make_meal(db, host))
    make_participation(db, event, foodie, status="booked", payment_intent="pi_fail")

    async def boom(pi):
        raise RuntimeError("stripe down")

    monkeypatch.setattr(event_service, "capture_payment_intent", boom)
    with pytest.raises(HTTPException) as e:
        await event_service.accept_user_participation(host.id, foodie.id, event.id, db)
    assert e.value.status_code == 500
    row = db.query(EventParticipantModel).one()
    assert row.status == "booked"  # reverted, money never moved


async def test_accept_rejected_for_non_host(db, stripe_calls):
    host, foodie = make_user(db), make_user(db, name="Foodie")
    event = make_event(db, host, make_meal(db, host))
    make_participation(db, event, foodie, status="booked")
    with pytest.raises(HTTPException) as e:
        await event_service.accept_user_participation(
            foodie.id, foodie.id, event.id, db
        )
    assert e.value.status_code == 403
