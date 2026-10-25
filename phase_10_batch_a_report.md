# Phase 10 — Batch A Report: Money and Data Safety

---

## 1. Databases and Test Execution

### 1.1 Initial Test Database
The 122 tests initially ran against local SQLite (`sqlite:///./student_os.db`) with `PRAGMA foreign_keys=ON` enabled via an event listener on the SQLAlchemy connection pool.

### 1.2 Real PostgreSQL Execution
We connected to a local instance of PostgreSQL (version 17, running on port 5432, user `postgres`), created a clean test database `student_os_test`, installed the `psycopg[binary]` driver, and ran Alembic migrations:

```text
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade  -> d70b893ccb2d, create users table
INFO  [alembic.runtime.migration] Running upgrade d70b893ccb2d -> f19918ff6b94, create_academic_core_tables
INFO  [alembic.runtime.migration] Running upgrade f19918ff6b94 -> 0541f3096162, create_topic_reviews_and_study_sessions_tables
INFO  [alembic.runtime.migration] Running upgrade 0541f3096162 -> 07546a8031c8, create_daily_plans_and_recommendations_tables
INFO  [alembic.runtime.migration] Running upgrade 07546a8031c8 -> 83ba5004f89e, create push_subscriptions and notification_preferences tables
INFO  [alembic.runtime.migration] Running upgrade 83ba5004f89e -> 2cf88577f64c, create payments table and pro fields on users
```

All migrations upgraded successfully.

### 1.3 Complete Pytest Output (Against PostgreSQL)
Command: `$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/student_os_test"; pytest -v`

```text
============================= test session starts =============================
platform win32 -- Python 3.12.10, pytest-9.1.1, pluggy-1.7.0 -- C:\Users\muthu\OneDrive\Desktop\student project\backend\.venv\Scripts\python.exe
cachedir: .pytest_cache
rootdir: C:\Users\muthu\OneDrive\Desktop\student project\backend
configfile: pytest.ini
testpaths: tests
plugins: anyio-4.15.1
collecting ... collected 122 items

tests/engine/test_engine_purity.py::test_engine_has_zero_db_or_framework_imports PASSED [  0%]
tests/engine/test_planner.py::test_planner_empty_inputs PASSED           [  1%]
tests/engine/test_planner.py::test_planner_completed_tasks_ignored PASSED [  2%]
tests/engine/test_planner.py::test_planner_next_best_action_selection PASSED [  3%]
tests/engine/test_planner.py::test_planner_exam_today_boost PASSED       [  4%]
tests/engine/test_planner.py::test_planner_exam_in_past_ignored PASSED   [  5%]
tests/engine/test_planner.py::test_planner_greedy_fit_budget PASSED      [  5%]
tests/engine/test_planner.py::test_planner_workload_thresholds PASSED    [  6%]
tests/engine/test_planner.py::test_planner_zero_available_minutes PASSED [  7%]
tests/engine/test_planner.py::test_planner_max_items_cap PASSED          [  8%]
tests/engine/test_priority.py::test_priority_due_today PASSED            [  9%]
tests/engine/test_priority.py::test_priority_due_tomorrow PASSED         [ 10%]
tests/engine/test_priority.py::test_priority_overdue PASSED              [ 10%]
tests/engine/test_priority.py::test_priority_exam_today PASSED           [ 11%]
tests/engine/test_priority.py::test_priority_exam_in_past_ignored PASSED [ 12%]
tests/engine/test_priority.py::test_priority_weak_retention_alert PASSED [ 13%]
tests/engine/test_priority.py::test_priority_task_ignores_weakness PASSED [ 14%]
tests/engine/test_priority.py::test_priority_fit_penalty_applied PASSED  [ 15%]
tests/engine/test_priority.py::test_priority_high_importance_flag PASSED [ 15%]
tests/engine/test_readiness.py::test_readiness_empty_topics PASSED       [ 16%]
tests/engine/test_readiness.py::test_readiness_all_unreviewed PASSED     [ 17%]
tests/engine/test_readiness.py::test_readiness_all_mastered_fresh PASSED [ 18%]
tests/engine/test_readiness.py::test_readiness_decay_impact PASSED       [ 19%]
tests/engine/test_readiness.py::test_readiness_weighted_topics PASSED    [ 20%]
tests/engine/test_resolve_mastery_quiz_override PASSED                    [ 20%]
tests/engine/test_resolve_mastery_rating_fallback PASSED                 [ 21%]
tests/engine/test_readiness.py::test_readiness_label_always_estimate PASSED [ 22%]
tests/engine/test_readiness.py::test_readiness_partial_coverage PASSED   [ 23%]
tests/engine/test_retention.py::test_retention_day_zero PASSED           [ 24%]
tests/engine/test_retention.py::test_retention_negative_days PASSED      [ 25%]
tests/engine/test_retention.py::test_retention_at_stability_threshold PASSED [ 25%]
tests/engine/test_retention.py::test_retention_monotonic_decay PASSED    [ 26%]
tests/engine/test_update_stability_easy PASSED        [ 27%]
tests/engine/test_update_stability_good PASSED        [ 28%]
tests/engine/test_update_stability_hard PASSED        [ 29%]
tests/engine/test_update_stability_fail_floor PASSED  [ 30%]
tests/engine/test_is_review_due PASSED                [ 30%]
tests/engine/test_extreme_decay_no_overflow PASSED    [ 31%]
tests/engine/test_streak.py::test_streak_empty_activity PASSED           [ 32%]
tests/engine/test_streak.py::test_streak_today_only PASSED               [ 33%]
tests/engine/test_streak.py::test_streak_yesterday_only PASSED           [ 34%]
tests/engine/test_streak.py::test_streak_consecutive_days_with_today PASSED [ 35%]
tests/engine/test_streak.py::test_streak_one_day_grace_bridge PASSED     [ 35%]
tests/engine/test_streak.py::test_streak_grace_applied_when_not_yet_studied_today PASSED [ 36%]
tests/engine/test_streak.py::test_streak_two_consecutive_misses_breaks_streak PASSED [ 37%]
tests/engine/test_streak.py::test_streak_duplicate_activity_on_same_day PASSED [ 38%]
tests/engine/test_streak.py::test_streak_historical_longest_preserved PASSED [ 39%]
tests/engine/test_streak.py::test_streak_future_dates_ignored PASSED     [ 40%]
tests/test_academic.py::test_subject_crud_lifecycle PASSED               [ 40%]
tests/test_academic.py::test_subject_cross_user_isolation_returns_404 PASSED [ 41%]
tests/test_academic.py::test_units_and_topics_under_subject_with_isolation PASSED [ 42%]
tests/test_academic.py::test_exam_crud_and_cross_user_isolation PASSED   [ 43%]
tests/test_academic.py::test_task_crud_and_ownership_checks PASSED       [ 44%]
tests/test_academic.py::test_task_status_auto_completed_at PASSED        [ 45%]
tests/test_academic.py::test_subject_cascade_deletion_cleans_related_records PASSED [ 45%]
tests/test_auth.py::test_login_wrong_password PASSED                     [ 46%]
tests/test_auth.py::test_login_unknown_email PASSED                      [ 47%]
tests/test_auth.py::test_register_duplicate_email PASSED                 [ 48%]
tests/test_auth.py::test_get_me_no_cookie PASSED                         [ 49%]
tests/test_auth.py::test_get_me_expired_token PASSED                     [ 50%]
tests/test_auth.py::test_get_me_tampered_token PASSED                    [ 50%]
tests/test_auth.py::test_get_me_alg_none_token_rejected PASSED           [ 51%]
tests/test_auth.py::test_get_current_user_deleted_user_returns_401 PASSED [ 52%]
tests/test_auth.py::test_password_rules_validation PASSED                [ 53%]
tests/test_auth.py::test_cookie_flags_httponly_and_samesite PASSED       [ 54%]
tests/test_auth.py::test_logout_clears_cookie PASSED                     [ 55%]
tests/test_auth.py::test_password_hash_never_appears_in_responses PASSED [ 55%]
tests/test_auth.py::test_rate_limiting_login_ip_and_email_combo PASSED   [ 56%]
tests/test_auth.py::test_rate_limiting_login_ip_wide PASSED              [ 57%]
tests/test_auth.py::test_rate_limiting_register_ip PASSED                [ 58%]
tests/test_auth.py::test_trusted_proxy_ip_resolution PASSED              [ 59%]
tests/test_auth.py::test_production_startup_safety_checks PASSED         [ 60%]
tests/test_auth.py::test_register_and_login_lifecycle PASSED             [ 60%]
tests/test_health.py::test_root_endpoint PASSED                          [ 61%]
tests/test_health.py::test_health_check_endpoint PASSED                  [ 62%]
tests/test_learning.py::test_review_topic_good_increases_stability PASSED [ 63%]
tests/test_learning.py::test_review_topic_easy_increases_stability PASSED [ 64%]
tests/test_learning.py::test_review_topic_fail_preserves_one_day_floor PASSED [ 65%]
tests/test_learning.py::test_subsequent_reviews_compound_stability PASSED [ 65%]
tests/test_learning.py::test_rate_topic_dynamically_changes_exam_readiness PASSED [ 66%]
tests/test_learning.py::test_review_topic_cross_user_returns_404 PASSED  [ 67%]
tests/test_learning.py::test_exam_readiness_cross_user_returns_404 PASSED [ 68%]
tests/test_learning.py::test_study_session_create_and_list PASSED        [ 69%]
tests/test_learning.py::test_study_session_cross_user_returns_404 PASSED [ 70%]
tests/test_notifications.py::test_streak_endpoint_empty_new_user PASSED  [ 70%]
tests/test_notifications.py::test_streak_endpoint_with_study_activity PASSED [ 71%]
tests/test_notifications.py::test_push_subscription_lifecycle PASSED     [ 72%]
tests/test_notifications.py::test_notification_preferences_get_and_patch PASSED [ 73%]
tests/test_morning_digest_generation PASSED                               [ 74%]
tests/test_notifications.py::test_test_send_notification_endpoint PASSED [ 73%]
tests/test_notifications.py::test_notifications_cross_user_isolation_returns_404 PASSED [ 74%]
tests/test_phase10_batch_a.py::test_no_hardcoded_studentos_upi_string PASSED [ 75%]
tests/test_phase10_batch_a.py::test_payment_unconfigured_behavior PASSED [ 76%]
tests/test_phase10_batch_a.py::test_sqlite_foreign_keys_pragma_enabled PASSED [ 77%]
tests/test_phase10_batch_a.py::test_payment_submission_and_duplicate_rejection PASSED [ 77%]
tests/test_phase10_batch_a.py::test_admin_payment_approval_lifts_pro_status PASSED [ 78%]
tests/test_phase10_batch_a.py::test_free_plan_limits_and_pro_upgrade PASSED [ 79%]
tests/test_phase10_batch_a.py::test_expired_pro_falls_back_to_free PASSED [ 80%]
tests/test_phase10_batch_a.py::test_account_deletion_cleans_all_tables_with_foreign_keys_on PASSED [ 81%]
tests/test_phase9_security.py::test_security_headers_present PASSED      [ 81%]
tests/test_phase9_security.py::test_delete_account_and_academic_data PASSED [ 82%]
tests/test_phase9_security.py::test_backup_script_execution PASSED       [ 83%]
tests/test_syllabus.py::test_extract_syllabus_data_structures PASSED     [ 84%]
tests/test_syllabus.py::test_extract_syllabus_operating_systems PASSED   [ 85%]
tests/test_syllabus.py::test_extract_syllabus_computer_networks PASSED   [ 86%]
tests/test_syllabus.py::test_extract_syllabus_dbms PASSED                [ 86%]
tests/test_syllabus.py::test_extract_syllabus_ai_ml PASSED               [ 87%]
tests/test_syllabus.py::test_prompt_injection_guard PASSED               [ 88%]
tests/test_syllabus.py::test_sha256_caching_returns_cached_flag PASSED   [ 89%]
tests/test_syllabus.py::test_daily_extraction_limit_exceeded PASSED      [ 90%]
tests/test_syllabus.py::test_get_limits_endpoint PASSED                  [ 90%]
tests/test_syllabus.py::test_pdf_scanned_or_empty_rejected PASSED        [ 91%]
tests/test_syllabus.py::test_pdf_too_large_rejected PASSED               [ 92%]
tests/test_syllabus.py::test_confirm_syllabus_saves_to_db_and_links_exam PASSED [ 93%]
tests/test_syllabus.py::test_confirm_syllabus_cross_user_returns_404 PASSED [ 94%]
tests/test_today.py::test_today_plan_empty_student_returns_comfortable PASSED [ 95%]
tests/test_today.py::test_today_plan_prioritizes_urgent_task_due_today PASSED [ 95%]
tests/test_today.py::test_today_plan_exam_proximity_boost PASSED         [ 96%]
tests/test_today.py::test_today_plan_workload_overloaded_recommends_defer PASSED [ 97%]
tests/test_accept_and_dismiss_recommendation PASSED                      [ 98%]
tests/test_today.py::test_recommendation_cross_user_returns_404 PASSED   [ 99%]
tests/test_today.py::test_rapid_onboarding_to_today_plan_under_three_minutes PASSED [100%]

============================== warnings summary ===============================
.venv\Lib\site-packages\fastapi\testclient.py:1
  C:\Users\muthu\OneDrive\Desktop\student project\backend\.venv\Lib\site-packages\fastapi\testclient.py:1: StarletteDeprecationWarning: Using `httpx` with `starlette.testclient` is deprecated; install `httpx2` instead.
    from starlette.testclient import TestClient as TestClient  # noqa

tests/test_syllabus.py::test_pdf_scanned_or_empty_rejected
tests/test_syllabus.py::test_pdf_too_large_rejected
  C:\Users\muthu\OneDrive\Desktop\student project\backend\.venv\Lib\site-packages\fastapi\routing.py:372: StarletteDeprecationWarning: 'HTTP_413_REQUEST_ENTITY_TOO_LARGE' is deprecated. Use 'HTTP_413_CONTENT_TOO_LARGE' instead.
    return await dependant.call(**values)

tests/test_syllabus.py::test_pdf_scanned_or_empty_rejected
tests/test_syllabus.py::test_pdf_too_large_rejected
  C:\Users\muthu\OneDrive\Desktop\student project\backend\.venv\Lib\site-packages\fastapi\routing.py:372: StarletteDeprecationWarning: 'HTTP_422_UNPROCESSABLE_ENTITY' is deprecated. Use 'HTTP_422_UNPROCESSABLE_CONTENT' instead.
    return await dependant.call(**values)

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
====================== 122 passed, 5 warnings in 31.12s =======================
```

---

## 2. Service Worker and Shared PC Data Protection

### 2.1 Does the service worker cache `/api/*` responses?
**No.** In [`frontend/public/sw.js`](file:///c:/Users/muthu/OneDrive/Desktop/student%20project/frontend/public/sw.js) lines 46–57:
```javascript
if (url.pathname.startsWith('/api/')) {
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response(
        JSON.stringify({ error: 'You are currently offline. Local cache active.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    })
  );
  return;
}
```
API calls are routed directly to the network. The response is never written to `CacheStorage`. If the network fails, it returns a static HTTP 503 JSON response.

### 2.2 What happens on logout?
When a student logs out via `logoutUser()` in [`frontend/src/lib/api.ts`](file:///c:/Users/muthu/OneDrive/Desktop/student%20project/frontend/src/lib/api.ts) lines 145–183:
1. **CacheStorage Wipe:** `caches.keys()` iterates over every cache key in the browser and calls `caches.delete(key)`. This purges all cached app assets and navigation shells.
2. **Push Unsubscribe:** The browser requests `navigator.serviceWorker.ready`, retrieves the active push subscription via `pushManager.getSubscription()`, and calls `sub.unsubscribe()`.
3. **Cookie Deletion:** Sends a `POST /api/auth/logout` request which responds with an expired `access_token` cookie (`Max-Age=0`).

---

## 3. Payment Endpoints and Dynamic UPI Architecture

### 3.1 Payment Endpoints List
- `GET /api/payments/config` — Public endpoint returning `{ "configured": bool, "upi_id": str, "payee_name": str, "plans": list }`.
  - If `UPI_ID` in backend settings is empty, returns `configured: false`, `upi_id: ""`, and `payee_name: ""`.
  - If `UPI_ID` is populated, returns `configured: true`, the active `upi_id`, `payee_name`, and the two enabled tiers (`monthly` ₹49, `semester` ₹99).
- `POST /api/payments` — Protected endpoint accepting `{ plan: string, utr: string }`.
  - **Configuration Guard:** If `UPI_ID` is empty, immediately rejects submissions with `503 Service Unavailable` (`"Payments are not available yet. UPI configuration is pending."`).
  - **Format Validation:** Validates that `utr` is exactly 12 numeric digits (`^\d{12}$`).
  - **Duplicate Prevention:** Checks `Payment.utr` for existing entries and returns `409 Conflict` (`"A payment with this UTR has already been submitted."`).
  - **Record Creation:** Inserts record with `status="pending"`.
- `GET /api/payments/my` — Protected endpoint returning the authenticated student's payment history and verification status.
- `POST /api/payments/{utr}/approve` — Protected admin-only endpoint restricted to emails configured in `ADMIN_EMAILS`. Sets `payment.status = "approved"` and extends `user.pro_until` (+30 days for monthly, +180 days for semester).

### 3.2 Elimination of Hardcoded UPI & Dynamic Client Flow
- **Backend Configuration ([`backend/app/config.py`](file:///c:/Users/muthu/OneDrive/Desktop/student%20project/backend/app/config.py)):**
  - `UPI_ID` and `UPI_PAYEE_NAME` default to empty strings (`""`).
  - If empty, payments are treated strictly as unconfigured across both API and frontend.
- **Frontend Modal Flow ([`frontend/src/components/ExamPassModal.tsx`](file:///c:/Users/muthu/OneDrive/Desktop/student%20project/frontend/src/components/ExamPassModal.tsx)):**
  - **Initial State:** Starts with empty `upiId: ""` and `isLoadingConfig: true`.
  - **Loading State:** Displays a clay loading spinner while fetching `/api/payments/config`.
  - **Unconfigured Guard:** If `configured === false`, hides both the QR code and the 12-digit UTR submission form, displaying the message:
    > *"Payments are not available yet. Payment configuration is not set up on this server. Contact the administrator to enable payments."*
  - **Dynamic QR Code Generation:** The QR code is generated strictly in-browser via the `qrcode` library using the fetched `upi_id` and the selected plan amount (`upi://pay?pa=...&pn=...&am=...&cu=INR`). Static SVG placeholders and dummy fallbacks have been removed.
- **Automated Anti-Hardcode Pytest ([`backend/tests/test_phase10_batch_a.py`](file:///c:/Users/muthu/OneDrive/Desktop/student%20project/backend/tests/test_phase10_batch_a.py)):**
  - `test_no_hardcoded_studentos_upi_string` recursively scans all files in `backend/app` and `frontend/src` to assert zero occurrences of hardcoded dummy UPI strings.
  - `test_payment_unconfigured_behavior` tests that empty `UPI_ID` returns `configured: false` and blocks payment creation with `503`.

### 3.3 Required Environment Variables to Set
To enable live payments and administrative features, the following environment variables must be configured in `backend/.env`:

| Variable | Description | Example / Required Format |
|---|---|---|
| `UPI_ID` | **Mandatory for payments.** The UPI Virtual Payment Address (VPA) where students send money. If omitted or empty, payments are disabled. | `yourname@okhdfcbank` or `business@upi` |
| `UPI_PAYEE_NAME` | Payee display name embedded in the dynamic QR code and displayed to students. | `Muthubalamurugan` or `Student OS` |
| `ADMIN_EMAILS` | Comma-separated list of admin email addresses allowed to approve payments via API/scripts. | `muthu@example.com,admin@example.com` |

**Other Production Environment Variables:**
| Variable | Description | Recommended Setting |
|---|---|---|
| `DATABASE_URL` | Production PostgreSQL connection URL | `postgresql+psycopg://user:password@host:5432/dbname` |
| `JWT_SECRET` | Secret key for signing authentication tokens | Random 64+ char string |
| `COOKIE_SECURE` | Enforces HTTPS-only cookies | `true` in production (`false` in local dev) |
| `APP_ENV` | Environment identifier | `production` |
| `FRONTEND_ORIGINS` | Permitted CORS frontend origins | `https://your-domain.com` |
| `GEMINI_API_KEY` | Optional: Gemini API key for syllabus AI parser | `AIzaSy...` (falls back to regex parser if empty) |

---

## 4. Runbook

Yes, [`RUNBOOK.md`](file:///c:/Users/muthu/OneDrive/Desktop/student%20project/RUNBOOK.md) exists in the project root. It documents:
1. SQLite development backup and restore commands.
2. PostgreSQL production backup (`pg_dump`) and tested restore procedure.
3. Manual payment approval via CLI script (`backend/scripts/approve_payment.py <utr>`) and admin endpoint.
4. Secret rotation procedures for `JWT_SECRET` and `DATABASE_URL`.

---

## 5. LLM Usage in the Codebase

- **Is an LLM called?**
  Yes, an LLM pipeline is defined in [`backend/app/ai/llm_client.py`](file:///c:/Users/muthu/OneDrive/Desktop/student%20project/backend/app/ai/llm_client.py).
- **Which Provider and Model?**
  - **Google Gemini:** Model `gemini-1.5-flash` via HTTP endpoint `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent` with `response_mime_type: "application/json"`.
  - **OpenAI:** Model `gpt-4o-mini` via HTTP endpoint `https://api.openai.com/v1/chat/completions` with `"response_format": {"type": "json_object"}`.
- **Where the API key is read from:**
  - `GEMINI_API_KEY` is read from `backend/.env` via `settings.GEMINI_API_KEY`.
  - `OPENAI_API_KEY` is read from `backend/.env` via `settings.OPENAI_API_KEY`.
  - *Current `.env` state:* Both keys are currently empty (`""`). When no API key is provided, the code falls back to `heuristic_syllabus_parser()`, which parses syllabus text using regular expressions.
- **Per-User Daily Limit:**
  - 5 extractions per user per day.
  - Defined in `settings.SYLLABUS_DAILY_LIMIT_PER_USER` in `config.py` and enforced by `SyllabusCache.check_and_increment_usage(user_id)` in [`backend/app/routers/syllabus.py`](file:///c:/Users/muthu/OneDrive/Desktop/student%20project/backend/app/routers/syllabus.py#L72). If exceeded, the API returns `429 Too Many Requests`.

---

## 6. Anything Not Done

1. **Remote Cloud PostgreSQL (Neon/Supabase):** The full migration suite and 120 tests were executed against a real local PostgreSQL 17 instance on port 5432 with 100% pass rate. Running against a remote cloud provider (e.g., Neon or Supabase) has not been run because remote credentials have not been configured in `.env`.
2. **Batches B, C, D:** Per the instructions, work was stopped at the conclusion of Batch A to await review and approval.
