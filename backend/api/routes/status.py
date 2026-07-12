"""Status route — GET /api/status/{job_id}."""
import logging
import re
from urllib.parse import urlparse
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from api.schemas import JobStatus
from api.routes.generate import get_progress
from db.session import get_db
from db.models import MeditationJob
from storage.factory import get_storage_backend
from storage.s3_backend import S3StorageBackend

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/api/status-ping")
async def status_ping():
    """Simple ping route to verify automated deployments."""
    return {"ping": "pong", "deployment": "automatic-github-actions-v1"}



@router.get("/api/audio-url")
async def get_audio_url(key: str):
    """Generate a temporary presigned URL for a given S3 storage key."""
    # Simple validation to prevent arbitrary bucket access:
    # Allow alphanumeric, hyphens, underscores, slashes, and periods.
    if not re.match(r"^[a-zA-Z0-9_\-\.\/]+$", key):
        raise HTTPException(status_code=400, detail="Invalid storage key format")

    storage = get_storage_backend()
    if isinstance(storage, S3StorageBackend):
        try:
            url = await storage.get_url(key)
            return {"url": url}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate URL: {str(e)}")
    else:
        # If using local storage, return the local media URL
        url = f"/media/{key}"
        return {"url": url}


@router.get("/api/status/{job_id}", response_model=JobStatus)
async def get_job_status(job_id: str, db: AsyncSession = Depends(get_db)):
    """Get the current status of a meditation job."""
    # Check in-memory progress first (for running jobs)
    progress = get_progress(job_id)

    # Check database
    result = await db.execute(select(MeditationJob).where(MeditationJob.id == job_id))
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    # Extract focus task and subtitle events from job.subtitles JSON or progress store
    subtitles_data = job.subtitles
    focus_task_val = "Focused Work"
    subtitles_val = None
    if isinstance(subtitles_data, dict):
        focus_task_val = subtitles_data.get("focus_task", "Focused Work")
        subtitles_val = subtitles_data.get("events")
    elif isinstance(subtitles_data, list):
        subtitles_val = subtitles_data

    raw_audio_url = job.storage_url or progress.get("audio_url")
    playable_audio_url = raw_audio_url

    # If it is an S3 URL, generate a presigned URL dynamically so it remains private
    if raw_audio_url and ("s3.amazonaws.com" in raw_audio_url or ".s3." in raw_audio_url):
        try:
            parsed = urlparse(raw_audio_url)
            key = parsed.path.lstrip("/")
            storage = get_storage_backend()
            playable_audio_url = await storage.get_url(key)
        except Exception as e:
            logger.error(f"Error signing audio URL for status response: {e}")

    return JobStatus(
        job_id=job.id,
        status=job.status if progress.get("stage") != "complete" else "complete",
        progress_pct=progress.get("pct", 0),
        current_stage=progress.get("stage", job.status),
        audio_url=playable_audio_url,
        duration_s=job.actual_duration_s or progress.get("duration_s"),
        title=job.title or progress.get("title"),
        error=job.error_message or progress.get("error"),
        focus_task=progress.get("focus_task") or focus_task_val,
        subtitles=subtitles_val,
    )
