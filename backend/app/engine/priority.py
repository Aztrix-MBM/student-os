from typing import Optional, List, Dict, Any


def calculate_priority(
    days_until_due: Optional[float] = None,
    days_to_nearest_exam: Optional[float] = None,
    retention_score: Optional[float] = None,
    importance: float = 0.5,
    estimated_minutes: int = 30,
    available_minutes_today: int = 180,
    item_type: str = "topic",
) -> Dict[str, Any]:
    """
    Computes priority score and mandatory human-readable reasons for Today study planner:
    score = 0.35*urgency + 0.25*exam_prox + 0.20*weakness + 0.15*importance - 0.05*fit_penalty

    :param days_until_due: Days until task/assignment due date (can be negative if overdue).
    :param days_to_nearest_exam: Days until related subject exam (0 = today, negative = past).
    :param retention_score: Current retention level in range [0.0, 1.0] (None for tasks).
    :param importance: Weightage / significance factor in range [0.0, 1.0].
    :param estimated_minutes: Required time duration in minutes.
    :param available_minutes_today: Daily remaining study budget in minutes.
    :param item_type: 'topic' or 'task'.
    :return: Dict containing 'score' (float) and 'reasons' (list of {label, value}).
    """
    reasons: List[Dict[str, str]] = []

    # 1. Urgency calculation
    if days_until_due is None:
        urgency = 0.0
    elif days_until_due < 0.0:
        urgency = 1.0
        overdue_days = abs(int(days_until_due))
        reasons.append({"label": "Urgency", "value": f"Overdue by {overdue_days} day{'s' if overdue_days > 1 else ''}"})
    elif days_until_due == 0.0:
        urgency = 1.0
        reasons.append({"label": "Urgency", "value": "Due today"})
    elif days_until_due == 1.0:
        urgency = 0.5
        reasons.append({"label": "Urgency", "value": "Due tomorrow"})
    else:
        urgency = 1.0 / (1.0 + days_until_due)
        reasons.append({"label": "Urgency", "value": f"Due in {int(days_until_due)} days"})

    # 2. Exam Proximity calculation
    if days_to_nearest_exam is None or days_to_nearest_exam < 0.0:
        exam_prox = 0.0
    elif days_to_nearest_exam == 0.0:
        exam_prox = 1.0
        reasons.append({"label": "Exam Proximity", "value": "Exam is today!"})
    elif days_to_nearest_exam == 1.0:
        exam_prox = 0.5
        reasons.append({"label": "Exam Proximity", "value": "Exam tomorrow"})
    else:
        exam_prox = 1.0 / (1.0 + days_to_nearest_exam)
        reasons.append({"label": "Exam Proximity", "value": f"Exam in {int(days_to_nearest_exam)} days"})

    # 3. Weakness calculation
    if item_type.lower() == "task" or retention_score is None:
        weakness = 0.0
    else:
        clamped_retention = max(0.0, min(1.0, retention_score))
        weakness = 1.0 - clamped_retention
        if clamped_retention < 0.4:
            reasons.append({"label": "Retention Alert", "value": f"Critical decay (retention at {int(clamped_retention * 100)}%)"})
        elif clamped_retention < 0.7:
            reasons.append({"label": "Retention Alert", "value": f"Review due (retention at {int(clamped_retention * 100)}%)"})

    # 4. Importance
    clamped_importance = max(0.0, min(1.0, importance))
    if clamped_importance >= 0.75:
        reasons.append({"label": "Weightage", "value": "High exam importance"})

    # 5. Fit Penalty
    if available_minutes_today <= 0 or estimated_minutes > available_minutes_today:
        fit_penalty = 1.0
        reasons.append({"label": "Time Fit", "value": f"Exceeds available study time ({estimated_minutes}m > {max(0, available_minutes_today)}m)"})
    else:
        fit_penalty = 0.0

    raw_score = (
        0.35 * urgency
        + 0.25 * exam_prox
        + 0.20 * weakness
        + 0.15 * clamped_importance
        - 0.05 * fit_penalty
    )

    score = round(max(0.0, min(1.0, raw_score)), 4)

    return {
        "score": score,
        "reasons": reasons,
    }
