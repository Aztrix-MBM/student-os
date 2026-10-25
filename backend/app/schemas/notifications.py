from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class StreakResponse(BaseModel):
    current_streak: int
    longest_streak: int
    total_active_days: int
    is_active_today: bool
    grace_days_used: int
    grace_days_remaining: int
    status: str
    message: str
    activity_calendar: List[str] = Field(default_factory=list)


class PushSubscriptionCreate(BaseModel):
    endpoint: str
    p256dh: str
    auth: str


class PushSubscriptionResponse(BaseModel):
    id: str
    endpoint: str
    created_at: datetime


class NotificationPreferenceResponse(BaseModel):
    morning_plan_enabled: bool
    morning_plan_time: str
    revision_due_alerts: bool
    exam_countdown_alerts: bool
    telegram_chat_id: Optional[str] = None
    has_push_subscription: bool = False


class NotificationPreferenceUpdate(BaseModel):
    morning_plan_enabled: Optional[bool] = None
    morning_plan_time: Optional[str] = None
    revision_due_alerts: Optional[bool] = None
    exam_countdown_alerts: Optional[bool] = None
    telegram_chat_id: Optional[str] = None


class MorningDigestResponse(BaseModel):
    date: str
    greeting: str
    student_name: str
    next_best_action_title: Optional[str] = None
    next_best_action_minutes: Optional[int] = None
    pending_tasks_count: int = 0
    revision_due_count: int = 0
    nearest_exam_title: Optional[str] = None
    nearest_exam_days: Optional[float] = None
    streak: StreakResponse
    push_payload: Dict[str, Any] = Field(default_factory=dict)


class TestNotificationResponse(BaseModel):
    ok: bool
    message: str
    dispatched_sub_count: int
    payload: Dict[str, Any]
