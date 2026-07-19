from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "PhishGuard AI API"
    API_V1_STR: str = "/api/v1"

    # Secret key for JWT
    SECRET_KEY: str = "super-secret-phishguard-key-change-in-production-123456789"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # ── Universal Admin Account (seeded automatically on startup) ─────────────
    # Change these via environment variables or .env before first run.
    ADMIN_EMAIL: str = "admin@phishguard.ai"
    ADMIN_PASSWORD: str = "Admin@1234"
    ADMIN_FULL_NAME: str = "PhishGuard Admin"

    # Database Configuration – falls back to SQLite locally
    DATABASE_URL: str = "sqlite:///./phishguard.db"

    # Redis Configuration
    REDIS_URL: str = "redis://localhost:6379/0"

    # Celery Configuration
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # Security Settings
    RATE_LIMIT_PER_MINUTE: int = 100
    CORS_ORIGINS: List[str] = ["*"]

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")

settings = Settings()
