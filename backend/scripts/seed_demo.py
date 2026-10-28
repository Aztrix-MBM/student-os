#!/usr/bin/env python3
"""
Student OS — Realistic Demo Account Seeder
Creates or resets a complete, rich demonstration student account:
- User: demo@studentos.app / Password123!
- Anna University B.E. CSE Semester 4 Core Subjects:
  1. CS3451 Operating Systems (Units 1-5)
  2. CS3491 Cryptography and Cyber Security (Units 1-5)
  3. CS3452 Theory of Computation (Units 1-5)
- Internal Assessment 1 Exam scoped to Units 1 & 2 (Exam in 4 days)
- Realistic Topic Reviews & retention decay
- Active Daily Tasks
- 4-Day Soft Streak with Grace Shield active
- Internal event logs for product activation metrics
"""

import sys
import os
from datetime import datetime, timezone, timedelta

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.orm import Session
from sqlalchemy import insert
from app.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.academic import Subject, Unit, Topic, Exam, Task, exam_topics
from app.models.learning import TopicReview, StudySession
from app.models.planner import DailyPlan
from app.models.notifications import NotificationPreference
from app.models.event import Event
from app.security.auth import hash_password
from app.analytics import log_event


def seed_demo_account():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        now = datetime.now(timezone.utc)
        demo_email = "demo@studentos.app"
        demo_password = "Password123!"

        # 1. Clear existing demo user if present to ensure clean idempotent run
        existing_user = db.query(User).filter(User.email == demo_email).first()
        if existing_user:
            print(f"Cleaning existing demo account: {existing_user.id} ({demo_email})...")
            db.query(TopicReview).filter(TopicReview.user_id == existing_user.id).delete(synchronize_session=False)
            db.query(StudySession).filter(StudySession.user_id == existing_user.id).delete(synchronize_session=False)
            db.query(DailyPlan).filter(DailyPlan.user_id == existing_user.id).delete(synchronize_session=False)
            db.query(NotificationPreference).filter(NotificationPreference.user_id == existing_user.id).delete(synchronize_session=False)
            db.query(Event).filter(Event.user_id == existing_user.id).delete(synchronize_session=False)
            db.query(Task).filter(Task.user_id == existing_user.id).delete(synchronize_session=False)
            for sub in db.query(Subject).filter(Subject.user_id == existing_user.id).all():
                db.delete(sub)
            db.delete(existing_user)
            db.commit()

        # 2. Create Demo User
        user = User(
            name="Muthu (Demo Student)",
            email=demo_email,
            password_hash=hash_password(demo_password),
            auth_provider="local",
            daily_study_minutes=120,
            syllabus_imports_count=2,
            created_at=now - timedelta(days=10),
            updated_at=now,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        log_event(db, "signup", user_id=user.id, properties={"role": "demo_student"})

        # 3. Notification Preferences
        pref = NotificationPreference(
            user_id=user.id,
            morning_plan_enabled=True,
            morning_plan_time="08:00",
            revision_due_alerts=True,
            exam_countdown_alerts=True,
        )
        db.add(pref)

        # 4. Subject 1: CS3451 Operating Systems
        sub_os = Subject(
            user_id=user.id,
            name="Operating Systems",
            code="CS3451",
            semester="Semester 4",
            color_theme="coral",
            created_at=now - timedelta(days=9),
        )
        db.add(sub_os)
        db.commit()
        db.refresh(sub_os)
        log_event(db, "subject_created", user_id=user.id, properties={"subject_id": sub_os.id, "code": sub_os.code})

        os_units_data = [
            ("Unit 1: Process Concept & Scheduling", 20, [
                ("Process State Transitions and PCB", 4, 3),
                ("CPU Scheduling: FCFS, SJF, Round Robin", 5, 4),
                ("Inter-Process Communication & Shared Memory", 3, 3),
            ]),
            ("Unit 2: Process Synchronization & Deadlocks", 25, [
                ("Critical Section Problem & Peterson's Algorithm", 5, 4),
                ("Semaphores and Mutex Locks", 5, 5),
                ("Banker's Algorithm for Deadlock Avoidance", 5, 4),
                ("Resource Allocation Graph & Deadlock Detection", 4, 3),
            ]),
            ("Unit 3: Memory Management & Paging", 20, [
                ("Logical vs Physical Address Space & MMU", 4, 3),
                ("Paging Hardware and Inverted Page Tables", 5, 4),
                ("Virtual Memory & Demand Paging", 5, 4),
                ("Page Replacement: FIFO, LRU, Optimal", 5, 4),
            ]),
            ("Unit 4: Storage & File System Implementation", 18, [
                ("File Allocation Methods: Contiguous, Linked, Indexed", 4, 3),
                ("Disk Scheduling: SSTF, SCAN, C-SCAN", 4, 3),
                ("RAID Architectures (RAID 0, 1, 5)", 3, 2),
            ]),
            ("Unit 5: I/O Systems & Protection", 17, [
                ("DMA, Polling and Interrupt-driven I/O", 3, 3),
                ("Access Matrix and Access Control Lists", 3, 3),
            ]),
        ]

        os_topics = []
        os_unit_1_2_topic_ids = []

        for u_idx, (u_name, weight, topics_list) in enumerate(os_units_data, start=1):
            unit_obj = Unit(subject_id=sub_os.id, name=u_name, order_no=u_idx, exam_weight=weight)
            db.add(unit_obj)
            db.flush()

            for t_idx, (t_name, imp, diff) in enumerate(topics_list, start=1):
                top_obj = Topic(
                    subject_id=sub_os.id,
                    unit_id=unit_obj.id,
                    name=t_name,
                    importance=imp,
                    difficulty=diff,
                    order_no=t_idx,
                )
                db.add(top_obj)
                db.flush()
                os_topics.append(top_obj)
                if u_idx in [1, 2]:
                    os_unit_1_2_topic_ids.append(top_obj.id)

        # 5. Subject 2: CS3491 Cryptography and Cyber Security
        sub_sec = Subject(
            user_id=user.id,
            name="Cryptography & Cyber Security",
            code="CS3491",
            semester="Semester 4",
            color_theme="sky",
            created_at=now - timedelta(days=8),
        )
        db.add(sub_sec)
        db.commit()
        db.refresh(sub_sec)
        log_event(db, "subject_created", user_id=user.id, properties={"subject_id": sub_sec.id, "code": sub_sec.code})

        sec_units_data = [
            ("Unit 1: Classical Encryption", 18, [
                ("Security Goals: CIA Triad", 3, 2),
                ("Symmetric Cipher Model & Playfair Cipher", 4, 3),
            ]),
            ("Unit 2: Modern Symmetric Ciphers", 22, [
                ("DES Round Structure & Avalanche Effect", 5, 4),
                ("AES State Array & MixColumns Transformation", 5, 5),
            ]),
            ("Unit 3: Public Key Cryptography", 25, [
                ("Fermat's and Euler's Totient Theorem", 4, 4),
                ("RSA Algorithm Key Generation & Encryption", 5, 4),
                ("Diffie-Hellman Key Exchange & Man-in-the-Middle", 5, 4),
            ]),
            ("Unit 4: Hash Functions & Signatures", 20, [
                ("SHA-512 Cryptographic Hash Function", 4, 3),
                ("Digital Signature Standard (DSS/ECDSA)", 4, 4),
            ]),
            ("Unit 5: Network Security & Firewalls", 15, [
                ("IPsec Architecture: AH and ESP Headers", 4, 3),
                ("Stateful Inspection Firewalls", 3, 3),
            ]),
        ]

        sec_topics = []
        for u_idx, (u_name, weight, topics_list) in enumerate(sec_units_data, start=1):
            unit_obj = Unit(subject_id=sub_sec.id, name=u_name, order_no=u_idx, exam_weight=weight)
            db.add(unit_obj)
            db.flush()
            for t_idx, (t_name, imp, diff) in enumerate(topics_list, start=1):
                top_obj = Topic(
                    subject_id=sub_sec.id,
                    unit_id=unit_obj.id,
                    name=t_name,
                    importance=imp,
                    difficulty=diff,
                    order_no=t_idx,
                )
                db.add(top_obj)
                db.flush()
                sec_topics.append(top_obj)

        log_event(
            db,
            "syllabus_imported",
            user_id=user.id,
            properties={"subject_id": sub_os.id, "units_count": 5, "topics_count": len(os_topics)},
        )

        # 6. Scoped Exam: Internal Assessment 1 (Covering Unit 1 & 2 of OS)
        exam_date = now + timedelta(days=4, hours=10)
        exam_ia1 = Exam(
            user_id=user.id,
            subject_id=sub_os.id,
            title="Internal Assessment 1",
            exam_date=exam_date,
            total_marks=50,
            type="internal_1",
            created_at=now - timedelta(days=5),
        )
        db.add(exam_ia1)
        db.flush()

        # Link scoped topics (Units 1 & 2 only)
        for t_id in os_unit_1_2_topic_ids:
            db.execute(insert(exam_topics).values(exam_id=exam_ia1.id, topic_id=t_id))

        # 7. Topic Review History (Realistic Decay & Ratings)
        # Unit 1 topics: Reviewed yesterday, Strong
        for t in os_topics[:2]:
            rev = TopicReview(
                topic_id=t.id,
                user_id=user.id,
                reviewed_at=now - timedelta(days=1),
                rating="good",
                self_level="strong",
                stability_days=4.0,
            )
            db.add(rev)
            log_event(db, "topic_reviewed", user_id=user.id, properties={"topic_id": t.id, "rating": "good"})

        # Semaphores: Reviewed 5 days ago, Hard -> Needs review!
        sem_topic = os_topics[4]
        rev_weak = TopicReview(
            topic_id=sem_topic.id,
            user_id=user.id,
            reviewed_at=now - timedelta(days=5),
            rating="hard",
            self_level="weak",
            stability_days=2.0,
        )
        db.add(rev_weak)
        log_event(db, "topic_reviewed", user_id=user.id, properties={"topic_id": sem_topic.id, "rating": "hard"})

        # RSA topic in Crypto: Reviewed 2 days ago
        rsa_topic = sec_topics[5]
        rev_rsa = TopicReview(
            topic_id=rsa_topic.id,
            user_id=user.id,
            reviewed_at=now - timedelta(days=2),
            rating="good",
            self_level="okay",
            stability_days=3.0,
        )
        db.add(rev_rsa)

        # 8. Active Tasks
        task1 = Task(
            user_id=user.id,
            subject_id=sub_os.id,
            title="Practice Peterson's algorithm critical section proof",
            priority=3,
            status="todo",
            due_date=now + timedelta(days=2),
            estimated_minutes=45,
        )
        task2 = Task(
            user_id=user.id,
            subject_id=sub_sec.id,
            title="Solve RSA numericals (p=61, q=53, e=17)",
            priority=2,
            status="todo",
            due_date=now + timedelta(days=4),
            estimated_minutes=35,
        )
        task3 = Task(
            user_id=user.id,
            subject_id=sub_os.id,
            title="Submit OS Lab Exercise 4 on Semaphore IPC",
            priority=3,
            status="todo",
            due_date=now + timedelta(days=1),
            estimated_minutes=40,
        )
        db.add_all([task1, task2, task3])

        # 9. Past Study Sessions (Soft Streak: 4 Active Days)
        for d in range(1, 5):
            sess = StudySession(
                user_id=user.id,
                subject_id=sub_os.id,
                duration_minutes=45,
                started_at=now - timedelta(days=d, hours=2),
            )
            db.add(sess)
            log_event(db, "session_logged", user_id=user.id, properties={"duration_minutes": 45})

        log_event(db, "plan_viewed", user_id=user.id, properties={"plan_items_count": 3, "workload_status": "manageable"})

        db.commit()

        print("=" * 60)
        print("STUDENT OS — DEMO ACCOUNT CREATED SUCCESSFULLY!")
        print("=" * 60)
        print(f"Email:     {demo_email}")
        print(f"Password:  {demo_password}")
        print(f"Name:      Muthu (Demo Student)")
        print("-" * 60)
        print(f"Subjects:  {sub_os.code} ({sub_os.name}) — {len(os_topics)} topics")
        print(f"           {sub_sec.code} ({sub_sec.name}) — {len(sec_topics)} topics")
        print(f"Exam:      {exam_ia1.title} in 4 days (Scoped to {len(os_unit_1_2_topic_ids)} topics in Units 1 & 2)")
        print(f"Tasks:     3 pending priority tasks")
        print(f"Streak:    4-day active study streak")
        print("=" * 60)
        print("You can now login at http://localhost:5173 with these credentials.")
        print("=" * 60)

    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_account()
