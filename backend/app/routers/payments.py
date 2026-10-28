from datetime import datetime, timezone, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.models.user import User
from app.models.payment import Payment
from app.security.deps import get_current_user
from app.schemas.payment import PaymentConfigResponse, PlanInfo, PaymentCreate, PaymentResponse
from app.analytics import log_event

router = APIRouter(prefix="/api/payments", tags=["payments"])

PLANS = [
    PlanInfo(
        id="monthly",
        name="1 Month Sprint",
        price=49,
        duration_days=30,
        duration_label="30 Days",
        features=[
            "Unlimited subjects (free plan limited to 2)",
            "Unlimited syllabus imports (free plan limited to 1)",
        ]
    ),
    PlanInfo(
        id="semester",
        name="Semester Pass",
        price=99,
        duration_days=180,
        duration_label="Full Semester (6 Months)",
        features=[
            "Unlimited subjects (free plan limited to 2)",
            "Unlimited syllabus imports (free plan limited to 1)",
        ]
    ),
]


@router.get("/config", response_model=PaymentConfigResponse)
def get_payment_config():
    """
    Returns public payment configuration including configured status, UPI ID, and available plans.
    """
    is_configured = bool(settings.UPI_ID.strip())
    return PaymentConfigResponse(
        configured=is_configured,
        upi_id=settings.UPI_ID if is_configured else "",
        payee_name=settings.UPI_PAYEE_NAME if is_configured else "",
        plans=PLANS
    )


@router.post("", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def submit_payment(
    payload: PaymentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submits a payment record with a 12-digit UPI reference (UTR).
    Payment is placed in 'pending' status until manual admin verification.
    """
    if not settings.UPI_ID.strip():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payments are not available yet. UPI configuration is pending."
        )

    # 1. Check for duplicate UTR
    existing = db.query(Payment).filter(Payment.utr == payload.utr).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A payment with this UTR has already been submitted."
        )

    # 2. Determine plan amount
    plan_obj = next((p for p in PLANS if p.id == payload.plan), None)
    if not plan_obj:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid plan selected."
        )

    # 3. Create pending payment record
    payment = Payment(
        user_id=current_user.id,
        plan=payload.plan,
        amount=plan_obj.price,
        utr=payload.utr,
        status="pending"
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    log_event(
        db,
        "payment_submitted",
        user_id=current_user.id,
        properties={"plan": payload.plan, "amount": plan_obj.price, "utr": payload.utr},
    )

    return payment


@router.get("/my", response_model=List[PaymentResponse])
def get_my_payments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns payment submission history for the authenticated user.
    """
    return db.query(Payment).filter(Payment.user_id == current_user.id).order_by(Payment.created_at.desc()).all()


@router.post("/{utr}/approve", response_model=PaymentResponse)
def approve_payment(
    utr: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Admin-only endpoint to verify and approve a pending payment.
    Extends user pro_until accordingly.
    """
    admin_list = [e.strip().lower() for e in settings.ADMIN_EMAILS.split(",") if e.strip()]
    if current_user.email.lower() not in admin_list:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required to approve payments."
        )

    payment = db.query(Payment).filter(Payment.utr == utr).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payment with UTR {utr} not found."
        )

    if payment.status == "approved":
        return payment

    # Approve and extend user pro_until
    payment.status = "approved"
    payment.reviewed_at = datetime.now(timezone.utc)

    if payment.user_id:
        user = db.query(User).filter(User.id == payment.user_id).first()
        if user:
            days = 30 if payment.plan == "monthly" else 180
            now = datetime.now(timezone.utc)
            base_date = now
            if user.pro_until:
                pu = user.pro_until
                if pu.tzinfo is None:
                    pu = pu.replace(tzinfo=timezone.utc)
                if pu > now:
                    base_date = pu
            user.pro_until = base_date + timedelta(days=days)

    db.commit()
    db.refresh(payment)
    return payment
