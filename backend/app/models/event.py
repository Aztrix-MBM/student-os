import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from app.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def generate_event_id() -> str:
    return f"evt_{uuid.uuid4().hex[:12]}"


class Event(Base):
    __tablename__ = "events"

    id = Column(String(36), primary_key=True, default=generate_event_id, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    event_name = Column(String(64), nullable=False, index=True)
    properties_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    user = relationship("User")

    __table_args__ = (
        Index("ix_events_name_created", "event_name", "created_at"),
    )

    @property
    def properties(self) -> Dict[str, Any]:
        if not self.properties_json:
            return {}
        try:
            return json.loads(self.properties_json)
        except Exception:
            return {}

    @properties.setter
    def properties(self, val: Optional[Dict[str, Any]]) -> None:
        if val is None:
            self.properties_json = None
        else:
            self.properties_json = json.dumps(val)

    def __repr__(self) -> str:
        return f"<Event {self.event_name} user={self.user_id} at={self.created_at}>"
