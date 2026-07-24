"""Generate route — POST /api/generate + SSE /api/generate/stream/{job_id}."""
import uuid
import json
import asyncio
import logging
import traceback
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from api.schemas import GenerateRequest, GenerateResponse
from db.session import get_db
from db.models import MeditationJob

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory progress store (Phase 1 — swap to Redis for production)
_progress: dict[str, dict] = {}


def update_progress(job_id: str, stage: str, pct: float, **kwargs):
    """Update the in-memory progress store for SSE streaming."""
    _progress[job_id] = {"stage": stage, "pct": pct, **kwargs}


def get_progress(job_id: str) -> dict:
    """Get progress for a job. Returns default if not found."""
    return _progress.get(job_id, {"stage": "pending", "pct": 0})


async def run_pipeline_task(job_id: str, request: GenerateRequest):
    """Background task that runs the full meditation pipeline."""
    from engine.nodes.n01_classifier import classifier_node
    from engine.nodes.n02_script_generator import script_generator_node
    from engine.nodes.n03_validator import validator_node, validator_router
    from engine.nodes.n04_tts_generator import tts_generator_node
    from engine.audio.composer import audio_composer_node
    from engine.nodes.n06_mastering import mastering_node
    from engine.nodes.n07_storage_notify import storage_notify_node

    category = request.duration_category or ("deep" if request.duration_mins and request.duration_mins > 5 else "quick")
    state = {
        "job_id": job_id,
        "stressor": request.stressor,
        "duration_category": category,
        "duration_mins": request.duration_mins or (7 if category == "deep" else 3),
        "voice_key": request.voice,
        "music_key": request.music,
        "fix_attempts": 0,
    }

    try:
        # Step 1: Classify
        update_progress(job_id, "classifying", 5)
        result = await classifier_node(state)
        state.update(result)

        # Step 2: Generate script (with retry loop)
        for attempt in range(3):
            update_progress(job_id, "generating_script", 15 + attempt * 5)
            result = await script_generator_node(state)
            state.update(result)

            # Step 3: Validate
            update_progress(job_id, "validating", 30)
            result = await validator_node(state)
            state.update(result)

            route = validator_router(state)
            if route == "tts_generator":
                break

        # Step 4: TTS Generation
        update_progress(job_id, "generating_voice", 40)
        result = await tts_generator_node(state)
        state.update(result)

        # Step 5: Audio Assembly
        update_progress(job_id, "composing", 70)
        result = await audio_composer_node(state)
        state.update(result)

        # Step 6: Mastering
        update_progress(job_id, "mastering", 85)
        result = await mastering_node(state)
        state.update(result)

        # Step 7: Storage
        update_progress(job_id, "storing", 95)
        result = await storage_notify_node(state)
        state.update(result)

        # Update DB
        from db.session import get_session_factory
        factory = get_session_factory()
        async with factory() as db:
            job = await db.get(MeditationJob, job_id)
            if job:
                job.status = "complete"
                job.meditation_type = state.get("meditation_type")
                job.title = state.get("timeline", {}).title if hasattr(state.get("timeline"), "title") else None
                job.storage_url = state.get("storage_url")
                job.actual_duration_s = state.get("actual_duration_s")
                job.completed_at = datetime.utcnow()
                
                # Save subtitles events and focus task metadata
                job.subtitles = {
                    "events": [
                        {"segment_id": s.segment_id, "text": s.text,
                         "start_ms": s.start_ms, "end_ms": s.end_ms}
                        for s in state.get("subtitles", [])
                    ],
                    "focus_task": state.get("raw_prose", {}).get("focus_task", "Focused Work")
                }
                
                await db.commit()

        update_progress(job_id, "complete", 100,
                       audio_url=state.get("storage_url"),
                       title=state.get("timeline").title if state.get("timeline") else None,
                       duration_s=state.get("actual_duration_s"),
                       focus_task=state.get("raw_prose", {}).get("focus_task", "Focused Work"))

    except Exception as e:
        logger.error(f"Pipeline failed for {job_id}: {e}")
        logger.error(traceback.format_exc())
        update_progress(job_id, "failed", 0, error=str(e))

        # Update DB
        try:
            from db.session import get_session_factory
            factory = get_session_factory()
            async with factory() as db:
                job = await db.get(MeditationJob, job_id)
                if job:
                    job.status = "failed"
                    job.error_message = str(e)[:500]
                    await db.commit()
        except Exception:
            pass


@router.post("/api/generate", response_model=GenerateResponse)
async def generate_meditation(
    request: GenerateRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Start a meditation generation job."""
    job_id = str(uuid.uuid4())

    job = MeditationJob(
        id=job_id,
        status="pending",
        stressor=request.stressor,
        duration_mins=request.duration_mins,
        voice=request.voice,
        music=request.music,
    )
    db.add(job)
    await db.commit()

    update_progress(job_id, "pending", 0)
    background_tasks.add_task(run_pipeline_task, job_id, request)

    return GenerateResponse(job_id=job_id)


@router.get("/api/generate/stream/{job_id}")
async def stream_progress(job_id: str):
    """SSE endpoint. Client connects here after POST /generate."""

    async def event_generator():
        while True:
            progress = get_progress(job_id)
            yield {"data": json.dumps(progress)}
            if progress.get("stage") in ("complete", "failed"):
                break
            await asyncio.sleep(0.5)

    return EventSourceResponse(event_generator())
