from datetime import timedelta
import base64
import json
import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app, validate_production_startup
from app.database import SessionLocal
from app.models.user import User
from app.security.auth import create_access_token
from app.security.rate_limiter import auth_rate_limiter
from app.config import settings

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_limiter_before_each_test():
    """Ensure in-memory rate limiter does not leak counts between test cases."""
    auth_rate_limiter.reset()
    yield
    auth_rate_limiter.reset()


def test_login_wrong_password():
    """Test login with wrong password returns 401 Unauthorized."""
    email = "wrong_pw_user@example.com"
    client.post("/api/auth/register", json={
        "name": "Wrong Password Test",
        "email": email,
        "password": "correct_password123"
    })

    login_res = client.post("/api/auth/login", json={
        "email": email,
        "password": "wrong_password_XYZ"
    })
    assert login_res.status_code == 401
    assert "Invalid email or password" in login_res.json()["detail"]


def test_login_unknown_email():
    """Test login with unknown email returns 401 Unauthorized."""
    login_res = client.post("/api/auth/login", json={
        "email": "completely_unknown_student_999@example.com",
        "password": "some_password_123"
    })
    assert login_res.status_code == 401
    assert "Invalid email or password" in login_res.json()["detail"]


def test_register_duplicate_email():
    """Test registering with an existing email returns 409 Conflict."""
    email = "existing_student_conflict@example.com"
    client.post("/api/auth/register", json={
        "name": "First Register",
        "email": email,
        "password": "validPassword123"
    })

    dup_res = client.post("/api/auth/register", json={
        "name": "Second Register",
        "email": email,
        "password": "anotherPassword456"
    })
    assert dup_res.status_code == 409
    assert "already exists" in dup_res.json()["detail"].lower()


def test_get_me_no_cookie():
    """Test /api/me without authentication cookie returns 401 Unauthorized."""
    clean_client = TestClient(app)
    res = clean_client.get("/api/me")
    assert res.status_code == 401
    assert "Authentication cookie missing" in res.json()["detail"]


def test_get_me_expired_token():
    """Test /api/me with expired token returns 401 Unauthorized."""
    expired_token = create_access_token(
        data={"sub": "usr_expired_test", "email": "expired@example.com"},
        expires_delta=timedelta(hours=-1)
    )

    clean_client = TestClient(app)
    clean_client.cookies.set("access_token", expired_token)

    res = clean_client.get("/api/me")
    assert res.status_code == 401
    assert "expired" in res.json()["detail"].lower()


def test_get_me_tampered_token():
    """Test /api/me with a modified/tampered signature returns 401 Unauthorized."""
    valid_token = create_access_token(
        data={"sub": "usr_tamper_test", "email": "tamper@example.com"}
    )
    tampered_token = valid_token[:-6] + "xyz123"

    clean_client = TestClient(app)
    clean_client.cookies.set("access_token", tampered_token)

    res = clean_client.get("/api/me")
    assert res.status_code == 401
    assert "could not validate credentials" in res.json()["detail"].lower()


def test_get_me_alg_none_token_rejected():
    """Test that an unsigned JWT with header alg=none is rejected with 401."""
    header = base64.urlsafe_b64encode(json.dumps({"alg": "none", "typ": "JWT"}).encode()).decode().rstrip("=")
    payload = base64.urlsafe_b64encode(json.dumps({"sub": "usr_alg_none", "email": "none@example.com"}).encode()).decode().rstrip("=")
    alg_none_token = f"{header}.{payload}."

    clean_client = TestClient(app)
    clean_client.cookies.set("access_token", alg_none_token)

    res = clean_client.get("/api/me")
    assert res.status_code == 401
    assert "could not validate credentials" in res.json()["detail"].lower()


def test_get_current_user_deleted_user_returns_401():
    """Test get_current_user loads user from DB and returns 401 if user was deleted."""
    test_client = TestClient(app)
    email = "deleted_user_test@example.com"
    reg_res = test_client.post("/api/auth/register", json={
        "name": "Soon Deleted",
        "email": email,
        "password": "validPassword123"
    })
    assert reg_res.status_code == 201
    user_id = reg_res.json()["user"]["id"]

    # Delete the user directly from DB
    db = SessionLocal()
    try:
        user_in_db = db.query(User).filter(User.id == user_id).first()
        if user_in_db:
            db.delete(user_in_db)
            db.commit()
    finally:
        db.close()

    # Now make request to /api/me with the still-valid JWT cookie
    res = test_client.get("/api/me")
    assert res.status_code == 401
    assert "user associated with token not found" in res.json()["detail"].lower()


def test_password_rules_validation():
    """Test min 8 characters and max 72 bytes password enforcement."""
    # 1. Too short (7 characters) -> 422 Unprocessable Entity
    short_res = client.post("/api/auth/register", json={
        "name": "Short Password",
        "email": "short_pw@example.com",
        "password": "short12"
    })
    assert short_res.status_code == 422
    assert "at least 8 characters" in short_res.text

    # 2. Too long (> 72 bytes) -> 422 Unprocessable Entity
    long_pw = "A" * 73
    long_res = client.post("/api/auth/register", json={
        "name": "Long Password",
        "email": "long_pw@example.com",
        "password": long_pw
    })
    assert long_res.status_code == 422
    assert "cannot exceed 72 bytes" in long_res.text

    # 3. Valid 8 characters -> 201 Created
    unique_valid_email = f"valid_8_char_{uuid.uuid4().hex[:8]}@example.com"
    valid_res = client.post("/api/auth/register", json={
        "name": "Valid Password",
        "email": unique_valid_email,
        "password": "exact8ch"
    })
    assert valid_res.status_code == 201


def test_cookie_flags_httponly_and_samesite():
    """Test that Set-Cookie headers on register and login contain HttpOnly and SameSite=lax."""
    test_client = TestClient(app)
    email = f"cookie_flags_{uuid.uuid4().hex[:8]}@example.com"

    # Register
    reg_res = test_client.post("/api/auth/register", json={
        "name": "Cookie Flag Test",
        "email": email,
        "password": "validPassword123"
    })
    assert reg_res.status_code == 201
    reg_set_cookie = reg_res.headers.get("set-cookie", "")
    assert "HttpOnly" in reg_set_cookie
    assert "samesite=lax" in reg_set_cookie.lower()

    # Login
    login_res = test_client.post("/api/auth/login", json={
        "email": email,
        "password": "validPassword123"
    })
    assert login_res.status_code == 200
    login_set_cookie = login_res.headers.get("set-cookie", "")
    assert "HttpOnly" in login_set_cookie
    assert "samesite=lax" in login_set_cookie.lower()


def test_logout_clears_cookie():
    """Test that /api/auth/logout clears the access_token cookie."""
    test_client = TestClient(app)
    logout_res = test_client.post("/api/auth/logout")
    assert logout_res.status_code == 200
    set_cookie = logout_res.headers.get("set-cookie", "")
    assert 'access_token=""' in set_cookie or "max-age=0" in set_cookie.lower()


def test_password_hash_never_appears_in_responses():
    """Test that password_hash and bcrypt salt $2b$ are never exposed in responses."""
    test_client = TestClient(app)
    email = "no_hash_exposure@example.com"

    # Register
    reg_res = test_client.post("/api/auth/register", json={
        "name": "Privacy Student",
        "email": email,
        "password": "validPassword123"
    })
    assert "password_hash" not in reg_res.text
    assert "$2b$" not in reg_res.text
    assert "password_hash" not in reg_res.json().get("user", {})

    # Login
    login_res = test_client.post("/api/auth/login", json={
        "email": email,
        "password": "validPassword123"
    })
    assert "password_hash" not in login_res.text
    assert "$2b$" not in login_res.text
    assert "password_hash" not in login_res.json().get("user", {})

    # /api/me
    me_res = test_client.get("/api/me")
    assert "password_hash" not in me_res.text
    assert "$2b$" not in me_res.text
    assert "password_hash" not in me_res.json()


def test_rate_limiting_login_ip_and_email_combo():
    """Test login limit: 5 attempts per (IP + email), 6th attempt returns 429."""
    test_client = TestClient(app)
    email = "combo_rate_target@example.com"

    for _ in range(5):
        res = test_client.post("/api/auth/login", json={
            "email": email,
            "password": "wrong_password123"
        })
        assert res.status_code == 401

    blocked_res = test_client.post("/api/auth/login", json={
        "email": email,
        "password": "wrong_password123"
    })
    assert blocked_res.status_code == 429
    assert "Rate limit exceeded" in blocked_res.json()["detail"]


def test_rate_limiting_login_ip_wide():
    """Test login IP-wide limit: 30 attempts per IP across different emails, 31st returns 429."""
    test_client = TestClient(app)

    # Send 30 requests across unique emails from same IP
    for i in range(30):
        res = test_client.post("/api/auth/login", json={
            "email": f"ip_login_{i}@example.com",
            "password": "wrong_password123"
        })
        assert res.status_code in [401, 404]

    # 31st request from same IP should be blocked
    blocked_res = test_client.post("/api/auth/login", json={
        "email": "ip_login_31@example.com",
        "password": "wrong_password123"
    })
    assert blocked_res.status_code == 429
    assert "Rate limit exceeded" in blocked_res.json()["detail"]


def test_rate_limiting_register_ip():
    """Test register IP limit: 20 attempts per IP, 21st attempt returns 429."""
    test_client = TestClient(app)
    run_id = uuid.uuid4().hex[:6]

    for i in range(20):
        res = test_client.post("/api/auth/register", json={
            "name": f"Student {i}",
            "email": f"reg_limit_{run_id}_{i}@example.com",
            "password": "validPassword123"
        })
        assert res.status_code == 201

    # 21st register attempt should be blocked
    blocked_res = test_client.post("/api/auth/register", json={
        "name": "Student 21",
        "email": f"reg_limit_{run_id}_21@example.com",
        "password": "validPassword123"
    })
    assert blocked_res.status_code == 429
    assert "Rate limit exceeded" in blocked_res.json()["detail"]


def test_trusted_proxy_ip_resolution():
    """Test that X-Forwarded-For is only respected when TRUSTED_PROXY is True."""
    orig_trusted = settings.TRUSTED_PROXY
    test_client = TestClient(app)

    try:
        # Case A: TRUSTED_PROXY is False -> ignores X-Forwarded-For header, counts against testclient IP
        settings.TRUSTED_PROXY = False
        auth_rate_limiter.reset()

        for _ in range(5):
            test_client.post(
                "/api/auth/login",
                json={"email": "proxy_test@example.com", "password": "wrong"},
                headers={"X-Forwarded-For": "203.0.113.195"}
            )
        # 6th should be blocked even if X-Forwarded-For is spoofed/changed
        blocked_res = test_client.post(
            "/api/auth/login",
            json={"email": "proxy_test@example.com", "password": "wrong"},
            headers={"X-Forwarded-For": "198.51.100.22"}
        )
        assert blocked_res.status_code == 429

        # Case B: TRUSTED_PROXY is True -> respects X-Forwarded-For
        settings.TRUSTED_PROXY = True
        auth_rate_limiter.reset()

        # Fill up 5 attempts for proxy IP 1.2.3.4
        for _ in range(5):
            res = test_client.post(
                "/api/auth/login",
                json={"email": "trusted_proxy_user@example.com", "password": "wrong"},
                headers={"X-Forwarded-For": "1.2.3.4, 10.0.0.1"}
            )
            assert res.status_code == 401

        # 6th attempt from 1.2.3.4 is blocked
        blocked = test_client.post(
            "/api/auth/login",
            json={"email": "trusted_proxy_user@example.com", "password": "wrong"},
            headers={"X-Forwarded-For": "1.2.3.4, 10.0.0.1"}
        )
        assert blocked.status_code == 429

        # But a different forwarded IP 5.6.7.8 is NOT blocked
        different_ip_res = test_client.post(
            "/api/auth/login",
            json={"email": "trusted_proxy_user@example.com", "password": "wrong"},
            headers={"X-Forwarded-For": "5.6.7.8, 10.0.0.1"}
        )
        assert different_ip_res.status_code == 401

    finally:
        settings.TRUSTED_PROXY = orig_trusted
        auth_rate_limiter.reset()


def test_production_startup_safety_checks():
    """Test that validate_production_startup raises RuntimeError on weak production configs."""
    orig_env = settings.ENVIRONMENT
    orig_secret = settings.JWT_SECRET
    orig_secure = settings.COOKIE_SECURE

    try:
        settings.ENVIRONMENT = "production"
        settings.JWT_SECRET = "student-os-super-secret-jwt-key-2026-phase-1"
        settings.COOKIE_SECURE = True
        with pytest.raises(RuntimeError, match="JWT_SECRET must be at least 32 characters"):
            validate_production_startup()

        settings.JWT_SECRET = "short_secret_123"
        with pytest.raises(RuntimeError, match="JWT_SECRET must be at least 32 characters"):
            validate_production_startup()

        settings.JWT_SECRET = "a_very_strong_random_production_secret_key_32_characters_long"
        settings.COOKIE_SECURE = False
        with pytest.raises(RuntimeError, match="COOKIE_SECURE must be True in production"):
            validate_production_startup()

        settings.COOKIE_SECURE = True
        validate_production_startup()

    finally:
        settings.ENVIRONMENT = orig_env
        settings.JWT_SECRET = orig_secret
        settings.COOKIE_SECURE = orig_secure


def test_register_and_login_lifecycle():
    """Test complete register -> /api/me -> logout -> /api/me flow."""
    test_client = TestClient(app)
    unique_email = f"lifecycle_{id(test_client)}@example.com"

    # 1. Register
    reg_res = test_client.post("/api/auth/register", json={
        "name": "Lifecycle Student",
        "email": unique_email,
        "password": "strongPassword123"
    })
    assert reg_res.status_code == 201
    assert "access_token" in reg_res.cookies

    # 2. Duplicate registration attempt should return 409
    dup_res = test_client.post("/api/auth/register", json={
        "name": "Duplicate Student",
        "email": unique_email,
        "password": "strongPassword123"
    })
    assert dup_res.status_code == 409

    # 3. Access protected /api/me
    me_res = test_client.get("/api/me")
    assert me_res.status_code == 200
    assert me_res.json()["email"] == unique_email

    # 4. Logout
    logout_res = test_client.post("/api/auth/logout")
    assert logout_res.status_code == 200

    # 5. /api/me after logout should return 401
    me_after_logout = test_client.get("/api/me")
    assert me_after_logout.status_code == 401


def test_update_user_profile_study_minutes_and_name():
    """B4: PATCH /api/me updates daily_study_minutes and name, which the planner uses."""
    test_client = TestClient(app)
    unique_email = f"study_min_{uuid.uuid4().hex[:8]}@example.com"

    # Register with default
    reg_res = test_client.post("/api/auth/register", json={
        "name": "Study Student",
        "email": unique_email,
        "password": "strongPassword123",
    })
    assert reg_res.status_code == 201
    assert reg_res.json()["user"]["daily_study_minutes"] == 120

    # PATCH /api/me to 90 minutes and new name
    patch_res = test_client.patch("/api/me", json={
        "name": "Muthubalamurugan",
        "daily_study_minutes": 90,
    })
    assert patch_res.status_code == 200
    user_data = patch_res.json()
    assert user_data["name"] == "Muthubalamurugan"
    assert user_data["daily_study_minutes"] == 90

    # Verify GET /api/me reflects update
    me_res = test_client.get("/api/me")
    assert me_res.status_code == 200
    assert me_res.json()["daily_study_minutes"] == 90

    # Verify invalid values are rejected (e.g. less than 30 or over 720)
    bad_res = test_client.patch("/api/me", json={"daily_study_minutes": 10})
    assert bad_res.status_code == 422

