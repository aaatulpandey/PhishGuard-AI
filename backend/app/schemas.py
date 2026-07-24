import re
from pydantic import BaseModel, EmailStr, Field, field_validator
from pydantic import ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters, with 1 uppercase, 1 number, and 1 special character.")

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not re.match(r"^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$", v):
            raise ValueError("Password must be at least 8 characters, with 1 uppercase, 1 number, and 1 special character.")
        return v

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[int] = None
    password: Optional[str] = None

class UserResponse(UserBase):
    id: int
    role: str
    is_active: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

class PasswordResetRequest(BaseModel):
    email: EmailStr

# --- Scan & Analytics Schemas ---
class ScanRequest(BaseModel):
    url: str

class ScanResponse(BaseModel):
    id: Optional[int] = None
    url: str
    risk_score: int
    classification: str
    confidence: float
    explanation: Optional[str] = None
    recommendation: Optional[str] = None
    indicators: List[str]
    features: Dict[str, Any]
    model_name: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class BatchScanRequest(BaseModel):
    urls: List[str] = Field(..., min_length=1, max_length=100)

class BatchScanResponse(BaseModel):
    scans: List[ScanResponse]
    summary: Dict[str, Any]

# --- Audit & System Logs ---
class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: str
    ip_address: Optional[str] = None
    details: Optional[str] = None
    timestamp: datetime
    user_email: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# --- Dashboard Stats ---
class DashboardStatsResponse(BaseModel):
    total_scanned: int
    total_phishing: int
    total_suspicious: int
    total_safe: int
    avg_risk_score: float
    recent_activity: List[ScanResponse]
    trends: List[Dict[str, Any]]
