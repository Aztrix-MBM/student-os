from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class PlanInfo(BaseModel):
    id: str
    name: str
    price: int
    duration_days: int
    duration_label: str
    features: List[str]


class PaymentConfigResponse(BaseModel):
    configured: bool
    upi_id: str
    payee_name: str
    plans: List[PlanInfo]


class PaymentCreate(BaseModel):
    plan: str = Field(..., pattern="^(monthly|semester)$")
    utr: str = Field(..., pattern=r"^\d{12}$", description="12-digit UPI reference number")


class PaymentResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    plan: str
    amount: int
    utr: str
    status: str
    created_at: datetime
    reviewed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
