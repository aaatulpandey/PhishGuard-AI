from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from app.database import get_db
from app.models import User, AuditLog
from app.schemas import UserResponse, UserUpdate, AuditLogResponse
from app.dependencies import get_current_active_admin

router = APIRouter(prefix="/users", tags=["User & Admin Management"])

@router.get("", response_model=List[UserResponse])
def get_users(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_active_admin)
):
    """Retrieves all registered users. Admin only."""
    return db.query(User).order_by(User.id).offset(skip).limit(limit).all()

@router.put("/{user_id}", response_model=UserResponse)
def update_user_role(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_active_admin)
):
    """Updates user information (role, active status). Admin only."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
        
    if user_id == admin_user.id and user_in.role is not None and user_in.role != "Admin":
        raise HTTPException(
            status_code=400,
            detail="Admins cannot revoke their own admin permissions."
        )
        
    if user_in.full_name is not None:
        user.full_name = user_in.full_name
        
    if user_in.role is not None:
        user.role = user_in.role
        
    if user_in.is_active is not None:
        user.is_active = user_in.is_active
        
    db.commit()
    db.refresh(user)
    
    # Audit log
    audit = AuditLog(
        user_id=admin_user.id,
        action="UPDATE_USER",
        details=f"Admin updated User ID {user_id}: Role={user.role}, Active={user.is_active}"
    )
    db.add(audit)
    db.commit()
    
    return user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_active_admin)
):
    """Deletes a user account. Admin only."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
        
    if user_id == admin_user.id:
        raise HTTPException(
            status_code=400,
            detail="Admins cannot delete their own accounts."
        )
        
    db.delete(user)
    db.commit()
    
    # Audit log
    audit = AuditLog(
        user_id=admin_user.id,
        action="DELETE_USER",
        details=f"Admin deleted User ID {user_id}"
    )
    db.add(audit)
    db.commit()
    
    return None

@router.get("/logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_active_admin)
):
    """Retrieves all security and operational audit logs. Admin only."""
    logs = db.query(AuditLog).order_by(desc(AuditLog.timestamp)).offset(skip).limit(limit).all()
    
    # Populate user emails in the response schemas dynamically
    results = []
    for log in logs:
        email = None
        if log.user:
            email = log.user.email
        results.append(
            AuditLogResponse(
                id=log.id,
                user_id=log.user_id,
                action=log.action,
                ip_address=log.ip_address,
                details=log.details,
                timestamp=log.timestamp,
                user_email=email
            )
        )
    return results
