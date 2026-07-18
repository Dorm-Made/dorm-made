# CLAUDE.md - Dorm Made

Dorm Made is a paid-dinner marketplace for college students (chefs host, foodies pay to attend). Monorepo: `backend/` (FastAPI + Postgres + Stripe Connect) and `frontend/` (Vite + React + TS + shadcn).

- **PROJECT.md** - architecture, data flow, payment state machine, design decisions. Read it before any non-trivial change.
- **GAPS.md** - known bugs, security issues, and tech debt, ordered by severity. Check it before "fixing" something; it may already be cataloged with a scoped fix.

## Style rule (from the founder)

NEVER use an em-dash in any file, doc, or message. Use a plain hyphen "-" instead.

## Commands

Backend (run from `backend/`, uses uv):
```bash
uv sync                                   # install deps
docker-compose up -d                      # local Postgres (db only, not the app)
uv run uvicorn main:app --reload          # run API on :8000 (also runs migrations)
uv run alembic upgrade head               # migrate manually
uv run alembic revision --autogenerate -m "msg"   # ALWAYS review output, see gotchas
uv run black .                            # format
uv run pyright                            # type check (standard mode)
stripe listen --forward-to localhost:8000/webhooks/stripe   # required for join flow
```

Frontend (run from `frontend/`):
```bash
npm install
npm run dev          # Vite dev server on :8080
npm run build        # production build
npm run lint         # eslint (lint:fix to autofix)
```

No test suite exists (GAPS.md #8). If you add tests: pytest for backend, put them in `backend/tests/`.

Deploy: frontend on Vercel (SPA rewrite in `vercel.json`); backend deploys run migrations at startup automatically.

## Required env vars

Backend `.env` (env.example is incomplete - this list is the truth):
`DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME` (database.py) · `SECRET_KEY` (JWT) · `SUPABASE_URL, SUPABASE_KEY` (image storage) · `STRIPE_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_CONNECT_WEBHOOK_SECRET` · `RESEND_API_KEY` · `FRONTEND_URL` · `ENVIRONMENT` (dev|prod; prod enables Sentry).

Frontend `.env`: `VITE_API_URL`, `VITE_PUBLIC_POSTHOG_KEY`, `VITE_PUBLIC_POSTHOG_HOST`.

## Conventions

Backend:
- Layering: `routers/` (thin HTTP) -> `services/` (business logic, owns commit/rollback) -> `models/` (SQLAlchemy 2.0 typed `Mapped[]`) with `schemas/` (Pydantic v2) at the boundary. Model-to-schema conversion lives in `utils/converters.py` or private `_x_to_schema` helpers inside the service.
- External APIs only in `services/gateways/` (stripe, email); webhook endpoints in `routers/gateways/stripe/`.
- Error pattern in services: `try / except HTTPException: raise / except Exception: db.rollback(); logger.error(..., exc_info=True); raise HTTPException(400, ...)`. Follow it exactly (one function forgets the HTTPException re-raise and it is GAPS.md #7).
- Auth: endpoints require `current_user_id: Annotated[str, Depends(get_current_user_id)]`. Ownership checks compare `current_user_id` to the resource's user id in the router or service.
- IDs are UUID strings (`UUID(as_uuid=False)`). Money is integer cents. Timestamps are `DateTime(timezone=True)` with `server_default=func.now()`.
- Soft delete: events and meals have `is_deleted`; EVERY read query must filter `is_deleted == False`.
- Logging via module `logger = logging.getLogger(__name__)`; no print() (two exist in `utils/auth.py`, slated for removal).

Frontend:
- Flow: `services/*.service.ts` (axios via the shared `http-client.ts`) -> `hooks/use-*.ts` -> `components/<domain>/` -> `pages/`. Types in `types/*.types.ts`.
- All API calls go through `httpClient` (never raw axios) - it injects the JWT and handles 401s.
- UI: shadcn/ui components in `components/ui/` (generated, edit sparingly), Tailwind for styling, `@/` alias for `src/`.
- State: React Query for server state, localStorage for auth (`authToken`, `currentUser`, `userEmail`), local useState elsewhere.
- Analytics: call `analytics.*` from `lib/analytics.ts` (PostHog wrapper, logs to console in dev). Add new events there, not inline.

## Gotchas (things that look wrong-or look right but aren't)

- **API casing is split**: event/meal/review/checkout endpoints speak camelCase (Pydantic `to_camel` alias + `response_model_by_alias=True`); user/auth endpoints speak snake_case. Match the domain you are in; do not "fix" one side alone (GAPS.md #17).
- **`is_deleted` model default is `True`** on EventModel/MealModel. Any new creation path must pass `is_deleted=False` explicitly or rows are born invisible.
- **Participation rows are created ONLY by the Stripe webhook** (`checkout.session.completed`). If joining "doesn't work" locally, `stripe listen` isn't running or webhook secrets are wrong. There is no non-payment join path.
- **Payments are manual-capture on purpose**: `booked` = authorized, `confirmed` = host accepted and captured. Never switch to automatic capture; it would delete the host-approval feature.
- **`migrations/env.py` does not import the review models**, so autogenerate will propose dropping `event_reviews`/`guest_reviews`. Never apply an autogenerated migration unreviewed. Never edit an applied migration; add a new one.
- **Migrations auto-run at startup** from `main.py` lifespan, with a CWD-relative `alembic.ini` - run the server from `backend/`.
- **READMEs (root and backend) are stale and wrong.** Trust PROJECT.md and the code.
- **Dead files - do not use or extend**: `frontend/src/index.js`, `frontend/src/lib/Index.tsx`, `frontend/public/index.html`. Real entry is `src/main.tsx`; real landing page is `pages/Index.tsx`.
- **`GET /meals/` without user_id returns a hardcoded `[]`** - not a bug in your code, an unimplemented branch.
- **Onboarding gate reads localStorage**, not the API: after mutating `onboarding_completed`, update the cached `currentUser` or the user loops back to /onboarding.
- **Some profile-picture errors are in Portuguese** - known inconsistency (GAPS.md #18), not a pattern to follow.
- **JWTs expire after 7 days with no refresh** (raised from 30 minutes in July 2026 - the short expiry was logging beta users out mid-form). On 401 the http-client hard-redirects to /login; create-meal and create-event forms autosave drafts to localStorage so nothing is lost.
- **Colors live ONLY in `frontend/src/index.css` tokens** (hot red / black / white / neutral grays). Never hardcode hex/named colors in components; landing and app share the same palette by design (beta feedback, July 2026).
- **DELETIONS.md protocol**: before deleting any file or feature, add an entry to DELETIONS.md (date, plain-language description, why, where its job went). Founder's rule.

## Rules

- Money math (`84%` chef split in `stripe_service.create_checkout_session`, `70%` refund in `event_service.refund_event_participation`, 12h/24h refund windows) is business policy. Never change without the founder's explicit sign-off.
- `backend/migrations/versions/` is append-only.
- Do not weaken webhook signature validation, and never create participation rows outside the webhook flow.
- Do not add default fallbacks for secrets (the existing `"fallback"` defaults are GAPS.md #1, to be removed, not imitated).
- `components/ui/*` are shadcn-generated; prefer composition over editing them.
- Reviews are permanent by design - no edit/delete endpoints for reviews without founder sign-off.
- Uploaded images go to Supabase buckets `event-images`, `meal-images`, `profile-pictures` - keep the 5MB / type checks when touching upload code.
