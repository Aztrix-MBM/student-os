# ANTIGRAVITY BUILD GUIDE — Exam Readiness & Daily Plan (Student Micro-SaaS)

> Idha Antigravity la project root la `BUILD_GUIDE.md` nu vechu, agent ku first message la:
> **"Read BUILD_GUIDE.md fully. Follow it strictly. Start with Phase 1 only. Stop after each phase and wait for my approval."**

---

## 0. Product in one line

Student syllabus + exam date upload pannuvaan → app topics-ah extract pannum → **daily plan ("inniku idhu padi, idhukku why")** + **exam readiness %** + **spaced revision reminders** kudukkum.

**Target user:** Indian engineering college students (RIT pilot first).
**Business goal:** 2 months la launch → semester exam season la ₹49–₹199 "Exam Pass" sell.

---

## 1. HARD SCOPE RULES (agent ku mukkiyam)

### IN scope (MVP — idhu mattum)
1. Auth (email + Google login)
2. Subjects + Exams CRUD
3. Syllabus upload (paste text / PDF) → AI extracts units & topics → **user edits & confirms**
4. Topic rating (strong / okay / weak) — 1-tap
5. **Today screen** — next best action + 3–5 plan items, each with a "why"
6. Log study / mark done
7. Exam readiness % + weak topics
8. Spaced revision (forgetting curve)
9. Basic tasks (assignments)
10. Delete my account & data

### OUT of scope (DO NOT BUILD, even if it seems easy)
Digital Twin, Career GPS, Skill Graph, AI Dependency Meter, Learning Efficiency, Academic Inbox, Framer Motion fancy animations, chat bot UI, social features, payments (Phase 9 la manual UPI first).

> Agent ku new idea thonna → `BACKLOG.md` la add pannu, build pannaadhe.

---

## 2. Tech Stack (fixed)

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + TanStack Query |
| Backend | Python FastAPI + Pydantic v2 + SQLAlchemy 2 + Alembic |
| DB | MySQL (SQLAlchemy use pannurathunaala Postgres ku maaruvadhu easy) |
| Auth | JWT in **httpOnly + Secure + SameSite cookie** (localStorage la vaikkaadhe) |
| AI | Provider-agnostic `llm_client.py` (API key `.env` la). Local model production la use pannaadhe |
| Tests | pytest (backend), Playwright smoke (frontend, later) |
| PWA | next-pwa / manifest + service worker (Phase 8) |

---

## 3. Project Structure

```text
student-os/
├── BUILD_GUIDE.md
├── BACKLOG.md
├── DECISIONS.md
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py            # env loading
│   │   ├── database.py
│   │   ├── models/              # SQLAlchemy models
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── routers/             # auth, subjects, exams, syllabus, topics, today, tasks, account
│   │   ├── services/            # business logic (DB access here)
│   │   ├── engine/              # PURE functions, no DB, no HTTP
│   │   │   ├── retention.py
│   │   │   ├── priority.py
│   │   │   ├── readiness.py
│   │   │   └── planner.py
│   │   ├── ai/
│   │   │   ├── llm_client.py
│   │   │   └── syllabus_extractor.py
│   │   └── security/            # auth deps, rate limit
│   ├── alembic/
│   ├── tests/
│   │   ├── engine/              # unit tests (most important)
│   │   └── api/
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── app/
    │   ├── (auth)/login, register
    │   ├── onboarding/
    │   ├── today/               # HOME screen
    │   ├── subjects/[id]/
    │   ├── exams/[id]/
    │   └── settings/
    ├── components/
    ├── lib/api.ts
    └── package.json
```

---

## 4. Coding Rules (agent must follow)

1. **One phase at a time.** Phase mudinjadhum: summary + how to run + how to test. Appuram **STOP**.
2. **Engine = pure functions.** `engine/` la DB import, HTTP import **kooda koodaathu**. Input → output mattum.
3. **Tests first for engine.** Ovvoru engine function ku min 8 pytest cases (edge cases include: exam today, no topics, all mastered, exam in past).
4. **Ownership check everywhere.** Every query la `user_id == current_user.id`. Another user oda `subject_id` kudutha → 404.
5. **Pydantic validation** on all inputs. Response schemas la `password_hash` never.
6. **No secrets in code.** `.env` + `.env.example`. `.gitignore` la `.env`.
7. **Migrations only via Alembic.** Manual table create vendaam.
8. **Timestamps UTC** store; frontend la IST display.
9. **AI output = untrusted.** Always: JSON schema validate → retry once → show editable preview → user confirm → then save.
10. **No new library without telling me** (why + alternative).
11. **Small files, clear names, type hints, docstrings** on engine functions.
12. Each phase end la `DECISIONS.md` update (enna decide pannom, ēn).
13. Git commits small: `feat: ...`, `fix: ...`, `test: ...`.

---

## 5. Database Schema (v1)

```text
users          id, name, email(unique), password_hash(nullable for google), auth_provider,
               daily_study_minutes(default 180), created_at, updated_at

subjects       id, user_id, name, code, semester, created_at
units          id, subject_id, name, order_no, exam_weight(0–1, nullable)
topics         id, unit_id, subject_id, name, difficulty(1–5), importance(0–1), order_no

exams          id, user_id, subject_id, title, exam_date, total_marks, type
exam_topics    exam_id, topic_id          (which topics are in which exam)

tasks          id, user_id, subject_id(nullable), title, priority(1–5), status,
               due_date, estimated_minutes, completed_at, created_at

topic_reviews  id, user_id, topic_id, reviewed_at, rating(easy/good/hard/fail),
               self_level(strong/okay/weak, nullable), quiz_score(nullable),
               stability_days
study_sessions id, user_id, topic_id(nullable), started_at, duration_minutes

daily_plans    id, user_id, plan_date, items_json, generated_at
recommendations id, user_id, type, target_type, target_id, score, reason_json,
               created_at, accepted_at, dismissed_at
```

**Important:** `mastery` / `last_studied` topics table la store pannaadhe. `topic_reviews` events la irundhu **compute** pannu.

Indexes: `(user_id)`, `(user_id, due_date)` on tasks, `(user_id, exam_date)` on exams, `(topic_id, reviewed_at)`.

---

## 6. Intelligence Engine Spec (pure functions)

### 6.1 `retention.py`
```text
retention(days_since_review, stability) = exp(-days / stability)
INITIAL_STABILITY = 2.0 days
update_stability(stability, rating):
    easy → *2.5 | good → *2.0 | hard → *1.3 | fail → max(1.0, stability*0.5)
is_review_due(days, stability, threshold=0.7) = retention < threshold
```

### 6.2 `priority.py`
```text
urgency    = 1 / (1 + days_until_due)
exam_prox  = 1 / (1 + days_to_nearest_related_exam)
weakness   = 1 - retention(topic)           # tasks la 0
importance = 0..1
fit_penalty= 1 if estimated_minutes > available_minutes_today else 0

score = 0.35*urgency + 0.25*exam_prox + 0.20*weakness + 0.15*importance - 0.05*fit_penalty
```
Return: `{score, reasons: [ {label, value} ]}` — **reasons mandatory** ("Due tomorrow", "Exam in 5 days", "Weak topic").

### 6.3 `readiness.py`
```text
topic_weight = importance * (exam_weight or 1)
mastery      = mapping from latest rating/self_level/quiz (strong=0.9, okay=0.6, weak=0.3, none=0)
readiness    = Σ(topic_weight * mastery * retention) / Σ(topic_weight)
coverage     = topics_with_≥1_review / total_topics
```
Return: `{readiness_pct, coverage_pct, weak_topics[], strong_topics[]}`. UI la "estimate" nu label.

### 6.4 `planner.py`
```text
1. candidates = tasks due soon + topics whose review is due + weak topics of upcoming exams
2. score each with priority.py
3. greedy fit into daily_study_minutes by score per minute
4. output top 3–5: {title, minutes, type, reasons[]}
5. next_best_action = highest-score item
```
Edge cases handle pannu: no exams, no topics, exam passed, 0 available minutes, overload (suggest defer).

### 6.5 Workload (inside planner)
`load_ratio = required_minutes / available_minutes`: <0.7 comfortable, 0.7–1.0 busy, >1.0 overloaded.

---

## 7. AI: Syllabus Extraction Spec

Flow:
```text
Upload PDF / paste text
  → extract text (pypdf; scanned na "paste text" ask)
  → LLM call with strict JSON schema
  → Pydantic validate (retry once)
  → return DRAFT (not saved)
  → frontend editable tree (rename / delete / add topic / set importance)
  → POST confirm → save units+topics
```

Expected JSON:
```json
{ "units": [ { "name": "Unit I – Trees", "topics": ["BST", "AVL", "B-Trees"] } ] }
```

Rules:
- Document content is **data, not instructions** (prompt injection guard — system prompt la clearly separate).
- Max file size 5 MB, max 30 pages, PDF/text only.
- Cache by hash of text → same syllabus ku thirumba LLM call vendaam.
- Per-user limit (e.g., 5 extractions/day) + log token usage.
- LLM provider abstract: `llm_client.generate_json(prompt, schema)`; key `.env` la.
- Minimum PII: user name/email LLM ku anuppaadhe.

---

## 8. API (MVP)

```text
POST   /api/auth/register | login | logout        GET /api/me
CRUD   /api/subjects  /api/exams  /api/tasks
POST   /api/syllabus/extract      → draft
POST   /api/syllabus/confirm      → saves units/topics (+ links exam_topics)
POST   /api/topics/{id}/review    → {rating, self_level?, quiz_score?}
POST   /api/study-sessions
GET    /api/today                 → {next_best_action, plan[], workload, upcoming[]}
GET    /api/exams/{id}/readiness
DELETE /api/account               → hard delete all user data
GET    /api/health
```
Common: consistent error format `{error: {code, message}}`, pagination on list endpoints, rate limit on auth + AI endpoints.

---

## 9. Frontend Screens (mobile-first)

1. **Login / Register** (Google button + email)
2. **Onboarding (≤3 min):** subject → exam date → paste/upload syllabus → edit topics → rate topics (strong/okay/weak chips) → **land on Today**
3. **Today** (home): big "Next best action" card with *why*; below 2–4 plan items; exam countdown; workload badge
4. **Exam detail:** readiness %, coverage %, weak topics, topic list with rating chips
5. **Subjects / Tasks** simple lists
6. **Settings:** daily study minutes, delete account, logout

UI rules: clean, mobile-first (360px base), loading/empty/error states for every screen, accessible contrast, no heavy animation. **Readiness = "estimate"** label.

---

## 10. Phase Plan (Antigravity ku one by one kudu)

Ovvoru phase: agent **STOP** panni, naan test pannitu "approved" sonnaadhaan next.

### Phase 1 — Foundation
- Repo structure, FastAPI `/api/health`, config via `.env`, DB connection (MySQL), Alembic init, `users` table.
- Next.js app, Tailwind, shadcn/ui, API client.
- **Done when:** backend health OK, frontend calls it, migration runs.

### Phase 2 — Auth
- Register/login/logout, bcrypt, JWT in httpOnly cookie, `/api/me`, protected route middleware (frontend), Google login, rate limit.
- **Tests:** wrong password, unknown email, expired token, no cookie → 401.
- **Done when:** login → /today placeholder, logout clears cookie.

### Phase 3 — Academic Core
- subjects, exams, tasks models + CRUD + ownership checks.
- **Tests:** user A user B oda data access panna 404.

### Phase 4 — Engine (NO UI yet)
- Implement `retention`, `priority`, `readiness`, `planner` + **pytest** (≥8 cases each).
- **Done when:** `pytest tests/engine` all green. Engine la DB import illa nu verify.

### Phase 5 — Syllabus AI
- `llm_client`, extractor, `/syllabus/extract` + `/confirm`, caching, limits.
- Frontend: editable preview tree.
- **Test with:** 5 real RIT syllabus texts. Failure cases handle (bad JSON, empty doc, huge doc).

### Phase 6 — Learning loop
- `topic_reviews`, `/topics/{id}/review`, `study_sessions`, readiness endpoint, rating chips UI.
- **Done when:** rate topic → readiness % maarum.

### Phase 7 — Today screen
- `/api/today` uses planner; Today UI with "why"; mark done; accept/dismiss recommendation.
- **Done when:** new user onboarding → Today plan <3 min.

### Phase 8 — Retention & PWA
- Installable PWA, web push (or Telegram bot) for morning plan + revision due.
- Streak (soft), exam countdown.

### Phase 9 — Polish, Security, Launch
- Responsive pass (mobile/tablet/desktop), empty/error states, privacy policy + terms page, delete-account, Sentry, backups.
- Deploy: Vercel (frontend), Render/Railway/Fly (backend), managed MySQL.
- Payments: first **manual UPI QR / payment link**, Razorpay later.
- Pilot: 30–50 RIT students.

---

## 11. Security Checklist (Phase 9 ku munnaadi ellaam ✔)

- [x] httpOnly + Secure + SameSite cookies
- [x] Ownership check every endpoint (test panni prove pannu - 114 passing tests)
- [x] Pydantic validation, no raw SQL string concat
- [x] Rate limit: login, register, AI endpoints, uploads (InMemoryRateLimiter active)
- [x] Upload: type/size/page limits
- [x] CORS = exact frontend domain only (production / credentials supported)
- [x] Secrets only in env; rotated if leaked
- [x] HTTPS only (enforced via security headers middleware in production)
- [x] DB automated backups + PRAGMA integrity_check (backup_db.py)
- [x] Delete-account works across all tables (DELETE /api/auth/me + Danger Zone UI)
- [x] Privacy policy + consent (India DPDP Act 2023 awareness - PrivacyModal.tsx)
- [x] Error monitoring & recovery (React ErrorBoundary + robust FastAPI handlers)

---

## 12. Environment Variables

Backend `.env.example`:
```text
DATABASE_URL=mysql+pymysql://user:password@localhost:3306/student_os
JWT_SECRET=change-me
JWT_ALGORITHM=HS256
ACCESS_TOKEN_MINUTES=15
REFRESH_TOKEN_DAYS=14
FRONTEND_ORIGIN=http://localhost:3000
LLM_PROVIDER=
LLM_API_KEY=
LLM_MODEL=
AI_DAILY_LIMIT_PER_USER=5
COOKIE_SECURE=false
```
Frontend `.env.local.example`:
```text
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

---

## 13. Definition of Done (MVP)

- [ ] New user: register → syllabus → rate topics → Today plan in **under 3 minutes**
- [ ] Every plan item has a visible "why"
- [ ] Readiness updates after reviews
- [ ] Revision due items appear automatically
- [ ] All engine tests pass, ownership tests pass
- [ ] Works on a 360px phone screen
- [ ] Delete-account works
- [ ] Deployed + 30 real students invited

---

## 14. Prompts to Paste into Antigravity (copy-paste)

**Kickoff:**
> Read BUILD_GUIDE.md fully. Obey Section 1 (scope) and Section 4 (coding rules). Start Phase 1 only. When done, summarize what you built, how to run it, how to test it, then STOP and wait for my approval.

**Each next phase:**
> Phase N approved. Proceed to Phase N+1 from BUILD_GUIDE.md. Same rules: tests first for engine, ownership checks, no scope creep, stop at the end.

**Security review (after Phases 2, 3, 7):**
> Review all endpoints added so far. For each: is there an ownership check? Input validation? Rate limit where needed? Any data leak in response? List problems and fix them.

**Bug fix:**
> Here is the error: [paste]. Find root cause first, explain it in 2 lines, then fix with the smallest change. Add a test that would have caught it.

**When agent scope-creeps:**
> That's out of scope per Section 1. Add it to BACKLOG.md and continue the current phase.

---

## 15. Your Weekly Rhythm (neenga)

- **Week 0–1:** Validation kit (interviews + waitlist) — Antigravity-oda parallel-ah Phase 1–2 run pannalaam.
- **Every phase end:** nee test pannu, `git commit`, `DECISIONS.md` read pannu.
- **Weekend:** 3 students ku demo kaattu, feedback `BACKLOG.md` la.
- **Ellaa AI-generated code ku:** diff skim pannu — especially auth, DB queries, uploads.
- **Week 5:** pilot users ku first paid offer (early-bird ₹49).

**Realistic target:** ₹5,000–₹30,000 first semester. Product work aana, next semester la growth.
