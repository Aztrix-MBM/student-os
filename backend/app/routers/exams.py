from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.academic import Exam, Subject, Topic
from app.schemas.academic import ExamCreate, ExamUpdate, ExamResponse
from app.security.deps import get_current_user

router = APIRouter(prefix="/api/exams", tags=["Exams"])


def _map_exam_response(exam: Exam) -> ExamResponse:
    t_ids = [t.id for t in exam.topics] if exam.topics else []
    return ExamResponse(
        id=exam.id,
        user_id=exam.user_id,
        subject_id=exam.subject_id,
        subject_name=exam.subject.name if exam.subject else None,
        title=exam.title,
        exam_date=exam.exam_date,
        total_marks=exam.total_marks,
        type=exam.type,
        created_at=exam.created_at,
        updated_at=exam.updated_at,
        topic_ids=t_ids,
        topics_count=len(t_ids),
    )


@router.get("", response_model=List[ExamResponse])
def get_user_exams(
    subject_id: Optional[str] = Query(None, description="Filter exams by subject ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all exams belonging to the authenticated student, optionally filtered by subject."""
    query = db.query(Exam).filter(Exam.user_id == current_user.id)
    if subject_id:
        query = query.filter(Exam.subject_id == subject_id)
    exams = query.order_by(Exam.exam_date.asc()).all()
    return [_map_exam_response(e) for e in exams]


@router.post("", response_model=ExamResponse, status_code=status.HTTP_201_CREATED)
def create_exam(
    payload: ExamCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create an exam. Validates that the associated subject belongs to the current student.
    Supports scoping by specific topic_ids and/or unit_ids.
    Returns 404 if subject is not found or owned by another student.
    """
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

    exam = Exam(
        user_id=current_user.id,
        subject_id=subject.id,
        title=payload.title.strip(),
        exam_date=payload.exam_date,
        total_marks=payload.total_marks,
        type=payload.type.strip() if payload.type else "internal",
    )

    target_topics = {}
    if payload.topic_ids:
        found_topics = (
            db.query(Topic)
            .filter(Topic.id.in_(payload.topic_ids), Topic.subject_id == subject.id)
            .all()
        )
        for t in found_topics:
            target_topics[t.id] = t

    if payload.unit_ids:
        unit_topics = (
            db.query(Topic)
            .filter(Topic.unit_id.in_(payload.unit_ids), Topic.subject_id == subject.id)
            .all()
        )
        for t in unit_topics:
            target_topics[t.id] = t

    if target_topics:
        exam.topics = list(target_topics.values())
    else:
        exam.topics = db.query(Topic).filter(Topic.subject_id == subject.id).all()

    db.add(exam)
    db.commit()
    db.refresh(exam)
    return _map_exam_response(exam)


@router.get("/{exam_id}", response_model=ExamResponse)
def get_exam(
    exam_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get single exam details. Returns 404 if not found or not owned."""
    exam = (
        db.query(Exam)
        .filter(Exam.id == exam_id, Exam.user_id == current_user.id)
        .first()
    )
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found",
        )
    return _map_exam_response(exam)


@router.put("/{exam_id}", response_model=ExamResponse)
def update_exam(
    exam_id: str,
    payload: ExamUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update exam details. Returns 404 if not found or not owned."""
    exam = (
        db.query(Exam)
        .filter(Exam.id == exam_id, Exam.user_id == current_user.id)
        .first()
    )
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found",
        )

    if payload.title is not None:
        exam.title = payload.title.strip()
    if payload.exam_date is not None:
        exam.exam_date = payload.exam_date
    if payload.total_marks is not None:
        exam.total_marks = payload.total_marks
    if payload.type is not None:
        exam.type = payload.type.strip()

    if payload.topic_ids is not None or payload.unit_ids is not None:
        target_topics = {}
        if payload.topic_ids:
            found_topics = (
                db.query(Topic)
                .filter(Topic.id.in_(payload.topic_ids), Topic.subject_id == exam.subject_id)
                .all()
            )
            for t in found_topics:
                target_topics[t.id] = t
        if payload.unit_ids:
            unit_topics = (
                db.query(Topic)
                .filter(Topic.unit_id.in_(payload.unit_ids), Topic.subject_id == exam.subject_id)
                .all()
            )
            for t in unit_topics:
                target_topics[t.id] = t
        exam.topics = list(target_topics.values())

    db.commit()
    db.refresh(exam)
    return _map_exam_response(exam)


@router.delete("/{exam_id}", status_code=status.HTTP_200_OK)
def delete_exam(
    exam_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete exam. Returns 404 if not found or not owned."""
    exam = (
        db.query(Exam)
        .filter(Exam.id == exam_id, Exam.user_id == current_user.id)
        .first()
    )
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found",
        )

    db.delete(exam)
    db.commit()
    return {"message": "Exam deleted successfully", "id": exam_id}
