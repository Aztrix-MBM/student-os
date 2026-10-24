import uuid
from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.academic import Subject, Unit, Topic, Exam, exam_topics
from app.models.learning import TopicReview, StudySession
from app.security.rate_limiter import auth_rate_limiter
from sqlalchemy import select


@pytest.fixture(autouse=True)
def reset_limiter_before_each_test():
    auth_rate_limiter.reset()
    yield
    auth_rate_limiter.reset()


def create_authenticated_client(name: str = "Learning Student") -> TestClient:
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


def setup_subject_and_exam(client: TestClient):
    """Sets up a test subject, exam, and 2 topics."""
    # 1. Subject
    sub_res = client.post("/api/subjects", json={
        "name": "Operating Systems",
        "code": "CS3451",
        "semester": "Semester 4",
        "color_theme": "sky",
    })
    assert sub_res.status_code == 201
    subject_id = sub_res.json()["id"]

    # 2. Units and Topics via confirm syllabus
    confirm_payload = {
        "subject_id": subject_id,
        "units": [
            {
                "name": "Unit I – Process Management",
                "order_no": 1,
                "exam_weight": 1.0,
                "topics": [
                    {"name": "Process Scheduling", "importance": 0.8, "difficulty": 3, "order_no": 1},
                    {"name": "Inter-process Communication", "importance": 0.9, "difficulty": 4, "order_no": 2},
                ],
            }
        ],
    }
    c_res = client.post("/api/syllabus/confirm", json=confirm_payload)
    assert c_res.status_code == 200

    # Query created topic IDs from DB
    db = SessionLocal()
    topics = db.scalars(select(Topic).where(Topic.subject_id == subject_id)).all()
    topic_ids = [t.id for t in topics]
    db.close()
    assert len(topic_ids) == 2

    # 3. Exam
    exam_res = client.post("/api/exams", json={
        "subject_id": subject_id,
        "title": "OS Internal 1",
        "exam_date": (datetime.now(timezone.utc) + timedelta(days=5)).isoformat(),
        "total_marks": 50,
        "type": "internal",
    })
    assert exam_res.status_code == 201
    exam_id = exam_res.json()["id"]

    return subject_id, exam_id, topic_ids


# ------------------ TEST 1: Review Topic with 'Good' ------------------

def test_review_topic_good_increases_stability():
    client = create_authenticated_client("Student Review")
    _, _, topic_ids = setup_subject_and_exam(client)
    target_topic = topic_ids[0]

    # Initial stability default is 2.0. Good multiplier = 2.0 -> new stability = 4.0
    res = client.post(f"/api/topics/{target_topic}/review", json={
        "rating": "good",
        "self_level": "okay",
    })
    assert res.status_code == 201
    data = res.json()
    assert data["topic_id"] == target_topic
    assert data["rating"] == "good"
    assert data["self_level"] == "okay"
    assert data["stability_days"] == 4.0
    assert data["retention_estimate"] == 1.0


# ------------------ TEST 2: Review Topic with 'Easy' ------------------

def test_review_topic_easy_increases_stability():
    client = create_authenticated_client("Student Easy")
    _, _, topic_ids = setup_subject_and_exam(client)
    target_topic = topic_ids[0]

    # Easy multiplier = 2.5 -> 2.0 * 2.5 = 5.0
    res = client.post(f"/api/topics/{target_topic}/review", json={
        "rating": "easy",
        "self_level": "strong",
        "quiz_score": 95.0,
    })
    assert res.status_code == 201
    data = res.json()
    assert data["stability_days"] == 5.0
    assert data["quiz_score"] == 95.0


# ------------------ TEST 3: Review Topic with 'Fail' Floor ------------------

def test_review_topic_fail_preserves_one_day_floor():
    client = create_authenticated_client("Student Fail")
    _, _, topic_ids = setup_subject_and_exam(client)
    target_topic = topic_ids[0]

    # Fail halves stability (2.0 * 0.5 = 1.0) and maintains minimum 1.0 floor
    res = client.post(f"/api/topics/{target_topic}/review", json={
        "rating": "fail",
        "self_level": "weak",
    })
    assert res.status_code == 201
    assert res.json()["stability_days"] == 1.0


# ------------------ TEST 4: Subsequent Reviews Compound Stability ------------------

def test_subsequent_reviews_compound_stability():
    client = create_authenticated_client("Student Compound")
    _, _, topic_ids = setup_subject_and_exam(client)
    target_topic = topic_ids[0]

    # Review 1: Good (2.0 -> 4.0)
    res1 = client.post(f"/api/topics/{target_topic}/review", json={"rating": "good"})
    assert res1.json()["stability_days"] == 4.0

    # Review 2: Easy (4.0 * 2.5 = 10.0)
    res2 = client.post(f"/api/topics/{target_topic}/review", json={"rating": "easy"})
    assert res2.json()["stability_days"] == 10.0

    # Check History
    hist_res = client.get(f"/api/topics/{target_topic}/reviews")
    assert hist_res.status_code == 200
    assert len(hist_res.json()) == 2
    assert hist_res.json()[0]["stability_days"] == 10.0
    assert hist_res.json()[1]["stability_days"] == 4.0


# ------------------ TEST 5: CRITICAL MILESTONE — Rate Topic Changes Readiness % ------------------

def test_rate_topic_dynamically_changes_exam_readiness():
    """
    CRITICAL MILESTONE:
    Done when: rate topic -> readiness % maarum.
    Verifies that rating a topic immediately and measurably shifts the exam readiness %.
    """
    client = create_authenticated_client("Student Readiness Live")
    _, exam_id, topic_ids = setup_subject_and_exam(client)
    topic_1, topic_2 = topic_ids[0], topic_ids[1]

    # 1. Baseline: zero reviews completed
    res_base = client.get(f"/api/exams/{exam_id}/readiness")
    assert res_base.status_code == 200
    base_data = res_base.json()
    assert base_data["readiness_pct"] == 0.0
    assert base_data["coverage_pct"] == 0.0
    assert base_data["total_topics"] == 2
    assert base_data["reviewed_topics"] == 0
    assert len(base_data["weak_topics"]) == 2
    assert len(base_data["strong_topics"]) == 0
    assert base_data["label"] == "estimate"

    # 2. Rate Topic 1 as strong / easy
    rev1 = client.post(f"/api/topics/{topic_1}/review", json={
        "rating": "easy",
        "self_level": "strong",
    })
    assert rev1.status_code == 201

    # 3. Poll readiness: Readiness % MUST have changed from 0.0% to > 25.0%
    res_after_1 = client.get(f"/api/exams/{exam_id}/readiness")
    assert res_after_1.status_code == 200
    data_1 = res_after_1.json()
    assert data_1["readiness_pct"] > 0.0
    assert data_1["readiness_pct"] > base_data["readiness_pct"]  # PROVES READINESS SHIFT
    assert data_1["coverage_pct"] == 50.0
    assert data_1["reviewed_topics"] == 1
    assert len(data_1["strong_topics"]) == 1
    assert len(data_1["weak_topics"]) == 1

    # 4. Rate Topic 2 as strong / easy
    rev2 = client.post(f"/api/topics/{topic_2}/review", json={
        "rating": "easy",
        "self_level": "strong",
    })
    assert rev2.status_code == 201

    # 5. Poll readiness: Both topics mastered
    res_after_2 = client.get(f"/api/exams/{exam_id}/readiness")
    assert res_after_2.status_code == 200
    data_2 = res_after_2.json()
    assert data_2["readiness_pct"] >= 85.0
    assert data_2["coverage_pct"] == 100.0
    assert data_2["reviewed_topics"] == 2
    assert len(data_2["weak_topics"]) == 0
    assert len(data_2["strong_topics"]) == 2


# ------------------ TEST 6: Cross-User Isolation on Review ------------------

def test_review_topic_cross_user_returns_404():
    client_a = create_authenticated_client("Student A Review")
    client_b = create_authenticated_client("Student B Review")

    _, _, topic_ids = setup_subject_and_exam(client_a)
    user_a_topic = topic_ids[0]

    # User B tries to review User A's topic -> 404 Not Found
    res = client_b.post(f"/api/topics/{user_a_topic}/review", json={"rating": "good"})
    assert res.status_code == 404
    assert res.json()["detail"] == "Topic not found"


# ------------------ TEST 7: Cross-User Isolation on Exam Readiness ------------------

def test_exam_readiness_cross_user_returns_404():
    client_a = create_authenticated_client("Student A Exam")
    client_b = create_authenticated_client("Student B Exam")

    _, exam_id, _ = setup_subject_and_exam(client_a)

    # User B tries to get readiness for User A's exam -> 404 Not Found
    res = client_b.get(f"/api/exams/{exam_id}/readiness")
    assert res.status_code == 404
    assert res.json()["detail"] == "Exam not found"


# ------------------ TEST 8: Study Session Lifecycle ------------------

def test_study_session_create_and_list():
    client = create_authenticated_client("Student Session")
    subject_id, _, topic_ids = setup_subject_and_exam(client)

    # Log 30m study session
    res = client.post("/api/study-sessions", json={
        "subject_id": subject_id,
        "topic_id": topic_ids[0],
        "duration_minutes": 30,
    })
    assert res.status_code == 201
    s_data = res.json()
    assert s_data["duration_minutes"] == 30
    assert s_data["subject_id"] == subject_id
    assert s_data["topic_id"] == topic_ids[0]

    # List study sessions
    list_res = client.get("/api/study-sessions")
    assert list_res.status_code == 200
    sessions = list_res.json()
    assert len(sessions) >= 1
    assert any(s["id"] == s_data["id"] for s in sessions)


# ------------------ TEST 9: Cross-User Isolation on Study Sessions ------------------

def test_study_session_cross_user_returns_404():
    client_a = create_authenticated_client("Student A Session")
    client_b = create_authenticated_client("Student B Session")

    subject_id, _, _ = setup_subject_and_exam(client_a)

    # User B tries to log session against User A's subject
    res = client_b.post("/api/study-sessions", json={
        "subject_id": subject_id,
        "duration_minutes": 25,
    })
    assert res.status_code == 404
    assert res.json()["detail"] == "Subject not found"
