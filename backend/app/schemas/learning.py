from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, ConfigDict


class TopicReviewCreate(BaseModel):
    rating: Literal["easy", "good", "hard", "fail"] = Field(..., description="Spaced repetition recall rating")
    self_level: Optional[Literal["strong", "okay", "weak"]] = Field(None, description="Optional self-assessed mastery level")
    quiz_score: Optional[float] = Field(None, ge=0.0, le=100.0, description="Optional quiz score (0 to 100)")


class TopicReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    topic_id: str
    user_id: str
    reviewed_at: datetime
    rating: str
    self_level: Optional[str] = None
    quiz_score: Optional[float] = None
    stability_days: float
    retention_estimate: float = 1.0


class StudySessionCreate(BaseModel):
    subject_id: Optional[str] = None
    topic_id: Optional[str] = None
    duration_minutes: int = Field(25, ge=1, le=720)
    started_at: Optional[datetime] = None


class StudySessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    subject_id: Optional[str] = None
    topic_id: Optional[str] = None
    duration_minutes: int
    started_at: datetime
    created_at: datetime


class ExamReadinessTopic(BaseModel):
    id: str
    name: str
    importance: float
    mastery: float
    retention: float
    effective_score: float
    latest_rating: Optional[str] = None
    self_level: Optional[str] = None
    days_since_review: Optional[float] = None
    is_weak: bool = False


class ExamReadinessResponse(BaseModel):
    exam_id: str
    exam_title: str
    subject_id: str
    subject_name: str
    exam_date: datetime
    days_to_exam: float
    readiness_pct: float
    coverage_pct: float
    total_topics: int
    reviewed_topics: int
    weak_topics: List[ExamReadinessTopic]
    strong_topics: List[ExamReadinessTopic]
    all_topics: List[ExamReadinessTopic]
    label: str = "estimate"
