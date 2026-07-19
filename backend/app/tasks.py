import os
import sys
from celery import Celery

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.config import settings

# Initialize Celery
celery_app = Celery(
    "phishguard_tasks",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

@celery_app.task(name="tasks.async_scan_url")
def async_scan_url(url: str):
    """
    Background worker task to scan a single URL and save/cache results.
    Useful for scheduling scans or executing large scale background workloads.
    """
    try:
        from ml.threat_engine import analyze_url
    except ImportError:
        from ml.threat_engine import analyze_url
        
    print(f"Executing background scan for URL: {url}")
    result = analyze_url(url)
    return result
