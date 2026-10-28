from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.database import get_db
from app.models.user import User
from app.models.academic import Subject, Topic, Exam, exam_topics
from app.models.learning import TopicReview, StudySession
from app.security.deps import get_current_user
from app.schemas.learning import (
    TopicReviewCreate,
    TopicReviewResponse,
    StudySessionCreate,
    StudySessionResponse,
    ExamReadinessResponse,
    ExamReadinessTopic,
)
from app.engine.retention import update_stability, retention, INITIAL_STABILITY
from app.engine.readiness import calculate_readiness, resolve_mastery
from app.analytics import log_event

router = APIRouter(prefix="/api", tags=["Learning Loop"])


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


@router.post("/topics/{topic_id}/review", response_model=TopicReviewResponse, status_code=status.HTTP_201_CREATED)
def review_topic(
    topic_id: str,
    payload: TopicReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Submits a review recall event for a topic.
    Updates memory stability using Spaced Repetition algorithms:
    - easy: * 2.5
    - good: * 2.0
    - hard: * 1.3
    - fail: max(1.0, stability * 0.5)
    Event-sourced: Never mutates topics table directly; records a TopicReview.
    """
    # 1. Enforce ownership: topic's subject must belong to current user
    topic = db.scalars(
        select(Topic)
        .join(Subject, Topic.subject_id == Subject.id)
        .where(Topic.id == topic_id, Subject.user_id == current_user.id)
    ).first()
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Topic not found",
        )

    # 2. Fetch latest previous review for stability calculation
    prev_review = db.scalars(
        select(TopicReview)
        .where(TopicReview.topic_id == topic_id, TopicReview.user_id == current_user.id)
        .order_by(desc(TopicReview.reviewed_at))
    ).first()

    current_stability = prev_review.stability_days if prev_review else INITIAL_STABILITY
    new_stability = update_stability(current_stability, payload.rating)

    # 3. Create review event
    review_record = TopicReview(
        user_id=current_user.id,
        topic_id=topic.id,
        reviewed_at=utc_now(),
        rating=payload.rating.strip().lower(),
        self_level=payload.self_level.strip().lower() if payload.self_level else None,
        quiz_score=payload.quiz_score,
        stability_days=new_stability,
    )
    db.add(review_record)
    db.commit()
    db.refresh(review_record)

    log_event(
        db,
        "topic_reviewed",
        user_id=current_user.id,
        properties={"topic_id": topic_id, "rating": payload.rating, "stability_days": new_stability},
    )

    return TopicReviewResponse(
        id=review_record.id,
        topic_id=review_record.topic_id,
        user_id=review_record.user_id,
        reviewed_at=review_record.reviewed_at,
        rating=review_record.rating,
        self_level=review_record.self_level,
        quiz_score=review_record.quiz_score,
        stability_days=review_record.stability_days,
        retention_estimate=1.0,
    )


@router.get("/topics/{topic_id}/reviews", response_model=List[TopicReviewResponse])
def get_topic_reviews_history(
    topic_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves full review history timeline for an owned topic."""
    # Verify ownership
    topic = db.scalars(
        select(Topic)
        .join(Subject, Topic.subject_id == Subject.id)
        .where(Topic.id == topic_id, Subject.user_id == current_user.id)
    ).first()
    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")

    reviews = db.scalars(
        select(TopicReview)
        .where(TopicReview.topic_id == topic_id, TopicReview.user_id == current_user.id)
        .order_by(desc(TopicReview.reviewed_at))
    ).all()

    now = utc_now()
    results = []
    for r in reviews:
        r_time = r.reviewed_at
        if r_time.tzinfo is None:
            r_time = r_time.replace(tzinfo=timezone.utc)
        days = max(0.0, (now - r_time).total_seconds() / 86400.0)
        ret_val = retention(days, r.stability_days)
        results.append(
            TopicReviewResponse(
                id=r.id,
                topic_id=r.topic_id,
                user_id=r.user_id,
                reviewed_at=r.reviewed_at,
                rating=r.rating,
                self_level=r.self_level,
                quiz_score=r.quiz_score,
                stability_days=r.stability_days,
                retention_estimate=round(ret_val, 2),
            )
        )
    return results


@router.get("/exams/{exam_id}/readiness", response_model=ExamReadinessResponse)
def get_exam_readiness(
    exam_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Computes real-time exam readiness % and syllabus coverage %
    from live topic review event history and retention decay.
    """
    # 1. Enforce ownership: exam must belong to current user
    exam = db.scalars(
        select(Exam).where(Exam.id == exam_id, Exam.user_id == current_user.id)
    ).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")

    subject = exam.subject
    now = utc_now()
    exam_date = exam.exam_date
    if exam_date.tzinfo is None:
        exam_date = exam_date.replace(tzinfo=timezone.utc)
    days_to_exam = round((exam_date - now).total_seconds() / 86400.0, 1)

    # 2. Fetch associated topics (via exam_topics or fallback to subject topics)
    topics = list(exam.topics) if exam.topics else list(subject.topics)

    engine_topics_input = []
    topic_meta_map = {}

    for t in topics:
        # Fetch latest review for this topic by current user
        latest_review = db.scalars(
            select(TopicReview)
            .where(TopicReview.topic_id == t.id, TopicReview.user_id == current_user.id)
            .order_by(desc(TopicReview.reviewed_at))
        ).first()

        if latest_review:
            r_time = latest_review.reviewed_at
            if r_time.tzinfo is None:
                r_time = r_time.replace(tzinfo=timezone.utc)
            days_since = max(0.0, (now - r_time).total_seconds() / 86400.0)
            stability = latest_review.stability_days
            self_level = latest_review.self_level
            quiz_score = latest_review.quiz_score
            rating = latest_review.rating
        else:
            days_since = None
            stability = INITIAL_STABILITY
            self_level = None
            quiz_score = None
            rating = None

        engine_topics_input.append({
            "id": t.id,
            "title": t.name,
            "importance": t.importance,
            "days_since_review": days_since,
            "stability": stability,
            "self_level": self_level,
            "quiz_score": quiz_score,
            "latest_rating": rating,
        })

        topic_meta_map[t.id] = {
            "name": t.name,
            "importance": t.importance,
            "latest_rating": rating,
            "self_level": self_level,
            "days_since_review": round(days_since, 1) if days_since is not None else None,
        }

    # 3. Call Pure Intelligence Engine
    readiness_result = calculate_readiness(engine_topics_input, exam_weight=1.0)

    # 4. Format detailed topic breakdown
    all_topics_list: List[ExamReadinessTopic] = []
    weak_topics_list: List[ExamReadinessTopic] = []
    strong_topics_list: List[ExamReadinessTopic] = []

    weak_ids = {w["id"] for w in readiness_result["weak_topics"]}
    strong_ids = {s["id"] for s in readiness_result["strong_topics"]}

    for item in engine_topics_input:
        t_id = item["id"]
        meta = topic_meta_map[t_id]
        days = item["days_since_review"]
        stab = item["stability"]
        r_val = retention(days, stab) if days is not None else 0.0
        m_val = resolve_mastery(item["self_level"], item["quiz_score"], item["latest_rating"])
        eff_score = round(m_val * r_val, 2)
        is_weak = t_id in weak_ids

        topic_obj = ExamReadinessTopic(
            id=t_id,
            name=meta["name"],
            importance=meta["importance"],
            mastery=round(m_val, 2),
            retention=round(r_val, 2),
            effective_score=eff_score,
            latest_rating=meta["latest_rating"],
            self_level=meta["self_level"],
            days_since_review=meta["days_since_review"],
            is_weak=is_weak,
        )
        all_topics_list.append(topic_obj)
        if is_weak:
            weak_topics_list.append(topic_obj)
        elif t_id in strong_ids:
            strong_topics_list.append(topic_obj)

    return ExamReadinessResponse(
        exam_id=exam.id,
        exam_title=exam.title,
        subject_id=subject.id,
        subject_name=subject.name,
        exam_date=exam_date,
        days_to_exam=days_to_exam,
        readiness_pct=readiness_result["readiness_pct"],
        coverage_pct=readiness_result["coverage_pct"],
        total_topics=readiness_result["total_topics"],
        reviewed_topics=readiness_result["reviewed_topics"],
        weak_topics=weak_topics_list,
        strong_topics=strong_topics_list,
        all_topics=all_topics_list,
        label="estimate",
    )


@router.post("/study-sessions", response_model=StudySessionResponse, status_code=status.HTTP_201_CREATED)
def create_study_session(
    payload: StudySessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Logs a focused study session or Pomodoro block."""
    if payload.subject_id:
        sub = db.scalars(
            select(Subject).where(Subject.id == payload.subject_id, Subject.user_id == current_user.id)
        ).first()
        if not sub:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")

    if payload.topic_id:
        top = db.scalars(
            select(Topic)
            .join(Subject, Topic.subject_id == Subject.id)
            .where(Topic.id == payload.topic_id, Subject.user_id == current_user.id)
        ).first()
        if not top:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")

    session_record = StudySession(
        user_id=current_user.id,
        subject_id=payload.subject_id,
        topic_id=payload.topic_id,
        duration_minutes=payload.duration_minutes,
        started_at=payload.started_at or utc_now(),
    )
    db.add(session_record)
    db.commit()
    db.refresh(session_record)

    log_event(
        db,
        "session_logged",
        user_id=current_user.id,
        properties={"duration_minutes": payload.duration_minutes, "subject_id": payload.subject_id},
    )

    return session_record


@router.get("/study-sessions", response_model=List[StudySessionResponse])
def list_study_sessions(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lists student's past study sessions ordered chronologically."""
    sessions = db.scalars(
        select(StudySession)
        .where(StudySession.user_id == current_user.id)
        .order_by(desc(StudySession.started_at))
        .limit(limit)
    ).all()
    return sessions
