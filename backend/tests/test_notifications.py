import uuid
from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.academic import Subject, Topic, Exam, Task
from app.models.learning import TopicReview, StudySession
from app.models.notifications import PushSubscription, NotificationPreference
from app.security.rate_limiter import auth_rate_limiter


@pytest.fixture(autouse=True)
def reset_limiter_before_each_test():
    auth_rate_limiter.reset()
    yield
    auth_rate_limiter.reset()


def create_authenticated_client(name: str = "Retention Student") -> TestClient:
    """Helper to create a fresh TestClient with an isolated authenticated session."""
    client = TestClient(app)
    uid = uuid.uuid4().hex[:8]
    email = f"retention_{uid}@example.com"
    reg_res = client.post("/api/auth/register", json={
        "name": name,
        "email": email,
        "password": "securePassword123!"
    })
    assert reg_res.status_code == 201
    return client


def test_streak_endpoint_empty_new_user():
    client = create_authenticated_client("Student NoStreak")
    res = client.get("/api/retention/streak")
    assert res.status_code == 200
    data = res.json()
    assert data["current_streak"] == 0
    assert data["longest_streak"] == 0
    assert data["total_active_days"] == 0
    assert data["is_active_today"] is False
    assert data["status"] == "broken"
    assert "Start a new streak" in data["message"]


def test_streak_endpoint_with_study_activity():
    client = create_authenticated_client("Student Active")

    # Log study session for today
    sess_res = client.post("/api/study-sessions", json={
        "duration_minutes": 45,
    })
    assert sess_res.status_code == 201

    # Check streak endpoint
    res = client.get("/api/retention/streak")
    assert res.status_code == 200
    data = res.json()
    assert data["current_streak"] == 1
    assert data["longest_streak"] == 1
    assert data["total_active_days"] == 1
    assert data["is_active_today"] is True
    assert data["status"] == "active"
    assert len(data["activity_calendar"]) == 1


def test_push_subscription_lifecycle():
    client = create_authenticated_client("Student Push")

    endpoint_url = "https://fcm.googleapis.com/fcm/send/sample-token-123"
    sub_res = client.post("/api/notifications/subscribe", json={
        "endpoint": endpoint_url,
        "p256dh": "sample-p256dh-key",
        "auth": "sample-auth-secret",
    })
    assert sub_res.status_code == 201
    sub_data = sub_res.json()
    assert sub_data["id"].startswith("sub_")
    assert sub_data["endpoint"] == endpoint_url

    # Check preferences reflects active push subscription
    pref_res = client.get("/api/notifications/preferences")
    assert pref_res.status_code == 200
    assert pref_res.json()["has_push_subscription"] is True

    # Duplicate subscribe updates existing
    sub2_res = client.post("/api/notifications/subscribe", json={
        "endpoint": endpoint_url,
        "p256dh": "updated-p256dh",
        "auth": "updated-auth",
    })
    assert sub2_res.status_code == 201
    assert sub2_res.json()["id"] == sub_data["id"]

    # Unsubscribe
    unsub_res = client.delete(f"/api/notifications/unsubscribe?endpoint={endpoint_url}")
    assert unsub_res.status_code == 200
    assert unsub_res.json()["ok"] is True

    # Preferences now shows no push subscription
    pref2_res = client.get("/api/notifications/preferences")
    assert pref2_res.json()["has_push_subscription"] is False


def test_notification_preferences_get_and_patch():
    client = create_authenticated_client("Student Prefs")

    # Initial get creates default preferences
    get_res = client.get("/api/notifications/preferences")
    assert get_res.status_code == 200
    prefs = get_res.json()
    assert prefs["morning_plan_enabled"] is True
    assert prefs["morning_plan_time"] == "08:00"
    assert prefs["telegram_chat_id"] is None

    # Patch preferences
    patch_res = client.patch("/api/notifications/preferences", json={
        "morning_plan_time": "07:30",
        "telegram_chat_id": "@rit_student_bot",
        "revision_due_alerts": False,
    })
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["morning_plan_time"] == "07:30"
    assert updated["telegram_chat_id"] == "@rit_student_bot"
    assert updated["revision_due_alerts"] is False
    assert updated["morning_plan_enabled"] is True  # preserved


def test_morning_digest_generation():
    client = create_authenticated_client("Student Digest")

    # Create a subject and pending task
    sub_res = client.post("/api/subjects", json={"name": "Database Management Systems", "code": "CS8492"})
    sub_id = sub_res.json()["id"]

    client.post("/api/tasks", json={
        "title": "DBMS Assignment 1",
        "subject_id": sub_id,
        "priority": 4,
        "estimated_minutes": 45,
    })

    # Create an upcoming exam
    exam_date = (datetime.now(timezone.utc) + timedelta(days=4)).isoformat()
    client.post("/api/exams", json={
        "subject_id": sub_id,
        "title": "DBMS Internal Assessment",
        "exam_date": exam_date,
        "type": "internal",
    })

    # Fetch morning digest
    digest_res = client.get("/api/notifications/morning-digest")
    assert digest_res.status_code == 200
    data = digest_res.json()
    assert data["pending_tasks_count"] >= 1
    assert data["nearest_exam_title"] == "DBMS Internal Assessment"
    assert data["nearest_exam_days"] is not None
    assert "push_payload" in data
    assert "title" in data["push_payload"]
    assert "body" in data["push_payload"]


def test_test_send_notification_endpoint():
    client = create_authenticated_client("Student TestSend")

    send_res = client.post("/api/notifications/test-send")
    assert send_res.status_code == 200
    data = send_res.json()
    assert data["ok"] is True
    assert "dispatched_sub_count" in data
    assert "payload" in data


def test_notifications_cross_user_isolation_returns_404():
    client_a = create_authenticated_client("Student UserA")
    client_b = create_authenticated_client("Student UserB")

    endpoint_a = "https://fcm.googleapis.com/fcm/send/token-user-a"
    sub_a = client_a.post("/api/notifications/subscribe", json={
        "endpoint": endpoint_a,
        "p256dh": "keyA",
        "auth": "authA",
    })
    assert sub_a.status_code == 201

    # User B attempts to unsubscribe User A's push endpoint -> 404 Not Found
    unsub_b = client_b.delete(f"/api/notifications/unsubscribe?endpoint={endpoint_a}")
    assert unsub_b.status_code == 404
    assert unsub_b.json()["detail"] == "Subscription not found"
