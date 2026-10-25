from datetime import datetime, timezone, date
from typing import List, Optional, Set
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, delete

from app.database import get_db
from app.models.user import User
from app.models.learning import TopicReview, StudySession
from app.models.academic import Exam, Task, Topic
from app.models.notifications import PushSubscription, NotificationPreference
from app.security.deps import get_current_user
from app.engine.streak import calculate_soft_streak
from app.schemas.notifications import (
    StreakResponse,
    PushSubscriptionCreate,
    PushSubscriptionResponse,
    NotificationPreferenceResponse,
    NotificationPreferenceUpdate,
    MorningDigestResponse,
    TestNotificationResponse,
)

router = APIRouter(prefix="/api", tags=["Retention & Notifications"])


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


@router.get("/retention/streak", response_model=StreakResponse)
def get_user_streak(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Computes and returns the student's current Soft Streak, longest streak,
    grace day status, and activity calendar from chronological review and session events.
    """
    now = utc_now()
    today_date = now.date()

    # Query all review dates
    reviews = db.scalars(
        select(TopicReview.reviewed_at)
        .where(TopicReview.user_id == current_user.id)
    ).all()

    # Query all study session dates
    sessions = db.scalars(
        select(StudySession.started_at)
        .where(StudySession.user_id == current_user.id)
    ).all()

    # Aggregate unique dates
    activity_dates: Set[date] = set()
    for dt in reviews:
        if dt:
            d = dt.date() if isinstance(dt, datetime) else dt
            activity_dates.add(d)

    for dt in sessions:
        if dt:
            d = dt.date() if isinstance(dt, datetime) else dt
            activity_dates.add(d)

    # Compute soft streak using pure engine
    streak_result = calculate_soft_streak(
        activity_dates=list(activity_dates),
        today=today_date,
        grace_days_allowed=1,
    )

    calendar_sorted = sorted([d.strftime("%Y-%m-%d") for d in activity_dates], reverse=True)[:30]

    return StreakResponse(
        current_streak=streak_result.current_streak,
        longest_streak=streak_result.longest_streak,
        total_active_days=streak_result.total_active_days,
        is_active_today=streak_result.is_active_today,
        grace_days_used=streak_result.grace_days_used,
        grace_days_remaining=streak_result.grace_days_remaining,
        status=streak_result.status,
        message=streak_result.message,
        activity_calendar=calendar_sorted,
    )


@router.post("/notifications/subscribe", response_model=PushSubscriptionResponse, status_code=status.HTTP_201_CREATED)
def subscribe_push(
    payload: PushSubscriptionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Registers a browser Web Push subscription for morning plans and revision alerts.
    """
    # Check if this exact endpoint already exists for this user
    existing = db.scalar(
        select(PushSubscription).where(
            PushSubscription.user_id == current_user.id,
            PushSubscription.endpoint == payload.endpoint,
        )
    )
    if existing:
        existing.p256dh = payload.p256dh
        existing.auth = payload.auth
        db.commit()
        db.refresh(existing)
        return PushSubscriptionResponse(
            id=existing.id,
            endpoint=existing.endpoint,
            created_at=existing.created_at,
        )

    sub = PushSubscription(
        user_id=current_user.id,
        endpoint=payload.endpoint,
        p256dh=payload.p256dh,
        auth=payload.auth,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)

    return PushSubscriptionResponse(
        id=sub.id,
        endpoint=sub.endpoint,
        created_at=sub.created_at,
    )


@router.delete("/notifications/unsubscribe")
def unsubscribe_push(
    endpoint: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Removes a Web Push subscription.
    """
    sub = db.scalar(
        select(PushSubscription).where(
            PushSubscription.user_id == current_user.id,
            PushSubscription.endpoint == endpoint,
        )
    )
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")

    db.delete(sub)
    db.commit()
    return {"ok": True, "message": "Unsubscribed successfully"}


@router.get("/notifications/preferences", response_model=NotificationPreferenceResponse)
def get_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Gets user notification preferences and push subscription status.
    """
    pref = db.scalar(
        select(NotificationPreference).where(NotificationPreference.user_id == current_user.id)
    )
    if not pref:
        pref = NotificationPreference(user_id=current_user.id)
        db.add(pref)
        db.commit()
        db.refresh(pref)

    subs_count = db.scalar(
        select(PushSubscription.id)
        .where(PushSubscription.user_id == current_user.id)
        .limit(1)
    )

    return NotificationPreferenceResponse(
        morning_plan_enabled=pref.morning_plan_enabled,
        morning_plan_time=pref.morning_plan_time,
        revision_due_alerts=pref.revision_due_alerts,
        exam_countdown_alerts=pref.exam_countdown_alerts,
        telegram_chat_id=pref.telegram_chat_id,
        has_push_subscription=subs_count is not None,
    )


@router.patch("/notifications/preferences", response_model=NotificationPreferenceResponse)
def update_notification_preferences(
    payload: NotificationPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Updates student notification preferences.
    """
    pref = db.scalar(
        select(NotificationPreference).where(NotificationPreference.user_id == current_user.id)
    )
    if not pref:
        pref = NotificationPreference(user_id=current_user.id)
        db.add(pref)

    if payload.morning_plan_enabled is not None:
        pref.morning_plan_enabled = payload.morning_plan_enabled
    if payload.morning_plan_time is not None:
        pref.morning_plan_time = payload.morning_plan_time
    if payload.revision_due_alerts is not None:
        pref.revision_due_alerts = payload.revision_due_alerts
    if payload.exam_countdown_alerts is not None:
        pref.exam_countdown_alerts = payload.exam_countdown_alerts
    if payload.telegram_chat_id is not None:
        pref.telegram_chat_id = payload.telegram_chat_id

    db.commit()
    db.refresh(pref)

    subs_count = db.scalar(
        select(PushSubscription.id)
        .where(PushSubscription.user_id == current_user.id)
        .limit(1)
    )

    return NotificationPreferenceResponse(
        morning_plan_enabled=pref.morning_plan_enabled,
        morning_plan_time=pref.morning_plan_time,
        revision_due_alerts=pref.revision_due_alerts,
        exam_countdown_alerts=pref.exam_countdown_alerts,
        telegram_chat_id=pref.telegram_chat_id,
        has_push_subscription=subs_count is not None,
    )


@router.get("/notifications/morning-digest", response_model=MorningDigestResponse)
def get_morning_digest(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generates the morning study plan digest payload ready for Web Push or Telegram dispatch.
    """
    now = utc_now()
    today_date = now.date()

    # 1. Calculate streak
    reviews = db.scalars(
        select(TopicReview.reviewed_at)
        .where(TopicReview.user_id == current_user.id)
    ).all()
    sessions = db.scalars(
        select(StudySession.started_at)
        .where(StudySession.user_id == current_user.id)
    ).all()

    activity_dates: Set[date] = set()
    for dt in reviews:
        if dt:
            d = dt.date() if isinstance(dt, datetime) else dt
            activity_dates.add(d)
    for dt in sessions:
        if dt:
            d = dt.date() if isinstance(dt, datetime) else dt
            activity_dates.add(d)

    streak_res = calculate_soft_streak(list(activity_dates), today_date)
    streak_data = StreakResponse(
        current_streak=streak_res.current_streak,
        longest_streak=streak_res.longest_streak,
        total_active_days=streak_res.total_active_days,
        is_active_today=streak_res.is_active_today,
        grace_days_used=streak_res.grace_days_used,
        grace_days_remaining=streak_res.grace_days_remaining,
        status=streak_res.status,
        message=streak_res.message,
        activity_calendar=sorted([d.strftime("%Y-%m-%d") for d in activity_dates], reverse=True)[:10],
    )

    # 2. Count pending tasks
    pending_tasks_count = db.scalar(
        select(Task.id)
        .where(Task.user_id == current_user.id, Task.status != "completed", Task.completed_at.is_(None))
    )
    tasks_count = len(db.scalars(
        select(Task.id).where(Task.user_id == current_user.id, Task.status != "completed")
    ).all())

    # 3. Nearest exam
    exams = db.scalars(
        select(Exam)
        .where(Exam.user_id == current_user.id)
        .order_by(Exam.exam_date.asc())
    ).all()

    nearest_exam_title: Optional[str] = None
    nearest_exam_days: Optional[float] = None
    for ex in exams:
        ex_date = ex.exam_date if ex.exam_date.tzinfo else ex.exam_date.replace(tzinfo=timezone.utc)
        diff_days = round((ex_date - now).total_seconds() / 86400.0, 1)
        if diff_days >= 0:
            nearest_exam_title = ex.title
            nearest_exam_days = diff_days
            break

    # 4. Formulate notification payload
    student_name = current_user.name or "Student"
    streak_text = f"🔥 {streak_res.current_streak}-Day Streak" if streak_res.current_streak > 0 else "🌱 Start your streak today"
    exam_text = f" • {nearest_exam_title} in {int(nearest_exam_days)}d" if nearest_exam_title and nearest_exam_days is not None else ""

    push_title = f"Good Morning, {student_name}! ☀️"
    push_body = f"{streak_text}! You have {tasks_count} pending tasks{exam_text}. Tap to view your plan."

    push_payload = {
        "title": push_title,
        "body": push_body,
        "icon": "/favicon.svg",
        "badge": "/favicon.svg",
        "data": {
            "url": "/",
            "type": "morning_plan",
            "date": today_date.strftime("%Y-%m-%d"),
        },
    }

    return MorningDigestResponse(
        date=today_date.strftime("%Y-%m-%d"),
        greeting=f"Good Morning, {student_name}!",
        student_name=student_name,
        pending_tasks_count=tasks_count,
        revision_due_count=0,
        nearest_exam_title=nearest_exam_title,
        nearest_exam_days=nearest_exam_days,
        streak=streak_data,
        push_payload=push_payload,
    )


@router.post("/notifications/test-send", response_model=TestNotificationResponse)
def test_send_notification(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generates and simulates a push notification dispatch for the student's registered devices.
    """
    subs = db.scalars(
        select(PushSubscription).where(PushSubscription.user_id == current_user.id)
    ).all()

    digest = get_morning_digest(current_user=current_user, db=db)

    return TestNotificationResponse(
        ok=True,
        message=f"Test notification generated for {len(subs)} registered device(s)",
        dispatched_sub_count=len(subs),
        payload=digest.push_payload,
    )
