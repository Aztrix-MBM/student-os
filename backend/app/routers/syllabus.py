from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import select, insert

from app.database import get_db
from app.models.user import User
from app.models.academic import Subject, Unit, Topic, Exam, exam_topics
from app.security.deps import get_current_user
from app.schemas.syllabus import (
    SyllabusExtractTextRequest,
    SyllabusDraftResponse,
    SyllabusConfirmRequest,
    SyllabusConfirmResponse,
    SyllabusLimitsResponse,
    UnitDraft,
)
from app.ai.extractor import extract_text_from_pdf, SyllabusExtractionError
from app.ai.cache import syllabus_cache
from app.ai.llm_client import extract_syllabus_structure

router = APIRouter(prefix="/api/syllabus", tags=["Syllabus AI"])


@router.get("/limits", response_model=SyllabusLimitsResponse)
def get_syllabus_limits(
    current_user: User = Depends(get_current_user),
):
    """Returns current user's daily extraction allowance and usage count."""
    limits = syllabus_cache.get_user_limits(current_user.id)
    return limits


@router.post("/extract", response_model=SyllabusDraftResponse)
async def extract_syllabus_from_text(
    payload: SyllabusExtractTextRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Extracts draft academic units and topics from pasted syllabus text.
    - Applies per-user daily rate limiting (max 5/day).
    - Checks SHA-256 cache to prevent duplicate LLM calls.
    - Returns editable draft tree without committing to DB.
    """
    if payload.subject_id:
        # Verify subject ownership if subject_id passed
        sub = db.scalars(
            select(Subject).where(Subject.id == payload.subject_id, Subject.user_id == current_user.id)
        ).first()
        if not sub:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subject not found",
            )

    text_hash = syllabus_cache.compute_hash(payload.text)

    # 1. Check Cache
    cached_draft = syllabus_cache.get_cached_draft(text_hash)
    if cached_draft:
        return SyllabusDraftResponse(
            subject_id=payload.subject_id,
            units=cached_draft["units"],
            raw_text_hash=text_hash,
            cached=True,
            token_count=cached_draft.get("token_count"),
            message="Retrieved from cache (0 tokens consumed)",
        )

    # 2. Check Daily Limit
    allowed, used, remaining = syllabus_cache.check_and_increment_usage(current_user.id)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily syllabus extraction limit reached (5/day). Try again tomorrow.",
        )

    # 3. Extract via LLM / Heuristic Engine
    try:
        raw_result = await extract_syllabus_structure(payload.text)
        units_data = [UnitDraft(**u) for u in raw_result.get("units", [])]
        if not units_data:
            raise ValueError("No units could be extracted.")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to parse syllabus structure: {str(exc)}",
        )

    # 4. Save to Cache
    draft_dict = {
        "units": [u.model_dump() for u in units_data],
        "token_count": len(payload.text) // 4,
    }
    syllabus_cache.set_cached_draft(text_hash, draft_dict)

    return SyllabusDraftResponse(
        subject_id=payload.subject_id,
        units=units_data,
        raw_text_hash=text_hash,
        cached=False,
        token_count=draft_dict["token_count"],
        message=f"Extraction successful ({remaining} extractions remaining today)",
    )


@router.post("/upload", response_model=SyllabusDraftResponse)
async def upload_and_extract_pdf(
    file: UploadFile = File(...),
    subject_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Extracts syllabus structure from an uploaded PDF document.
    - Validates file size (max 5MB) and page count (max 30 pages).
    - Checks for scanned/empty text and provides clear guidance.
    """
    if subject_id:
        sub = db.scalars(
            select(Subject).where(Subject.id == subject_id, Subject.user_id == current_user.id)
        ).first()
        if not sub:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subject not found",
            )

    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty.",
        )

    try:
        extracted_text, num_pages = extract_text_from_pdf(content)
    except SyllabusExtractionError as exc:
        status_map = {
            "FILE_TOO_LARGE": status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            "TOO_MANY_PAGES": status.HTTP_422_UNPROCESSABLE_ENTITY,
            "SCANNED_PDF_TEXT_REQUIRED": status.HTTP_422_UNPROCESSABLE_ENTITY,
            "INVALID_PDF": status.HTTP_400_BAD_REQUEST,
            "EMPTY_PDF": status.HTTP_400_BAD_REQUEST,
        }
        raise HTTPException(
            status_code=status_map.get(exc.code, status.HTTP_422_UNPROCESSABLE_ENTITY),
            detail=exc.message,
        )

    # Hand off to extract pipeline
    req = SyllabusExtractTextRequest(text=extracted_text, subject_id=subject_id)
    return await extract_syllabus_from_text(req, current_user=current_user, db=db)


@router.post("/confirm", response_model=SyllabusConfirmResponse)
def confirm_syllabus(
    payload: SyllabusConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Saves student-confirmed units and topics into the Academic Core database.
    - Enforces strict multi-tenant ownership on subject and exam.
    - Automatically links newly created topics to the specified exam if provided.
    """
    # 1. Verify subject ownership (404 if not found or cross-user)
    subject = db.scalars(
        select(Subject).where(Subject.id == payload.subject_id, Subject.user_id == current_user.id)
    ).first()
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found",
        )

    # 2. Verify exam ownership if exam_id provided
    exam: Optional[Exam] = None
    if payload.exam_id:
        exam = db.scalars(
            select(Exam).where(
                Exam.id == payload.exam_id,
                Exam.user_id == current_user.id,
                Exam.subject_id == subject.id,
            )
        ).first()
        if not exam:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Exam not found for this subject",
            )

    saved_units_count = 0
    saved_topics_count = 0
    created_topic_ids = []

    # 3. Create Units and Topics
    for u_idx, unit_draft in enumerate(payload.units, start=1):
        unit_record = Unit(
            subject_id=subject.id,
            name=unit_draft.name,
            order_no=unit_draft.order_no or u_idx,
            exam_weight=unit_draft.exam_weight,
        )
        db.add(unit_record)
        db.flush()  # Populates unit_record.id
        saved_units_count += 1

        for t_idx, topic_draft in enumerate(unit_draft.topics, start=1):
            topic_record = Topic(
                subject_id=subject.id,
                unit_id=unit_record.id,
                name=topic_draft.name,
                importance=topic_draft.importance,
                difficulty=topic_draft.difficulty,
                order_no=topic_draft.order_no or t_idx,
            )
            db.add(topic_record)
            db.flush()  # Populates topic_record.id
            saved_topics_count += 1
            created_topic_ids.append(topic_record.id)

    # 4. Link topics to exam if exam exists
    if exam and created_topic_ids:
        for t_id in created_topic_ids:
            db.execute(
                insert(exam_topics).values(exam_id=exam.id, topic_id=t_id)
            )

    db.commit()

    return SyllabusConfirmResponse(
        success=True,
        subject_id=subject.id,
        saved_units_count=saved_units_count,
        saved_topics_count=saved_topics_count,
        exam_linked=bool(exam),
        message=f"Successfully saved {saved_units_count} units and {saved_topics_count} topics.",
    )
