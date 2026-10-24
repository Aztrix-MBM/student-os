from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class TopicDraft(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    importance: float = Field(0.5, ge=0.0, le=1.0)
    difficulty: int = Field(3, ge=1, le=5)
    order_no: int = Field(1, ge=1)

    @field_validator("name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Topic name cannot be empty")
        return clean


class UnitDraft(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    order_no: int = Field(1, ge=1)
    exam_weight: float = Field(1.0, ge=0.1, le=5.0)
    topics: List[TopicDraft] = Field(default_factory=list)

    @field_validator("name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Unit name cannot be empty")
        return clean


class SyllabusDraftResponse(BaseModel):
    subject_id: Optional[str] = None
    units: List[UnitDraft]
    raw_text_hash: str
    cached: bool = False
    token_count: Optional[int] = None
    message: Optional[str] = None


class SyllabusExtractTextRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=100000)
    subject_id: Optional[str] = None

    @field_validator("text")
    @classmethod
    def clean_text(cls, v: str) -> str:
        clean = v.strip()
        if len(clean) < 10:
            raise ValueError("Syllabus text must contain at least 10 characters")
        return clean


class SyllabusConfirmRequest(BaseModel):
    subject_id: str
    exam_id: Optional[str] = None
    units: List[UnitDraft] = Field(..., min_length=1)


class SyllabusConfirmResponse(BaseModel):
    success: bool = True
    subject_id: str
    saved_units_count: int
    saved_topics_count: int
    exam_linked: bool = False
    message: str = "Syllabus successfully saved to academic core"


class SyllabusLimitsResponse(BaseModel):
    limit: int
    used_today: int
    remaining_today: int
