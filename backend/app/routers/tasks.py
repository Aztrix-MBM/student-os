from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.academic import Task, Subject
from app.schemas.academic import TaskCreate, TaskUpdate, TaskResponse
from app.security.deps import get_current_user

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _map_task_response(task: Task) -> TaskResponse:
    return TaskResponse(
        id=task.id,
        user_id=task.user_id,
        subject_id=task.subject_id,
        subject_name=task.subject.name if task.subject else None,
        title=task.title,
        priority=task.priority,
        status=task.status,
        due_date=task.due_date,
        estimated_minutes=task.estimated_minutes,
        completed_at=task.completed_at,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


@router.get("", response_model=List[TaskResponse])
def get_user_tasks(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (todo, in_progress, completed)"),
    subject_id: Optional[str] = Query(None, description="Filter by subject ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all tasks belonging to the authenticated student, with optional status and subject filters."""
    query = db.query(Task).filter(Task.user_id == current_user.id)
    if status_filter:
        query = query.filter(Task.status == status_filter.lower())
    if subject_id:
        query = query.filter(Task.subject_id == subject_id)
    tasks = query.order_by(Task.due_date.asc().nullslast(), Task.priority.desc()).all()
    return [_map_task_response(t) for t in tasks]


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new task. If subject_id is provided, verifies that the subject is owned by current user.
    Returns 404 if the subject does not exist or belongs to another student.
    """
    if payload.subject_id:
        subject = (
            db.query(Subject)
            .filter(Subject.id == payload.subject_id, Subject.user_id == current_user.id)
            .first()
        )
        if not subject:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subject not found",
            )

    completed_at = utc_now() if payload.status == "completed" else None

    task = Task(
        user_id=current_user.id,
        subject_id=payload.subject_id,
        title=payload.title.strip(),
        priority=payload.priority,
        status=payload.status or "todo",
        due_date=payload.due_date,
        estimated_minutes=payload.estimated_minutes,
        completed_at=completed_at,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return _map_task_response(task)


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve single task. Returns 404 if not found or not owned."""
    task = (
        db.query(Task)
        .filter(Task.id == task_id, Task.user_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    return _map_task_response(task)


@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: str,
    payload: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update task details or status. Auto-sets completed_at when status becomes 'completed'.
    Returns 404 if task is not found or not owned.
    """
    task = (
        db.query(Task)
        .filter(Task.id == task_id, Task.user_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    if payload.subject_id is not None:
        if payload.subject_id != "":
            subject = (
                db.query(Subject)
                .filter(Subject.id == payload.subject_id, Subject.user_id == current_user.id)
                .first()
            )
            if not subject:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Subject not found",
                )
            task.subject_id = payload.subject_id
        else:
            task.subject_id = None

    if payload.title is not None:
        task.title = payload.title.strip()
    if payload.priority is not None:
        task.priority = payload.priority
    if payload.status is not None:
        new_status = payload.status.lower()
        if new_status == "completed" and task.status != "completed":
            task.completed_at = utc_now()
        elif new_status != "completed":
            task.completed_at = None
        task.status = new_status
    if payload.due_date is not None:
        task.due_date = payload.due_date
    if payload.estimated_minutes is not None:
        task.estimated_minutes = payload.estimated_minutes

    db.commit()
    db.refresh(task)
    return _map_task_response(task)


@router.delete("/{task_id}", status_code=status.HTTP_200_OK)
def delete_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete task. Returns 404 if not found or not owned."""
    task = (
        db.query(Task)
        .filter(Task.id == task_id, Task.user_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    db.delete(task)
    db.commit()
    return {"message": "Task deleted successfully", "id": task_id}
