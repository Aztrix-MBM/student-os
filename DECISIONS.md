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


