import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def generate_payment_id() -> str:
    return f"pay_{uuid.uuid4().hex[:12]}"


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=generate_payment_id, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    plan = Column(String(50), nullable=False)  # "monthly", "semester"
    amount = Column(Integer, nullable=False)   # 49, 99
    utr = Column(String(50), unique=True, index=True, nullable=False)
    status = Column(String(20), default="pending", nullable=False)  # "pending", "approved", "rejected"
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationship
    user = relationship("User")

    __table_args__ = (
        Index("ix_payments_status_created", "status", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<Payment {self.id} utr={self.utr} plan={self.plan} status={self.status}>"
