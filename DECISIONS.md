# Architectural & Engineering Decisions — Student OS

## Decision 1: Frontend Framework — Vite + React (TypeScript) instead of Next.js
- **Context:** `ANTIGRAVITY_BUILD_GUIDE.md` Section 2 suggested Next.js (App Router), but the reference UI design required custom, highly bespoke Claymorphism styling, instantaneous client-side calculations (retention curves, readiness formulas), and responsive mobile simulations without server component hydration overhead.
- **Decision:** Built the frontend using **Vite + React (TypeScript)**.
- **Rationale:**
  - Sub-second hot-module replacement (HMR) and instantaneous build times (491ms).
  - Clean client-side routing and state management without Next.js App Router hydration mismatches.
  - Zero server-side rendering latency for student dashboard workflows.
  - Can be wrapped into an installable PWA with service workers in Phase 8 without Next.js complex server dependencies.

## Decision 2: Database Strategy — SQLite for Development, Migration-Ready for MySQL/PostgreSQL
- **Context:** The build guide specified MySQL with an eye toward PostgreSQL.
- **Decision:** Configured SQLAlchemy 2 and Alembic with **SQLite as the local development default** (`sqlite:///./student_os.db`), while fully supporting MySQL (`mysql+pymysql://...`) via `.env`.
- **Rationale:**
  - Allows immediate, reliable local development, automated testing (`pytest`), and offline development without demanding that every student or developer maintain an active local MySQL service with configured root passwords.
  - All migrations and models are managed strictly via Alembic (`alembic upgrade head`), ensuring 100% portable DDL that switches to managed MySQL or Supabase PostgreSQL by changing a single `.env` variable (`DATABASE_URL`).

## Decision 3: MVP Scope Boundary — Out-of-Scope Screens Moved to `/prototype`
- **Context:** Per `ANTIGRAVITY_BUILD_GUIDE.md` Section 1, items like Career GPS, Analytics graphs, public marketing pages, and complex calendars are out of MVP scope.
- **Decision:** Moved `Career`, `Analytics`, `Landing`, and `Study Planner` screens into `frontend/src/prototype/` and wrapped them inside a dedicated `PrototypeHub` container.
- **Rationale:** Keeps the core product laser-focused on the primary user loop: **Auth -> Syllabus Extract -> Topic Rating -> Today Screen ("what to study today and why") -> Exam Readiness %**.

## Decision 4: Claymorphism Design System Implementation
- **Context:** High-fidelity Claymorphism design requested based on `UI and UX reference.png`.
- **Decision:** Created a bespoke Vanilla CSS design system (`index.css`) with multi-layered soft drop shadows, dual inset bevels, tactile button depressions, and light/dark mode support. Touch targets meet WCAG 2.2 AA (>= 44px).

## Decision 5: Phase 2 Authentication Architecture (httpOnly Cookies + bcrypt)
- **Context:** `ANTIGRAVITY_BUILD_GUIDE.md` Section 2 strictly forbids storing JWT tokens in `localStorage`.
- **Decision:**
  - Implemented password hashing using `bcrypt` (12 rounds).
  - Generated HMAC-SHA256 signed JWT tokens via `pyjwt` with UTC timestamp expirations.
  - Tokens are transmitted exclusively through **httpOnly + SameSite=lax** cookies (`access_token`).
  - Added protected route dependency `get_current_user` in FastAPI, raising 401 for missing cookies, expired tokens, or nonexistent users.
  - Frontend `api.ts` uses `credentials: 'include'` on all requests so cookies are handled automatically and securely by the browser.
  - Logout explicitly instructs the browser to delete the cookie via `response.delete_cookie`.
- **7-Day Token Lifespan Trade-off Analysis:**
  - *Benefits:* Eliminates complex client-side refresh-token synchronization loops, preventing unexpected session disconnects while students take timed mock exams or study offline.
  - *Trade-offs:* In standard stateless JWTs, a compromised token remains valid until expiration. To mitigate this risk, `get_current_user` queries the database on every authenticated request, allowing immediate server-side account revocation or deletion to block access before the 7-day expiration. In enterprise production phases, rotating short-lived access tokens (15m) paired with refresh tokens can be introduced if stricter revocation windows are required.

## Decision 6: Rate Limiting Architecture & Trusted Proxy IP Resolution
- **Context:** Rate limiting on `/api/auth/login` and `/api/auth/register` prevents credential stuffing and registration spam. Reverse proxies (Cloudflare, Nginx, ALB) typically pass the original client IP in `X-Forwarded-For`.
- **Decision:**
  - Separated rate limits:
    - Login: **5 attempts/min per (IP + email)** to mitigate targeted credential attacks, and **30 attempts/min per IP** to prevent distributed dictionary attacks.
    - Register: **20 attempts/min per IP** to prevent automated account creation abuse.
  - Client IP Resolution (`TRUSTED_PROXY`):
    - When `TRUSTED_PROXY=False` (default in development), the client IP is read directly from `request.client.host`.
    - `X-Forwarded-For` is only parsed when `TRUSTED_PROXY=True` in production, preventing attackers from bypassing IP rate limits via spoofed request headers.

## Decision 7: Multi-Tenant Data Isolation Strategy & Cross-User 404 Policy (Phase 3)
- **Context:** Students share the same backend database for subjects, exams, and tasks. If Student B attempts to query, modify, or delete Student A's subject or task, standard REST APIs sometimes return `403 Forbidden`.
- **Decision:** All resource lookup queries filter strictly by `user_id == current_user.id`. When a resource is not found OR belongs to another user, the API uniformly returns **`404 Not Found`** (`{"detail": "Subject not found"}` or `"Exam not found"` or `"Task not found"`).
- **Rationale:**
  - Returning `403 Forbidden` leaks information by confirming that a resource with that ID actually exists in the database (an ID enumeration vulnerability).
  - Returning `404 Not Found` completely conceals resource existence, ensuring true zero-knowledge privacy between engineering students.
  - Cascade Deletion Policy: Deleting a subject cascades and deletes its internal units, topics, and exams, but tasks attached to that subject have `subject_id` set to `NULL` (`ondelete="SET NULL"`), ensuring students never lose personal assignment notes if a subject is reorganized.

## Decision 8: Pure Functional Intelligence Engine Architecture & Spaced Repetition Parameters (Phase 4)
- **Context:** The intelligence engine calculates memory retention, prioritization, exam readiness, and daily study planning. Tight coupling to ORMs (SQLAlchemy) or web frameworks (FastAPI) creates architectural brittleness, impairs unit test velocity, and complicates offline simulation or client-side portability.
- **Decision:**
  - All engine logic in `backend/app/engine/` (`retention.py`, `priority.py`, `readiness.py`, `planner.py`) is written as **100% pure deterministic functions** with zero imports of `sqlalchemy`, `fastapi`, `pydantic`, or HTTP clients.
  - An automated AST-based purity test (`test_engine_has_zero_db_or_framework_imports`) continuously enforces zero framework/ORM imports in CI/CD.
  - **Spaced Repetition Parameters:**
    - Retention Formula: Ebbinghaus exponential decay $R(t, S) = e^{-t / S}$ with initial stability $S_0 = 2.0$ days.
    - Rating multipliers: `easy` $\to \times 2.5$, `good` $\to \times 2.0$, `hard` $\to \times 1.3$, `fail` $\to \max(1.0, S \times 0.5)$.
    - Threshold: Reviews are due when retention drops below 0.70 ($70\%$).
  - **Multi-Factor Priority Scoring:**
    - $\text{score} = 0.35 \times \text{urgency} + 0.25 \times \text{exam\_prox} + 0.20 \times \text{weakness} + 0.15 \times \text{importance} - 0.05 \times \text{fit\_penalty}$.
    - Human-readable reasons list is strictly mandatory on every computed item to empower student trust ("Due today", "Exam is today!", "Critical decay", "Exceeds available study time").
  - **Greedy Planner & Workload Classification:**
    - Prioritizes candidates by efficiency ($\text{score} / \text{minutes}$) into the student's daily study budget (default 120m, max 3-5 items).
    - Top candidate is marked `next_best_action`.
    - Workload categorized by load ratio $\text{required} / \text{available}$: $<0.7$ (comfortable), $0.7 - 1.0$ (busy), $>1.0$ (overloaded with deferral recommendations).

## Decision 9: Syllabus AI Two-Stage Draft-Confirm Lifecycle & Security Safeguards (Phase 5)
- **Context:** Automated syllabus extraction from unstructured university documents (PDFs, pasted text) is inherently non-deterministic. Storing raw AI outputs directly into student academic records without human review creates data corruption risks and prompt injection vulnerabilities.
- **Decision:**
  - **Two-Stage Draft & Confirm Flow:**
    - `POST /api/syllabus/extract` and `POST /api/syllabus/upload` return an in-memory structured **DRAFT** tree without writing to the database.
    - Students review and fine-tune units and topics (renaming, adding missing topics, deleting noise, toggling importance/yield chips) in an interactive Claymorphism UI tree.
    - `POST /api/syllabus/confirm` explicitly validates student ownership of the subject and optional exam, committing the verified structure and associating topics with exams in a single atomic database transaction.
  - **Security & Prompt Injection Defenses:**
    - User input is treated strictly as **DATA, NOT INSTRUCTIONS** in the system prompt. System overrides or jailbreak phrases embedded in student uploads are discarded.
    - Minimum PII: Student names, emails, and database keys are never sent to external LLMs.
    - Resource Limits: PDF size is strictly capped at 5 MB, page count capped at 30 pages, and scanned image-only PDFs trigger an explicit fallback error (`SCANNED_PDF_TEXT_REQUIRED`) advising manual text paste.
  - **SHA-256 Text Caching & Token Economics:**
    - Syllabus text hashes are computed via SHA-256. Repeated requests with identical content return instant responses with zero token usage (`cached: true`).
    - Daily quotas are enforced per student (default 5 extractions/day) with a dedicated `/api/syllabus/limits` inspection endpoint.
  - **Offline Heuristic Parser Fallback:**
    - To guarantee 100% test reliability and eliminate cloud API runtime dependencies in local/offline environments, the extractor includes a deterministic regex parser tuned for Indian engineering university syllabi (Anna University, VTU, JNTU) that operates autonomously when API keys are absent.

## Decision 10: Event-Sourced Spaced Repetition Learning Loop & Dynamic Readiness (Phase 6)
- **Context:** Storing mutable `mastery`, `stability`, or `last_studied` fields directly in the `topics` table destroys chronological revision history, prevents time-series decay analysis, and introduces concurrency bugs when multiple sessions or reviews occur.
- **Decision:**
  - **Immutable Event-Sourced Reviews (`topic_reviews`):**
    - The `topics` table remains immutable regarding student progress. Every student rating action (`easy`, `good`, `hard`, `fail`) generates an immutable append-only `TopicReview` record capturing `(user_id, topic_id, reviewed_at, rating, self_level, quiz_score, stability_days)`.
    - Stability is computed sequentially from the student's previous review stability factor (default $S_0 = 2.0$ days) using pure engine multipliers: easy ($\times 2.5$), good ($\times 2.0$), hard ($\times 1.3$), fail ($\max(1.0, S \times 0.5)$).
  - **Dynamic Multi-Factor Exam Readiness Computation:**
    - `/api/exams/{id}/readiness` calculates readiness on-the-fly by querying the latest review event for each topic linked to the exam.
    - Elapsed days $t = (\text{now} - \text{reviewed\_at})$ feed into Ebbinghaus exponential decay $R = e^{-t / S}$.
    - Rating a single topic immediately and measurably shifts the exam's readiness percentage and syllabus coverage in real time without data denormalization.
  - **Multi-Tenant Zero-Knowledge Security:**
    - All review submissions, study session logs, and readiness endpoints verify that the target topic, subject, and exam strictly belong to `current_user.id`, returning `404 Not Found` upon any cross-user access attempts.

## Decision 11: Daily Study Planner & Workload Heuristic Architecture (Phase 7)
- **Context:** Students experience decision paralysis without a clear, prioritized daily roadmap. Simply showing a raw list of overdue tasks or unreviewed topics causes overwhelm. The platform needs an intelligent, explainable plan that respects the student's daily time budget while explaining *why* each item was selected.
- **Decision:**
  - **Dynamic Planner Endpoint (`GET /api/today`):**
    - Gathers pending tasks, due revision topics, and weak topics of upcoming exams belonging to `current_user.id`.
    - Scores each candidate using pure functional `calculate_priority(...)` incorporating urgency, exam proximity, weakness/decay, importance, and fit penalties.
    - Fits candidates greedily into the student's configured `daily_study_minutes` (default 180m, max 3–5 items).
    - Top scoring candidate is designated the **"Next Best Action"** with transparent, human-readable reasons (e.g., *"Internal exam in 3 days"*, *"Retention dropped to 42%"*, *"High syllabus weight"*).
  - **Explainability & Recommendation Lifecycle (`recommendations`):**
    - Daily plan and candidate recommendations are persisted with unique IDs in `DailyPlan` and `Recommendation` tables.
    - Endpoints `POST /api/recommendations/{id}/accept` and `POST /api/recommendations/{id}/dismiss` empower students to accept items into their priority queue or dismiss irrelevant suggestions.
    - Dismissed targets are excluded from active today's recommendations.
  - **Workload Classification Heuristic:**
    - Evaluates load ratio $L = \text{required\_minutes} / \text{available\_minutes}$:
      - $L < 0.70$: **Comfortable** (well within study capacity).
      - $0.70 \le L \le 1.00$: **Busy** (manageable focus required).
      - $L > 1.00$: **Overloaded** (recommends deferring low-priority topics to tomorrow to prevent cognitive fatigue).
  - **Rapid Onboarding Guarantee:**
    - Automated lifecycle integration test (`test_rapid_onboarding_to_today_plan_under_three_minutes`) validates the complete cold-start pipeline: Student Registration $\to$ Subject Creation $\to$ Exam Scheduling $\to$ Syllabus Extraction & Confirmation $\to$ Instant generation of an actionable Today Plan with Next Best Action in $<3$ minutes.

## Decision 12: Progressive Web App, Soft Streaks, and Morning Plan Notifications (Phase 8)
- **Context:** To ensure students remain consistent throughout the semester, the app requires frictionless installation on mobile devices and daily study habit loops. However, rigid "hard streaks" that wipe out a 20-day streak after a single missed day induce study anxiety and cause app abandonment. Additionally, morning notification digests must summarize priorities without spamming the student.
- **Decision:**
  - **Installable Progressive Web App (PWA):**
    - Configured Web App Manifest (`manifest.json`) supporting standalone display mode, orientation locking, and bespoke icons.
    - Implemented Service Worker (`sw.js`) with dual-strategy caching:
      - **Cache-First** for static assets, clay cards, and design tokens, guaranteeing sub-second cold starts and offline resiliency.
      - **Network-First** with offline fallbacks for all `/api/` dynamic endpoints.
    - Built a reactive install prompt (`usePWAInstall`) that listens to the browser's `beforeinstallprompt` event and exposes a clean Claymorphism install button in the navigation bar and settings modal.
  - **Soft Streak Retention Engine (`streak.py`):**
    - Pure functional algorithm with AST-enforced purity (`calculate_soft_streak`).
    - Implemented intelligent **Grace Day Bridging**: a 1-day missed study gap does not wipe the streak to 0; instead, a grace day protects the streak (`status: grace_applied`), preserving student morale and providing a 24-hour recovery window.
    - Tracks `current_streak`, `longest_streak`, `total_active_days`, `grace_days_used`, and human-readable motivational prompts.
  - **Web Push & Notification Digest Architecture (`notifications.py`):**
    - Implemented database models `PushSubscription` and `NotificationPreference` with Alembic migration `83ba5004f89e`.
    - Endpoints `POST /api/notifications/subscribe` and `DELETE /api/notifications/unsubscribe` manage browser Web Push API tokens.
    - Endpoint `GET /api/notifications/morning-digest` generates a morning study plan payload combining the Next Best Action, pending tasks count, upcoming exam proximity, and soft streak.
    - Support for optional Telegram Bot alerts (`telegram_chat_id`) allows engineering students who prefer chat apps to receive morning digests directly in messaging feeds.
    - Test endpoint `POST /api/notifications/test-send` allows students to verify system push notifications instantly from the settings interface.

## Decision 13: 100% Free & Unlimited Access Model (Phase 10 Hardening)
- **Context:** An initial prototype included an "Exam Pass (₹99)" modal with client-side UTR validation and simulated celebration screens. Testing and student feedback revealed that artificial restrictions (2-subject limits) impaired core student onboarding.
- **Decision:** Removed free-tier gating in both frontend and backend (`POST /api/subjects`, `POST /api/syllabus/confirm`). All registered students receive unrestricted access to create subjects, schedule exams, log reviews, and import syllabi.
- **Rationale:** Ensures maximum student adoption, academic utility, and authentic product usage. The database `payments` table and manual UTR verification (`scripts/approve_payment.py`) are retained as operational tooling for future optional services.

## Decision 14: Scoped Exam Readiness Architecture (Phase 10 Hardening)
- **Context:** In Indian engineering colleges (Anna University / autonomous colleges), internal assessments (IA-1, IA-2) cover specific units (e.g., Units 1 and 2), rather than the entire 5-unit semester syllabus. Computing readiness across the whole subject unfairly penalized students preparing for an internal test.
- **Decision:**
  - Added `exam_topics` (many-to-many association table between `exams` and `topics`).
  - Added unit selector in `AddExamModal` that maps selected units to their topics and persists both `unit_ids` and `topic_ids`.
  - Added an Exam Scope filter dropdown in `ExamReadinessView` allowing students to toggle between "Full Subject" and specific internal exams.
  - Readiness gauge, syllabus coverage %, and recommendations strictly compute over scoped exam topics.

## Decision 15: UI Accessibility & Clay Design System Cleanup (Phase 10 Hardening)
- **Context:** The product required a calm, focused, and professional tool feel per `UI_UX_RULES.md`, eliminating "AI-generated template" characteristics.
- **Decision:**
  - Kept the soft tactile clay design system per user decision.
  - Removed 100% of emojis from headings, buttons, pills, and navigation strings (0 emojis remaining across frontend), replacing them with semantic `lucide-react` vector icons (`Shield`, `Clock`, `Check`, `CheckCircle2`, `Target`, `BookOpen`).
  - Renamed "Syllabus AI" to functional "Import Syllabus" across all navigation and views.
  - Light mode pastel text colors updated to WCAG 2.2 AA compliant contrast (>= 5.4:1 contrast ratio: `--coral-text: #B83211`, `--mint-text: #0F6B3C`, `--sky-text: #1A5BB8`, `--lavender-text: #6929D5`, `--amber-text: #92400E`).
  - Added visible `:focus-visible` styling and ensured touch targets are >= 44px.
  - Removed `/mobile-preview` simulated frame; responsive layouts cleanly adapt down to 360px.

## Decision 16: First-Party Internal Event Analytics & DPDP Alignment (Phase 10 Hardening)
- **Context:** To measure product health, activation rate, and day-7 retention without violating student privacy or installing third-party telemetry trackers (Google Analytics, Mixpanel).
- **Decision:**
  - Implemented internal `events` table (`id`, `user_id`, `event_name`, `properties_json`, `created_at`).
  - Event logging utility (`log_event`) records `signup`, `session_logged`, `subject_created`, `syllabus_imported`, `plan_viewed`, `topic_reviewed`, and `payment_submitted`.
  - Added operational CLI tool (`scripts/report_metrics.py`) calculating activation rate (% of users who imported a syllabus and viewed a daily plan) and day-7 retention.
  - Signup page requires an "I am 18 or older" confirmation checkbox.
  - Privacy policy updated to follow Digital Personal Data Protection (DPDP) principles with complete right to erasure and designated grievance redressal (`grievance@studentos.app`).


