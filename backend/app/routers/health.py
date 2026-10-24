from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.schemas.health import HealthResponse
from app.config import settings

router = APIRouter(prefix="/api", tags=["System"])


@router.get("/health", response_model=HealthResponse, status_code=status.HTTP_200_OK)
def get_health(db: Session = Depends(get_db)):
    """
    Health check endpoint for monitoring and uptime verification.
    Verifies that the database connection is live and healthy.
    """
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return HealthResponse(
        status="ok" if "unhealthy" not in db_status else "degraded",
        app_name="Student OS API",
        version="0.1.0",
        timestamp=datetime.now(timezone.utc),
        database=db_status,
        environment=settings.APP_ENV
    )
