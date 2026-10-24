import uuid
from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.academic import Subject, Unit, Topic, Exam, Task
from app.security.rate_limiter import auth_rate_limiter


@pytest.fixture(autouse=True)
def reset_limiter_before_each_test():
    """Ensure in-memory rate limiter does not throttle auth in tests."""
    auth_rate_limiter.reset()
    yield
    auth_rate_limiter.reset()


def create_authenticated_client(name: str = "Test Student") -> TestClient:
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


def test_subject_crud_lifecycle():
    """User creates, lists, reads, updates, and deletes an owned subject."""
    client = create_authenticated_client("Student A")

    # 1. Create subject
    create_res = client.post("/api/subjects", json={
        "name": "Data Structures & Algorithms",
        "code": "CS3301",
        "semester": "Semester 3",
        "color_theme": "coral"
    })
    assert create_res.status_code == 201
    data = create_res.json()
    assert data["name"] == "Data Structures & Algorithms"
    assert data["code"] == "CS3301"
    assert data["color_theme"] == "coral"
    assert data["id"].startswith("sub_")
    subject_id = data["id"]

    # 2. List subjects
    list_res = client.get("/api/subjects")
    assert list_res.status_code == 200
    sub_ids = [s["id"] for s in list_res.json()]
    assert subject_id in sub_ids

    # 3. Get single subject detail
    detail_res = client.get(f"/api/subjects/{subject_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == subject_id
    assert detail_res.json()["units"] == []
    assert detail_res.json()["topics"] == []

    # 4. Update subject
    update_res = client.put(f"/api/subjects/{subject_id}", json={
        "name": "Advanced Data Structures",
        "color_theme": "mint"
    })
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Advanced Data Structures"
    assert update_res.json()["color_theme"] == "mint"

    # 5. Delete subject
    del_res = client.delete(f"/api/subjects/{subject_id}")
    assert del_res.status_code == 200

    # 6. Verify deleted
    get_after_del = client.get(f"/api/subjects/{subject_id}")
    assert get_after_del.status_code == 404


def test_subject_cross_user_isolation_returns_404():
    """User B attempting to read, update, or delete User A's subject must receive 404 Not Found."""
    client_a = create_authenticated_client("Student Alice")
    client_b = create_authenticated_client("Student Bob")

    # Alice creates a subject
    create_res = client_a.post("/api/subjects", json={
        "name": "Operating Systems",
        "code": "CS3401",
        "semester": "Semester 4",
        "color_theme": "sky"
    })
    assert create_res.status_code == 201
    alice_subject_id = create_res.json()["id"]

    # Bob lists his subjects - Alice's subject must NOT be present
    b_list = client_b.get("/api/subjects")
    assert b_list.status_code == 200
    assert alice_subject_id not in [s["id"] for s in b_list.json()]

    # Bob attempts to GET Alice's subject -> 404
    b_get = client_b.get(f"/api/subjects/{alice_subject_id}")
    assert b_get.status_code == 404
    assert b_get.json()["detail"] == "Subject not found"

    # Bob attempts to PUT Alice's subject -> 404
    b_put = client_b.put(f"/api/subjects/{alice_subject_id}", json={
        "name": "Hacked Subject Name"
    })
    assert b_put.status_code == 404
    assert b_put.json()["detail"] == "Subject not found"

    # Bob attempts to DELETE Alice's subject -> 404
    b_del = client_b.delete(f"/api/subjects/{alice_subject_id}")
    assert b_del.status_code == 404
    assert b_del.json()["detail"] == "Subject not found"

    # Verify Alice's subject is still intact and owned by Alice
    a_get = client_a.get(f"/api/subjects/{alice_subject_id}")
    assert a_get.status_code == 200
    assert a_get.json()["name"] == "Operating Systems"


def test_units_and_topics_under_subject_with_isolation():
    """Units and Topics creation under owned subject, and 404 isolation for cross-user attempts."""
    client_a = create_authenticated_client("Student A")
    client_b = create_authenticated_client("Student B")

    # A creates subject
    sub_res = client_a.post("/api/subjects", json={
        "name": "Database Management Systems",
        "code": "CS3501",
    })
    subject_id = sub_res.json()["id"]

    # A creates Unit
    unit_res = client_a.post(f"/api/subjects/{subject_id}/units", json={
        "name": "Unit 1: Relational Model & SQL",
        "order_no": 1,
        "exam_weight": 0.25
    })
    assert unit_res.status_code == 201
    unit_id = unit_res.json()["id"]
    assert unit_id.startswith("unit_")

    # A creates Topic linked to Unit
    topic_res = client_a.post(f"/api/subjects/{subject_id}/topics", json={
        "name": "B+ Tree Indexing",
        "unit_id": unit_id,
        "difficulty": 4,
        "importance": 0.8,
        "order_no": 1
    })
    assert topic_res.status_code == 201
    topic_id = topic_res.json()["id"]
    assert topic_id.startswith("top_")

    # A fetches subject detail and checks nested hierarchy
    detail_res = client_a.get(f"/api/subjects/{subject_id}")
    assert detail_res.status_code == 200
    data = detail_res.json()
    assert len(data["units"]) == 1
    assert data["units"][0]["name"] == "Unit 1: Relational Model & SQL"
    assert len(data["topics"]) == 1
    assert data["topics"][0]["name"] == "B+ Tree Indexing"

    # B attempts to add unit to A's subject -> 404
    b_unit = client_b.post(f"/api/subjects/{subject_id}/units", json={
        "name": "Unit Rogue",
        "order_no": 2
    })
    assert b_unit.status_code == 404

    # B attempts to add topic to A's subject -> 404
    b_topic = client_b.post(f"/api/subjects/{subject_id}/topics", json={
        "name": "Topic Rogue",
        "order_no": 2
    })
    assert b_topic.status_code == 404

    # B attempts to list topics of A's subject -> 404
    b_list_topics = client_b.get(f"/api/subjects/{subject_id}/topics")
    assert b_list_topics.status_code == 404


def test_exam_crud_and_cross_user_isolation():
    """Exam CRUD operations, subject ownership validation on exam creation, and cross-user 404s."""
    client_a = create_authenticated_client("Student A")
    client_b = create_authenticated_client("Student B")

    # A creates subject
    sub_res = client_a.post("/api/subjects", json={
        "name": "Computer Networks",
        "code": "CS3601",
    })
    alice_sub_id = sub_res.json()["id"]

    exam_date = (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()

    # B attempts to create an exam attached to Alice's subject -> 404
    b_fake_exam = client_b.post("/api/exams", json={
        "subject_id": alice_sub_id,
        "title": "Unauthorized Exam",
        "exam_date": exam_date,
        "total_marks": 100,
        "type": "internal"
    })
    assert b_fake_exam.status_code == 404
    assert b_fake_exam.json()["detail"] == "Subject not found"

    # Alice creates exam for her subject -> 201
    create_res = client_a.post("/api/exams", json={
        "subject_id": alice_sub_id,
        "title": "Unit Test 1 - Routing Algorithms",
        "exam_date": exam_date,
        "total_marks": 50,
        "type": "internal"
    })
    assert create_res.status_code == 201
    exam_data = create_res.json()
    assert exam_data["title"] == "Unit Test 1 - Routing Algorithms"
    assert exam_data["subject_name"] == "Computer Networks"
    exam_id = exam_data["id"]
    assert exam_id.startswith("exm_")

    # Alice lists exams
    a_exams = client_a.get("/api/exams")
    assert a_exams.status_code == 200
    assert exam_id in [e["id"] for e in a_exams.json()]

    # Bob attempts to GET Alice's exam -> 404
    b_get = client_b.get(f"/api/exams/{exam_id}")
    assert b_get.status_code == 404
    assert b_get.json()["detail"] == "Exam not found"

    # Bob attempts to PUT Alice's exam -> 404
    b_put = client_b.put(f"/api/exams/{exam_id}", json={
        "title": "Hacked Exam"
    })
    assert b_put.status_code == 404
    assert b_put.json()["detail"] == "Exam not found"

    # Bob attempts to DELETE Alice's exam -> 404
    b_del = client_b.delete(f"/api/exams/{exam_id}")
    assert b_del.status_code == 404
    assert b_del.json()["detail"] == "Exam not found"

    # Alice updates exam
    a_put = client_a.put(f"/api/exams/{exam_id}", json={
        "title": "Unit Test 1 - Revised",
        "total_marks": 60
    })
    assert a_put.status_code == 200
    assert a_put.json()["title"] == "Unit Test 1 - Revised"
    assert a_put.json()["total_marks"] == 60

    # Alice deletes exam
    a_del = client_a.delete(f"/api/exams/{exam_id}")
    assert a_del.status_code == 200
    assert client_a.get(f"/api/exams/{exam_id}").status_code == 404


def test_task_crud_and_ownership_checks():
    """Task CRUD lifecycle, cross-user subject attachment prevention, and 404 isolation."""
    client_a = create_authenticated_client("Student A")
    client_b = create_authenticated_client("Student B")

    # A creates subject
    sub_res = client_a.post("/api/subjects", json={
        "name": "Cloud Computing",
        "code": "CS3701",
    })
    alice_sub_id = sub_res.json()["id"]

    # Bob attempts to create a task referencing Alice's subject -> 404
    b_fake_task = client_b.post("/api/tasks", json={
        "title": "Spy on Alice Subject",
        "subject_id": alice_sub_id,
        "priority": 5,
        "status": "todo"
    })
    assert b_fake_task.status_code == 404
    assert b_fake_task.json()["detail"] == "Subject not found"

    # Alice creates a standalone task without subject
    task_res1 = client_a.post("/api/tasks", json={
        "title": "Submit Lab Manual",
        "priority": 3,
        "status": "todo",
        "estimated_minutes": 45
    })
    assert task_res1.status_code == 201
    assert task_res1.json()["subject_id"] is None
    assert task_res1.json()["id"].startswith("tsk_")

    # Alice creates a task attached to her subject
    task_res2 = client_a.post("/api/tasks", json={
        "title": "Kubernetes Pod Deployment Lab",
        "subject_id": alice_sub_id,
        "priority": 4,
        "status": "todo",
        "estimated_minutes": 60
    })
    assert task_res2.status_code == 201
    alice_task_id = task_res2.json()["id"]
    assert task_res2.json()["subject_name"] == "Cloud Computing"

    # Bob attempts to GET Alice's task -> 404
    assert client_b.get(f"/api/tasks/{alice_task_id}").status_code == 404

    # Bob attempts to PATCH Alice's task -> 404
    assert client_b.patch(f"/api/tasks/{alice_task_id}", json={"status": "completed"}).status_code == 404

    # Bob attempts to DELETE Alice's task -> 404
    assert client_b.delete(f"/api/tasks/{alice_task_id}").status_code == 404

    # Alice lists tasks filtered by subject
    filtered_tasks = client_a.get(f"/api/tasks?subject_id={alice_sub_id}")
    assert filtered_tasks.status_code == 200
    assert len(filtered_tasks.json()) == 1
    assert filtered_tasks.json()[0]["id"] == alice_task_id


def test_task_status_auto_completed_at():
    """Marking a task completed sets completed_at timestamp; un-completing clears it."""
    client = create_authenticated_client("Student A")

    # Create todo task
    create_res = client.post("/api/tasks", json={
        "title": "Revise Binary Trees",
        "status": "todo"
    })
    task_id = create_res.json()["id"]
    assert create_res.json()["completed_at"] is None

    # Patch to completed
    complete_res = client.patch(f"/api/tasks/{task_id}", json={
        "status": "completed"
    })
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "completed"
    assert complete_res.json()["completed_at"] is not None

    # Patch back to in_progress -> completed_at must reset to None
    reopen_res = client.patch(f"/api/tasks/{task_id}", json={
        "status": "in_progress"
    })
    assert reopen_res.status_code == 200
    assert reopen_res.json()["status"] == "in_progress"
    assert reopen_res.json()["completed_at"] is None


def test_subject_cascade_deletion_cleans_related_records():
    """Deleting a subject cascades and deletes all associated units, topics, and exams."""
    client = create_authenticated_client("Student A")

    # Create subject
    sub_res = client.post("/api/subjects", json={
        "name": "Machine Learning",
        "code": "CS3801",
    })
    sub_id = sub_res.json()["id"]

    # Create unit & topic
    unit_res = client.post(f"/api/subjects/{sub_id}/units", json={"name": "Supervised Learning"})
    unit_id = unit_res.json()["id"]

    top_res = client.post(f"/api/subjects/{sub_id}/topics", json={
        "name": "Linear Regression",
        "unit_id": unit_id
    })
    top_id = top_res.json()["id"]

    # Create exam
    exam_res = client.post("/api/exams", json={
        "subject_id": sub_id,
        "title": "Midterm Exam",
        "exam_date": (datetime.now(timezone.utc) + timedelta(days=10)).isoformat(),
        "total_marks": 100
    })
    exam_id = exam_res.json()["id"]

    # Create task linked to subject
    task_res = client.post("/api/tasks", json={
        "subject_id": sub_id,
        "title": "Study Linear Regression",
    })
    task_id = task_res.json()["id"]

    # Delete subject
    del_res = client.delete(f"/api/subjects/{sub_id}")
    assert del_res.status_code == 200

    # Verify subject, exam are gone
    assert client.get(f"/api/subjects/{sub_id}").status_code == 404
    assert client.get(f"/api/exams/{exam_id}").status_code == 404

    # Verify task subject_id was set to None (ondelete="SET NULL")
    task_after = client.get(f"/api/tasks/{task_id}")
    assert task_after.status_code == 200
    assert task_after.json()["subject_id"] is None
