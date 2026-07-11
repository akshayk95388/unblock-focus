"""Node 03 — Validator: Validates a MeditationTimeline for quality issues."""
import re
import logging
from typing import List

from engine.state import MeditationEngineState
from engine.models.events import SpeechEvent, PauseEvent
from engine.models.timeline import MeditationTimeline

logger = logging.getLogger(__name__)


def validate_timeline(timeline: MeditationTimeline) -> List[str]:
    """Check the timeline for structural and content issues.

    Returns a list of issue strings. Empty list means the timeline is valid.
    """
    issues = []
    speech_events = [e for e in timeline.events if isinstance(e, SpeechEvent)]
    consecutive_speech = 0

    for i, event in enumerate(timeline.events):
        if not isinstance(event, SpeechEvent):
            consecutive_speech = 0
            continue
        consecutive_speech += 1

        words = event.text.split()

        # Check sentence length
        if len(words) > 20:
            issues.append(f"Line {i}: {len(words)} words (max 20): '{event.text[:50]}'")

        # Check for forbidden punctuation
        if re.search(r'[:;]', event.text):
            issues.append(f"Line {i}: colon/semicolon in text")

        # Check for digits
        if re.search(r'\b\d+\b', event.text):
            issues.append(f"Line {i}: contains digits")

        # Check for em dashes
        if "—" in event.text or "--" in event.text:
            issues.append(f"Line {i}: contains em dash or double dash")

        # Check consecutive speech without pause
        if consecutive_speech >= 4:
            issues.append(f"Line {i}: 4 speech events with no pause")

    # Check for repetition
    texts = [e.text.lower().strip() for e in speech_events]
    seen = set()
    for text in texts:
        if text in seen:
            issues.append(f"Repeated line: '{text[:50]}'")
        seen.add(text)

    # Check minimum line count
    if len(speech_events) < 8:
        issues.append(f"Too few lines: {len(speech_events)} (minimum 8)")

    return issues


async def validator_node(state: MeditationEngineState) -> dict:
    """Validate the timeline and record issues."""
    timeline = state["timeline"]
    issues = validate_timeline(timeline)

    fix_attempts = state.get("fix_attempts", 0)
    if issues:
        fix_attempts += 1
        logger.warning(f"Validation issues (attempt {fix_attempts}): {issues}")

    return {
        "validation_issues": issues,
        "fix_attempts": fix_attempts,
        "current_stage": "validating",
        "progress_pct": 35.0,
    }


def validator_router(state: MeditationEngineState) -> str:
    """Route: retry script generation if there are fixable issues, else continue."""
    issues = state.get("validation_issues", [])
    fix_attempts = state.get("fix_attempts", 0)

    if issues and fix_attempts < 2:
        logger.info(f"Routing back to script_generator (attempt {fix_attempts})")
        return "script_generator"

    if issues:
        logger.warning(f"Proceeding despite {len(issues)} issues after {fix_attempts} attempts")

    return "tts_generator"
