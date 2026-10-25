from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import (
    health_router,
    auth_router,
    subjects_router,
    exams_router,
    tasks_router,
    syllabus_router,
    learning_router,
    today_router,
    retention_router,
)


DEFAULT_INSECURE_SECRETS = [
    "student-os-super-secret-jwt-key-2026-phase-1",
    "secret",
    "changeme",
    "your-secret-key",
    "default_jwt_secret",
]


def validate_production_startup() -> None:
    """
    Enforces production startup security assertions:
    - If ENVIRONMENT/APP_ENV is production, refuses to start with default or short JWT_SECRET.
    - If ENVIRONMENT/APP_ENV is production, refuses to start if COOKIE_SECURE is False.
    """
    env = (settings.ENVIRONMENT or settings.APP_ENV).lower()
    if env == "production":
        if settings.JWT_SECRET in DEFAULT_INSECURE_SECRETS or len(settings.JWT_SECRET) < 32:
            raise RuntimeError(
                "Production startup aborted: JWT_SECRET must be at least 32 characters long and not use a default development value."
            )
        if not settings.COOKIE_SECURE:
            raise RuntimeError(
                "Production startup aborted: COOKIE_SECURE must be True in production environments to protect auth cookies."
            )


@asynccontextmanager
async def lifespan(app: FastAPI):
    validate_production_startup()
    yield


app = FastAPI(
    title="Student OS API",
    description="Exam Readiness & Daily Planner Micro-SaaS API for Engineering Students",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(subjects_router)
app.include_router(exams_router)
app.include_router(tasks_router)
app.include_router(syllabus_router)
app.include_router(learning_router)
app.include_router(today_router)
app.include_router(retention_router)


@app.get("/")

def root_redirect():
    return {
        "message": "Welcome to Student OS API",
        "health": "/api/health",
        "docs": "/docs"
    }
