# GAPS.md - Honest audit

Ordered by severity, most important first. Each item: what, where, why it matters, and a fix scoped small enough to execute as a single task. "CRITICAL" items involve money, auth, or data loss.

---

## 1. CRITICAL - JWT secret falls back to the string "fallback"

**Where:** `backend/utils/password.py` line 11: `SECRET_KEY = os.getenv("SECRET_KEY", "fallback")`. Same pattern in `backend/utils/supabase.py` (URL and key default to "fallback").

**Why it matters:** If `SECRET_KEY` is ever unset in a deployment, every JWT is signed with a publicly-visible constant and anyone can mint a valid token for any user id. This is silent - the app boots and works normally.

**Fix:** Remove the defaults; raise `ValueError` at import if `SECRET_KEY`, `SUPABASE_URL`, or `SUPABASE_KEY` is missing (mirror the pattern already in `utils/config.py Config.validate`, and actually call `Config.validate()` at startup in `main.py` lifespan - today it is defined but never called).

## 2. CRITICAL - Stripe webhook failures return HTTP 200, so payments can vanish

**Where:** `backend/routers/gateways/stripe/webhook.py`, `handle_checkout_session_completed` catch-all returns `WebhookResponse(received=True, message="Error processing webhook: ...")`.

**Why it matters:** The webhook is the ONLY code path that creates a participation row after a foodie pays. If the DB write fails (deadlock, transient outage, bad data), Stripe receives a 200 and never retries. Result: charged customer, no seat, no record, no alert. This is the single most dangerous behavior in the codebase.

**Fix:** In the exception branch, `raise HTTPException(status_code=500, ...)` instead of returning 200 so Stripe retries. Also move `email_service.send_chef_notification` into its own try/except AFTER the commit so a Resend failure can't be confused with a booking failure.

## 3. CRITICAL - Webhook has no idempotency or uniqueness guarantee; overbooking race

**Where:** `webhook.py` + `models/event_participant.py` (no unique constraint on `(event_id, participant_id)`); capacity is checked only in `validate_checkout_requirements` at session-creation time, and it counts `confirmed` rows while the webhook increments `current_participants` on `booked`.

**Why it matters:** (a) Stripe retries or duplicate events can insert two participant rows for the same user. (b) Two foodies can pass the capacity check simultaneously and both complete checkout for the last seat - the webhook increments blindly. (c) The counter and the "count confirmed rows" definition disagree, so `current_participants` drifts from reality.

**Fix (three small tasks):** (1) migration adding `UniqueConstraint("event_id", "participant_id")` to `events_participants` and handle IntegrityError in the webhook as "already processed"; (2) in the webhook, re-check confirmed+booked count against `max_participants` before insert and auto-refund/cancel if full; (3) pick one source of truth - drop `current_participants` reads in favor of a COUNT, or define exactly which statuses the counter includes and enforce it everywhere it is mutated (webhook, refund, accept).

## 4. CRITICAL - `verify_token` accepts tokens with no userId

**Where:** `backend/utils/password.py` `verify_token`: `user_id = payload.get("userId") or ""` followed by `if user_id is None` - which can never be true. A validly-signed token missing `userId` returns `""` as the user id instead of 401.

**Why it matters:** Downstream code then queries `UserModel.id == ""` (harmless today, returns nothing, usually surfacing as confusing 404s instead of 401s) - but it is an auth-layer correctness bug and a trap for future code that trusts a non-None user id.

**Fix:** `user_id = payload.get("userId")` then `if not user_id: raise HTTPException(401)`. One-line change plus remove the `print()` calls in `utils/auth.py` (they log user ids to stdout on every request).

## 5. HIGH - Public user endpoint leaks email and Stripe account id

**Where:** `GET /users/{user_id}` (`routers/users.py`) returns the full `User` schema, which includes `email`, `stripe_account_id`, `stripe_onboarding_complete`, `invite_code`, and `referred_by_user_id`. No auth required. `GET /events/{event_id}/participants` is also unauthenticated.

**Why it matters:** Anyone can enumerate emails and Stripe account ids for every user. On a college campus product this is a real safety/privacy problem, and the T&Cs/Privacy Policy in the workspace promise better.

**Fix:** Create a `PublicUser` schema (id, name, university, description, profile_picture, taste_archetype, taste_description) and use it for `GET /users/{user_id}`; keep the full schema only for the authenticated self (add `GET /users/me`). Frontend `Profile.tsx` reads from these endpoints - update its type accordingly.

## 6. HIGH - Uncaptured payments have no expiry handling (7-day Stripe hold)

**Where:** The `booked` state (`webhook.py` creates it, `event_service.accept_user_participation` resolves it). Nothing handles the case where a host never accepts.

**Why it matters:** Manual-capture PaymentIntents auto-expire after ~7 days; the authorization is released, but the participant row stays `booked` forever, `current_participants` stays incremented, and the foodie thinks they may still have a seat. There is also no way for a foodie to cancel a `booked` (not yet accepted) request - the refund path requires status `confirmed`.

**Fix:** Handle the `payment_intent.canceled` / `charge.expired` webhook event: set the matching participation to `cancelled` and decrement the counter. Separately, allow refund/cancel of `booked` participations by cancelling (not refunding) the uncaptured PaymentIntent.

## 7. HIGH - `accept_user_participation` swallows its own HTTPExceptions and can capture without committing

**Where:** `backend/services/event_service.py`, bottom function. The blanket `except Exception` catches the 404/500 HTTPExceptions raised inside and re-wraps them as generic 400s. Worse: `capture_payment_intent` runs BEFORE `db.commit()`; if commit fails, money is captured but the row stays `booked`.

**Why it matters:** Money moves without a matching state change, and real error causes are masked.

**Fix:** Add `except HTTPException: raise` before the generic handler (the pattern used everywhere else in this file), and reorder to commit the status change first, then capture, with a compensating rollback (or at minimum log loudly with the payment_intent_id) if capture fails.

## 8. HIGH - Zero tests

**Where:** Nowhere. No test framework, no test directory, no CI config in either backend or frontend.

**Why it matters:** The refund window math, the 84/16 split, checkout validation, and webhook handling are all pure-logic candidates that break silently. Every gap in this file could regress unnoticed.

**Fix (first task, deliberately small):** Add `pytest` + `httpx` to backend dev deps and write tests for `validate_checkout_requirements` and `refund_event_participation` using a sqlite-or-postgres test session and monkeypatched stripe calls. That single file covers the two highest-risk functions. Frontend tests can wait.

## 9. HIGH - CORS wildcard and hardcoded secrets in the repo

**Where:** `backend/main.py`: `allow_origins=["*"]` plus the Sentry DSN hardcoded with `send_default_pii=True`. `backend/docker-compose.yaml`: real-looking Postgres password `D0rm-M4d3_2025` committed.

**Why it matters:** Wildcard CORS lets any website call the API with a stolen token (localStorage JWT + XSS makes this worse). Committed credentials and DSNs travel with every clone. `send_default_pii=True` ships user data to Sentry - check that against the Privacy Policy.

**Fix:** Drive `allow_origins` from an `ALLOWED_ORIGINS` env var (default localhost list for dev); move the Sentry DSN to env; rotate the DB password if it was ever used beyond local.

## 10. MEDIUM - `is_deleted` defaults to True on Event and Meal models

**Where:** `models/event.py` line 39, `models/meal.py` line 24: `default=True`.

**Why it matters:** Any new creation path (script, admin tool, test fixture, future endpoint) that forgets to pass `is_deleted=False` creates invisible rows. The current create paths pass it explicitly, which is why nobody noticed.

**Fix:** Change both to `default=False` (Python-side default only; no migration needed since the DB has no server_default for these).

## 11. MEDIUM - Invalid price silently becomes a free event

**Where:** `routers/events.py` `create_event_endpoint`: `int(price)` failure falls through to `price_int = None`, then `price=price_int or 0`. No validation that price is non-negative or above Stripe's minimum charge either.

**Why it matters:** A frontend bug or malformed request turns a $20 dinner into a free event, and checkout later fails confusingly for sub-minimum amounts.

**Fix:** Raise 422 on unparseable price; validate `0 <= price <= some_max` in `EventCreate` with a Pydantic validator; treat price 0 explicitly (free events currently still go through Stripe checkout - decide if free events should skip payment entirely).

## 12. MEDIUM - Migration autogenerate will try to drop the review tables

**Where:** `backend/migrations/env.py` imports User/Meal/Event/EventParticipant models but not `EventReviewModel`/`GuestReviewModel`.

**Why it matters:** The next `alembic revision --autogenerate` will emit `drop_table("event_reviews")` / `drop_table("guest_reviews")`. If someone applies it without reading, production review data is gone.

**Fix:** Add the two imports to `migrations/env.py`. One-line task.

## 13. MEDIUM - Migrations run at app startup

**Where:** `main.py` lifespan runs `alembic upgrade head` on every boot, using a relative `Config("alembic.ini")`.

**Why it matters:** With more than one instance (or a serverless platform that cold-starts concurrently), two processes can run migrations simultaneously. The relative path also means the app only boots when CWD is `backend/`.

**Fix:** Gate it behind an env var (`RUN_MIGRATIONS_ON_STARTUP`, default true for now to preserve behavior) and resolve `alembic.ini` relative to `__file__`. Full fix (migrate in deploy step) can come later.

## 14. MEDIUM - 30-minute sessions with silent-failure zones

**Where:** `utils/password.py` (30 min expiry, no refresh); `frontend/src/services/http-client.ts` 401 interceptor exempts `/create-event` and `/profile/*` from the login redirect.

**Why it matters:** A chef composing an event for 30+ minutes loses their session; on the exempted paths the failure is silent (requests just fail). The interceptor also clears the token but not `currentUser`/`userEmail` in localStorage, leaving stale state that `OnboardingRedirect` and headers read.

**Fix:** (1) Extend token life or add a refresh endpoint. (2) In the 401 handler, also remove `currentUser` and `userEmail`. (3) Replace the path-exemption hack with a toast + redirect that preserves intended destination (`?next=`).

## 15. MEDIUM - N+1 queries and no pagination on the main feed

**Where:** `event_service.list_events` (and get_user_events / get_user_joined_events) call `get_meal_name(...)` per event - one query per row - and return ALL events ever, ordered by date. `review_service.get_pending_reviews` similarly loops queries per hosted event.

**Why it matters:** Explore is the most-hit endpoint; this is O(n) queries and unbounded payload. Fine at 20 events, painful at 2,000.

**Fix:** Join meals in the main query (`db.query(EventModel, MealModel.title).join(...)`) and add `limit/offset` params with a default limit (50). Filter out past events by default on the Explore feed.

## 16. MEDIUM - Refund can be attempted on uncaptured intents; policy edge unclear

**Where:** `event_service.refund_event_participation` creates `stripe.Refund` with `reverse_transfer=True` for a `confirmed` (captured) payment. But the 12-hours-since-booking window applies while `joined_at` is set at webhook time, and confirmation may happen days later - so a foodie confirmed on day 3 can never refund even though the event is a week away.

**Why it matters:** The refund window measures from booking, not confirmation; combined with #6 (no cancel for `booked`), foodies have a very narrow real-world exit. Support tickets will land on the founder.

**Fix:** Decide the intended policy (likely: cancel freely while `booked`; refund window runs from confirmation). Then change `hours_since_reservation` to use a confirmation timestamp (add `confirmed_at` column, set in accept flow).

## 17. LOW - API casing is inconsistent (camelCase vs snake_case)

**Where:** `schemas/event.py`, `schemas/meal.py`, `schemas/review.py`, `schemas/event_participant.py`, `schemas/checkout.py` use `to_camel` aliases; `schemas/user.py` and `schemas/stripe.py` do not. Frontend types mirror the split.

**Why it matters:** Every new endpoint requires remembering which world it lives in; converting user endpoints later is a breaking change that grows more expensive over time.

**Fix:** Standardize on camelCase: add the same `model_config` to user/stripe schemas and update `frontend/src/types/user.types.ts`, `auth.types.ts`, and the handful of `snake_case` property reads (`onboarding_completed`, `access_token`, `invite_code`). Do it in one PR, both sides simultaneously.

## 18. LOW - Mixed-language error messages

**Where:** `routers/users.py` and `services/user_service.py` profile-picture paths raise Portuguese messages ("Você só pode fazer upload...", "Tipo de arquivo inválido..."); everything else is English.

**Why it matters:** User-facing inconsistency; the product is US-campus-targeted.

**Fix:** Translate the five Portuguese strings to English.

## 19. LOW - Dead files and stale docs mislead newcomers

**Where:** `frontend/src/index.js` (CRA entry, unused), `frontend/src/lib/Index.tsx` (duplicate landing page component, unused - real one is `pages/Index.tsx`), `frontend/public/index.html` (unused; Vite serves root `index.html`), committed `__pycache__/` dirs (built under Python 3.10), root `README.md` and `backend/README.md` describing structures that no longer exist (including literal merge-garbage text "out mig" in the root README).

**Why it matters:** Each one is a trap: an agent grepping for the entry point or reading the README will build a wrong mental model (this audit almost did).

**Fix:** Delete the three dead frontend files, add `__pycache__/` to `.gitignore` and `git rm -r --cached` them, rewrite both READMEs to a short pointer at PROJECT.md.

## 20. LOW - Upload validation trusts the client

**Where:** `event_service.upload_event_image`, `meal_service.upload_meal_image`, `user_service.upload_profile_picture` validate `image.content_type` (client-controlled header) and take the file extension from the client filename unsanitized.

**Why it matters:** Content sniffing bypass lets non-images into public buckets; weird extensions produce odd public URLs. Low direct risk since Supabase serves with stored content-type, but it is the classic pattern that bites later.

**Fix:** Validate magic bytes (e.g. `imghdr`-style check or Pillow open) and whitelist the extension from the detected type, not the filename. Also extract the triplicated upload function into one shared helper with a bucket parameter - it is copy-pasted three times with drift (profile pictures disallow webp; the other two allow it).

## 21. LOW - `GET /meals/` returns a hardcoded empty list

**Where:** `routers/meals.py` `list_meals_endpoint` - the no-user_id branch returns `[]` with a comment admitting it.

**Why it matters:** Half-finished endpoint; any consumer assuming it lists meals gets silently nothing.

**Fix:** Either implement `meal_service.list_all_meals` (filter `is_deleted == False`) or remove the branch and make `user_id` required.

## 22. LOW - `get_user_joined_events` includes cancelled participations

**Where:** `event_service.get_user_joined_events` filters only `refunded_at == None`, so `cancelled`-but-unrefunded and `booked` rows all count as "joined".

**Why it matters:** Profile "My events" can show events the user was denied for or cancelled from.

**Fix:** Filter `status.in_(["booked", "confirmed"])` and surface the status in the UI (the schema `EventParticipantUser` already carries status elsewhere).

## 23. LOW - Signup does not log the user in

**Where:** `use-auth.ts` signUp navigates to `/login` after account creation; backend `POST /users/` returns the user but no token.

**Why it matters:** Extra friction at the most fragile point of the funnel, for a project explicitly optimizing signup conversion (referral codes, taste quiz).

**Fix:** Return a `LoginResponse` (token + user) from `create_user` and have the frontend store it and go straight to `/onboarding`.

## 24. LOW - Env documentation is wrong/incomplete

**Where:** `backend/env.example` lists only SUPABASE_URL/KEY/SECRET_KEY; missing DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME, STRIPE_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_CONNECT_WEBHOOK_SECRET, RESEND_API_KEY, FRONTEND_URL, ENVIRONMENT. `frontend/env.example` misses the two PostHog vars.

**Why it matters:** A fresh clone cannot be configured from the examples; failures surface as cryptic runtime errors (or worse, silent fallbacks, see #1).

**Fix:** Regenerate both env.example files with every variable and a one-line comment each (the full list is in CLAUDE.md).

## 25. LOW - Miscellaneous debt (bundle into one cleanup task)

- `routers/events.py` imports `create_checkout_session` directly while other gateways go through the service module namespace - pick one import style.
- `schemas/event.py` `EventUpdate` fields are required (not Optional) although the service treats them as optional patches - PUT with partial body 422s surprisingly.
- `stripe_service.generate_login_link` and `capture_payment_intent` use `_async` variants of the stripe SDK while everything else is sync in async wrappers - harmless but inconsistent.
- `event_service.py` has `import stripe` and raw `stripe.Refund.create` inline instead of going through `stripe_service` - the only place raw stripe leaks out of the gateway layer.
- `main.py` `allow_credentials=False` comment contradicts the frontend sending Authorization headers (works because Bearer headers are not "credentials" in CORS terms, but the comment invites a wrong "fix").
- Unused deps: `passlib` (bcrypt is used directly), CRA-era `src/App.css` mostly unused.
- `taste_picks` stores JSON in a Text column - fine, but add a comment or use JSONB next migration touching users.
