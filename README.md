# Student OS — Exam Readiness & Daily Study Planner

> An intelligent, calm academic workspace and exam readiness micro-SaaS engineered for engineering students (tailored for Anna University / autonomous curricula).

---

## 1. What is Student OS?

Engineering students often struggle with syllabus overload, last-minute cramming, and poor visibility into their actual exam preparedness. Student OS solves this through:

1. **Daily Study Planner (Today Dashboard):**
   - Fits high-priority tasks and spaced repetition reviews into the student's daily study time budget.
   - Suggests the single **Next Best Action** with transparent, human-readable reasons (e.g., *"Exam in 4 days + 0 past reviews on high-weight unit"*).

2. **Exam Readiness Analyzer:**
   - Evaluates real-time exam preparedness strictly scoped to the units and topics covered in that exam (e.g., Internal Assessment 1 covering Units 1 & 2).
   - Calculates estimated readiness via:
     $$\text{Readiness Estimate} = \frac{\sum (\text{weight} \times \text{mastery} \times \text{retention})}{\sum \text{weight}}$$
   - Accurately tracks syllabus coverage percentage and highlights weak topics that require urgent revision.

3. **Import Syllabus:**
   - Extracts 3 to 7 units, importance ratings, and topics directly from college syllabus PDFs or pasted text.
   - Allows fine-tuning, editing, and instant assignment to subjects.

4. **Soft Habit Streak:**
   - Rewards consistent daily learning without penalizing students for a missed day during illness or college events (includes automatic Grace Day shielding).

5. **Student Privacy Sovereignty:**
   - Built following India Digital Personal Data Protection (DPDP) principles with complete Right to Erasure (instant, permanent cascade deletion).

---

## 2. Technology Stack

- **Frontend:**
  - React 18 with TypeScript
  - Vite build tool
  - Vanilla CSS design system with accessible tactile clay aesthetics
  - WCAG 2.2 AA compliant color contrast (>= 4.5:1 text, >= 3:1 UI)
  - Progressive Web App (PWA) offline asset caching
  - Lucide React semantic vector icons (0 emojis)

- **Backend:**
  - FastAPI (Python 3.14)
  - SQLAlchemy 2.0 ORM with Foreign Key cascading deletion
  - SQLite (development) / Managed PostgreSQL (production)
  - Pytest with 126 automated test cases covering all engines, auth, and security
  - Self-hosted internal event analytics (`events` table)

---

## 3. Quickstart & Local Setup

### 3.1 Backend Setup

```bash
cd backend

# Create and activate virtual environment (Python 3.12+ / 3.14 recommended)
py -3.14 -m venv venv
venv\Scripts\activate  # On Windows
# source venv/bin/activate  # On Linux/macOS

# Install dependencies
pip install -r requirements.txt

# Seed realistic Anna University demo account (optional but recommended)
python scripts/seed_demo.py

# Start local API development server
py -3.14 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be live at: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 3.2 Frontend Setup

```bash
cd frontend

# Install node dependencies
npm install

# Start Vite development server
npm run dev
```
Web application will be live at: [http://localhost:5173](http://localhost:5173)

---

## 4. Demonstration Account

To evaluate the application with realistic data immediately without manual data entry:

- **Run Seeder:** `cd backend && py -3.14 scripts/seed_demo.py`
- **Login Credentials:**
  - **Email:** `demo@studentos.app`
  - **Password:** `Password123!`
- **What's included in Demo:**
  - CS3451 Operating Systems (5 units, 16 topics)
  - CS3491 Cryptography and Cyber Security (5 units, 11 topics)
  - Internal Assessment 1 scheduled in 4 days (scoped to Units 1 & 2)
  - Spaced repetition decay states (Strong, Okay, and Weak topics)
  - 3 pending tasks with deadlines
  - 4-day active soft streak with grace protection

---

## 5. Running Automated Tests

```bash
# Run backend pytest suite (126 tests)
cd backend
py -3.14 -m pytest

# Run frontend typecheck and production bundle build
cd frontend
npm run build
```

---

## 6. Operations & Deployment

For database backups, disaster recovery restore, secret rotation, metrics reporting, and deployment guides, see [RUNBOOK.md](./RUNBOOK.md).
