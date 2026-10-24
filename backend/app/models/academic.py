import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from app.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def generate_subject_id() -> str:
    return f"sub_{uuid.uuid4().hex[:12]}"


def generate_unit_id() -> str:
    return f"unit_{uuid.uuid4().hex[:12]}"


def generate_topic_id() -> str:
    return f"top_{uuid.uuid4().hex[:12]}"


def generate_exam_id() -> str:
    return f"exm_{uuid.uuid4().hex[:12]}"


def generate_task_id() -> str:
    return f"tsk_{uuid.uuid4().hex[:12]}"


# Many-to-many association between Exams and Topics
exam_topics = Table(
    "exam_topics",
    Base.metadata,
    Column("exam_id", String(36), ForeignKey("exams.id", ondelete="CASCADE"), primary_key=True),
    Column("topic_id", String(36), ForeignKey("topics.id", ondelete="CASCADE"), primary_key=True),
)


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(String(36), primary_key=True, default=generate_subject_id, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    name = Column(String(120), nullable=False)
    code = Column(String(50), nullable=False)
    semester = Column(String(50), nullable=True)
    color_theme = Column(String(50), nullable=False, default="sky")

    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    user = relationship("User", backref="subjects")
    units = relationship("Unit", back_populates="subject", cascade="all, delete-orphan", order_by="Unit.order_no")
    topics = relationship("Topic", back_populates="subject", cascade="all, delete-orphan")
    exams = relationship("Exam", back_populates="subject", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="subject")

    def __repr__(self) -> str:
        return f"<Subject {self.code} - {self.name} ({self.id})>"


class Unit(Base):
    __tablename__ = "units"

    id = Column(String(36), primary_key=True, default=generate_unit_id, index=True)
    subject_id = Column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), index=True, nullable=False)
    name = Column(String(120), nullable=False)
    order_no = Column(Integer, default=1, nullable=False)
    exam_weight = Column(Float, nullable=True)  # 0.0 to 1.0

    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    subject = relationship("Subject", back_populates="units")
    topics = relationship("Topic", back_populates="unit", cascade="all, delete-orphan", order_by="Topic.order_no")

    def __repr__(self) -> str:
        return f"<Unit {self.name} ({self.id})>"


class Topic(Base):
    __tablename__ = "topics"

    id = Column(String(36), primary_key=True, default=generate_topic_id, index=True)
    subject_id = Column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), index=True, nullable=False)
    unit_id = Column(String(36), ForeignKey("units.id", ondelete="CASCADE"), index=True, nullable=True)
    name = Column(String(255), nullable=False)
    difficulty = Column(Integer, default=3, nullable=False)  # 1 to 5
    importance = Column(Float, default=0.5, nullable=False)  # 0.0 to 1.0
    order_no = Column(Integer, default=1, nullable=False)

    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    subject = relationship("Subject", back_populates="topics")
    unit = relationship("Unit", back_populates="topics")

    def __repr__(self) -> str:
        return f"<Topic {self.name} ({self.id})>"


class Exam(Base):
    __tablename__ = "exams"

    id = Column(String(36), primary_key=True, default=generate_exam_id, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    subject_id = Column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), index=True, nullable=False)
    title = Column(String(150), nullable=False)
    exam_date = Column(DateTime(timezone=True), nullable=False)
    total_marks = Column(Integer, default=100, nullable=False)
    type = Column(String(50), default="internal", nullable=False)  # internal, semester, practical, quiz

    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    subject = relationship("Subject", back_populates="exams")
    topics = relationship("Topic", secondary=exam_topics, backref="exams")

    def __repr__(self) -> str:
        return f"<Exam {self.title} ({self.id})>"


class Task(Base):
    __tablename__ = "tasks"

    id = Column(String(36), primary_key=True, default=generate_task_id, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    subject_id = Column(String(36), ForeignKey("subjects.id", ondelete="SET NULL"), index=True, nullable=True)
    title = Column(String(255), nullable=False)
    priority = Column(Integer, default=3, nullable=False)  # 1 to 5 (1=low, 3=medium, 5=high)
    status = Column(String(50), default="todo", nullable=False)  # todo, in_progress, completed
    due_date = Column(DateTime(timezone=True), nullable=True)
    estimated_minutes = Column(Integer, default=30, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    subject = relationship("Subject", back_populates="tasks")

    def __repr__(self) -> str:
        return f"<Task {self.title} ({self.id})>"
