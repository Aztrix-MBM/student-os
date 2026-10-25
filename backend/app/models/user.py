import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime
from app.database import Base


def generate_uuid() -> str:
    return f"usr_{uuid.uuid4().hex[:12]}"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    auth_provider = Column(String(50), nullable=False, default="local")
    daily_study_minutes = Column(Integer, nullable=False, default=180)
    pro_until = Column(DateTime(timezone=True), nullable=True)
    syllabus_imports_count = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    @property
    def is_pro(self) -> bool:
        if self.pro_until is None:
            return False
        now = datetime.now(timezone.utc)
        pu = self.pro_until
        if pu.tzinfo is None:
            pu = pu.replace(tzinfo=timezone.utc)
        return pu > now

    def __repr__(self) -> str:
        return f"<User {self.email} ({self.id})>"
