"""History route — GET /api/history."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from api.schemas import HistoryItem, HistoryResponse
from db.session import get_db
from db.models import MeditationJob

router = APIRouter()


@router.get("/api/history", response_model=HistoryResponse)
async def get_history(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Get meditation generation history."""
    # Count total
    count_result = await db.execute(select(func.count(MeditationJob.id)))
    total = count_result.scalar()

    # Fetch items
    result = await db.execute(
        select(MeditationJob)
        .order_by(desc(MeditationJob.created_at))
        .limit(limit)
        .offset(offset)
    )
    jobs = result.scalars().all()

    items = [
        HistoryItem(
            job_id=job.id,
            stressor=job.stressor or "",
            duration_mins=job.duration_mins or 0,
            meditation_type=job.meditation_type,
            title=job.title,
            status=job.status or "unknown",
            audio_url=job.storage_url,
            actual_duration_s=job.actual_duration_s,
            created_at=job.created_at.isoformat() if job.created_at else "",
        )
        for job in jobs
    ]

    return HistoryResponse(items=items, total=total)
