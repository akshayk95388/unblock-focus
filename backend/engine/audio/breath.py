"""Breath cycle audio renderer."""
import logging
from pathlib import Path
from typing import Dict

from pydub import AudioSegment

from engine.profiles.breath_patterns import BREATH_PATTERNS, BreathPattern

logger = logging.getLogger(__name__)


def render_breath_cycle(
    pattern: BreathPattern,
    cycles: int,
    voice_key: str,
    breath_cues: Dict[str, Dict[str, str]],
) -> AudioSegment:
    """Render a breath cycle sequence as an AudioSegment.

    Each phase: TTS cue audio + silence padding to match exact phase duration.
    The total duration is exact: pattern.cycle_duration_s × cycles.
    """
    one_cycle = AudioSegment.empty()

    cues = breath_cues.get(pattern.id, {})

    for phase in pattern.phases:
        phase_duration_ms = int(phase.duration_s * 1000)

        # Load TTS cue if available
        cue_path = cues.get(phase.phase)
        if cue_path and Path(cue_path).exists():
            cue_audio = AudioSegment.from_file(cue_path)
            cue_duration_ms = len(cue_audio)

            # Pad with silence to fill the full phase duration
            if cue_duration_ms < phase_duration_ms:
                silence_ms = phase_duration_ms - cue_duration_ms
                one_cycle += cue_audio + AudioSegment.silent(duration=silence_ms)
            else:
                # Cue is longer than phase — truncate (shouldn't happen with short cues)
                one_cycle += cue_audio[:phase_duration_ms]
        else:
            # No cue audio — fill with silence
            one_cycle += AudioSegment.silent(duration=phase_duration_ms)

    # Repeat for requested cycles
    full = AudioSegment.empty()
    for _ in range(cycles):
        full += one_cycle

    expected_ms = int(pattern.cycle_duration_s * cycles * 1000)
    actual_ms = len(full)

    # Trim or pad to exact expected length
    if actual_ms > expected_ms:
        full = full[:expected_ms]
    elif actual_ms < expected_ms:
        full += AudioSegment.silent(duration=expected_ms - actual_ms)

    logger.debug(
        f"Breath cycle '{pattern.id}' × {cycles} = {len(full)}ms "
        f"(expected {expected_ms}ms)"
    )

    return full
