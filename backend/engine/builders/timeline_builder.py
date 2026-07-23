"""Timeline Builder: Converts raw prose dict into MeditationTimeline DSL."""

import json
import logging
from typing import List, Dict, Any

from engine.models.events import (
    SpeechEvent,
    PauseEvent,
    PauseType,
    BreathEvent,
    SectionMarkerEvent,
)
from engine.models.timeline import MeditationTimeline
from engine.profiles.pacing import PAUSE_WEIGHTS, DEFAULT_PAUSE_TYPE
from engine.profiles.breath_patterns import BREATH_PATTERNS

logger = logging.getLogger(__name__)

# Build sorted threshold list from PAUSE_WEIGHTS config.
# Each entry is (max_prompt_s, pause_type_key), sorted ascending.
# This drives _pause_s_to_type dynamically — no hardcoded thresholds.
_PAUSE_THRESHOLDS = sorted(
    [(cfg["max_prompt_s"], key) for key, cfg in PAUSE_WEIGHTS.items()],
    key=lambda t: t[0],
)


def _pause_s_to_type(seconds: int) -> str:
    """Map explicit pause seconds from LLM to pause-type string.

    Thresholds are driven by PAUSE_WEIGHTS[...]["max_prompt_s"]
    so they stay in sync with the centralized pacing config.
    """
    for max_s, pause_key in _PAUSE_THRESHOLDS:
        if seconds <= max_s:
            return pause_key
    # Beyond all thresholds → section_end
    return "section_end"


def format_sections_for_prompt(section_plan: list) -> str:
    """Format section plan into readable prompt text."""
    lines = []
    for s in section_plan:
        breath_info = ""
        if s.get("breath_pattern"):
            breath_info = f" (breath exercise: {s['breath_pattern']}, {s['breath_cycles']} cycles)"
        lines.append(f"  - {s['name']}: ~{s['duration_s']:.0f}s{breath_info}")
    return "\n".join(lines)


def parse_llm_json(response_text: str) -> dict:
    """Parse LLM response as JSON, handling markdown fences."""
    text = response_text.strip()

    # Strip markdown code fences if present
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines)

    return json.loads(text)


def build_timeline_from_prose(prose: dict, state: Dict[str, Any]) -> MeditationTimeline:
    """Deterministically convert LLM prose JSON into a MeditationTimeline DSL."""
    events = []
    speech_count = 0

    for i, section in enumerate(prose["sections"]):
        events.append(SectionMarkerEvent(
            section_name=section["name"],
            section_index=i,
        ))

        lines = section.get("lines", [])
        # Add breath cycle if specified
        breath_cycle = section.get("breath_cycle")
        breath_reps = section.get("breath_repetitions", 0)
        has_breath = bool(breath_cycle and breath_reps > 0 and breath_cycle in BREATH_PATTERNS)

        for j, line in enumerate(lines):
            segment_id = f"seg_{speech_count:03d}"
            speech_count += 1

            events.append(SpeechEvent(
                segment_id=segment_id,
                text=line["text"],
            ))

            # Determine pause type from LLM output
            raw_pause = line.get("pause_s")
            if raw_pause is not None:
                try:
                    pause_type_str = _pause_s_to_type(int(float(raw_pause)))
                except (ValueError, TypeError):
                    logger.warning(f"Invalid pause_s value '{raw_pause}', using default")
                    pause_type_str = DEFAULT_PAUSE_TYPE
            else:
                pause_type_str = line.get("pause_after", DEFAULT_PAUSE_TYPE)
                if pause_type_str not in PAUSE_WEIGHTS:
                    pause_type_str = DEFAULT_PAUSE_TYPE

            # Apply reflection pause (5s) before breath cycles, section_end on standard section ends
            if j == len(lines) - 1:
                pause_type_str = "reflection" if has_breath else "section_end"

            events.append(PauseEvent(
                pause_type=PauseType(pause_type_str),
                weight=PAUSE_WEIGHTS[pause_type_str]["weight"],
                minimum_ms=PAUSE_WEIGHTS[pause_type_str]["minimum_ms"],
            ))

        if has_breath:
            pattern = BREATH_PATTERNS[breath_cycle]
            cycle_s = pattern.cycle_duration_s * breath_reps
            events.append(BreathEvent(
                pattern=breath_cycle,
                cycles=breath_reps,
                duration_s=cycle_s,
            ))

    return MeditationTimeline(
        job_id=state.get("job_id", ""),
        meditation_type=state.get("meditation_type", "general"),
        title=prose.get("title", "Guided Reset"),
        duration_target_s=state.get("duration_mins", 3) * 60,
        pacing_profile=state.get("pacing_profile", ""),
        events=events,
    )
