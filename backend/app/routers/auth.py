from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from app.database import get_db
from app.models import User, AuditLog
from app.schemas import UserCreate, UserResponse, UserUpdate, Token, PasswordResetRequest
from app.security import verify_password, get_password_hash, create_access_token
from app.dependencies import get_current_user, get_current_active_user
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """Registers a new user. All self-registered accounts receive the 'User' role.
    The Admin account is seeded automatically on startup via config.ADMIN_EMAIL.
    """
    # Block self-registration as admin – admin is seeded on startup
    if user_in.email.lower() == settings.ADMIN_EMAIL.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This email address is reserved. Please use a different email."
        )

    # Reject duplicate registrations
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    # All self-registered users always get the basic 'User' role
    assigned_role = "User"


    hashed_password = get_password_hash(user_in.password)
    user = User(
        email=user_in.email,
        hashed_password=hashed_password,
        full_name=user_in.full_name,
        role=assigned_role,
        is_active=1
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Audit log
    audit = AuditLog(
        user_id=user.id,
        action="REGISTER",
        details=f"New user registered with role: {assigned_role}"
    )
    db.add(audit)
    db.commit()

    return user

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """OAuth2 compatible token login, retrieve access token."""
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password."
        )
    if user.is_active == 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account."
        )
        
    # Generate token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.email, expires_delta=access_token_expires
    )
    
    # Audit log
    audit = AuditLog(
        user_id=user.id,
        action="LOGIN",
        details="User successfully logged in"
    )
    db.add(audit)
    db.commit()
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/profile", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_active_user)):
    """Retrieves profile details of the currently authenticated user."""
    return current_user

@router.put("/profile", response_model=UserResponse)
def update_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Updates profile of the currently logged-in user."""
    if user_update.email is not None and user_update.email != current_user.email:
        # Check if email is already taken
        other_user = db.query(User).filter(User.email == user_update.email).first()
        if other_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already in use by another account."
            )
        current_user.email = user_update.email
        
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
        
    if user_update.password is not None:
        current_user.hashed_password = get_password_hash(user_update.password)
        
    # Standard users cannot modify roles or activation status
    if current_user.role == "Admin":
        if user_update.role is not None:
            current_user.role = user_update.role
        if user_update.is_active is not None:
            current_user.is_active = user_update.is_active
            
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="UPDATE_PROFILE",
        details="User updated profile information"
    )
    db.add(audit)
    db.commit()
    
    return current_user

@router.post("/reset-password-mock")
def reset_password(request: PasswordResetRequest, db: Session = Depends(get_db)):
    """Mock endpoint for password reset. Logs operation and returns success."""
    user = db.query(User).filter(User.email == request.email).first()
    if user:
        audit = AuditLog(
            user_id=user.id,
            action="PASSWORD_RESET_REQUEST",
            details="Mock password reset link requested"
        )
        db.add(audit)
        db.commit()
    return {"message": "If this email exists in our records, a password reset link has been dispatched."}
