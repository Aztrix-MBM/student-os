from app.routers.health import router as health_router
from app.routers.auth import router as auth_router
from app.routers.subjects import router as subjects_router
from app.routers.exams import router as exams_router
from app.routers.tasks import router as tasks_router
from app.routers.syllabus import router as syllabus_router
from app.routers.learning import router as learning_router
from app.routers.today import router as today_router
from app.routers.retention import router as retention_router
from app.routers.payments import router as payments_router

__all__ = [
    "health_router",
    "auth_router",
    "subjects_router",
    "exams_router",
    "tasks_router",
    "syllabus_router",
    "learning_router",
    "today_router",
    "retention_router",
    "payments_router",
]

