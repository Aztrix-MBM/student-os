from typing import List, Dict, Any, Optional
from app.engine.priority import calculate_priority
from app.engine.retention import retention, is_review_due


def generate_daily_plan(
    tasks: Optional[List[Dict[str, Any]]] = None,
    topics: Optional[List[Dict[str, Any]]] = None,
    exams: Optional[List[Dict[str, Any]]] = None,
    daily_study_minutes: int = 120,
    max_items: int = 5,
) -> Dict[str, Any]:
    """
    Generates an optimized daily study plan using greedy priority-per-minute heuristic:
    1. Aggregates candidates:
       - Pending tasks due soon / overdue
       - Topics with review due based on retention decay
       - Weak or unreviewed topics for upcoming exams
    2. Scores each candidate using calculate_priority(...)
    3. Greedily allocates available daily_study_minutes
    4. Computes workload load_ratio (<0.7 comfortable, 0.7-1.0 busy, >1.0 overloaded)
    5. Identifies next_best_action (highest score candidate)

    :param tasks: List of candidate task dicts (completed tasks ignored).
    :param topics: List of candidate topic dicts.
    :param exams: List of upcoming exam dicts for proximity calculations.
    :param daily_study_minutes: Total minutes student can allocate today (e.g. 120m).
    :param max_items: Maximum items in the final daily plan (3 to 5).
    :return: Dict containing next_best_action, plan, deferred, workload, candidate_count.
    """
    tasks = tasks or []
    topics = topics or []
    exams = exams or []

    # Map nearest exam proximity by subject_id or general minimum
    subject_to_nearest_exam: Dict[Any, float] = {}
    min_general_exam_days: Optional[float] = None

    for ex in exams:
        # Ignore exams already concluded in the past (negative days)
        raw_exam_days = ex.get("days_to_exam")
        if raw_exam_days is None:
            raw_exam_days = ex.get("days_until")
        if raw_exam_days is not None and float(raw_exam_days) >= 0.0:
            days_val = float(raw_exam_days)
            sub_id = ex.get("subject_id")
            if sub_id is not None:
                if sub_id not in subject_to_nearest_exam or days_val < subject_to_nearest_exam[sub_id]:
                    subject_to_nearest_exam[sub_id] = days_val

            if min_general_exam_days is None or days_val < min_general_exam_days:
                min_general_exam_days = days_val

    candidates: List[Dict[str, Any]] = []

    # 1. Process Task candidates
    for task in tasks:
        if task.get("completed", False):
            continue

        task_id = task.get("id")
        title = task.get("title", f"Task {task_id or 'Untitled'}")
        est_minutes = int(task.get("estimated_minutes") or 30)
        due_days = task.get("days_until_due")
        if due_days is None and "due_date_days" in task:
            due_days = task.get("due_date_days")
        due_days_val = float(due_days) if due_days is not None else None

        importance = float(task.get("importance", 0.5))
        subject_id = task.get("subject_id")
        exam_prox_days = (
            subject_to_nearest_exam.get(subject_id)
            if subject_id is not None
            else min_general_exam_days
        )

        p_result = calculate_priority(
            days_until_due=due_days_val,
            days_to_nearest_exam=exam_prox_days,
            retention_score=None,
            importance=importance,
            estimated_minutes=est_minutes,
            available_minutes_today=daily_study_minutes,
            item_type="task",
        )

        candidates.append({
            "id": task_id,
            "title": title,
            "type": "task",
            "minutes": est_minutes,
            "score": p_result["score"],
            "reasons": p_result["reasons"],
            "subject_id": subject_id,
        })

    # 2. Process Topic candidates
    for topic in topics:
        topic_id = topic.get("id")
        title = topic.get("title") or topic.get("name") or f"Topic {topic_id or 'Untitled'}"
        est_minutes = int(topic.get("estimated_minutes") or 25)
        importance = float(topic.get("importance", 0.5))
        subject_id = topic.get("subject_id")
        exam_prox_days = (
            subject_to_nearest_exam.get(subject_id)
            if subject_id is not None
            else min_general_exam_days
        )

        days_since_review = topic.get("days_since_review")
        stability = float(topic.get("stability", 2.0))
        self_level = (topic.get("self_level") or "").lower()

        if days_since_review is not None and float(days_since_review) >= 0.0:
            retention_val = retention(float(days_since_review), stability)
            review_due = is_review_due(float(days_since_review), stability)
        else:
            # Never reviewed topic
            retention_val = 0.0
            review_due = True

        # Candidate eligibility: review is due, self_level is weak, or exam is near (<= 14 days)
        is_candidate = (
            review_due
            or self_level == "weak"
            or (exam_prox_days is not None and exam_prox_days <= 14.0)
            or topic.get("is_candidate", False)
        )

        if not is_candidate:
            continue

        p_result = calculate_priority(
            days_until_due=None,
            days_to_nearest_exam=exam_prox_days,
            retention_score=retention_val,
            importance=importance,
            estimated_minutes=est_minutes,
            available_minutes_today=daily_study_minutes,
            item_type="topic",
        )

        candidates.append({
            "id": topic_id,
            "title": title,
            "type": "topic",
            "minutes": est_minutes,
            "score": p_result["score"],
            "reasons": p_result["reasons"],
            "subject_id": subject_id,
            "retention": round(retention_val, 2),
        })

    # Calculate workload metrics
    total_candidate_minutes = sum(c["minutes"] for c in candidates)
    safe_available = max(0, daily_study_minutes)

    if safe_available > 0:
        load_ratio = round(total_candidate_minutes / safe_available, 2)
    else:
        load_ratio = 999.0 if total_candidate_minutes > 0 else 0.0

    if load_ratio < 0.7:
        workload_status = "comfortable"
        workload_msg = "Comfortable workload. You have plenty of time for deep focus."
    elif load_ratio <= 1.0:
        workload_status = "busy"
        workload_msg = "Productive pace today. Stick to your scheduled focus blocks."
    else:
        workload_status = "overloaded"
        workload_msg = (
            f"Overloaded schedule ({total_candidate_minutes}m required vs {safe_available}m available). "
            "Consider deferring lower priority tasks or increasing study time."
        )

    # Empty candidate handling
    if not candidates:
        return {
            "next_best_action": None,
            "plan": [],
            "deferred": [],
            "workload": {
                "status": "comfortable",
                "load_ratio": 0.0,
                "required_minutes": 0,
                "available_minutes": safe_available,
                "planned_minutes": 0,
                "backlog_minutes": 0,
                "message": "All caught up! No pending tasks or topics due for review.",
            },
            "candidate_count": 0,
        }

    # Identify Next Best Action: item with absolute highest priority score
    # Tie-breaker: higher importance or shorter minutes
    best_candidate = max(candidates, key=lambda c: (c["score"], -c["minutes"]))
    next_best_action = {
        "id": best_candidate["id"],
        "title": best_candidate["title"],
        "type": best_candidate["type"],
        "minutes": best_candidate["minutes"],
        "score": best_candidate["score"],
        "reasons": best_candidate["reasons"],
    }

    # Greedy fit by efficiency (score / minute) while respecting daily_study_minutes
    # Sort candidates by efficiency descending
    sorted_by_efficiency = sorted(
        candidates,
        key=lambda c: (c["score"] / max(1, c["minutes"]), c["score"]),
        reverse=True,
    )

    plan: List[Dict[str, Any]] = []
    deferred: List[Dict[str, Any]] = []
    remaining_budget = safe_available

    # Always ensure the next_best_action is considered first if budget allows or as top item
    for candidate in sorted_by_efficiency:
        if len(plan) >= max_items:
            deferred.append(candidate)
            continue

        item_min = candidate["minutes"]
        if remaining_budget >= item_min or len(plan) == 0:
            # Fit into plan (if it's the very first item and budget is low, include it to give actionable plan)
            plan.append({
                "id": candidate["id"],
                "title": candidate["title"],
                "type": candidate["type"],
                "minutes": item_min,
                "score": candidate["score"],
                "reasons": candidate["reasons"],
            })
            remaining_budget = max(0, remaining_budget - item_min)
        else:
            deferred.append(candidate)

    planned_total = sum(p["minutes"] for p in plan)
    return {
        "next_best_action": next_best_action,
        "plan": plan,
        "deferred": deferred,
        "workload": {
            "status": workload_status,
            "load_ratio": load_ratio,
            "required_minutes": total_candidate_minutes,
            "available_minutes": safe_available,
            "planned_minutes": planned_total,
            "backlog_minutes": total_candidate_minutes,
            "message": workload_msg,
        },
        "candidate_count": len(candidates),
    }
