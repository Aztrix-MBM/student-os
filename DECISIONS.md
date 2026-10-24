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
