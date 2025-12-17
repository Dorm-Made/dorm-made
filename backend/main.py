from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from alembic.config import Config
from alembic import command
from contextlib import asynccontextmanager

from routers import users, events, meals, checkout
from routers.gateways.stripe import webhook

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        alembic_cfg = Config("alembic.ini")
        command.upgrade(alembic_cfg, "head")
        print("[STARTUP] Database migrations completed successfully")
    except Exception as e:
        print(f"[STARTUP] Migration failed: {e}")
        raise
    yield

    # Code after yield runs on application shutdown


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
    print(f"[REQUEST] {request.method} {request.url.path}")
    print(f"[REQUEST] Query params: {dict(request.query_params)}")
    auth_header = request.headers.get("authorization")
    if auth_header:
        print(f"[REQUEST] Authorization: {auth_header[:20]}...")
    else:
        print(f"[REQUEST] Authorization: Missing")
    response = await call_next(request)
    print(f"[RESPONSE] {response.status_code}")
    return response


app.include_router(users.router)
app.include_router(events.router)
app.include_router(meals.router)
app.include_router(checkout.router)
app.include_router(webhook.router)


@app.get("/")
async def root():
    return {"message": "Welcome to Dorm Made - Culinary Social Network API"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, reload_dirs=["./"])
