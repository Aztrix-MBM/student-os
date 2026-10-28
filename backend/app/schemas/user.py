from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    daily_study_minutes: int = Field(default=120, ge=30, le=720)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)


class UserUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    daily_study_minutes: Optional[int] = Field(default=None, ge=30, le=720)


class UserResponse(UserBase):
    id: str
    auth_provider: str
    is_pro: bool = False
    pro_until: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
