# Overnight run - July 19, 2026

All 25 GAPS.md items executed. Backend: 16 new tests all passing, every file
compiles. Frontend: TypeScript check and production build both pass. Nothing
was committed to git - review the diff and commit when you're happy.

## Decisions you made before sleeping (now implemented)

- Cancellation policy: foodies cancel FREE while "booked" (the payment hold
  is voided, never captured, so there are no Stripe fees for this - the 30
  cent worry only applies to captured charges). Once the host confirms, the
  seat is final - no foodie refunds. If the HOST cancels the event, every
  guest is refunded in full automatically (platform eats the Stripe
  processing fee on captured payments).
- $0 events: blocked. Price must be 50 cents to $500.
- Sessions: 7 days (was already in the code from a previous fix).

## Critical fixes (money/auth)

1. No more "fallback" secrets - the app refuses to boot if SECRET_KEY,
   SUPABASE_URL/KEY are missing, and Config.validate() now actually runs at
   startup.
2. Stripe webhook now returns HTTP 500 on processing failure so Stripe
   retries (before: a DB hiccup meant charged customer, no seat, no alert).
   Chef email moved after the commit so an email failure can't break a booking.
3. Overbooking/duplicates closed: unique constraint on (event_id,
   participant_id) via new migration e9d2c4a7b1f3 (dedupes existing rows
   first), capacity re-checked at webhook time (a payment for a seat that
   filled up meanwhile is auto-voided), and capacity now always COUNTs
   booked+confirmed rows instead of trusting the counter.
4. verify_token now rejects tokens without a userId; auth print() statements
   removed.
5. GET /users/{id} returns a PublicUser (no email, Stripe ids, invite codes).
   Full profile only via new GET /users/me. Participants endpoint now
   requires login.
6. payment_intent.canceled webhook handled - expired 7-day holds release the
   seat automatically.
7. accept_user_participation: commits the confirmation BEFORE capturing;
   if capture fails it reverts to booked (before: money could be captured
   with no committed seat). Also added confirmed_at column (same migration).

## Everything else

CORS from ALLOWED_ORIGINS env var; Sentry DSN moved to env with PII off;
docker-compose password now comes from .env; is_deleted defaults fixed;
price validated (422 on garbage); review models imported in migrations
env.py (autogenerate would have dropped the review tables); startup
migrations gated by RUN_MIGRATIONS_ON_STARTUP; 401 handler clears all auth
state and preserves destination (?next=); Explore feed is one query with
JOIN, paginated, upcoming-only by default; API fully camelCase (user/stripe
schemas + all frontend types/reads updated); Portuguese strings translated;
dead CRA files deleted (logged in DELETIONS.md); uploads validated by magic
bytes via one shared helper; GET /meals/ actually lists meals; "joined
events" excludes cancelled rows; signup returns a token and logs you
straight in (one round-trip less in the funnel); both env.example files
complete; both READMEs rewritten as short accurate pointers; passlib
removed; EventUpdate fields optional; refund/delete dialog copy matches the
new policy ("Cancel Event & Refund All").

## Before next deploy (2 steps)

1. Run migration e9d2c4a7b1f3 (happens automatically on boot unless you
   disabled RUN_MIGRATIONS_ON_STARTUP).
2. In the Stripe dashboard, add payment_intent.canceled to the webhook
   endpoint's subscribed events (checkout.session.completed alone is no
   longer enough).
3. Also set the new env vars in prod: ALLOWED_ORIGINS, SENTRY_DSN,
   DB_PASSWORD for compose. And rotate the old committed DB password if it
   was ever used outside local.

## Worth your review

- The 70%-refund window logic is GONE on purpose (replaced by your policy).
  The legal T&C text (frontend/src/content/legal.ts) already says "payments
  are non-refundable except as expressly stated" - consistent, but give the
  cancellation wording a read when you update the legal docs.
- Host-cancel now refunds everyone automatically from the delete-event
  dialog. The old "email support to delete" flow is gone.
- Tests live in backend/tests/ - run with `pytest` from backend/.
