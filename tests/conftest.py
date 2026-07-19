"""
Pytest configuration and shared fixtures for PhishGuard AI test suite.
Uses a file-based SQLite test database so all sessions share the same connection.
"""
import os
import sys
import pytest

# Ensure TESTING flag is set before any app code is imported
os.environ["TESTING"] = "1"

# Prepend paths so app and ml modules resolve correctly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Use a file-based SQLite test DB (avoids in-memory isolation issues with multiple connections)
TEST_DB_PATH = os.path.join(os.path.dirname(__file__), "test_phishguard.db")
TEST_DB_URL = f"sqlite:///{TEST_DB_PATH}"

# Patch the database module BEFORE the app is imported
import app.database as db_module
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

db_module.engine = test_engine
db_module.SessionLocal = TestingSessionLocal

# Now import the app and Base
from app.database import Base, get_db
from app.main import app
from fastapi.testclient import TestClient

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="session", autouse=True)
def create_test_tables():
    """Create all DB tables once for the entire test session."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)
    # Dispose all connections before removing the file (required on Windows)
    test_engine.dispose()
    import time
    time.sleep(0.1)   # allow OS to release the file handle
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except PermissionError:
            pass  # non-critical: file will be overwritten on next test run

@pytest.fixture(autouse=True)
def clean_tables():
    """Truncate all tables between tests to guarantee isolation."""
    yield
    # Delete all rows in reverse dependency order
    with test_engine.connect() as conn:
        from sqlalchemy import text
        conn.execute(text("DELETE FROM audit_logs"))
        conn.execute(text("DELETE FROM scan_results"))
        conn.execute(text("DELETE FROM system_logs"))
        conn.execute(text("DELETE FROM users"))
        conn.commit()

@pytest.fixture
def client():
    return TestClient(app)
