# Dorm Made - Backend

FastAPI service. See the root [README.md](../README.md) and
[PROJECT.md](../PROJECT.md) for product context; [CLAUDE.md](../CLAUDE.md)
for conventions.

## Quick start

1. `cp env.example .env` and fill in every value (the app refuses to boot
   with missing secrets - no silent fallbacks).
2. `docker compose up -d` (Postgres; requires `DB_PASSWORD` in `.env`).
3. `uv sync` (or `pip install -e .`), then from this directory:
   `uvicorn main:app --reload`.
   Migrations run automatically on startup (`RUN_MIGRATIONS_ON_STARTUP`).
4. Tests: `pytest`.

## Structure

`routers/` HTTP endpoints -> `services/` business logic -> `models/`
SQLAlchemy models. `schemas/` are the Pydantic wire types (camelCase over the
wire via alias generator). Stripe/webhook code: `routers/gateways/stripe/` and
`services/gateways/stripe_service.py`. `migrations/` is Alembic - when adding
a model, import it in `migrations/env.py` or autogenerate will try to drop its
table.
