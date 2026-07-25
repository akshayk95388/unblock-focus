"""Node 07 — Storage + Notify: Store final audio and update database."""
import logging
from datetime import datetime
from pathlib import Path
from typing import List

from engine.state import MeditationEngineState
from engine.models.events import SpeechEvent, BreathEvent
from engine.models.job import SubtitleEntry
from engine.profiles.breath_patterns import BREATH_PATTERNS
from storage.factory import get_storage_backend

logger = logging.getLogger(__name__)


def _build_breath_cue_words(cue_text: str, start_ms: int, phase_duration_ms: int) -> List[dict]:
    """Generate precise word-level timestamps for a breath cue phrase."""
    raw_words = cue_text.strip().split()
    if not raw_words:
        return []

    spoken_duration_ms = min(phase_duration_ms, 1200)
    total_chars = sum(len(w) for w in raw_words)
    if total_chars == 0:
        return []

    words = []
    curr = start_ms
    for w in raw_words:
        w_dur = max(50, int((len(w) / total_chars) * spoken_duration_ms))
        words.append({
            "word": w,
            "start_ms": curr,
            "end_ms": curr + w_dur,
        })
        curr += w_dur

    return words


def build_subtitles(state: MeditationEngineState) -> List[SubtitleEntry]:
    """Build subtitle entries from timeline speech events and their durations."""
    timeline = state["timeline"]
    segments = {s.segment_id: s for s in state["speech_segments"]}
    subtitles = []
    # Start at 1500ms to align with the composer's leading silence
    current_ms = 1500

    for event in timeline.events:
        if isinstance(event, SpeechEvent):
            seg = segments.get(event.segment_id)
            if seg:
                duration_ms = int(seg.duration_s * 1000)
                words = None
                if getattr(seg, "words", None):
                    words = [
                        {
                            "word": w["word"],
                            "start_ms": current_ms + w["start_ms"],
                            "end_ms": current_ms + w["end_ms"],
                        }
                        for w in seg.words
                    ]

                subtitles.append(SubtitleEntry(
                    segment_id=event.segment_id,
                    text=event.text,
                    start_ms=current_ms,
                    end_ms=current_ms + duration_ms,
                    words=words,
                ))
                current_ms += duration_ms
        elif isinstance(event, BreathEvent):
            pattern = BREATH_PATTERNS.get(event.pattern)
            if pattern:
                for cycle in range(event.cycles):
                    for phase in pattern.phases:
                        duration_ms = int(phase.duration_s * 1000)
                        breath_words = _build_breath_cue_words(phase.cue_text, current_ms, duration_ms)
                        subtitles.append(SubtitleEntry(
                            segment_id=f"breath_{event.pattern}_{cycle}_{phase.phase}",
                            text=phase.cue_text,
                            start_ms=current_ms,
                            end_ms=current_ms + duration_ms,
                            words=breath_words,
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
