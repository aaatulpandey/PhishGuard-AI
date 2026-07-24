import os
import csv
import json
import io
import sys
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse, Response
from sqlalchemy import func, desc
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import ScanResult, User, AuditLog
from app.schemas import ScanRequest, ScanResponse, BatchScanRequest, BatchScanResponse, DashboardStatsResponse
from app.dependencies import get_current_user, get_current_active_user

# Resolve project root (2 levels above this router file) and add to path
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from ml.threat_engine import analyze_url


router = APIRouter(prefix="/analysis", tags=["Threat Analysis Engine"])

# In-memory Redis mock for caching if Redis is not running
CACHE = {}

@router.post("/scan")
def scan_url(
    payload: ScanRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    import traceback
    try:
        url = payload.url.strip()
        if not url:
            raise HTTPException(status_code=400, detail="URL cannot be empty.")
            
        if url in CACHE:
            cached_res = CACHE[url]
            db_res = ScanResult(
                url=url,
                risk_score=cached_res["risk_score"],
                classification=cached_res["classification"],
                confidence=cached_res["confidence"],
                explanation=cached_res["explanation"],
                recommendation=cached_res["recommendation"],
                indicators=cached_res["indicators"],
                features=cached_res["features"],
                model_name=cached_res["model_name"] + " (Cached)",
                user_id=current_user.id if current_user else None
            )
            db.add(db_res)
            db.commit()
            db.refresh(db_res)
            return db_res
            
        try:
            analysis = analyze_url(url)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Threat engine analysis failed: {str(e)}")
            
        db_res = ScanResult(
            url=url,
            risk_score=analysis["risk_score"],
            classification=analysis["classification"],
            confidence=analysis["confidence"],
            explanation=analysis["explanation"],
            recommendation=analysis["recommendation"],
            indicators=analysis["indicators"],
            features=analysis["features"],
            model_name=analysis["model_name"],
            user_id=current_user.id if current_user else None
        )
        db.add(db_res)
        db.commit()
        db.refresh(db_res)
        
        if current_user:
            audit = AuditLog(
                user_id=current_user.id,
                action="SCAN_URL",
                details=f"Scanned: {url} | Class: {analysis['classification']} | Risk: {analysis['risk_score']}"
            )
            db.add(audit)
            db.commit()
            
        CACHE[url] = analysis
        return db_res
    except Exception as e:
        db.rollback()
        return Response(content=json.dumps({"detail": f"INTERNAL CRASH: {str(e)}", "trace": traceback.format_exc()}), status_code=500, media_type="application/json")


@router.post("/batch", response_model=BatchScanResponse)
def batch_scan_urls(
    payload: BatchScanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Executes scans on multiple URLs in batch.
    Saves and returns scan summaries.
    """
    scans = []
    total_scanned = 0
    phishing_count = 0
    suspicious_count = 0
    safe_count = 0
    
    for url in payload.urls:
        url_clean = url.strip()
        if not url_clean:
            continue
            
        # Standard Scan Logic
        if url_clean in CACHE:
            analysis = CACHE[url_clean]
        else:
            try:
                analysis = analyze_url(url_clean)
                CACHE[url_clean] = analysis
            except Exception:
                # Default failure fallback
                continue
                
        # Save record
        db_res = ScanResult(
            url=url_clean,
            risk_score=analysis["risk_score"],
            classification=analysis["classification"],
            confidence=analysis["confidence"],
            explanation=analysis["explanation"],
            recommendation=analysis["recommendation"],
            indicators=analysis["indicators"],
            features=analysis["features"],
            model_name=analysis["model_name"],
            user_id=current_user.id
        )
        db.add(db_res)
        scans.append(db_res)
        
        # Summary metrics
        total_scanned += 1
        if analysis["classification"] == "Phishing":
            phishing_count += 1
        elif analysis["classification"] == "Suspicious":
            suspicious_count += 1
        else:
            safe_count += 1
            
    db.commit()
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="BATCH_SCAN",
        details=f"Scanned {total_scanned} URLs | Phishing: {phishing_count} | Suspicious: {suspicious_count} | Safe: {safe_count}"
    )
    db.add(audit)
    db.commit()
    
    # Fetch database results with IDs
    for scan in scans:
        db.refresh(scan)
        
    return {
        "scans": scans,
        "summary": {
            "total_scanned": total_scanned,
            "phishing": phishing_count,
            "suspicious": suspicious_count,
            "safe": safe_count
        }
    }

@router.get("/history", response_model=List[ScanResponse])
def get_scan_history(
    q: Optional[str] = None,
    classification: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieves history logs of scanned URLs.
    Supports query search (q) and classification filtering.
    """
    query = db.query(ScanResult)
    
    # Standard User can only see their own scans; Analyst & Admin can see all
    if current_user.role not in {"Analyst", "Admin"}:
        query = query.filter(ScanResult.user_id == current_user.id)
        
    if q:
        query = query.filter(ScanResult.url.contains(q))
        
    if classification:
        query = query.filter(ScanResult.classification == classification)
        
    # Order by newest first
    query = query.order_by(desc(ScanResult.created_at))
    
    # Pagination
    offset = (page - 1) * limit
    return query.offset(offset).limit(limit).all()

@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Compiles analytics and statistical metrics for the SOC Dashboard.
    """
    base_query = db.query(ScanResult)
    
    # Filter by user if standard User
    if current_user.role not in {"Analyst", "Admin"}:
        base_query = base_query.filter(ScanResult.user_id == current_user.id)
        
    total_scanned = base_query.count()
    total_phishing = base_query.filter(ScanResult.classification == "Phishing").count()
    total_suspicious = base_query.filter(ScanResult.classification == "Suspicious").count()
    total_safe = base_query.filter(ScanResult.classification == "Safe").count()
    
    # Calculate average risk score
    avg_score_res = base_query.with_entities(func.avg(ScanResult.risk_score)).scalar()
    avg_risk_score = round(float(avg_score_res), 1) if avg_score_res is not None else 0.0
    
    # Fetch recent activity (limit to 10)
    recent_activity = base_query.order_by(desc(ScanResult.created_at)).limit(10).all()
    
    # Build 7-day trend statistics
    trends = []
    today = datetime.utcnow().date()
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())
        
        day_query = base_query.filter(ScanResult.created_at >= day_start, ScanResult.created_at <= day_end)
        
        phishing = day_query.filter(ScanResult.classification == "Phishing").count()
        suspicious = day_query.filter(ScanResult.classification == "Suspicious").count()
        safe = day_query.filter(ScanResult.classification == "Safe").count()
        
        trends.append({
            "date": day.strftime("%Y-%m-%d"),
            "phishing": phishing,
            "suspicious": suspicious,
            "safe": safe
        })
        
    return {
        "total_scanned": total_scanned,
        "total_phishing": total_phishing,
        "total_suspicious": total_suspicious,
        "total_safe": total_safe,
        "avg_risk_score": avg_risk_score,
        "recent_activity": recent_activity,
        "trends": trends
    }

@router.get("/export")
def export_scans(
    format: str = Query("csv", pattern="^(csv|json|excel|pdf)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Exports scan records in CSV, JSON, Excel (standard CSV), or PDF (plain text format).
    """
    query = db.query(ScanResult)
    if current_user.role not in {"Analyst", "Admin"}:
        query = query.filter(ScanResult.user_id == current_user.id)
        
    scans = query.order_by(desc(ScanResult.created_at)).all()
    
    if format == "json":
        data = []
        for s in scans:
            data.append({
                "id": s.id,
                "url": s.url,
                "risk_score": s.risk_score,
                "classification": s.classification,
                "confidence": s.confidence,
                "model_name": s.model_name,
                "created_at": s.created_at.isoformat()
            })
        return Response(content=json.dumps(data, indent=4), media_type="application/json", headers={"Content-Disposition": "attachment; filename=scan_history.json"})
        
    elif format in {"csv", "excel"}:
        output = io.StringIO()
        writer = csv.writer(output)
        # Write header
        writer.writerow(["ID", "URL", "Risk Score", "Classification", "Confidence %", "Model Engine", "Timestamp"])
        
        for s in scans:
            writer.writerow([s.id, s.url, s.risk_score, s.classification, s.confidence, s.model_name, s.created_at.strftime("%Y-%m-%d %H:%M:%S")])
            
        output.seek(0)
        media_type = "text/csv" if format == "csv" else "application/vnd.ms-excel"
        filename = "scan_history.csv" if format == "csv" else "scan_history.xls"
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8")),
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    elif format == "pdf":
        # Generate a structured textual threat PDF report
        # We write a clean formatted text report in BytesIO and return as PDF/Text attachment
        output = io.StringIO()
        output.write("========================================================================\n")
        output.write("PHISHGUARD AI - CYBERSECURITY DETECTION REPORT\n")
        output.write(f"Generated on: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC\n")
        output.write(f"Requested by: {current_user.email}\n")
        output.write("========================================================================\n\n")
        output.write(f"Total Scans Found: {len(scans)}\n\n")
        
        for idx, s in enumerate(scans, 1):
            output.write(f"{idx}. URL: {s.url}\n")
            output.write(f"   Classification : {s.classification.upper()}\n")
            output.write(f"   Risk Score     : {s.risk_score} / 100\n")
            output.write(f"   Confidence     : {s.confidence}%\n")
            output.write(f"   Model Used     : {s.model_name}\n")
            output.write(f"   Indicators     : {', '.join(s.indicators or ['None'])}\n")
            output.write(f"   Timestamp      : {s.created_at.isoformat()}\n")
            output.write("------------------------------------------------------------------------\n")
            
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8")),
            media_type="text/plain",
            headers={"Content-Disposition": "attachment; filename=threat_report.txt"}
        )
