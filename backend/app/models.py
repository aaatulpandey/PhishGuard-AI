from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(String, default="User")  # Admin, Analyst, User
    is_active = Column(Integer, default=1) # 1 = Active, 0 = Inactive
    created_at = Column(DateTime, default=datetime.utcnow)
    
    scans = relationship("ScanResult", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")

class ScanResult(Base):
    __tablename__ = "scan_results"
    
    id = Column(Integer, primary_key=True, index=True)
    url = Column(Text, nullable=False)
    risk_score = Column(Integer, nullable=False)
    classification = Column(String, nullable=False) # Safe, Suspicious, Phishing
    confidence = Column(Float, nullable=False)
    explanation = Column(Text, nullable=True)
    recommendation = Column(Text, nullable=True)
    indicators = Column(JSON, nullable=True)  # List of strings: JSON array
    features = Column(JSON, nullable=True)     # Raw feature dictionary: JSON object
    model_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    user = relationship("User", back_populates="scans")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String, nullable=False) # LOGIN, REGISTER, SCAN_URL, UPDATE_ROLE, DELETE_USER, etc.
    ip_address = Column(String, nullable=True)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="audit_logs")

class SystemLog(Base):
    __tablename__ = "system_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    level = Column(String, nullable=False)  # INFO, WARNING, ERROR, CRITICAL
    module = Column(String, nullable=False) # app.routers.analysis, ml.threat_engine, etc.
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
