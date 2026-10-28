#!/usr/bin/env python3
"""
Internal Product Analytics Reporter
Queries the self-hosted `events` table and calculates:
- Core product funnel counts
- Activation Rate: % of users who imported a syllabus AND viewed their plan
- Day-7 Retention: % of users active 7 days after signup
"""

import sys
import os
from datetime import datetime, timezone, timedelta
from typing import Dict, Set

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.event import Event


def compute_metrics(db: Session):
    now = datetime.now(timezone.utc)
    
    # 1. Total event counts by event_name
    event_counts = dict(
        db.query(Event.event_name, func.count(Event.id))
        .group_by(Event.event_name)
        .all()
    )

    total_users = db.query(User).count()
    total_events = db.query(Event).count()

    # 2. Activation metric:
    # Users who did BOTH "syllabus_imported" and "plan_viewed"
    syllabus_importer_ids = set(
        db.scalars(
            select(Event.user_id)
            .where(Event.event_name == "syllabus_imported", Event.user_id.is_not(None))
            .distinct()
        ).all()
    )

    plan_viewer_ids = set(
        db.scalars(
            select(Event.user_id)
            .where(Event.event_name == "plan_viewed", Event.user_id.is_not(None))
            .distinct()
        ).all()
    )

    activated_user_ids = syllabus_importer_ids.intersection(plan_viewer_ids)
    activation_rate = (len(activated_user_ids) / total_users * 100.0) if total_users > 0 else 0.0

    # 3. Day-7 Retention:
    # Users whose account was created >= 7 days ago
    users_older_than_7d = db.query(User).filter(
        User.created_at <= now - timedelta(days=7)
    ).all()

    d7_retained_count = 0
    d7_eligible_count = len(users_older_than_7d)

    for u in users_older_than_7d:
        signup_dt = u.created_at
        if signup_dt.tzinfo is None:
            signup_dt = signup_dt.replace(tzinfo=timezone.utc)
        d7_start = signup_dt + timedelta(days=6)
        d7_end = signup_dt + timedelta(days=8)

        active_d7 = db.query(Event).filter(
            Event.user_id == u.id,
            Event.created_at >= d7_start,
            Event.created_at <= d7_end
        ).first()

        if active_d7:
            d7_retained_count += 1

    d7_retention_rate = (d7_retained_count / d7_eligible_count * 100.0) if d7_eligible_count > 0 else 0.0

    # Output Report
    print("=" * 60)
    print("STUDENT OS — INTERNAL PRODUCT ANALYTICS REPORT")
    print(f"Generated at: {now.strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print("=" * 60)
    print(f"Total Users Registered: {total_users}")
    print(f"Total Events Logged:     {total_events}")
    print("-" * 60)
    print("EVENT COUNTS:")
    tracked_events = [
        "signup",
        "session_logged",
        "subject_created",
        "syllabus_imported",
        "plan_viewed",
        "topic_reviewed",
        "payment_submitted",
    ]
    for ev in tracked_events:
        count = event_counts.get(ev, 0)
        print(f"  • {ev.ljust(22)}: {count}")

    print("-" * 60)
    print("KEY PRODUCT HEALTH METRICS:")
    print(f"  • Activated Users (Syllabus + Plan): {len(activated_user_ids)} / {total_users} ({activation_rate:.1f}%)")
    print(f"  • Day-7 Retention (Cohort >= 7d):   {d7_retained_count} / {d7_eligible_count} ({d7_retention_rate:.1f}%)")
    print("=" * 60)


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        compute_metrics(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
