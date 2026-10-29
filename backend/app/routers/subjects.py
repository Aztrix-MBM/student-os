from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from app.database import get_db
from app.models.user import User
from app.models.academic import Subject, Unit, Topic, Exam
from app.models.learning import TopicReview
from app.schemas.academic import (
    SubjectCreate,
    SubjectUpdate,
    SubjectResponse,
    SubjectDetailResponse,
    UnitCreate,
    UnitResponse,
    TopicCreate,
    TopicResponse,
)
from app.security.deps import get_current_user
from app.analytics import log_event

router = APIRouter(prefix="/api/subjects", tags=["Subjects"])


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _build_topic_response_with_review(
    t: Topic, latest_review: TopicReview | None
) -> TopicResponse:
    """Build a TopicResponse enriched with the latest review snapshot."""
    self_level = None
    days_since_review = None
    stability_days = None

    if latest_review:
        self_level = latest_review.self_level
        r_time = latest_review.reviewed_at
        if r_time.tzinfo is None:
            r_time = r_time.replace(tzinfo=timezone.utc)
        days_since_review = round(
            max(0.0, (_utc_now() - r_time).total_seconds() / 86400.0), 2
        )
        stability_days = latest_review.stability_days

    return TopicResponse(
        id=t.id,
        subject_id=t.subject_id,
        unit_id=t.unit_id,
        name=t.name,
        difficulty=t.difficulty,
        importance=t.importance,
        order_no=t.order_no,
        created_at=t.created_at,
        self_level=self_level,
        days_since_review=days_since_review,
        stability_days=stability_days,
    )


def _map_subject_response(sub: Subject) -> SubjectResponse:
    return SubjectResponse(
        id=sub.id,
        user_id=sub.user_id,
        name=sub.name,
        code=sub.code,
        semester=sub.semester,
        color_theme=sub.color_theme,
        created_at=sub.created_at,
        updated_at=sub.updated_at,
        units_count=len(sub.units),
        topics_count=len(sub.topics),
        exams_count=len(sub.exams),
    )


@router.get("", response_model=List[SubjectResponse])
def get_user_subjects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all subjects belonging to the authenticated student."""
    subjects = (
        db.query(Subject)
        .filter(Subject.user_id == current_user.id)
        .order_by(Subject.created_at.desc())
        .all()
    )
    return [_map_subject_response(s) for s in subjects]


@router.post("", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
def create_subject(
    payload: SubjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new subject for the authenticated student."""
    subject = Subject(
        user_id=current_user.id,
        name=payload.name.strip(),
        code=payload.code.strip().upper(),
        semester=payload.semester.strip() if payload.semester else None,
        color_theme=payload.color_theme or "sky",
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)
    log_event(db, "subject_created", user_id=current_user.id, properties={"subject_id": subject.id, "code": subject.code})
    return _map_subject_response(subject)


@router.get("/{subject_id}", response_model=SubjectDetailResponse)
def get_subject_detail(
    subject_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve single subject with its units and topics (enriched with latest review data). Returns 404 if not found or not owned."""
    subject = (
        db.query(Subject)
        .filter(Subject.id == subject_id, Subject.user_id == current_user.id)
        .first()
    )
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found",
        )

    # Bulk-fetch latest reviews for all topics in this subject to avoid N+1 queries
    topic_ids = [t.id for t in subject.topics]
    latest_reviews: dict = {}
    if topic_ids:
        all_reviews = (
            db.execute(
                select(TopicReview)
                .where(
                    TopicReview.topic_id.in_(topic_ids),
                    TopicReview.user_id == current_user.id,
                )
                .order_by(desc(TopicReview.reviewed_at))
            )
            .scalars()
            .all()
        )
        for rev in all_reviews:
            if rev.topic_id not in latest_reviews:
                latest_reviews[rev.topic_id] = rev

    # Convert units with nested topics (enriched with review snapshots)
    unit_responses = []
    for u in subject.units:
        unit_responses.append(
            UnitResponse(
                id=u.id,
                subject_id=u.subject_id,
                name=u.name,
                order_no=u.order_no,
                exam_weight=u.exam_weight,
                created_at=u.created_at,
                topics=[
                    _build_topic_response_with_review(t, latest_reviews.get(t.id))
                    for t in u.topics
                ],
            )
        )

    return SubjectDetailResponse(
        id=subject.id,
        user_id=subject.user_id,
        name=subject.name,
        code=subject.code,
        semester=subject.semester,
        color_theme=subject.color_theme,
        created_at=subject.created_at,
        updated_at=subject.updated_at,
        units_count=len(subject.units),
        topics_count=len(subject.topics),
        exams_count=len(subject.exams),
        units=unit_responses,
        topics=[
            _build_topic_response_with_review(t, latest_reviews.get(t.id))
            for t in subject.topics
        ],
    )


@router.put("/{subject_id}", response_model=SubjectResponse)
def update_subject(
    subject_id: str,
    payload: SubjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update subject details. Returns 404 if not found or not owned."""
    subject = (
        db.query(Subject)
        .filter(Subject.id == subject_id, Subject.user_id == current_user.id)
        .first()
    )
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found",
        )

    if payload.name is not None:
        subject.name = payload.name.strip()
    if payload.code is not None:
        subject.code = payload.code.strip().upper()
    if payload.semester is not None:
        subject.semester = payload.semester.strip() if payload.semester else None
    if payload.color_theme is not None:
        subject.color_theme = payload.color_theme

    db.commit()
    db.refresh(subject)
    return _map_subject_response(subject)


@router.delete("/{subject_id}", status_code=status.HTTP_200_OK)
def delete_subject(
    subject_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete subject and cascade delete its units, topics, and exams. Returns 404 if not owned."""
    subject = (
        db.query(Subject)
        .filter(Subject.id == subject_id, Subject.user_id == current_user.id)
        .first()
    )
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found",
        )

    db.delete(subject)
    db.commit()
    return {"message": "Subject deleted successfully", "id": subject_id}


@router.post("/{subject_id}/units", response_model=UnitResponse, status_code=status.HTTP_201_CREATED)
def create_unit(
    subject_id: str,
    payload: UnitCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a unit within an owned subject. Returns 404 if subject not owned."""
    subject = (
        db.query(Subject)
        .filter(Subject.id == subject_id, Subject.user_id == current_user.id)
        .first()
    )
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found",
        )

    unit = Unit(
        subject_id=subject.id,
        name=payload.name.strip(),
        order_no=payload.order_no,
        exam_weight=payload.exam_weight,
    )
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return UnitResponse(
        id=unit.id,
        subject_id=unit.subject_id,
        name=unit.name,
        order_no=unit.order_no,
        exam_weight=unit.exam_weight,
        created_at=unit.created_at,
        topics=[],
    )


@router.post("/{subject_id}/topics", response_model=TopicResponse, status_code=status.HTTP_201_CREATED)
def create_topic(
    subject_id: str,
    payload: TopicCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a topic within an owned subject. Returns 404 if subject not owned."""
    subject = (
        db.query(Subject)
        .filter(Subject.id == subject_id, Subject.user_id == current_user.id)
        .first()
    )
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found",
        )

    if payload.unit_id:
        unit = (
            db.query(Unit)
            .filter(Unit.id == payload.unit_id, Unit.subject_id == subject.id)
            .first()
        )
        if not unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Unit not found in this subject",
            )

    topic = Topic(
        subject_id=subject.id,
        unit_id=payload.unit_id,
        name=payload.name.strip(),
        difficulty=payload.difficulty,
        importance=payload.importance,
        order_no=payload.order_no,
    )
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return TopicResponse.model_validate(topic)


@router.get("/{subject_id}/topics", response_model=List[TopicResponse])
def get_subject_topics(
    subject_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List topics for an owned subject. Returns 404 if not owned."""
    subject = (
        db.query(Subject)
        .filter(Subject.id == subject_id, Subject.user_id == current_user.id)
        .first()
    )
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found",
        )

    topics = db.query(Topic).filter(Topic.subject_id == subject.id).order_by(Topic.order_no.asc()).all()
    return [TopicResponse.model_validate(t) for t in topics]
