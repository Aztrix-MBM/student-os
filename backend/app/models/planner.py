import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from app.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def generate_plan_id() -> str:
    return f"plan_{uuid.uuid4().hex[:12]}"


def generate_recommendation_id() -> str:
    return f"rec_{uuid.uuid4().hex[:12]}"


class DailyPlan(Base):
    """
    Stores generated daily study plan snapshots for each student date.
    """
    __tablename__ = "daily_plans"

    id = Column(String(36), primary_key=True, default=generate_plan_id, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    plan_date = Column(String(10), index=True, nullable=False)  # 'YYYY-MM-DD'
    items_json = Column(Text, nullable=False)
    generated_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    user = relationship("User")

    __table_args__ = (
        Index("ix_daily_plans_user_date", "user_id", "plan_date"),
    )

    def __repr__(self) -> str:
        return f"<DailyPlan user={self.user_id} date={self.plan_date} ({self.id})>"


class Recommendation(Base):
    """
    Tracks actionable study recommendations with student accept/dismiss state.
    """
    __tablename__ = "recommendations"

    id = Column(String(36), primary_key=True, default=generate_recommendation_id, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    
    type = Column(String(50), nullable=False, default="study_priority")  # topic_review, task_deadline, exam_prep
    target_type = Column(String(50), nullable=False)  # 'topic' or 'task'
    target_id = Column(String(36), nullable=False)
    
    score = Column(Float, nullable=False, default=0.5)
    reason_json = Column(Text, nullable=False, default="[]")
    
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    dismissed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User")

    __table_args__ = (
        Index("ix_recommendations_user_created", "user_id", "created_at"),
        Index("ix_recommendations_user_target", "user_id", "target_type", "target_id"),
    )

    def __repr__(self) -> str:
        return f"<Recommendation user={self.user_id} target={self.target_type}:{self.target_id} score={self.score} ({self.id})>"
