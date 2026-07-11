"""Status route — GET /api/status/{job_id}."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from api.schemas import JobStatus
from api.routes.generate import get_progress
from db.session import get_db
from db.models import MeditationJob

router = APIRouter()


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

    return JobStatus(
        job_id=job.id,
        status=job.status if progress.get("stage") != "complete" else "complete",
        progress_pct=progress.get("pct", 0),
        current_stage=progress.get("stage", job.status),
        audio_url=job.storage_url or progress.get("audio_url"),
        duration_s=job.actual_duration_s or progress.get("duration_s"),
        title=job.title or progress.get("title"),
        error=job.error_message or progress.get("error"),
        focus_task=progress.get("focus_task") or focus_task_val,
        subtitles=subtitles_val,
    )
