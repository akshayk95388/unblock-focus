"""Node 07 — Storage + Notify: Store final audio and update database."""
import logging
from datetime import datetime
from pathlib import Path
from typing import List

from engine.state import MeditationEngineState
from engine.models.events import SpeechEvent
from engine.models.job import SubtitleEntry
from storage.factory import get_storage_backend

logger = logging.getLogger(__name__)


def build_subtitles(state: MeditationEngineState) -> List[SubtitleEntry]:
    """Build subtitle entries from timeline speech events and their durations."""
    timeline = state["timeline"]
    segments = {s.segment_id: s for s in state["speech_segments"]}
    subtitles = []
    current_ms = 0

    for event in timeline.events:
        if isinstance(event, SpeechEvent):
            seg = segments.get(event.segment_id)
            if seg:
                duration_ms = int(seg.duration_s * 1000)
                subtitles.append(SubtitleEntry(
                    segment_id=event.segment_id,
                    text=event.text,
                    start_ms=current_ms,
                    end_ms=current_ms + duration_ms,
                ))
                current_ms += duration_ms
        elif hasattr(event, "resolved_ms") and event.resolved_ms > 0:
            current_ms += event.resolved_ms
        elif hasattr(event, "duration_s") and event.duration_s > 0:
            current_ms += int(event.duration_s * 1000)

    return subtitles


async def storage_notify_node(state: MeditationEngineState) -> dict:
    """Store the mastered audio and build subtitles."""
    job_id = state.get("job_id", "default")
    mastered_path = state["mastered_path"]

    # Store the file
    storage = get_storage_backend()
    storage_key = f"{job_id}/meditation.mp3"
    storage_url = await storage.store(mastered_path, storage_key)

    # Build subtitles
    subtitles = build_subtitles(state)

    logger.info(f"Stored: {storage_url} ({len(subtitles)} subtitles)")

    return {
        "storage_url": storage_url,
        "subtitles": subtitles,
        "status": "complete",
        "current_stage": "complete",
        "progress_pct": 100.0,
    }
