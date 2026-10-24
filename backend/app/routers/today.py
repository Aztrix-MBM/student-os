import json
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.database import get_db
from app.models.user import User
from app.models.academic import Subject, Topic, Exam, Task
from app.models.learning import TopicReview
from app.models.planner import DailyPlan, Recommendation
from app.security.deps import get_current_user
from app.schemas.today import (
    TodayPlanResponse,
    PlanItem,
    ReasonItem,
    WorkloadSummary,
    UpcomingExamItem,
    RecommendationActionResponse,
)
from app.engine.planner import generate_daily_plan
from app.engine.retention import retention, INITIAL_STABILITY

router = APIRouter(prefix="/api", tags=["Today Study Planner"])


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


@router.get("/today", response_model=TodayPlanResponse)
def get_today_plan(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generates an optimized daily study plan using the Pure Intelligence Engine:
    - Analyzes pending tasks (urgency & due dates)
    - Analyzes syllabus topics due for Spaced Repetition review
    - Analyzes upcoming exams (proximity boost)
    - Greedily fits candidate items into student's daily_study_minutes budget
    - Returns Next Best Action with human-readable 'Why' reasons
    """
    now = utc_now()
    today_str = now.strftime("%Y-%m-%d")
    available_minutes = max(30, current_user.daily_study_minutes or 180)

    # Query active dismissed recommendation IDs to avoid re-suggesting dismissed items today
    dismissed_rec_targets = set(
        db.scalars(
            select(Recommendation.target_id)
            .where(
                Recommendation.user_id == current_user.id,
                Recommendation.dismissed_at.is_not(None),
            )
        ).all()
    )

    # 1. Fetch uncompleted tasks for current user
    tasks_db = db.scalars(
        select(Task)
        .where(Task.user_id == current_user.id, Task.status != "completed", Task.completed_at.is_(None))
    ).all()

    task_cands: List[Dict[str, Any]] = []
    task_map: Dict[str, Task] = {}

    for t in tasks_db:
        if t.id in dismissed_rec_targets:
            continue
        task_map[t.id] = t
        due_days: Optional[float] = None
        if t.due_date:
            t_due = t.due_date if t.due_date.tzinfo else t.due_date.replace(tzinfo=timezone.utc)
            due_days = round((t_due - now).total_seconds() / 86400.0, 2)

        task_cands.append({
            "id": t.id,
            "title": t.title,
            "estimated_minutes": t.estimated_minutes or 30,
            "importance": 0.6 if t.priority >= 4 else 0.4,
            "subject_id": t.subject_id,
            "days_until_due": due_days,
            "completed": False,
        })

    # 2. Fetch upcoming exams
    exams_db = db.scalars(
        select(Exam)
        .where(Exam.user_id == current_user.id)
        .order_by(Exam.exam_date.asc())
    ).all()

    exam_cands: List[Dict[str, Any]] = []
    upcoming_exams_list: List[UpcomingExamItem] = []

    for ex in exams_db:
        ex_date = ex.exam_date if ex.exam_date.tzinfo else ex.exam_date.replace(tzinfo=timezone.utc)
        days_to = round((ex_date - now).total_seconds() / 86400.0, 1)
        if days_to >= -1.0:
            exam_cands.append({
                "id": ex.id,
                "subject_id": ex.subject_id,
                "days_to_exam": max(0.0, days_to),
            })
            if days_to >= 0.0:
                upcoming_exams_list.append(
                    UpcomingExamItem(
                        id=ex.id,
                        title=ex.title,
                        subject_name=ex.subject.name if ex.subject else "General",
                        exam_date=ex_date,
                        days_to_exam=days_to,
                        type=ex.type,
                    )
                )

    # 3. Fetch topics across all subjects owned by current user
    topics_db = db.scalars(
        select(Topic)
        .join(Subject, Topic.subject_id == Subject.id)
        .where(Subject.user_id == current_user.id)
    ).all()

    topic_cands: List[Dict[str, Any]] = []
    topic_map: Dict[str, Topic] = {}

    for top in topics_db:
        if top.id in dismissed_rec_targets:
            continue

        topic_map[top.id] = top
        latest_rev = db.scalars(
            select(TopicReview)
            .where(TopicReview.topic_id == top.id, TopicReview.user_id == current_user.id)
            .order_by(desc(TopicReview.reviewed_at))
        ).first()

        if latest_rev:
            r_time = latest_rev.reviewed_at
            if r_time.tzinfo is None:
                r_time = r_time.replace(tzinfo=timezone.utc)
            days_since = max(0.0, (now - r_time).total_seconds() / 86400.0)
            stability = latest_rev.stability_days
            self_level = latest_rev.self_level
        else:
            days_since = None
            stability = INITIAL_STABILITY
            self_level = None

        topic_cands.append({
            "id": top.id,
            "title": top.name,
            "subject_id": top.subject_id,
            "estimated_minutes": 25,
            "importance": top.importance or 0.5,
            "days_since_review": days_since,
            "stability": stability,
            "self_level": self_level,
        })

    # 4. Invoke Pure Intelligence Engine Planner
    engine_plan = generate_daily_plan(
        tasks=task_cands,
        topics=topic_cands,
        exams=exam_cands,
        daily_study_minutes=available_minutes,
        max_items=4,
    )

    def convert_candidate_to_plan_item(item_dict: Optional[Dict[str, Any]]) -> Optional[PlanItem]:
        if not item_dict:
            return None

        target_id = item_dict["id"]
        item_type = item_dict["type"]
        title = item_dict["title"]
        minutes = item_dict["minutes"]
        score = item_dict["score"]
        reasons_raw = item_dict.get("reasons", [])

        reasons = [ReasonItem(label=r["label"], value=r["value"]) for r in reasons_raw]

        # Resolve subject name
        sub_id = item_dict.get("subject_id")
        sub_name = None
        if item_type == "task" and target_id in task_map:
            t_obj = task_map[target_id]
            if t_obj.subject:
                sub_name = t_obj.subject.name
                sub_id = t_obj.subject_id
        elif item_type == "topic" and target_id in topic_map:
            top_obj = topic_map[target_id]
            if top_obj.subject:
                sub_name = top_obj.subject.name
                sub_id = top_obj.subject_id

        # Sync persistent Recommendation
        rec = db.scalars(
            select(Recommendation).where(
                Recommendation.user_id == current_user.id,
                Recommendation.target_id == target_id,
                Recommendation.target_type == item_type,
            )
        ).first()

        if not rec:
            rec = Recommendation(
                user_id=current_user.id,
                type=f"{item_type}_priority",
                target_type=item_type,
                target_id=target_id,
                score=score,
                reason_json=json.dumps([r.model_dump() for r in reasons]),
            )
            db.add(rec)
            db.flush()

        return PlanItem(
            id=target_id,
            title=title,
            type=item_type,
            minutes=minutes,
            score=score,
            reasons=reasons,
            subject_id=sub_id,
            subject_name=sub_name,
            completed=False,
            recommendation_id=rec.id,
        )

    next_best_action = convert_candidate_to_plan_item(engine_plan["next_best_action"])
    plan_items = [convert_candidate_to_plan_item(c) for c in engine_plan["plan"] if c]
    deferred_items = [convert_candidate_to_plan_item(c) for c in engine_plan.get("deferred", []) if c]

    workload_summary = WorkloadSummary(
        status=engine_plan["workload"]["status"],
        load_ratio=engine_plan["workload"]["load_ratio"],
        required_minutes=engine_plan["workload"]["required_minutes"],
        available_minutes=engine_plan["workload"]["available_minutes"],
        message=engine_plan["workload"]["message"],
    )

    # 5. Snapshot in daily_plans
    plan_snapshot = {
        "next_best_action": next_best_action.model_dump() if next_best_action else None,
        "plan": [p.model_dump() for p in plan_items if p],
        "workload": workload_summary.model_dump(),
    }

    existing_daily = db.scalars(
        select(DailyPlan).where(DailyPlan.user_id == current_user.id, DailyPlan.plan_date == today_str)
    ).first()

    if existing_daily:
        existing_daily.items_json = json.dumps(plan_snapshot)
        existing_daily.generated_at = now
    else:
        new_daily = DailyPlan(
            user_id=current_user.id,
            plan_date=today_str,
            items_json=json.dumps(plan_snapshot),
            generated_at=now,
        )
        db.add(new_daily)

    db.commit()

    return TodayPlanResponse(
        next_best_action=next_best_action,
        plan=[p for p in plan_items if p],
        deferred=[d for d in deferred_items if d],
        workload=workload_summary,
        upcoming_exams=upcoming_exams_list,
        student_daily_minutes=available_minutes,
        date=today_str,
        candidate_count=engine_plan["candidate_count"],
    )


@router.post("/recommendations/{rec_id}/accept", response_model=RecommendationActionResponse)
def accept_recommendation(
    rec_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Marks a study recommendation as accepted by the student."""
    rec = db.scalars(
        select(Recommendation).where(Recommendation.id == rec_id, Recommendation.user_id == current_user.id)
    ).first()
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found")

    rec.accepted_at = utc_now()
    rec.dismissed_at = None
    db.commit()

    return RecommendationActionResponse(
        id=rec.id,
        status="accepted",
        action_at=rec.accepted_at,
        target_type=rec.target_type,
        target_id=rec.target_id,
        message="Recommendation accepted! Added to priority study focus.",
    )


@router.post("/recommendations/{rec_id}/dismiss", response_model=RecommendationActionResponse)
def dismiss_recommendation(
    rec_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Dismisses a recommendation from today's plan."""
    rec = db.scalars(
        select(Recommendation).where(Recommendation.id == rec_id, Recommendation.user_id == current_user.id)
    ).first()
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found")

    rec.dismissed_at = utc_now()
    rec.accepted_at = None
    db.commit()

    return RecommendationActionResponse(
        id=rec.id,
        status="dismissed",
        action_at=rec.dismissed_at,
        target_type=rec.target_type,
        target_id=rec.target_id,
        message="Recommendation dismissed for today.",
    )
