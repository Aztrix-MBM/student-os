from app.routers.health import router as health_router
from app.routers.auth import router as auth_router
from app.routers.subjects import router as subjects_router
from app.routers.exams import router as exams_router
from app.routers.tasks import router as tasks_router

__all__ = [
    "health_router",
    "auth_router",
    "subjects_router",
    "exams_router",
    "tasks_router",
]
