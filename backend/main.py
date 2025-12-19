from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from dotenv import load_dotenv
import logging
import os
import sys

from alembic.config import Config
from alembic import command
from contextlib import asynccontextmanager

from routers import users, events, meals, checkout
from routers.gateways.stripe import webhook, connect_webhook

import sentry_sdk

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="[%(levelname)s] %(name)s - %(message)s",
    stream=sys.stdout,
)

logger = logging.getLogger(__name__)

environment = os.getenv("ENVIRONMENT", "dev")

if environment == "prod":
    sentry_sdk.init(
        dsn="https://137305a5acd3180c04322048e8269c45@o4510551410147328.ingest.us.sentry.io/4510551411261440",
        send_default_pii=True,
        enable_logs=True,
    )
    logger.info("Sentry monitoring enabled for production")
else:
    logger.info(f"Running in {environment} mode - Sentry disabled")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        alembic_cfg = Config("alembic.ini")
        command.upgrade(alembic_cfg, "head")
        logger.info("Database migrations completed successfully")
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise
    yield
    # Code after yield runs on application shutdown
    logger.info("Application shutdown")


app = FastAPI(
    title="Dorm Made - Culinary Social Network", version="1.0.0", lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=False,  # Set to False when using wildcard origins
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
    response = await call_next(request)
    if response.status_code >= 400:
        logger.warning(f"{request.method} {request.url.path} - {response.status_code}")
    return response


app.include_router(users.router)
app.include_router(events.router)
app.include_router(meals.router)
app.include_router(checkout.router)
app.include_router(webhook.router)
app.include_router(connect_webhook.router)


@app.get("/")
async def root():
    return {"message": "Welcome to Dorm Made - Culinary Social Network API"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, reload_dirs=["./"])
