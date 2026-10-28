from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


# ---------------------- TOPIC SCHEMAS ----------------------
class TopicBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    unit_id: Optional[str] = None
    difficulty: int = Field(default=3, ge=1, le=5)
    importance: float = Field(default=0.5, ge=0.0, le=1.0)
    order_no: int = Field(default=1, ge=1)


class TopicCreate(TopicBase):
    pass


class TopicResponse(TopicBase):
    id: str
    subject_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------- UNIT SCHEMAS ----------------------
class UnitBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    order_no: int = Field(default=1, ge=1)
    exam_weight: Optional[float] = Field(default=None, ge=0.0, le=1.0)


class UnitCreate(UnitBase):
    pass


class UnitResponse(UnitBase):
    id: str
    subject_id: str
    created_at: datetime
    topics: List[TopicResponse] = []

    model_config = ConfigDict(from_attributes=True)


# ---------------------- SUBJECT SCHEMAS ----------------------
class SubjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    code: str = Field(..., min_length=1, max_length=50)
    semester: Optional[str] = Field(default=None, max_length=50)
    color_theme: str = Field(default="sky", max_length=50)


class SubjectCreate(SubjectBase):
    pass


class SubjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    code: Optional[str] = Field(default=None, min_length=1, max_length=50)
    semester: Optional[str] = Field(default=None, max_length=50)
    color_theme: Optional[str] = Field(default=None, max_length=50)


class SubjectResponse(SubjectBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    units_count: int = 0
    topics_count: int = 0
    exams_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class SubjectDetailResponse(SubjectResponse):
    units: List[UnitResponse] = []
    topics: List[TopicResponse] = []


# ---------------------- EXAM SCHEMAS ----------------------
class ExamBase(BaseModel):
    subject_id: str
    title: str = Field(..., min_length=1, max_length=150)
    exam_date: datetime
    total_marks: int = Field(default=100, ge=1, le=1000)
    type: str = Field(default="internal", max_length=50)


class ExamCreate(ExamBase):
    topic_ids: Optional[List[str]] = None
    unit_ids: Optional[List[str]] = None


class ExamUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=150)
    exam_date: Optional[datetime] = None
    total_marks: Optional[int] = Field(default=None, ge=1, le=1000)
    type: Optional[str] = Field(default=None, max_length=50)
    topic_ids: Optional[List[str]] = None
    unit_ids: Optional[List[str]] = None


class ExamResponse(BaseModel):
    id: str
    user_id: str
    subject_id: str
    subject_name: Optional[str] = None
    title: str
    exam_date: datetime
    total_marks: int
    type: str
    created_at: datetime
    updated_at: datetime
    topic_ids: List[str] = []
    topics_count: int = 0

    model_config = ConfigDict(from_attributes=True)


# ---------------------- TASK SCHEMAS ----------------------
class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    subject_id: Optional[str] = None
    priority: int = Field(default=3, ge=1, le=5)
    status: str = Field(default="todo")  # todo, in_progress, completed
    due_date: Optional[datetime] = None
    estimated_minutes: int = Field(default=30, ge=5, le=480)


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    subject_id: Optional[str] = None
    priority: Optional[int] = Field(default=None, ge=1, le=5)
    status: Optional[str] = None  # todo, in_progress, completed
    due_date: Optional[datetime] = None
    estimated_minutes: Optional[int] = Field(default=None, ge=5, le=480)


class TaskResponse(BaseModel):
    id: str
    user_id: str
    subject_id: Optional[str] = None
    subject_name: Optional[str] = None
    title: str
    priority: int
    status: str
    due_date: Optional[datetime] = None
    estimated_minutes: int
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
