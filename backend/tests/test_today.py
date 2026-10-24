import uuid
from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.academic import Subject, Unit, Topic, Exam, Task
from app.models.learning import TopicReview
from app.models.planner import DailyPlan, Recommendation
from app.security.rate_limiter import auth_rate_limiter
from sqlalchemy import select


@pytest.fixture(autouse=True)
def reset_limiter_before_each_test():
    auth_rate_limiter.reset()
    yield
    auth_rate_limiter.reset()


def create_authenticated_client(name: str = "Today Student") -> TestClient:
    """Helper to create a fresh TestClient with an isolated authenticated session."""
    client = TestClient(app)
    uid = uuid.uuid4().hex[:8]
    email = f"student_{uid}@example.com"
    reg_res = client.post("/api/auth/register", json={
        "name": name,
        "email": email,
        "password": "securePassword123!"
    })
    assert reg_res.status_code == 201
    return client


# ------------------ TEST 1: Empty Student Initial Plan ------------------

def test_today_plan_empty_student_returns_comfortable():
    client = create_authenticated_client("Student Fresh")
    res = client.get("/api/today")
    assert res.status_code == 200
    data = res.json()
    assert data["next_best_action"] is None
    assert data["plan"] == []
    assert data["workload"]["status"] == "comfortable"
    assert data["workload"]["load_ratio"] == 0.0
    assert "All caught up" in data["workload"]["message"]


# ------------------ TEST 2: Prioritizes Urgent Task Due Today ------------------

def test_today_plan_prioritizes_urgent_task_due_today():
    client = create_authenticated_client("Student Urgent Task")

    # Create task due today
    now = datetime.now(timezone.utc)
    res_due_today = client.post("/api/tasks", json={
        "title": "Submit OS Lab Report",
        "priority": 5,
        "status": "todo",
        "due_date": now.isoformat(),
        "estimated_minutes": 45,
    })
    assert res_due_today.status_code == 201

    # Create task due in 10 days
    client.post("/api/tasks", json={
        "title": "Read Chapter 10",
        "priority": 1,
        "status": "todo",
        "due_date": (now + timedelta(days=10)).isoformat(),
        "estimated_minutes": 30,
    })

    today_res = client.get("/api/today")
    assert today_res.status_code == 200
    data = today_res.json()

    assert data["next_best_action"] is not None
    assert data["next_best_action"]["title"] == "Submit OS Lab Report"
    assert data["next_best_action"]["type"] == "task"

    # Verify 'Why' reasons list is present
    reasons = data["next_best_action"]["reasons"]
    assert len(reasons) >= 1
    labels = [r["label"] for r in reasons]
    values = [r["value"] for r in reasons]
    assert "Urgency" in labels
    assert "Due today" in values


# ------------------ TEST 3: Exam Proximity Boosts Related Topics ------------------

def test_today_plan_exam_proximity_boost():
    client = create_authenticated_client("Student Exam Near")

    # 1. Create Subject & Topic
    sub_res = client.post("/api/subjects", json={"name": "Compiler Design", "code": "CS3501"})
    sub_id = sub_res.json()["id"]

    client.post("/api/syllabus/confirm", json={
        "subject_id": sub_id,
        "units": [{
            "name": "Unit 1",
            "order_no": 1,
            "exam_weight": 1.0,
            "topics": [{"name": "Lexical Analysis", "importance": 0.9, "difficulty": 4, "order_no": 1}]
        }]
    })

    # 2. Create Exam occurring in 1 day
    now = datetime.now(timezone.utc)
    client.post("/api/exams", json={
        "subject_id": sub_id,
        "title": "Compiler Design Unit Test",
        "exam_date": (now + timedelta(days=1)).isoformat(),
        "total_marks": 50,
        "type": "internal",
    })

    today_res = client.get("/api/today")
    assert today_res.status_code == 200
    data = today_res.json()

    assert data["next_best_action"] is not None
    assert "Lexical Analysis" in data["next_best_action"]["title"]
    assert data["next_best_action"]["type"] == "topic"

    reasons = data["next_best_action"]["reasons"]
    labels = [r["label"] for r in reasons]
    assert "Exam Proximity" in labels


# ------------------ TEST 4: Workload Overloaded & Deferral Suggestion ------------------

def test_today_plan_workload_overloaded_recommends_defer():
    client = create_authenticated_client("Student Overloaded")

    # Create 5 big urgent tasks totaling 350 minutes
    now = datetime.now(timezone.utc)
    for i in range(5):
        client.post("/api/tasks", json={
            "title": f"Huge Project Part {i+1}",
            "priority": 5,
            "status": "todo",
            "due_date": now.isoformat(),
            "estimated_minutes": 70,
        })

    today_res = client.get("/api/today")
    assert today_res.status_code == 200
    data = today_res.json()

    assert data["workload"]["status"] == "overloaded"
    assert data["workload"]["load_ratio"] > 1.0
    assert "Overloaded schedule" in data["workload"]["message"]
    assert len(data["plan"]) <= 4
    assert len(data["deferred"]) >= 1


# ------------------ TEST 5 & 6: Accept & Dismiss Recommendations ------------------

def test_accept_and_dismiss_recommendation():
    client = create_authenticated_client("Student Rec Action")

    now = datetime.now(timezone.utc)
    client.post("/api/tasks", json={
        "title": "Task for Recommendation",
        "priority": 4,
        "due_date": now.isoformat(),
        "estimated_minutes": 30,
    })

    today_res = client.get("/api/today")
    assert today_res.status_code == 200
    plan_item = today_res.json()["plan"][0]
    rec_id = plan_item["recommendation_id"]
    assert rec_id is not None

    # Accept recommendation
    accept_res = client.post(f"/api/recommendations/{rec_id}/accept")
    assert accept_res.status_code == 200
    assert accept_res.json()["status"] == "accepted"

    # Dismiss recommendation
    dismiss_res = client.post(f"/api/recommendations/{rec_id}/dismiss")
    assert dismiss_res.status_code == 200
    assert dismiss_res.json()["status"] == "dismissed"

    # Calling /api/today again should exclude the dismissed item from active plan
    today_res2 = client.get("/api/today")
    active_rec_ids = [p["recommendation_id"] for p in today_res2.json()["plan"]]
    assert rec_id not in active_rec_ids


# ------------------ TEST 7: Cross-User Isolation on Recommendations ------------------

def test_recommendation_cross_user_returns_404():
    client_a = create_authenticated_client("Student A Rec")
    client_b = create_authenticated_client("Student B Rec")

    now = datetime.now(timezone.utc)
    client_a.post("/api/tasks", json={
        "title": "User A Task",
        "due_date": now.isoformat(),
    })
    res_a = client_a.get("/api/today")
    rec_id_a = res_a.json()["plan"][0]["recommendation_id"]

    # User B attempts to accept User A's recommendation -> 404 Not Found
    res_b_accept = client_b.post(f"/api/recommendations/{rec_id_a}/accept")
    assert res_b_accept.status_code == 404
    assert res_b_accept.json()["detail"] == "Recommendation not found"

    # User B attempts to dismiss User A's recommendation -> 404 Not Found
    res_b_dismiss = client_b.post(f"/api/recommendations/{rec_id_a}/dismiss")
    assert res_b_dismiss.status_code == 404
    assert res_b_dismiss.json()["detail"] == "Recommendation not found"


# ------------------ TEST 8: CRITICAL MILESTONE — Rapid Onboarding to Today Plan < 3 Min ------------------

def test_rapid_onboarding_to_today_plan_under_three_minutes():
    """
    CRITICAL MILESTONE:
    Done when: new user onboarding -> Today plan < 3 min.
    Simulates the entire student onboarding flow:
    1. Register
    2. Add Subject
    3. Upload/Extract Syllabus
    4. Confirm syllabus units & topics
    5. Set Exam Date
    6. Load /api/today -> Immediately yields actionable Next Best Action with 'Why'
    """
    import time
    start_time = time.time()

    # Step 1: Student registers
    client = create_authenticated_client("Rapid Onboarding Student")

    # Step 2: Subject creation
    sub_res = client.post("/api/subjects", json={
        "name": "Design & Analysis of Algorithms",
        "code": "CS3401",
        "semester": "Semester 4",
    })
    assert sub_res.status_code == 201
    subject_id = sub_res.json()["id"]

    # Step 3 & 4: Syllabus Extraction & Confirmation
    syllabus_text = """
    CS3401 DESIGN AND ANALYSIS OF ALGORITHMS
    UNIT I INTRODUCTION AND RECURSION
    Notion of an Algorithm – Fundamentals of Algorithmic Problem Solving – Analysis of Algorithm Efficiency – Time and Space Complexities – Mathematical Analysis of Non-recursive and Recursive Algorithms.
    UNIT II DIVIDE AND CONQUER
    Divide and Conquer Methodology – Merge Sort – Quick Sort – Binary Search – Strassen's Matrix Multiplication.
    """
    extract_res = client.post("/api/syllabus/extract", json={"text": syllabus_text})
    assert extract_res.status_code == 200
    units_draft = extract_res.json()["units"]

    confirm_res = client.post("/api/syllabus/confirm", json={
        "subject_id": subject_id,
        "units": units_draft,
    })
    assert confirm_res.status_code == 200

    # Step 5: Add upcoming exam in 4 days
    now = datetime.now(timezone.utc)
    exam_res = client.post("/api/exams", json={
        "subject_id": subject_id,
        "title": "DAA Semester Exam",
        "exam_date": (now + timedelta(days=4)).isoformat(),
        "total_marks": 100,
        "type": "semester",
    })
    assert exam_res.status_code == 201

    # Step 6: Land on Today Screen (/api/today)
    today_res = client.get("/api/today")
    assert today_res.status_code == 200
    data = today_res.json()

    # Assertions for successful onboarding completion
    assert data["next_best_action"] is not None
    assert data["next_best_action"]["title"] != ""
    assert len(data["next_best_action"]["reasons"]) >= 1
    assert len(data["plan"]) >= 1
    assert data["workload"]["status"] in ["comfortable", "busy", "overloaded"]
    assert len(data["upcoming_exams"]) == 1

    elapsed_time = time.time() - start_time
    assert elapsed_time < 180.0  # Must be strictly under 3 minutes (180s); typically executes in < 0.5s!
