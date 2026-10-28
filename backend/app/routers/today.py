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
    TogglePlanItemRequest,
    TogglePlanItemResponse,
)
from app.engine.planner import generate_daily_plan
from app.engine.retention import retention, INITIAL_STABILITY
from app.analytics import log_event

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
    available_minutes = max(30, current_user.daily_study_minutes or 120)

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
    dynamic_max_items = max(4, min(10, available_minutes // 25))
    engine_plan = generate_daily_plan(
        tasks=task_cands,
        topics=topic_cands,
        exams=exam_cands,
        daily_study_minutes=available_minutes,
        max_items=dynamic_max_items,
    )

    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    reviewed_today_topic_ids = set(
        db.scalars(
            select(TopicReview.topic_id)
            .where(
                TopicReview.user_id == current_user.id,
                TopicReview.reviewed_at >= today_start,
            )
        ).all()
    )
    completed_task_ids = set(
        db.scalars(
            select(Task.id)
            .where(
                Task.user_id == current_user.id,
                Task.status == "completed",
            )
        ).all()
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

        is_completed = bool(
            item_dict.get("completed")
            or (item_type == "topic" and target_id in reviewed_today_topic_ids)
            or (item_type == "task" and target_id in completed_task_ids)
        )

        return PlanItem(
            id=target_id,
            title=title,
            type=item_type,
            minutes=minutes,
            score=score,
            reasons=reasons,
            subject_id=sub_id,
            subject_name=sub_name,
            completed=is_completed,
            recommendation_id=rec.id,
        )

    # 5. Check if daily plan already exists for today to preserve planned items
    existing_daily = db.scalars(
        select(DailyPlan).where(DailyPlan.user_id == current_user.id, DailyPlan.plan_date == today_str)
    ).first()

    saved_items: List[PlanItem] = []
    if existing_daily and existing_daily.items_json:
        try:
            saved_data = json.loads(existing_daily.items_json)
            for raw_item in saved_data.get("plan", []):
                t_id = raw_item.get("id")
                if not t_id or t_id in dismissed_rec_targets:
                    continue
                t_type = raw_item.get("type", "topic")
                is_done = bool(
                    raw_item.get("completed")
                    or (t_type == "topic" and t_id in reviewed_today_topic_ids)
                    or (t_type == "task" and t_id in completed_task_ids)
                )
                reasons = [ReasonItem(**r) for r in raw_item.get("reasons", [])]
                saved_items.append(
                    PlanItem(
                        id=t_id,
                        title=raw_item.get("title", ""),
                        type=t_type,
                        minutes=raw_item.get("minutes", 25),
                        score=raw_item.get("score", 0.5),
                        reasons=reasons,
                        subject_id=raw_item.get("subject_id"),
                        subject_name=raw_item.get("subject_name"),
                        completed=is_done,
                        recommendation_id=raw_item.get("recommendation_id"),
                    )
                )
        except Exception:
            saved_items = []

    # If dynamic budget increased, append additional candidate items
    existing_ids = {p.id for p in saved_items}
    for cand in engine_plan["plan"]:
        if len(saved_items) >= dynamic_max_items:
            break
        if not cand or cand.get("id") in existing_ids or cand.get("id") in dismissed_rec_targets:
            continue
        new_plan_item = convert_candidate_to_plan_item(cand)
        if new_plan_item:
            saved_items.append(new_plan_item)
            existing_ids.add(new_plan_item.id)

    if saved_items:
        plan_items = saved_items
    else:
        plan_items = [convert_candidate_to_plan_item(c) for c in engine_plan["plan"] if c]

    # Pick Next Best Action: first uncompleted item, or first item if all completed
    uncompleted = [p for p in plan_items if not p.completed]
    if uncompleted:
        next_best_action = uncompleted[0]
    elif plan_items:
        next_best_action = plan_items[0]
    else:
        next_best_action = convert_candidate_to_plan_item(engine_plan["next_best_action"])

    existing_item_ids = {p.id for p in plan_items}
    deferred_items = [
        convert_candidate_to_plan_item(c)
        for c in engine_plan.get("deferred", [])
        if c and c.get("id") not in existing_item_ids and c.get("id") not in dismissed_rec_targets
    ]

    plan_minutes = sum(p.minutes for p in plan_items if p)
    workload_summary = WorkloadSummary(
        status=engine_plan["workload"]["status"],
        load_ratio=engine_plan["workload"]["load_ratio"],
        required_minutes=engine_plan["workload"]["required_minutes"],
        available_minutes=available_minutes,
        planned_minutes=plan_minutes,
        backlog_minutes=engine_plan["workload"].get("backlog_minutes", engine_plan["workload"]["required_minutes"]),
        message=engine_plan["workload"]["message"],
    )

    # Snapshot in daily_plans
    plan_snapshot = {
        "next_best_action": next_best_action.model_dump() if next_best_action else None,
        "plan": [p.model_dump() for p in plan_items if p],
        "workload": workload_summary.model_dump(),
    }

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

    log_event(
        db,
        "plan_viewed",
        user_id=current_user.id,
        properties={"plan_items_count": len([p for p in plan_items if p]), "workload_status": workload_summary.status},
    )

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


@router.post("/today/toggle-item", response_model=TogglePlanItemResponse)
def toggle_today_plan_item(
    payload: TogglePlanItemRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Toggles completion status for an item in Today's Study Plan.
    Persists completion in DailyPlan, TopicReview, and Task tables.
    """
    now = utc_now()
    today_str = now.strftime("%Y-%m-%d")
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)

    existing_daily = db.scalars(
        select(DailyPlan).where(DailyPlan.user_id == current_user.id, DailyPlan.plan_date == today_str)
    ).first()

    item_type = "topic"
    if existing_daily and existing_daily.items_json:
        try:
            data = json.loads(existing_daily.items_json)
            for itm in data.get("plan", []):
                if itm.get("id") == payload.item_id:
                    itm["completed"] = payload.completed
                    item_type = itm.get("type", item_type)
            if data.get("next_best_action") and data["next_best_action"].get("id") == payload.item_id:
                data["next_best_action"]["completed"] = payload.completed
            existing_daily.items_json = json.dumps(data)
        except Exception:
            pass

    # Update Task or Topic Review
    if payload.item_id.startswith("tsk_") or item_type == "task":
        task = db.scalars(
            select(Task).where(Task.id == payload.item_id, Task.user_id == current_user.id)
        ).first()
        if task:
            task.status = "completed" if payload.completed else "todo"
            task.completed_at = now if payload.completed else None
    else:
        # Topic
        if payload.completed:
            # Create review record if not reviewed today
            existing_rev = db.scalars(
                select(TopicReview).where(
                    TopicReview.user_id == current_user.id,
                    TopicReview.topic_id == payload.item_id,
                    TopicReview.reviewed_at >= today_start,
                )
            ).first()
            if not existing_rev:
                new_rev = TopicReview(
                    user_id=current_user.id,
                    topic_id=payload.item_id,
                    quality_rating="good",
                    performance_rating="okay",
                    stability_days=3.0,
                    reviewed_at=now,
                )
                db.add(new_rev)
        else:
            # Remove today's review for this topic
            today_revs = db.scalars(
                select(TopicReview).where(
                    TopicReview.user_id == current_user.id,
                    TopicReview.topic_id == payload.item_id,
                    TopicReview.reviewed_at >= today_start,
                )
            ).all()
            for r in today_revs:
                db.delete(r)

    db.commit()

    return TogglePlanItemResponse(
        success=True,
        item_id=payload.item_id,
        completed=payload.completed,
    )
