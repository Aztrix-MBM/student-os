# Backlog & Future Phases — Student OS

Items identified during UI/UX and engine development reserved for subsequent phases:

1. **Phase 2 Deferred Auth Enhancements:**
   - **Google OAuth Login (`POST /api/auth/google`):** Deferred until Google Cloud Console OAuth Client ID & Secret (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) are configured. The UI Google login button is hidden for now; local email/password authentication is active.
   - **Password Reset via Email (SMTP):** Forgot password / email token verification deferred to production infrastructure setup.
   - **Dual Refresh Token Rotation:** Single 7-day `httpOnly` access token cookie currently used; sliding refresh token rotation deferred to enterprise production hardening.

2. **Phase 3 Academic Core:**
   - Wire Alembic MySQL/PostgreSQL persistence and CRUD endpoints for user subjects, exams, and tasks.
   - Enforce strict User Ownership Isolation (`WHERE user_id = current_user.id`).

3. **Phase 5 Production LLM Pipeline:**
   - Integrate `llm_client.py` with OpenAI/Gemini/Anthropic API key from `.env` for automated syllabus PDF OCR and JSON parsing.

4. **Phase 8 Web Push Notifications:**
   - Push notifications for morning plan and spaced revision reminders due on the day.

5. **Phase 9 UPI Payment Modal:**
   - QR code UPI intent for the ₹49–₹199 semester "Exam Pass".
