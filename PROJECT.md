# PROJECT.md - Dorm Made

This is the orientation document for anyone (human or AI) working on this codebase for the first time. Read this before touching anything. Known problems are cataloged in GAPS.md; day-to-day operational rules are in CLAUDE.md.

## What this is

Dorm Made is a two-sided marketplace for college students: student "chefs" host paid dinners in their dorms/apartments, and student "foodies" pay to attend. Think Airbnb Experiences scoped to campus cooking. The founder (Franco) is pre-PMF and running this as a GTM experiment: the app is a Minimum Lovable Product, and the surrounding artifacts (landing pages, waitlist, referral codes, legal docs) exist to test demand and virality.

The core loop:

1. A chef creates a **meal** (a reusable dish: title, description, ingredients, photo).
2. The chef creates an **event** from that meal (date, location, price in cents, max participants).
3. A foodie finds the event on Explore, pays via Stripe Embedded Checkout. The charge is **authorized but not captured** (manual capture), and the foodie becomes a participant with status `booked`.
4. The chef reviews the request and **accepts** it; acceptance captures the payment and flips the participant to `confirmed`. 84% of the price is transferred to the chef's Stripe Connect Express account; the platform keeps 16%.
5. After the event, both sides rate each other: foodies leave a 3-layer review of the event (food / space / host, each 1-5 stars, total /15), and hosts rate guests on sociability + etiquette (total /10). Unwritten foodie reviews are meant to hard-gate the next booking; unwritten host reviews are a soft reminder.
6. Foodies can self-serve refund (70% of price) if they cancel within 12 hours of booking AND at least 24 hours before the event.

Growth mechanics baked into the product: every user gets a human-friendly invite code (e.g. `FRANCO-7K2`) generated at signup, signups can carry a referral code, and first login forces a non-skippable 8-question image-pair "taste quiz" that assigns a taste archetype ("The Bold Carnivore", etc.) shown on the profile.

## What lives where (workspace vs repo)

The Cowork workspace folder ("Dorm Made") contains more than the repo:

```
Dorm Made/                          <- workspace folder (NOT all git)
├── dorm-made/                      <- THE GIT REPO (this file's home)
│   ├── backend/                    <- FastAPI app
│   └── frontend/                   <- Vite + React app
├── landing-site/                   <- current waitlist landing page (static, self-contained)
│   └── WEBSITE_NOTES.md            <- deploy + A/B testing notes, worth reading for GTM context
├── Dorm Made landing page 2/       <- second landing page iteration
├── DormMade_Landing_v1.zip         <- archived first version
├── Dorm Made App Prototype.html    <- clickable single-file product prototype
├── DM T&C's Terms and Conditions.docx
├── DM Privacy Policy.docx
└── DM Community Guidelines.docx    <- the "House Rules" (8 guidelines, Las Vegas Rule etc.)
```

The landing pages are deliberately dependency-free single HTML files with a client-side-simulated waitlist (see `WEBSITE_NOTES.md` for how to wire a real endpoint). They are marketing assets, not part of the app build.

## Tech stack and why

**Backend** (`backend/`): FastAPI (Python 3.12) + SQLAlchemy 2.0 (typed `Mapped[]` style) + Alembic migrations + PostgreSQL. Postgres is Supabase-hosted in production (the DB URL builder in `utils/database.py` switches sslmode based on host); Supabase Storage holds all uploaded images (buckets: `event-images`, `meal-images`, `profile-pictures`). Payments are Stripe Connect (Express accounts, embedded checkout, manual capture, destination transfers). Email is Resend (template-based chef notifications). Sentry is enabled when `ENVIRONMENT=prod`. Dependency management is `uv` (see `uv.lock`; a recent commit ported deployment to uv). Docker Compose exists only to run a local Postgres.

Why these choices (inferred): FastAPI + Supabase + Stripe + Vercel is the fastest solo-founder stack; Supabase collapses DB + object storage into one account; Stripe Connect with manual capture gives the "host approves guests" marketplace mechanic without building escrow.

**Frontend** (`frontend/`): Vite + React 18 + TypeScript, shadcn/ui on Radix primitives, Tailwind, TanStack React Query, axios, react-router v6, PostHog for product analytics, Stripe React components for embedded checkout. Deployed on Vercel (`vercel.json` has the SPA catch-all rewrite). The project was scaffolded from Lovable (package name `vite_react_shadcn_ts`, `lovable-tagger` dev dependency) and then hand-evolved.

## Architecture

```
React SPA (Vercel) ──axios/JWT──> FastAPI backend ──SQLAlchemy──> Postgres (Supabase)
     │                                │  │  │
     │                                │  │  └──> Supabase Storage (images)
     │                                │  └─────> Resend (chef email)
     └──── PostHog (analytics)        └────────> Stripe API
                                           ▲
Stripe ──webhooks──────────────────────────┘
  /webhooks/stripe          (checkout.session.completed -> create participant)
  /webhooks/stripe-connect  (account.updated -> sync chef onboarding status)
```

Backend layering is consistent: `routers/` (HTTP, auth dependency, thin) -> `services/` (business logic, owns commits/rollbacks) -> `models/` (SQLAlchemy) with `schemas/` (Pydantic) at the boundary and `utils/converters.py` doing model-to-schema mapping. External integrations live in `services/gateways/` (stripe_service, email_service) and `routers/gateways/stripe/` (the two webhook endpoints).

Frontend mirrors it: `services/*.ts` (one axios client + per-domain API modules) -> `hooks/use-*.ts` (state + mutations) -> `components/` (grouped by domain: events, meals, reviews, referral, profile, onboarding) -> `pages/`. `types/*.types.ts` hold the API contracts.

### Database schema (6 tables)

- `users`: identity + password hash + Stripe fields (`stripe_account_id`, `stripe_onboarding_complete`) + referral fields (`invite_code` unique, `referred_by_user_id` self-FK) + taste quiz fields (`taste_archetype`, `taste_description`, `taste_picks` JSON-in-Text, `onboarding_completed`).
- `meals`: reusable dishes owned by a user. Soft-deleted via `is_deleted`.
- `events`: instances of a meal being hosted. Price is **integer cents**. Soft-deleted via `is_deleted`. Has a denormalized `current_participants` counter.
- `events_participants`: join table with lifecycle `booked -> confirmed | cancelled` (CHECK constraint), plus `payment_intent_id` and `refunded_at`.
- `event_reviews`: foodie -> chef, 3 star columns + 3 optional comments, unique (event_id, reviewer_id), denormalized `host_user_id` for profile aggregates.
- `guest_reviews`: host -> foodie, 2 star columns + comment, unique (event_id, guest_id).

Everything keys on UUIDs stored as strings (`UUID(as_uuid=False)`).

### The payment state machine (the most load-bearing logic)

```
foodie clicks join
  -> POST /events/{id}/create-checkout-session
     (validate_checkout_requirements: not host, not past, not full,
      not already confirmed, chef charges_enabled)
  -> Stripe embedded checkout, capture_method=manual,
     transfer_data 84% to chef account, metadata carries event/foodie/chef ids
  -> Stripe fires checkout.session.completed
     -> webhook creates participant status=booked, stores payment_intent_id,
        increments current_participants, emails chef via Resend
  -> host accepts (POST /events/accept-participation)
     -> capture_payment_intent + status=confirmed
  -> (optional) foodie refunds (POST /events/{id}/refund)
     -> 70% refund with reverse_transfer, status=cancelled,
        refunded_at set, counter decremented
```

Participation is created ONLY by the webhook. If webhooks aren't configured (or fail silently, see GAPS.md), payments succeed but nobody joins anything. Locally you must run `stripe listen` and set both webhook secrets.

### Auth

Email + password (bcrypt) -> JWT (HS256, 30 min expiry, payload key is `userId`) issued by `POST /users/login`. Frontend stores the token AND a cached `currentUser` object in localStorage; an axios interceptor injects the Bearer header and force-redirects to /login on 401 (with some path exemptions). There is no refresh token; sessions just die after 30 minutes. Signup does not auto-login; users are bounced to /login after registering.

### Onboarding flow

`OnboardingRedirect` (mounted globally in App.tsx) reads the cached `currentUser` from localStorage and hard-redirects any logged-in user with `onboarding_completed=false` to `/onboarding`, where the taste quiz (`GET /taste-quiz/questions`, `POST /users/me/taste-quiz`) must be completed. The quiz is fully rule-based (no LLM): each image carries a primary (2 pts) and secondary (1 pt) signal, top signal picks the archetype, and a template builds the "personalized" description. Quiz content lives entirely in `backend/services/taste_quiz_service.py` with Unsplash image URLs.

## Key design decisions to respect

- **Soft deletes everywhere.** Events and meals are never hard-deleted; every read query filters `is_deleted == False`. Reviews are intentionally permanent.
- **Money is integer cents**, end to end. The 84/16 split and the 70% refund are integer arithmetic in `stripe_service.create_checkout_session` and `event_service.refund_event_participation`. These percentages are business decisions from the GTM deck, not arbitrary.
- **Manual capture is the product**, not a technicality: it is how "the host approves who comes to dinner" works. Do not switch to automatic capture.
- **Multipart form endpoints** for anything with an image (create meal, create event) rather than JSON; the axios client strips the Content-Type header when it sees FormData.
- **Denormalization for read speed** in two places: `events.current_participants` and `event_reviews.host_user_id`. Both must be kept in sync manually.
- **Referral codes are name-based and human-friendly** on purpose (marketing wants shareable codes, not opaque tokens). Uniqueness is retry-based generation, uppercase-normalized on resolve.
- **Migrations auto-run at API startup** (lifespan hook runs `alembic upgrade head`). Convenient for single-instance deploys, dangerous otherwise (see GAPS.md).

## Critical paths (change with care)

1. `backend/services/event_service.py` - checkout validation, refund windows, and the money math. Almost every business rule lives here.
2. `backend/routers/gateways/stripe/webhook.py` - the only writer of participation rows. Errors here mean paid-but-not-joined users.
3. `backend/services/gateways/stripe_service.py` - the 84% split constant, manual capture, webhook signature verification.
4. `backend/utils/password.py` + `utils/auth.py` - all of auth hangs on these ~90 lines.
5. `backend/migrations/versions/` - append-only; never edit an applied migration.
6. `frontend/src/services/http-client.ts` - token handling and the 401 redirect behavior every request flows through.

Safe to change casually: UI components under `components/ui/` (generated shadcn), page styling, quiz copy/archetypes in `taste_quiz_service.py`, landing pages, analytics event properties.

## Surprises that will trip you up

- **Two conventions for API casing.** Event/meal/review schemas use Pydantic `alias_generator=to_camel` with `response_model_by_alias=True`, so the wire format is camelCase. User/auth schemas do NOT, so users are snake_case on the wire (`onboarding_completed`, `invite_code`). The frontend types faithfully mirror this inconsistency. Match the existing convention of whichever domain you touch.
- **`is_deleted` defaults to `True`** in the Python-side column defaults of EventModel and MealModel. Creation paths explicitly pass `is_deleted=False`. If you build a new creation path and forget that, your rows will be born invisible.
- **Both root READMEs are stale fiction.** The repo README describes an `app/` layout, username fields, and auth routes that don't exist; the backend README describes a recipes table from an older scope and contains merge-garbage text. Trust the code, not the READMEs.
- **Dead files exist**: `frontend/src/index.js` (CRA remnant; real entry is `main.tsx`), `frontend/src/lib/Index.tsx` (duplicate of `pages/Index.tsx`), `frontend/public/index.html` (Vite uses root `index.html`). Backend `__pycache__/` directories (compiled under Python 3.10, predating the 3.12 port) are committed to git.
- **`migrations/env.py` does not import the review models**, so `alembic revision --autogenerate` will think `event_reviews`/`guest_reviews` should be dropped. The rating-system migration was written by hand. Always eyeball autogenerated migrations.
- **Error messages are bilingual**: profile picture endpoints raise Portuguese error strings, everything else is English.
- **The 401 redirect exempts some paths** (`/create-event`, `/profile/*`) in http-client.ts, so on those pages an expired token fails silently instead of redirecting.
- **Webhook handlers return HTTP 200 even on internal failure** (they catch, log, and return `received=True`), which means Stripe will not retry a failed event. Deliberate-looking but consequential; see GAPS.md #2.
- **`GET /meals/` without a user_id returns a hardcoded empty list** - the "list all meals" service was never implemented.
- **Two sets of frontend env vars**: `VITE_API_URL` (backend) and `VITE_PUBLIC_POSTHOG_KEY`/`VITE_PUBLIC_POSTHOG_HOST`. Only the first is in env.example.
- **Backend env vars are read in three different files** (`utils/database.py` wants DB_USER/DB_PASSWORD/DB_HOST/DB_PORT/DB_NAME; `utils/config.py` wants STRIPE_KEY, both webhook secrets, RESEND_API_KEY, FRONTEND_URL; `utils/password.py` wants SECRET_KEY; `utils/supabase.py` wants SUPABASE_URL/KEY; `main.py` wants ENVIRONMENT). `env.example` lists almost none of them. See CLAUDE.md for the full list.
