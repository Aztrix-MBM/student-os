from datetime import datetime
from typing import Optional, List, Literal, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class ReasonItem(BaseModel):
    label: str
    value: str


class PlanItem(BaseModel):
    id: str
    title: str
    type: Literal["task", "topic"]
    minutes: int
    score: float
    reasons: List[ReasonItem] = Field(default_factory=list)
    subject_id: Optional[str] = None
    subject_name: Optional[str] = None
    completed: bool = False
    recommendation_id: Optional[str] = None


class WorkloadSummary(BaseModel):
    status: Literal["comfortable", "busy", "overloaded"]
    load_ratio: float
    required_minutes: int
    available_minutes: int
    message: str


class UpcomingExamItem(BaseModel):
    id: str
    title: str
    subject_name: str
    exam_date: datetime
    days_to_exam: float
    type: str


class TodayPlanResponse(BaseModel):
    next_best_action: Optional[PlanItem] = None
    plan: List[PlanItem] = Field(default_factory=list)
    deferred: List[PlanItem] = Field(default_factory=list)
    workload: WorkloadSummary
    upcoming_exams: List[UpcomingExamItem] = Field(default_factory=list)
    student_daily_minutes: int = 180
    date: str  # 'YYYY-MM-DD'
    candidate_count: int = 0


class RecommendationActionResponse(BaseModel):
    id: str
    status: Literal["accepted", "dismissed"]
    action_at: datetime
    target_type: str
    target_id: str
    message: str
