from contextlib import asynccontextmanager
import time
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from collections import defaultdict
from app.config import settings
from app.routers import auth, analysis, users

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database tables and seed the admin account on startup."""
    import os
    if not os.environ.get("TESTING"):
        from app.database import engine, Base, SessionLocal
        from app.seed import seed_admin
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            seed_admin(db)
        finally:
            db.close()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Intelligent Phishing URL Detection & Threat Intelligence Platform APIs",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory rate limiter (per-IP, sliding 60-second window)
rate_limit_records: dict = defaultdict(list)

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if request.url.path.startswith("/api/v1"):
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        rate_limit_records[client_ip] = [t for t in rate_limit_records[client_ip] if now - t < 60]
        if len(rate_limit_records[client_ip]) >= settings.RATE_LIMIT_PER_MINUTE:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please wait before retrying."
            )
        rate_limit_records[client_ip].append(now)
    return await call_next(request)

# Register API routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(analysis.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "PhishGuard AI Platform API",
        "version": "1.0.0",
        "docs": "/docs"
    }
