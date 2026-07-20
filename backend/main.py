from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from dotenv import load_dotenv
import logging
import os
import sys

from alembic.config import Config
from alembic import command
from contextlib import asynccontextmanager

from routers import users, events, meals, checkout, reviews, onboarding
from routers.gateways.stripe import webhook, connect_webhook
from utils.config import Config as AppConfig

import sentry_sdk

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="[%(levelname)s] %(name)s - %(message)s",
    stream=sys.stdout,
)

logger = logging.getLogger(__name__)

environment = os.getenv("ENVIRONMENT", "dev")

sentry_dsn = os.getenv("SENTRY_DSN")
if environment == "prod" and sentry_dsn:
    sentry_sdk.init(
        dsn=sentry_dsn,
        # PII disabled: Privacy Policy does not disclose shipping user data to Sentry
        send_default_pii=False,
        enable_logs=True,
    )
    logger.info("Sentry monitoring enabled for production")
else:
    logger.info(f"Running in {environment} mode - Sentry disabled")


@asynccontextmanager
async def lifespan(app: FastAPI):
    AppConfig.validate()
    if os.getenv("RUN_MIGRATIONS_ON_STARTUP", "true").lower() == "true":
        try:
            alembic_ini = os.path.join(os.path.dirname(os.path.abspath(__file__)), "alembic.ini")
            alembic_cfg = Config(alembic_ini)
            command.upgrade(alembic_cfg, "head")
            logger.info("Database migrations completed successfully")
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            raise
    else:
        logger.info("RUN_MIGRATIONS_ON_STARTUP disabled - skipping migrations")
    yield
    # Code after yield runs on application shutdown
    logger.info("Application shutdown")


app = FastAPI(
    title="Dorm Made - Culinary Social Network", version="1.0.0", lifespan=lifespan
)

# Comma-separated list, e.g. "https://dormmade.com,https://www.dormmade.com"
allowed_origins = [
    o.strip()
    for o in os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173"
    ).split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    # Note: Authorization bearer headers are not CORS "credentials";
    # this stays False unless we move to cookie-based auth.
    allow_credentials=False,
    allow_methods=[
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "OPTIONS",
        "PATCH",
    ],  # Explicit methods
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"{request.method} {request.url.path}")
    auth_header = request.headers.get("authorization")
    if not auth_header:
        logger.debug(f"Request to {request.url.path} without authorization header")
    try:
        response = await call_next(request)
        if response.status_code >= 400:
            logger.warning(f"{request.method} {request.url.path} - {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"Unhandled exception in {request.method} {request.url.path}: {e}", exc_info=True)
        raise


app.include_router(users.router)
app.include_router(events.router)
app.include_router(meals.router)
app.include_router(checkout.router)
app.include_router(reviews.router)
app.include_router(onboarding.router)
app.include_router(webhook.router)
app.include_router(connect_webhook.router)


@app.get("/")
async def root():
    return {"message": "Welcome to Dorm Made - Culinary Social Network API"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, reload_dirs=["./"])
