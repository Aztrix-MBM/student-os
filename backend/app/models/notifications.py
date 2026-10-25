import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from app.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def generate_sub_id() -> str:
    return f"sub_{uuid.uuid4().hex[:12]}"


def generate_pref_id() -> str:
    return f"pref_{uuid.uuid4().hex[:12]}"


class PushSubscription(Base):
    """
    Stores browser Web Push API subscriptions for morning plan and revision alerts.
    """
    __tablename__ = "push_subscriptions"

    id = Column(String(36), primary_key=True, default=generate_sub_id, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    endpoint = Column(Text, nullable=False)
    p256dh = Column(String(255), nullable=False)
    auth = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    user = relationship("User")

    __table_args__ = (
        Index("ix_push_subs_user_created", "user_id", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<PushSubscription user={self.user_id} id={self.id}>"


class NotificationPreference(Base):
    """
    Student notification settings (morning plan alert, revision due, exam countdown, telegram).
    """
    __tablename__ = "notification_preferences"

    id = Column(String(36), primary_key=True, default=generate_pref_id, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    
    morning_plan_enabled = Column(Boolean, default=True, nullable=False)
    morning_plan_time = Column(String(8), default="08:00", nullable=False)
    revision_due_alerts = Column(Boolean, default=True, nullable=False)
    exam_countdown_alerts = Column(Boolean, default=True, nullable=False)
    telegram_chat_id = Column(String(64), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User")

    def __repr__(self) -> str:
        return f"<NotificationPreference user={self.user_id} morning={self.morning_plan_enabled}>"
