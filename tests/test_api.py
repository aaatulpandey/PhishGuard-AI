"""API integration tests for PhishGuard AI backend."""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# ──────────────────────────────────────────────────────────────────────────────
# Root & Health
# ──────────────────────────────────────────────────────────────────────────────

def test_api_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

# ──────────────────────────────────────────────────────────────────────────────
# Authentication
# ──────────────────────────────────────────────────────────────────────────────

def test_register_new_user_gets_user_role():
    """All self-registered users always receive the 'User' role."""
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "newuser@example.com", "password": "pass123456", "full_name": "New User"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert data["role"] == "User"    # never Admin

def test_register_second_user_also_gets_user_role():
    """Even subsequent registrations are always 'User'."""
    client.post("/api/v1/auth/register",
                json={"email": "first@example.com", "password": "pass123", "full_name": "First"})
    response = client.post("/api/v1/auth/register",
                           json={"email": "second@example.com", "password": "pass123", "full_name": "Second"})
    assert response.status_code == 201
    assert response.json()["role"] == "User"

def test_register_with_reserved_admin_email_fails():
    """Registering with the seeded admin email is blocked."""
    from app.config import settings
    response = client.post(
        "/api/v1/auth/register",
        json={"email": settings.ADMIN_EMAIL, "password": "anything123", "full_name": "Hacker"}
    )
    assert response.status_code == 400
    assert "reserved" in response.json()["detail"].lower()

def test_auth_full_flow():
    """Register → Login → get profile."""
    client.post("/api/v1/auth/register",
                json={"email": "flow@example.com", "password": "testpassword123", "full_name": "Flow User"})
    login_response = client.post(
        "/api/v1/auth/login",
        data={"username": "flow@example.com", "password": "testpassword123"}
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    assert token is not None

    profile = client.get("/api/v1/auth/profile",
                         headers={"Authorization": f"Bearer {token}"})
    assert profile.status_code == 200
    assert profile.json()["email"] == "flow@example.com"

def test_admin_login_works():
    """The seeded admin account should be able to log in."""
    from app.config import settings
    from app.models import User
    from app.security import get_password_hash

    # In TESTING mode the lifespan seeder is skipped, so manually ensure admin exists.
    # We use the override_get_db session (bound to the test SQLite engine via conftest).
    with client as c:
        # Hit a DB-touching endpoint so the overridden session is active, then seed directly
        pass

    # Access the TestingSessionLocal that conftest registered as a module-level name
    import sys
    _conftest = sys.modules.get("conftest") or sys.modules.get("tests.conftest")
    if _conftest is None:
        # Fallback: reconstruct a session from the already-patched app.database module
        import app.database as db_module
        Session = db_module.SessionLocal
    else:
        Session = _conftest.TestingSessionLocal

    db = Session()
    try:
        existing = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
        if not existing:
            admin = User(
                email=settings.ADMIN_EMAIL,
                hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
                full_name=settings.ADMIN_FULL_NAME,
                role="Admin",
                is_active=1,
            )
            db.add(admin)
            db.commit()
    finally:
        db.close()

    response = client.post(
        "/api/v1/auth/login",
        data={"username": settings.ADMIN_EMAIL, "password": settings.ADMIN_PASSWORD}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["role"] == "Admin"
    assert data["access_token"] is not None


def test_duplicate_registration_fails():
    client.post("/api/v1/auth/register", json={"email": "dup@example.com", "password": "pass123"})
    response = client.post("/api/v1/auth/register", json={"email": "dup@example.com", "password": "pass456"})
    assert response.status_code == 400

def test_wrong_password_login_fails():
    client.post("/api/v1/auth/register", json={"email": "real@example.com", "password": "correctpass"})
    response = client.post("/api/v1/auth/login",
                           data={"username": "real@example.com", "password": "wrongpass"})
    assert response.status_code == 400

def test_profile_requires_auth():
    response = client.get("/api/v1/auth/profile")
    assert response.status_code == 401

# ──────────────────────────────────────────────────────────────────────────────
# URL Analysis
# ──────────────────────────────────────────────────────────────────────────────

def test_scan_safe_url_anonymous():
    """Public endpoint – no token required."""
    response = client.post("/api/v1/analysis/scan", json={"url": "https://google.com"})
    assert response.status_code == 200
    data = response.json()
    assert data["url"] == "https://google.com"
    assert data["classification"] == "Safe"
    assert data["risk_score"] < 40

def test_scan_phishing_url():
    """Classic phishing URL should return Phishing classification."""
    response = client.post(
        "/api/v1/analysis/scan",
        json={"url": "http://secure-login-paypal.update-verify-account.xyz/webscr"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["classification"] == "Phishing"
    assert data["risk_score"] >= 70
    assert len(data["indicators"]) > 0

def test_scan_ip_domain_is_suspicious():
    response = client.post("/api/v1/analysis/scan", json={"url": "http://192.168.1.1/login"})
    assert response.status_code == 200
    assert response.json()["risk_score"] > 30

def test_scan_returns_required_fields():
    response = client.post("/api/v1/analysis/scan", json={"url": "https://github.com"})
    data = response.json()
    for field in ["url", "risk_score", "classification", "confidence", "indicators", "features"]:
        assert field in data

def test_scan_empty_url_fails():
    response = client.post("/api/v1/analysis/scan", json={"url": "   "})
    assert response.status_code == 400
