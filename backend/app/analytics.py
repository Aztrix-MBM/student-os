import logging
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from app.models.event import Event

logger = logging.getLogger("app.analytics")


def log_event(
    db: Session,
    event_name: str,
    user_id: Optional[str] = None,
    properties: Optional[Dict[str, Any]] = None,
) -> Optional[Event]:
    """
    Log an internal product event to the database.
    Does not crash the caller if an error occurs.
    """
    try:
        evt = Event(
            event_name=event_name,
            user_id=user_id,
        )
        if properties:
            evt.properties = properties
        db.add(evt)
        db.commit()
        return evt
    except Exception as e:
        logger.warning(f"Failed to log event {event_name}: {e}")
        db.rollback()
        return None
