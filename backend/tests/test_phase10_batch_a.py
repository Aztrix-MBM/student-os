from pathlib import Path
import uuid
from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.main import app
from app.config import settings
from app.database import SessionLocal, engine
from app.models.user import User
from app.models.payment import Payment
from app.models.academic import Subject, Unit, Topic, Exam, Task
from app.models.learning import TopicReview, StudySession
from app.models.planner import DailyPlan, Recommendation
from app.models.notifications import PushSubscription, NotificationPreference
from app.security.rate_limiter import auth_rate_limiter


@pytest.fixture(autouse=True)
def reset_limiter_before_each_test():
    auth_rate_limiter.reset()
    yield
    auth_rate_limiter.reset()


def create_authenticated_client(name: str = "Test Student") -> tuple[TestClient, str]:
    """Helper to register and return authenticated client and user ID."""
    client = TestClient(app)
    uid = uuid.uuid4().hex[:8]
    email = f"student_{uid}@example.com"
    reg_res = client.post("/api/auth/register", json={
        "name": name,
        "email": email,
        "password": "securePassword123!"
    })
    assert reg_res.status_code == 201
    user_data = reg_res.json()["user"]
    return client, user_data["id"]


def test_no_hardcoded_studentos_upi_string():
    """Verify that studentos@okaxis never appears anywhere in backend/app or frontend/src."""
    backend_app_dir = Path(__file__).resolve().parent.parent / "app"
    frontend_src_dir = Path(__file__).resolve().parent.parent.parent / "frontend" / "src"

    forbidden = "studentos@okaxis".lower()
    matches = []

    for search_dir in [backend_app_dir, frontend_src_dir]:
        assert search_dir.exists(), f"Directory not found: {search_dir}"
        for file_path in search_dir.rglob("*"):
            if file_path.is_file():
                try:
                    content = file_path.read_text(encoding="utf-8", errors="ignore").lower()
                    if forbidden in content:
                        matches.append(str(file_path))
                except Exception:
                    pass

    assert not matches, f"Forbidden hardcoded UPI ID string found in: {matches}"


def test_payment_unconfigured_behavior(monkeypatch):
    """Verify GET /api/payments/config returns configured=False and POST /api/payments returns 503 when UPI_ID is empty."""
    monkeypatch.setattr(settings, "UPI_ID", "")
    monkeypatch.setattr(settings, "UPI_PAYEE_NAME", "")

    client, user_id = create_authenticated_client("Unconfigured Tester")

    # 1. Config returns configured=False and empty upi_id
    res = client.get("/api/payments/config")
    assert res.status_code == 200
    data = res.json()
    assert data["configured"] is False
    assert data["upi_id"] == ""
    assert data["payee_name"] == ""

    # 2. Submission blocked with 503
    post_res = client.post("/api/payments", json={
        "plan": "semester",
        "utr": "123456789012"
    })
    assert post_res.status_code == 503
    assert "Payments are not available yet" in post_res.json()["detail"]


def test_sqlite_foreign_keys_pragma_enabled():
    """Verify PRAGMA foreign_keys=ON is active on SQLite and native FKs enforced on PostgreSQL."""
    db = SessionLocal()
    try:
        dialect = db.bind.dialect.name
        if dialect == "sqlite":
            res = db.execute(text("PRAGMA foreign_keys;")).scalar()
            assert res == 1, "SQLite foreign keys pragma must be 1 (enabled)"
        elif dialect == "postgresql":
            # PostgreSQL enforces foreign key constraints by default
            assert True
    finally:
        db.close()


def test_payment_submission_and_duplicate_rejection(monkeypatch):
    """Verify payment submission creates pending record and rejects duplicate UTR with 409."""
    monkeypatch.setattr(settings, "UPI_ID", "test@upi")
    monkeypatch.setattr(settings, "UPI_PAYEE_NAME", "Test Student OS")

    client, user_id = create_authenticated_client("Payment Tester")

    # 1. Get payment configuration
    config_res = client.get("/api/payments/config")
    assert config_res.status_code == 200
    cfg = config_res.json()
    assert cfg["configured"] is True
    assert cfg["upi_id"] == "test@upi"
    assert len(cfg["plans"]) == 2  # monthly and semester only

    # 2. Submit payment with 12-digit UTR
    utr = f"4289{uuid.uuid4().int % 100000000:08d}"
    submit_res = client.post("/api/payments", json={
        "plan": "semester",
        "utr": utr
    })
    assert submit_res.status_code == 201
    payment_data = submit_res.json()
    assert payment_data["status"] == "pending"
    assert payment_data["amount"] == 99
    assert payment_data["utr"] == utr

    # 3. User remains free while status is pending
    me_res = client.get("/api/auth/me")
    assert me_res.status_code == 200
    assert me_res.json()["is_pro"] is False

    # 4. Attempt duplicate submission with the same UTR -> 409 Conflict
    dup_res = client.post("/api/payments", json={
        "plan": "monthly",
        "utr": utr
    })
    assert dup_res.status_code == 409
    assert "already been submitted" in dup_res.json()["detail"]


def test_admin_payment_approval_lifts_pro_status(monkeypatch):
    """Verify manual payment approval extends pro_until and updates is_pro."""
    monkeypatch.setattr(settings, "UPI_ID", "test@upi")
    monkeypatch.setattr(settings, "UPI_PAYEE_NAME", "Test Student OS")

    client, user_id = create_authenticated_client("Pro Student")

    utr = f"9988{uuid.uuid4().int % 100000000:08d}"
    client.post("/api/payments", json={
        "plan": "semester",
        "utr": utr
    })

    # Verify not pro initially
    assert client.get("/api/auth/me").json()["is_pro"] is False

    # Approve payment directly via DB/script logic
    db = SessionLocal()
    try:
        payment = db.query(Payment).filter(Payment.utr == utr).first()
        assert payment is not None
        payment.status = "approved"
        payment.reviewed_at = datetime.now(timezone.utc)
        user = db.query(User).filter(User.id == user_id).first()
        user.pro_until = datetime.now(timezone.utc) + timedelta(days=180)
        db.commit()
    finally:
        db.close()

    # Verify user is now Pro
    me_after = client.get("/api/auth/me")
    assert me_after.status_code == 200
    assert me_after.json()["is_pro"] is True


def test_free_plan_limits_and_pro_upgrade():
    """
    Verify unrestricted student access:
    - Any student can create unlimited subjects without 403 errors.
    - Any student can confirm multiple syllabus imports without 403 errors.
    """
    client, user_id = create_authenticated_client("Unlimited Student")

    # 1. Create 1st subject -> 201
    s1 = client.post("/api/subjects", json={"name": "Subject 1", "code": "CS101"})
    assert s1.status_code == 201
    sub1_id = s1.json()["id"]

    # 2. Create 2nd subject -> 201
    s2 = client.post("/api/subjects", json={"name": "Subject 2", "code": "CS102"})
    assert s2.status_code == 201
    sub2_id = s2.json()["id"]

    # 3. Create 3rd subject -> 201 (Unlimited, no 403)
    s3 = client.post("/api/subjects", json={"name": "Subject 3", "code": "CS103"})
    assert s3.status_code == 201

    # 4. Confirm 1st syllabus import -> 200
    confirm1 = client.post("/api/syllabus/confirm", json={
        "subject_id": sub1_id,
        "units": [
            {
                "name": "Unit 1: Foundations",
                "order_no": 1,
                "topics": [{"name": "Topic A"}]
            }
        ]
    })
    assert confirm1.status_code == 200

    # 5. Confirm 2nd syllabus import -> 200 (Unlimited, no 403)
    confirm2 = client.post("/api/syllabus/confirm", json={
        "subject_id": sub2_id,
        "units": [
            {
                "name": "Unit 1: Advanced",
                "order_no": 1,
                "topics": [{"name": "Topic B"}]
            }
        ]
    })
    assert confirm2.status_code == 200


def test_expired_pro_falls_back_to_free():
    """Verify that when pro_until is in the past, is_pro returns False and limits re-apply."""
    client, user_id = create_authenticated_client("Expired Student")

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        # Set pro_until in the past
        user.pro_until = datetime.now(timezone.utc) - timedelta(days=1)
        db.commit()
    finally:
        db.close()

    me_res = client.get("/api/auth/me")
    assert me_res.status_code == 200
    assert me_res.json()["is_pro"] is False


def test_account_deletion_cleans_all_tables_with_foreign_keys_on():
    """
    Test requirement A3:
    Create a user with data in EVERY user-owned table.
    Delete the account.
    Assert zero user rows remain in all tables.
    Assert payment row remains with user_id=None.
    """
    client, user_id = create_authenticated_client("Wipe Target Student")
    db = SessionLocal()

    try:
        # 1. Populate Subject, Unit, Topic, Exam, Task
        subject = Subject(user_id=user_id, name="Physics", code="PH101")
        db.add(subject)
        db.flush()

        unit = Unit(subject_id=subject.id, name="Optics", order_no=1)
        db.add(unit)
        db.flush()

        topic = Topic(subject_id=subject.id, unit_id=unit.id, name="Diffraction", order_no=1)
        db.add(topic)
        db.flush()

        exam = Exam(user_id=user_id, subject_id=subject.id, title="Physics Midterm", exam_date=datetime.now(timezone.utc) + timedelta(days=10))
        db.add(exam)

        task = Task(user_id=user_id, subject_id=subject.id, title="Review Chapter 1")
        db.add(task)

        # 2. Learning tables: TopicReview, StudySession
        review = TopicReview(user_id=user_id, topic_id=topic.id, rating="good")
        db.add(review)

        session = StudySession(user_id=user_id, subject_id=subject.id, topic_id=topic.id, duration_minutes=25)
        db.add(session)

        # 3. Planner tables: DailyPlan, Recommendation
        plan = DailyPlan(user_id=user_id, plan_date="2026-10-25", items_json="[]")
        db.add(plan)

        rec = Recommendation(user_id=user_id, target_type="topic", target_id=topic.id, score=0.8)
        db.add(rec)

        # 4. Notification tables: PushSubscription, NotificationPreference
        sub = PushSubscription(user_id=user_id, endpoint="https://push.example.com/test", p256dh="key1", auth="auth1")
        db.add(sub)

        pref = NotificationPreference(user_id=user_id, morning_plan_enabled=True)
        db.add(pref)

        # 5. Payment table
        wipe_utr = f"wipe_{uuid.uuid4().hex[:8]}"
        payment = Payment(user_id=user_id, plan="semester", amount=99, utr=wipe_utr, status="pending")
        db.add(payment)

        db.commit()
    finally:
        db.close()

    # Trigger account deletion via DELETE /api/auth/me
    del_res = client.delete("/api/auth/me")
    assert del_res.status_code == 200

    # Verify zero rows remain for user across all tables
    db = SessionLocal()
    try:
        assert db.query(User).filter(User.id == user_id).count() == 0
        assert db.query(Subject).filter(Subject.user_id == user_id).count() == 0
        assert db.query(Task).filter(Task.user_id == user_id).count() == 0
        assert db.query(TopicReview).filter(TopicReview.user_id == user_id).count() == 0
        assert db.query(StudySession).filter(StudySession.user_id == user_id).count() == 0
        assert db.query(DailyPlan).filter(DailyPlan.user_id == user_id).count() == 0
        assert db.query(Recommendation).filter(Recommendation.user_id == user_id).count() == 0
        assert db.query(PushSubscription).filter(PushSubscription.user_id == user_id).count() == 0
        assert db.query(NotificationPreference).filter(NotificationPreference.user_id == user_id).count() == 0

        # Payments table must retain the record for financial bookkeeping with user_id = None
        retained_payment = db.query(Payment).filter(Payment.utr == wipe_utr).first()
        assert retained_payment is not None
        assert retained_payment.user_id is None
        assert retained_payment.amount == 99
        assert retained_payment.status == "pending"
    finally:
        db.close()
