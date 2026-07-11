"""Duration budget reconciler — the core duration control algorithm.

This is the most important module in the engine. It ensures the final
audio is within ±15 seconds of the user's requested duration.
"""
import logging
from typing import Dict, Optional

from engine.models.events import SpeechEvent, PauseEvent, BreathEvent, PauseType
from engine.models.timeline import MeditationTimeline
from engine.models.job import SpeechSegment
from engine.profiles.pacing import PAUSE_WEIGHTS
from engine.profiles.breath_patterns import BREATH_PATTERNS

logger = logging.getLogger(__name__)


def insert_extra_breath_cycle(
    timeline: MeditationTimeline,
    target_s: float,
    speech_total_s: float,
    breath_total_s: float,
) -> MeditationTimeline:
    """Insert an extra breath cycle when the script is too short.

    Finds the largest gap between speech events and inserts a calm_46
    breath cycle (3 cycles) to consume known time.
    """
    # Use calm_46 as the default insertion pattern
    pattern = BREATH_PATTERNS["calm_46"]
    extra_cycles = 3
    extra_duration = pattern.cycle_duration_s * extra_cycles

    # Find the best insertion point: after the largest pause weight
    best_idx = None
    best_weight = 0

    for i, event in enumerate(timeline.events):
        if isinstance(event, PauseEvent):
            if event.weight > best_weight:
                best_weight = event.weight
                best_idx = i

    if best_idx is not None:
        # Insert breath event after the chosen pause
        new_breath = BreathEvent(
            pattern="calm_46",
            cycles=extra_cycles,
            duration_s=extra_duration,
        )
        timeline.events.insert(best_idx + 1, new_breath)
        logger.info(
            f"Inserted extra breath cycle ({extra_duration:.0f}s) "
            f"to fill short script"
        )

    return timeline


def calculate_budget(
    timeline: MeditationTimeline,
    speech_segments: Dict[str, SpeechSegment],
) -> MeditationTimeline:
    """Core duration algorithm. Resolves all pause durations from budget.

    Returns timeline with every PauseEvent.resolved_ms set.

    Algorithm:
    1. Sum known durations (speech + breath)
    2. Compute pause_budget = target - speech - breath
    3. Validate: if budget too small → use minimums; if too large → insert breath
    4. Distribute budget proportionally by pause weight
    5. Fix rounding errors
    """
    target_s = timeline.duration_target_s

    # Step 1: Sum known durations
    speech_total_s = sum(
        speech_segments[e.segment_id].duration_s
        for e in timeline.events if isinstance(e, SpeechEvent)
    )
    breath_total_s = sum(
        e.duration_s for e in timeline.events if isinstance(e, BreathEvent)
    )
    pause_budget_s = target_s - speech_total_s - breath_total_s

    logger.info(
        f"Budget: target={target_s}s speech={speech_total_s:.1f}s "
        f"breath={breath_total_s:.1f}s pause_budget={pause_budget_s:.1f}s"
    )

    # Step 2: Validate budget
    pause_events = [e for e in timeline.events if isinstance(e, PauseEvent)]

    if not pause_events:
        logger.warning("No pause events in timeline")
        timeline.speech_total_s = speech_total_s
        timeline.breath_total_s = breath_total_s
        timeline.pause_budget_s = 0
        timeline.actual_duration_s = speech_total_s + breath_total_s
        return timeline

    minimum_pause_total_s = sum(e.minimum_ms / 1000 for e in pause_events)

    if pause_budget_s < minimum_pause_total_s:
        # Script ran too long. Scale pauses proportionally to fit budget.
        logger.warning(
            f"Script too long: pause_budget={pause_budget_s:.1f}s < "
            f"minimum_pauses={minimum_pause_total_s:.1f}s. Scaling down pauses."
        )

        if pause_budget_s <= 0:
            # Extreme case: no room for pauses at all. Use tiny gaps.
            for pe in pause_events:
                pe.resolved_ms = 200  # 200ms micro-pause
            actual_pause_s = len(pause_events) * 0.2
        else:
            # Scale all pauses proportionally to fit within budget
            scale = pause_budget_s / minimum_pause_total_s
            for pe in pause_events:
                pe.resolved_ms = max(int(pe.minimum_ms * scale), 200)
            actual_pause_s = sum(e.resolved_ms / 1000 for e in pause_events)

            # Reconcile any rounding difference
            rounding_error_ms = int((pause_budget_s - actual_pause_s) * 1000)
            if abs(rounding_error_ms) > 0 and pause_events:
                largest = max(pause_events, key=lambda e: e.resolved_ms)
                largest.resolved_ms = max(largest.resolved_ms + rounding_error_ms, 200)
            actual_pause_s = sum(e.resolved_ms / 1000 for e in pause_events)

        timeline.speech_total_s = speech_total_s
        timeline.breath_total_s = breath_total_s
        timeline.pause_budget_s = actual_pause_s
        timeline.actual_duration_s = speech_total_s + breath_total_s + actual_pause_s
        return timeline

    if pause_budget_s > target_s * 0.70:
        # Script ran too short. Insert a breath cycle at the largest section.
        logger.warning(
            f"Script too short: pause_budget={pause_budget_s:.1f}s > "
            f"70% of target ({target_s * 0.70:.1f}s). Inserting breath cycle."
        )
        timeline = insert_extra_breath_cycle(
            timeline, target_s, speech_total_s, breath_total_s
        )
        # Recalculate after insertion
        breath_total_s = sum(
            e.duration_s for e in timeline.events if isinstance(e, BreathEvent)
        )
        pause_budget_s = target_s - speech_total_s - breath_total_s
        pause_events = [e for e in timeline.events if isinstance(e, PauseEvent)]

    # Step 3: Distribute budget across pause events
    total_weight = sum(e.weight for e in pause_events)

    for pe in pause_events:
        allocated_s = (pe.weight / total_weight) * pause_budget_s
        pe.resolved_ms = max(int(allocated_s * 1000), pe.minimum_ms)

    # Step 4: Reconcile rounding errors
    actual_pause_s = sum(e.resolved_ms / 1000 for e in pause_events)
    rounding_error_ms = int((pause_budget_s - actual_pause_s) * 1000)

    if abs(rounding_error_ms) > 0:
        # Add rounding error to the largest pause event
        largest_pause = max(pause_events, key=lambda e: e.weight)
        largest_pause.resolved_ms += rounding_error_ms
        logger.debug(
            f"Rounding correction: {rounding_error_ms}ms added to "
            f"{largest_pause.pause_type.value}"
        )

    # Set budget fields
    timeline.speech_total_s = speech_total_s
    timeline.breath_total_s = breath_total_s
    timeline.pause_budget_s = pause_budget_s
    timeline.actual_duration_s = (
        speech_total_s + breath_total_s +
        sum(e.resolved_ms / 1000 for e in pause_events)
    )

    logger.info(
        f"Reconciled: actual={timeline.actual_duration_s:.1f}s "
        f"(delta={abs(timeline.actual_duration_s - target_s):.1f}s)"
    )

    return timeline
