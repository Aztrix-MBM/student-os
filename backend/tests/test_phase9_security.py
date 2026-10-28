import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.models.user import User
from app.models.academic import Subject, Task
from app.security.rate_limiter import auth_rate_limiter
from scripts.backup_db import run_backup

client = TestClient(app)

TEST_DB_URL = "sqlite:///./test_phase9.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    app.dependency_overrides[get_db] = override_get_db
    auth_rate_limiter.reset()
    yield
    Base.metadata.drop_all(bind=test_engine)
    app.dependency_overrides.clear()


def test_security_headers_present():
    """Verify production security headers are attached to API responses."""
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "DENY"
    assert "X-XSS-Protection" not in res.headers
    assert res.headers.get("Permissions-Policy") is not None
    assert res.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"


def test_delete_account_and_academic_data():
    """Verify DPDP Act 2023 complete right to erasure / data deletion flow."""
    # 1. Register a test student
    reg_res = client.post(
        "/api/auth/register",
        json={
            "name": "Delete Me Student",
            "email": "deleteme@example.com",
            "password": "Password123!",
            "daily_study_minutes": 120,
        },
    )
    assert reg_res.status_code == 201
    user_id = reg_res.json()["user"]["id"]

    # 2. Create academic records for this student
    sub_res = client.post(
        "/api/subjects",
        json={"name": "Compiler Design", "code": "CS8602", "semester": "Sem 6", "color_theme": "amber"},
    )
    assert sub_res.status_code == 201

    task_res = client.post(
        "/api/tasks",
        json={"title": "Read Chapter 1", "priority": 3, "estimated_minutes": 45},
    )
    assert task_res.status_code == 201

    # 3. Call DELETE /api/auth/me to permanently delete the account
    del_res = client.delete("/api/auth/me")
    assert del_res.status_code == 200
    del_data = del_res.json()
    assert del_data["deleted_user_id"] == user_id
    assert "permanently wiped" in del_data["message"]

    # 4. Verify accessing /api/me now returns 401 Unauthorized
    me_res = client.get("/api/me")
    assert me_res.status_code == 401

    # 5. Verify database rows are completely wiped
    db = TestingSessionLocal()
    try:
        user_in_db = db.query(User).filter(User.id == user_id).first()
        assert user_in_db is None

        subjects_in_db = db.query(Subject).filter(Subject.user_id == user_id).all()
        assert len(subjects_in_db) == 0

        tasks_in_db = db.query(Task).filter(Task.user_id == user_id).all()
        assert len(tasks_in_db) == 0
    finally:
        db.close()


def test_backup_script_execution():
    """Verify backup script creates valid gzip archive."""
    success = run_backup()
    assert success is True
