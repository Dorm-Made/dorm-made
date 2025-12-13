from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routers import users, events, meals, checkout
from routers.gateways.stripe import webhook

load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="Dorm Made - Culinary Social Network", version="1.0.0")

# Add CORS middleware
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
    allow_headers=["*"],  # Allows all headers
    expose_headers=["*"],  # Expose all headers
)


# Debug middleware to log all requests
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


# Include routers
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

    uvicorn.run(
        "main:app", host="0.0.0.0", port=8000, reload=True, reload_dirs=["./"]
    )
