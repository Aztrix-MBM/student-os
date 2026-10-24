import pytest
from app.engine.priority import calculate_priority


def test_priority_due_today():
    """Task due today has maximum urgency and specific reason."""
    res = calculate_priority(days_until_due=0.0, item_type="task")
    assert res["score"] > 0.3
    labels = [r["label"] for r in res["reasons"]]
    values = [r["value"] for r in res["reasons"]]
    assert "Urgency" in labels
    assert "Due today" in values


def test_priority_due_tomorrow():
    """Task due tomorrow has urgency 0.5."""
    res = calculate_priority(days_until_due=1.0, item_type="task")
    values = [r["value"] for r in res["reasons"]]
    assert "Due tomorrow" in values


def test_priority_overdue():
    """Overdue tasks should receive maximum urgency and overdue reason."""
    res = calculate_priority(days_until_due=-3.0, item_type="task")
    assert res["score"] >= 0.35
    values = [r["value"] for r in res["reasons"]]
    assert any("Overdue by 3 days" in v for v in values)


def test_priority_exam_today():
    """Exam occurring today provides maximum exam proximity boost."""
    res = calculate_priority(days_to_nearest_exam=0.0, item_type="topic")
    values = [r["value"] for r in res["reasons"]]
    assert "Exam is today!" in values
    assert res["score"] >= 0.25


def test_priority_exam_in_past_ignored():
    """Exams in the past (negative days) do not trigger proximity alerts."""
    res = calculate_priority(days_to_nearest_exam=-5.0, item_type="topic")
    labels = [r["label"] for r in res["reasons"]]
    assert "Exam Proximity" not in labels


def test_priority_weak_retention_alert():
    """Critical topic retention generates weakness score and alert."""
    res = calculate_priority(retention_score=0.25, item_type="topic")
    labels = [r["label"] for r in res["reasons"]]
    values = [r["value"] for r in res["reasons"]]
    assert "Retention Alert" in labels
    assert any("Critical decay" in v for v in values)
    assert res["score"] > 0.15


def test_priority_task_ignores_weakness():
    """Tasks should not receive retention weakness score even if retention is provided."""
    res_task = calculate_priority(retention_score=0.1, item_type="task")
    res_topic = calculate_priority(retention_score=0.1, item_type="topic")
    assert res_topic["score"] > res_task["score"]
    labels = [r["label"] for r in res_task["reasons"]]
    assert "Retention Alert" not in labels


def test_priority_fit_penalty_applied():
    """When estimated minutes exceeds available budget, fit penalty is deducted."""
    res_fit = calculate_priority(
        days_until_due=2.0, estimated_minutes=30, available_minutes_today=60
    )
    res_no_fit = calculate_priority(
        days_until_due=2.0, estimated_minutes=90, available_minutes_today=60
    )
    assert res_fit["score"] > res_no_fit["score"]
    values = [r["value"] for r in res_no_fit["reasons"]]
    assert any("Exceeds available study time" in v for v in values)


def test_priority_high_importance_flag():
    """High importance (>= 0.75) includes Weightage explanation."""
    res = calculate_priority(importance=0.9)
    labels = [r["label"] for r in res["reasons"]]
    assert "Weightage" in labels
