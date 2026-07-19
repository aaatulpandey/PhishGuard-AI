"""
Admin seeder for PhishGuard AI.
Creates the universal admin account on first startup if it doesn't already exist.
Credentials are taken from app.config.settings (overridable via .env).
"""
from sqlalchemy.orm import Session
from app.config import settings
from app.models import User, AuditLog
from app.security import get_password_hash


def seed_admin(db: Session) -> None:
    """
    Ensure the universal admin user exists.
    Safe to call on every startup – it is a no-op when the account already exists.
    """
    existing = db.query(User).filter(
        User.email == settings.ADMIN_EMAIL
    ).first()

    if existing:
        return  # already seeded – nothing to do

    admin = User(
        email=settings.ADMIN_EMAIL,
        hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
        full_name=settings.ADMIN_FULL_NAME,
        role="Admin",
        is_active=1,
    )
    db.add(admin)
    db.flush()   # get the id before committing

    audit = AuditLog(
        user_id=admin.id,
        action="SEED_ADMIN",
        details=f"Universal admin account created: {settings.ADMIN_EMAIL}",
    )
    db.add(audit)
    db.commit()
    db.refresh(admin)

    print(
        f"\n[OK] Admin account seeded:\n"
        f"     Email    : {settings.ADMIN_EMAIL}\n"
        f"     Password : {settings.ADMIN_PASSWORD}\n"
        f"     Role     : Admin\n"
    )
