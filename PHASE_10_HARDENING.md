# PHASE 10 — HARDENING & LAUNCH READINESS

Read BUILD_GUIDE.md, UI_UX_RULES.md, DECISIONS.md and this file fully.
Phases 1-9 are built. This phase makes the product safe to put in front of real students and real money.
No new features. Work in batches A, B, C, D in order. Stop after each batch and wait for my approval.

## Reporting rules (important)

- Every batch report must include: the full `pytest -v` output (every test name, not a summary), `git diff --stat`, the list of new Alembic migrations, and a "Not done / unsure" section.
- No marketing language in reports, code comments, UI or docs. Do not use "zero-knowledge", "Bayesian", "100% immune", "sub-millisecond", "production-grade", "mathematically optimized". Describe what the code actually does.
- Only cite rules, sections or files that exist. If unsure, say so.

---

## BATCH A — Money and data safety (blockers)

### A1. Payments must not unlock anything on the client
Current state: the Exam Pass modal validates a 12-digit UTR with a regex and shows a celebration screen. There is no payment or Pro state in the database, so nothing is actually verified or gated.

Build:
- Table `payments`: id, user_id (FK, ON DELETE SET NULL), plan, amount, utr (UNIQUE), status (pending / approved / rejected), created_at, reviewed_at.
- `users.pro_until` (nullable datetime). `/api/me` returns `is_pro`.
- `POST /api/payments` (auth required, rate limited): validates plan and 12-digit UTR, creates a pending row. Duplicate UTR returns 409.
- Approval is manual: `scripts/approve_payment.py <utr>` sets status=approved and extends `pro_until`. Also add an admin-only endpoint guarded by an `ADMIN_EMAILS` env list if simple.
- UI: after submit show "Payment submitted. We verify within 24 hours." with status pending. Remove confetti and the instant unlock screen.
- Server-side gating: free plan = max 2 subjects and 1 syllabus import. Pro lifts both. Enforce in the API, not the UI.
- UPI ID and payee name come from env (`UPI_ID`, `UPI_PAYEE_NAME`). Hardcoded UPI strings removed; defaults to empty so payments are unconfigured until admin sets env vars.
- Remove from the Pro feature list anything not built (for example "Timetable export", "3 extra Grace Shields") unless it is implemented in this batch.
- Plans: keep one config file for plans. Launch with Semester (₹99) and Monthly (₹49) only. Remove the Annual tier.
- Tests: cannot become Pro without approval; duplicate UTR rejected; free limits enforced; approval lifts limits; expired `pro_until` falls back to free.

### A2. Database portability and backups
- Production will use managed PostgreSQL (or MySQL), not SQLite. Free hosts have ephemeral disks, so a SQLite file is lost on redeploy.
- Run `alembic upgrade head` on a real PostgreSQL (local Docker or a free Neon database) and run the whole pytest suite against it. Fix every incompatibility.
- Enable `PRAGMA foreign_keys=ON` for SQLite so dev and tests behave like production.
- `scripts/backup_db.py` is SQLite-only. Keep it for dev only and write `RUNBOOK.md` covering production backups (provider backups) and a tested restore procedure.

### A3. Account deletion must remove everything
- The deletion list in the report omits `user_streaks` and `notification_preferences`. SQLite hides this because FK enforcement is off.
- Add ON DELETE CASCADE to every user-owned foreign key. Payments are the exception: SET NULL, keep amount/UTR/date only.
- Test: create a user with data in every table, delete the account, then iterate over every table that has a user_id or a path to one and assert zero rows remain. Run with FK enforcement on.

### A4. Service worker must not leak data on shared computers
Students will use college lab PCs.
- Never cache `/api/*` responses. Cache static assets only.
- On logout: delete all Cache Storage entries and unsubscribe from push.
- Test manually with two accounts in one browser: account B must never see account A's data, online or offline.

---

## BATCH B — Correctness

### B1. Exams need a scope
An internal test covers specific units, not the whole subject.
- Add `exam_topics` (exam_id, topic_id) or `exam_units`. Default = all topics.
- Exam create/edit UI: pick units or topics.
- Readiness is computed only over the exam's topics.
- Tests: exam with 2 of 5 units, exam with no topics, exam in the past, exam today.

### B2. Readiness formula
- Urgency must not be part of readiness: it rises as the exam gets closer, which makes the score go up for the wrong reason. Urgency belongs in the planner priority only.
- Readiness = sum(topic_weight x mastery x retention) / sum(topic_weight). Show coverage separately. Remove task completion from the formula unless you can justify it in DECISIONS.md.
- Show it in the UI as "Estimate" with a short explanation of what it is based on.
- Rename misleading labels in code, docs and UI: "Bayesian" (it is a weighted sum), "SM-2" (it is an interval ladder with multipliers) unless it truly implements SM-2.
- Every engine needs at least 8 pytest cases including: no topics, all mastered, no reviews yet, exam today, exam passed, zero available minutes.

### B3. Syllabus import
- Do not hardcode 5 units. Support 3-7 units, lab experiment lists and electives.
- No OCR exists (pypdf only). Remove "OCR" wording. For scanned PDFs return: "This looks like a scanned PDF. Paste the text instead."
- Add a "paste text" input and manual add/edit/remove for units and topics.
- Limits: 30 pages, parse timeout, 10 MB.
- Tell me whether an LLM is actually called anywhere. If yes: JSON schema validation, caching by text hash, per-user daily limit, prompt-injection guard (document text is data). If no: rename "Syllabus AI" to "Import syllabus" everywhere.
- Test on at least 5 real syllabus PDFs that I will place in `tests/fixtures/`. Report how many parsed correctly.

### B4. Study capacity
- Add `users.daily_study_minutes` (default 120), editable in Settings. The planner must use it. Test it.

### B5. Auth regression check
- Password: minimum 8 characters, maximum 72 bytes. The report says minimum 6, which is a regression.
- Confirm these tests still exist and pass, and list them by name: alg=none rejected, deleted user returns 401, login rate limit (5/min per IP+email and 30/min per IP), register rate limit (20/min per IP), production startup checks, cookie flags, no password hash in any response (also assert `$2b$` never appears), duplicate email returns 409.
- Logout only clears the cookie. Do not claim it invalidates the session.
- Fresh-install check: create a clean virtualenv from `requirements.txt` and run the tests. Pin all versions. If passlib is used, pin a compatible bcrypt or switch to the bcrypt library directly.

---

## BATCH C — UI cleanup (keep the clay style)

Decision: keep the clay design system. The following rules from UI_UX_RULES.md still apply in full.
- No emoji anywhere in UI strings, navigation or buttons. Use one icon set (lucide-react).
- No "AI" wording in the UI ("Syllabus AI" becomes "Import syllabus", "Explainable AI" removed).
- No confetti, no motivational quote banner, no gradient glow on logo or banners, no ambient audio toggle.
- Remove the `/mobile-preview` iPhone shell. The real app must work at 360 px width instead.
- Contrast: check every pastel text/background pair for 4.5:1. Fix the failures.
- Touch targets 44 px, visible focus rings, correct labels.
- Loading, empty, error and success states on every view.
- Readiness always labelled "Estimate". Every recommendation shows its reason.
- Relaxed for clay: soft shadows and pastel subject colors are allowed. One primary action per screen still applies.
- Run the UI_UX_RULES.md Section 12 checklist and report each line.

---

## BATCH D — Launch plumbing

- Deployment: frontend on Vercel, backend on Render/Railway/Fly, managed PostgreSQL. Put frontend and API under one parent domain (`app.` and `api.`) or proxy `/api/*` through Vercel so cookies are first-party. Document in DECISIONS.md.
- Config: `COOKIE_SECURE=true`, exact CORS origin, `TRUSTED_PROXY` setting for client IP (otherwise every user shares the proxy IP and rate limits lock everyone out), complete `.env.example`.
- Headers: security headers must also be set on the frontend (vercel.json): CSP, nosniff, frame deny, referrer policy, permissions policy. Add HSTS on the API. Remove `X-XSS-Protection` (deprecated).
- Monitoring: Sentry for frontend and backend, an uptime check. Free hosts sleep, so confirm scheduled push reminders actually fire in production (they need a running worker or cron), and test one real push end to end.
- Analytics (own database, no third party): `events` table with signup, subject_created, syllabus_imported, plan_viewed, topic_reviewed, session_logged, payment_submitted. A script prints activation (syllabus imported and plan viewed in the first session) and day-7 retention.
- Feedback: an in-app "Send feedback" link (WhatsApp or email).
- Legal text: make it match reality. Real grievance email, list exactly what is collected (name, email, academic data, push subscription). Remove "zero-knowledge" and "DPDP compliant" claims; say "built following DPDP principles". Add an "I am 18 or older" checkbox at signup. I will get the text reviewed.
- Docs: `RUNBOOK.md` (deploy, rollback, restore, rotate secrets), `README.md`, pinned dependencies, lockfiles.
- Demo: a seed script that creates a demo account with realistic data for demos.

When all batches are approved, write `phase_10_report.md` using the reporting rules above.
