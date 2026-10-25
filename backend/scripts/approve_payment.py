"""
CLI Script to manually approve a student payment by UTR.
Usage:
    python scripts/approve_payment.py <12-digit-utr>
"""
import sys
import os
from datetime import datetime, timezone, timedelta

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.models.payment import Payment
from app.models.user import User


def main():
    if len(sys.argv) < 2:
        print("Error: Missing UTR argument.")
        print("Usage: python scripts/approve_payment.py <12-digit-utr>")
        sys.exit(1)

    utr = sys.argv[1].strip()
    db = SessionLocal()
    try:
        payment = db.query(Payment).filter(Payment.utr == utr).first()
        if not payment:
            print(f"Error: No payment record found for UTR '{utr}'.")
            sys.exit(1)

        if payment.status == "approved":
            print(f"Payment with UTR '{utr}' is already approved.")
            sys.exit(0)

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
                print(f"Approved payment for {user.email}: extended Pro access by {days} days until {user.pro_until.isoformat()}.")
            else:
                print(f"Approved payment {payment.id}, but associated user {payment.user_id} was not found.")
        else:
            print(f"Approved payment {payment.id} (no associated user).")

        db.commit()
        print("Payment successfully approved.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
