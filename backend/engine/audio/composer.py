"""Audio composer — assembles the final voice track from timeline events."""
import logging
from pathlib import Path
from typing import Dict

from pydub import AudioSegment

from engine.state import MeditationEngineState
from engine.models.events import SpeechEvent, PauseEvent, BreathEvent
from engine.models.job import SpeechSegment
from engine.audio.reconciler import calculate_budget
from engine.audio.breath import render_breath_cycle
from engine.profiles.breath_patterns import BREATH_PATTERNS

logger = logging.getLogger(__name__)


async def audio_composer_node(state: MeditationEngineState) -> dict:
    """Assemble the final voice track from timeline events.

    Steps:
    1. Resolve pause durations via budget reconciler
    2. Concatenate speech + silence + breath cycles
    3. Export as WAV
    """
    timeline = state["timeline"]
    segments = {s.segment_id: s for s in state["speech_segments"]}

    # Step 1: Resolve pause durations (duration control)
    timeline = calculate_budget(timeline, segments)

    # Step 2: Assemble audio with 1500ms (1.5s) leading silence (gives listener time to settle & wakes BT headphones)
    voice_track = AudioSegment.silent(duration=1500)

    for event in timeline.events:
        if isinstance(event, SpeechEvent):
            seg = segments.get(event.segment_id)
            if seg and Path(seg.path).exists():
                clip = AudioSegment.from_file(seg.path)
                voice_track += clip
            else:
                logger.warning(f"Missing audio for segment {event.segment_id}")

        elif isinstance(event, PauseEvent):
            if event.resolved_ms > 0:
                voice_track += AudioSegment.silent(duration=event.resolved_ms)

        elif isinstance(event, BreathEvent):
            pattern = BREATH_PATTERNS.get(event.pattern)
            if pattern:
                breath_audio = render_breath_cycle(
                    pattern=pattern,
                    cycles=event.cycles,
                    voice_key=state.get("voice_key", "gentle_female"),
                    breath_cues=state.get("breath_cues", {}),
                )
                voice_track += breath_audio

    # Add 2.0s trailing tail room + 500ms smooth fade out for natural completion
    voice_track = voice_track.fade_out(500) + AudioSegment.silent(duration=2000)

    # Step 3: Export assembled track
    job_id = state.get("job_id", "default")
    assembled_dir = Path(f"/tmp/meditation_{job_id}")
    assembled_dir.mkdir(parents=True, exist_ok=True)
    assembled_path = str(assembled_dir / "assembled.wav")

    voice_track.export(assembled_path, format="wav")
    actual_duration_s = len(voice_track) / 1000.0

    logger.info(
        f"Assembled: {actual_duration_s:.1f}s "
        f"(target: {timeline.duration_target_s}s, "
        f"delta: {abs(actual_duration_s - timeline.duration_target_s):.1f}s)"
    )

    return {
        "assembled_path": assembled_path,
        "actual_duration_s": actual_duration_s,
        "timeline": timeline,
        "current_stage": "composed",
        "progress_pct": 75.0,
    }
