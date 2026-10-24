import pytest
from app.engine.planner import generate_daily_plan


def test_planner_empty_inputs():
    """Empty inputs yield empty plan, None next_best_action, and comfortable workload."""
    res = generate_daily_plan(tasks=[], topics=[], exams=[], daily_study_minutes=120)
    assert res["plan"] == []
    assert res["next_best_action"] is None
    assert res["candidate_count"] == 0
    assert res["workload"]["status"] == "comfortable"
    assert res["workload"]["load_ratio"] == 0.0


def test_planner_completed_tasks_ignored():
    """Completed tasks must not be scheduled or counted as candidates."""
    tasks = [
        {"id": 1, "title": "Done HW", "completed": True, "estimated_minutes": 45, "days_until_due": 0},
        {"id": 2, "title": "Done Lab", "completed": True, "estimated_minutes": 60, "days_until_due": 1},
    ]
    res = generate_daily_plan(tasks=tasks, topics=[], daily_study_minutes=120)
    assert res["candidate_count"] == 0
    assert res["plan"] == []


def test_planner_next_best_action_selection():
    """The highest priority item must be selected as next_best_action."""
    tasks = [
        {"id": 1, "title": "Urgent Assignment", "days_until_due": 0.0, "estimated_minutes": 30, "importance": 0.9},
        {"id": 2, "title": "Future Project", "days_until_due": 10.0, "estimated_minutes": 30, "importance": 0.4},
    ]
    res = generate_daily_plan(tasks=tasks, daily_study_minutes=120)
    assert res["next_best_action"] is not None
    assert res["next_best_action"]["id"] == 1
    assert res["next_best_action"]["title"] == "Urgent Assignment"
    assert res["next_best_action"]["score"] > 0.4


def test_planner_exam_today_boost():
    """Upcoming exam occurring today gives top priority to related topics."""
    exams = [{"id": 1, "subject_id": 10, "days_to_exam": 0.0}]
    topics = [
        {"id": 101, "subject_id": 10, "title": "Exam Topic 1", "days_since_review": 5.0, "estimated_minutes": 30},
        {"id": 102, "subject_id": 99, "title": "Unrelated Topic", "days_since_review": 1.0, "estimated_minutes": 30},
    ]
    res = generate_daily_plan(topics=topics, exams=exams, daily_study_minutes=120)
    assert res["next_best_action"] is not None
    assert res["next_best_action"]["id"] == 101
    assert any("Exam is today!" in r["value"] for r in res["next_best_action"]["reasons"])


def test_planner_exam_in_past_ignored():
    """Past exam (negative days) does not elevate related topics."""
    exams = [{"id": 1, "subject_id": 10, "days_to_exam": -3.0}]
    topics = [
        {"id": 101, "subject_id": 10, "title": "Past Exam Topic", "days_since_review": 1.0, "estimated_minutes": 30, "is_candidate": True}
    ]
    res = generate_daily_plan(topics=topics, exams=exams, daily_study_minutes=120)
    assert res["candidate_count"] == 1
    reasons = res["plan"][0]["reasons"]
    labels = [r["label"] for r in reasons]
    assert "Exam Proximity" not in labels


def test_planner_greedy_fit_budget():
    """Plan greedily includes items that fit in the daily study minutes."""
    tasks = [
        {"id": 1, "title": "Task 1", "days_until_due": 1.0, "estimated_minutes": 40},
        {"id": 2, "title": "Task 2", "days_until_due": 1.0, "estimated_minutes": 40},
        {"id": 3, "title": "Task 3", "days_until_due": 1.0, "estimated_minutes": 50},
    ]
    # Total minutes = 130m. Available = 80m. Max fit = 2 tasks (80m), 1 deferred.
    res = generate_daily_plan(tasks=tasks, daily_study_minutes=80)
    assert len(res["plan"]) == 2
    assert len(res["deferred"]) == 1
    scheduled_minutes = sum(item["minutes"] for item in res["plan"])
    assert scheduled_minutes <= 80


def test_planner_workload_thresholds():
    """Workload classifies into comfortable (<0.7), busy (0.7-1.0), and overloaded (>1.0)."""
    # 1. Comfortable: 30m / 100m = 0.3
    res_comf = generate_daily_plan(
        tasks=[{"id": 1, "title": "Quick", "estimated_minutes": 30, "days_until_due": 1}],
        daily_study_minutes=100,
    )
    assert res_comf["workload"]["status"] == "comfortable"
    assert res_comf["workload"]["load_ratio"] < 0.7

    # 2. Busy: 80m / 100m = 0.8
    res_busy = generate_daily_plan(
        tasks=[{"id": 1, "title": "Med", "estimated_minutes": 80, "days_until_due": 1}],
        daily_study_minutes=100,
    )
    assert res_busy["workload"]["status"] == "busy"
    assert 0.7 <= res_busy["workload"]["load_ratio"] <= 1.0

    # 3. Overloaded: 150m / 100m = 1.5
    res_over = generate_daily_plan(
        tasks=[
            {"id": 1, "title": "Big 1", "estimated_minutes": 90, "days_until_due": 0},
            {"id": 2, "title": "Big 2", "estimated_minutes": 60, "days_until_due": 0},
        ],
        daily_study_minutes=100,
    )
    assert res_over["workload"]["status"] == "overloaded"
    assert res_over["workload"]["load_ratio"] > 1.0
    assert "Overloaded schedule" in res_over["workload"]["message"]


def test_planner_zero_available_minutes():
    """Zero daily study minutes handles safely without division error."""
    tasks = [{"id": 1, "title": "Task", "estimated_minutes": 30, "days_until_due": 0}]
    res = generate_daily_plan(tasks=tasks, daily_study_minutes=0)
    assert res["workload"]["status"] == "overloaded"
    assert res["workload"]["available_minutes"] == 0
    assert res["candidate_count"] == 1


def test_planner_max_items_cap():
    """Plan caps at max_items (default 5)."""
    tasks = [
        {"id": i, "title": f"Task {i}", "days_until_due": 1, "estimated_minutes": 10}
        for i in range(1, 10)
    ]
    res = generate_daily_plan(tasks=tasks, daily_study_minutes=300, max_items=5)
    assert len(res["plan"]) == 5
    assert len(res["deferred"]) == 4
