import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def generate_review_id() -> str:
    return f"rev_{uuid.uuid4().hex[:12]}"


def generate_session_id() -> str:
    return f"ses_{uuid.uuid4().hex[:12]}"


class TopicReview(Base):
    """
    Event-sourced review log for Spaced Repetition tracking.
    Rule: Never mutate topic mastery in topics table; compute dynamically
    from the chronological sequence of TopicReview events.
    """
    __tablename__ = "topic_reviews"

    id = Column(String(36), primary_key=True, default=generate_review_id, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    topic_id = Column(String(36), ForeignKey("topics.id", ondelete="CASCADE"), index=True, nullable=False)
    
    reviewed_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    rating = Column(String(20), nullable=False)  # easy, good, hard, fail
    self_level = Column(String(20), nullable=True)  # strong, okay, weak
    quiz_score = Column(Float, nullable=True)  # 0.0 to 100.0 or 0.0 to 1.0
    stability_days = Column(Float, nullable=False, default=2.0)

    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    user = relationship("User")
    topic = relationship("Topic")

    __table_args__ = (
        Index("ix_topic_reviews_topic_reviewed", "topic_id", "reviewed_at"),
        Index("ix_topic_reviews_user_reviewed", "user_id", "reviewed_at"),
    )

    def __repr__(self) -> str:
        return f"<TopicReview {self.topic_id} rating={self.rating} stability={self.stability_days}d ({self.id})>"


class StudySession(Base):
    """
    Tracks focused study sessions and Pomodoro intervals.
    """
    __tablename__ = "study_sessions"

    id = Column(String(36), primary_key=True, default=generate_session_id, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    subject_id = Column(String(36), ForeignKey("subjects.id", ondelete="SET NULL"), index=True, nullable=True)
    topic_id = Column(String(36), ForeignKey("topics.id", ondelete="SET NULL"), index=True, nullable=True)
    
    duration_minutes = Column(Integer, default=25, nullable=False)
    started_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    user = relationship("User")
    subject = relationship("Subject")
    topic = relationship("Topic")

    __table_args__ = (
        Index("ix_study_sessions_user_started", "user_id", "started_at"),
    )

    def __repr__(self) -> str:
        return f"<StudySession user={self.user_id} duration={self.duration_minutes}m ({self.id})>"
