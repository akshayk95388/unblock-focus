"""Timeline Builder: Converts raw prose dict into MeditationTimeline DSL."""

import json
from typing import List, Dict, Any

from engine.models.events import (
    SpeechEvent,
    PauseEvent,
    PauseType,
    BreathEvent,
    SectionMarkerEvent,
)
from engine.models.timeline import MeditationTimeline
from engine.profiles.pacing import PAUSE_WEIGHTS
from engine.profiles.breath_patterns import BREATH_PATTERNS


def _pause_s_to_type(seconds: int) -> str:
    """Map explicit pause seconds from LLM to pause-type enum string."""
    if seconds <= 2:
        return "short"
    elif seconds <= 4:
        return "transition"
    elif seconds <= 9:
        return "reflection"
    elif seconds <= 18:
        return "deep_reflection"
    else:
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
        for j, line in enumerate(lines):
            segment_id = f"seg_{speech_count:03d}"
            speech_count += 1

            events.append(SpeechEvent(
                segment_id=segment_id,
                text=line["text"],
            ))

            # Use explicit pause_s from LLM if present, else fallback
            if "pause_s" in line:
                pause_type_str = _pause_s_to_type(int(line["pause_s"]))
            else:
                pause_type_str = line.get("pause_after", "reflection")
                if pause_type_str not in PAUSE_WEIGHTS:
                    pause_type_str = "reflection"
                if j == len(lines) - 1:
                    pause_type_str = "section_end"

            events.append(PauseEvent(
                pause_type=PauseType(pause_type_str),
                weight=PAUSE_WEIGHTS[pause_type_str]["weight"],
                minimum_ms=PAUSE_WEIGHTS[pause_type_str]["minimum_ms"],
            ))

        # Add breath cycle if specified
        breath_cycle = section.get("breath_cycle")
        breath_reps = section.get("breath_repetitions", 0)
        if breath_cycle and breath_reps > 0 and breath_cycle in BREATH_PATTERNS:
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
