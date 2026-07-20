# Dorm Made

A marketplace where college students cook for and eat with each other:
chefs host paid dinners in their dorms, foodies book seats.

**Start here: [PROJECT.md](PROJECT.md)** - product scope, flows, and current
status. Agent/contributor conventions live in [CLAUDE.md](CLAUDE.md).
Deleted-code log: [DELETIONS.md](DELETIONS.md). Known issues backlog: GAPS.md.

## Layout

- `backend/` - FastAPI + Postgres (SQLAlchemy/Alembic), Stripe Connect
  payments, Supabase storage, Resend email. Run: `uvicorn main:app --reload`
  from `backend/` (needs `.env`, see `backend/env.example`).
- `frontend/` - React + Vite + TypeScript + Tailwind (shadcn/ui). Run:
  `npm run dev` from `frontend/` (entry point: `src/main.tsx`).

## Payments in one paragraph

Foodies pay through Stripe Checkout (embedded, manual capture). The webhook
books the seat as `booked`; the chef accepting captures the payment and the
seat becomes `confirmed` (84% goes to the chef's connected account). Foodies
can cancel free while `booked`; confirmed seats are final. If the host cancels
the event, everyone is refunded in full.
