"""Duration budget reconciler — the core duration control algorithm.

This is the most important module in the engine. It ensures the final
audio has natural, high-quality pacing. When the script fits within the
target duration, pauses are distributed proportionally. When the script
is too wordy, natural minimum pauses are preserved (the session may run
slightly over target rather than crushing pauses to micro-gaps).
"""
import logging
from typing import Dict, Optional

from engine.models.events import SpeechEvent, PauseEvent, BreathEvent, PauseType
from engine.models.timeline import MeditationTimeline
from engine.models.job import SpeechSegment
from engine.profiles.pacing import (
    PAUSE_WEIGHTS,
    FALLBACK_MAX_PAUSE_MS,
    SHORT_SCRIPT_PAUSE_THRESHOLD,
)
from engine.profiles.breath_patterns import BREATH_PATTERNS

logger = logging.getLogger(__name__)


def insert_extra_breath_cycle(
    timeline: MeditationTimeline,
    target_s: float,
    speech_total_s: float,
    breath_total_s: float,
) -> MeditationTimeline:
    """Insert an extra breath cycle when the script is too short.

    Inserts after the last existing BreathEvent so the extra cycle
    follows the breathing phase naturally. Falls back to after the
    largest section_end pause if no breath events exist.
    """
    # Use calm_46 as the default insertion pattern
    pattern = BREATH_PATTERNS["calm_46"]
    extra_cycles = 3
    extra_duration = pattern.cycle_duration_s * extra_cycles

    # Preferred: insert after the last existing BreathEvent
    insert_idx = None
    for i, event in enumerate(timeline.events):
        if isinstance(event, BreathEvent):
            insert_idx = i

    # Fallback: insert after the largest-weight pause (section boundary)
    if insert_idx is None:
        best_weight = 0
        for i, event in enumerate(timeline.events):
            if isinstance(event, PauseEvent) and event.weight > best_weight:
                best_weight = event.weight
                insert_idx = i

    if insert_idx is not None:
        new_breath = BreathEvent(
            pattern="calm_46",
            cycles=extra_cycles,
            duration_s=extra_duration,
        )
        timeline.events.insert(insert_idx + 1, new_breath)
        logger.info(
            f"Inserted extra breath cycle ({extra_duration:.0f}s) "
            f"after event index {insert_idx} to fill short script"
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
    3. Validate: if budget too small → use natural minimums (quality-first);
       if too large → insert breath
    4. Distribute budget proportionally by pause weight
    5. Fix rounding errors within safe bounds
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
        # Quality-first: use each pause's natural minimum duration.
        # The session will slightly exceed the target, but audio quality
        # is preserved — rushed, cramped pauses damage the user experience
        # far more than a session running 10-20 seconds long.
        logger.info(
            f"Script is wordy: pause_budget={pause_budget_s:.1f}s < "
            f"minimum_pauses={minimum_pause_total_s:.1f}s. "
            f"Using natural minimum pauses to preserve audio quality."
        )
        for pe in pause_events:
            pe.resolved_ms = pe.minimum_ms

        actual_pause_s = sum(e.resolved_ms / 1000 for e in pause_events)
        timeline.speech_total_s = speech_total_s
        timeline.breath_total_s = breath_total_s
        timeline.pause_budget_s = actual_pause_s
        timeline.actual_duration_s = speech_total_s + breath_total_s + actual_pause_s
        return timeline

    if pause_budget_s > target_s * SHORT_SCRIPT_PAUSE_THRESHOLD:
        # Script ran too short. Insert a breath cycle at the largest section.
        logger.warning(
            f"Script too short: pause_budget={pause_budget_s:.1f}s > "
            f"{SHORT_SCRIPT_PAUSE_THRESHOLD:.0%} of target ({target_s * SHORT_SCRIPT_PAUSE_THRESHOLD:.1f}s). "
            f"Inserting breath cycle."
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

    # Step 3: Distribute budget across pause events.
    # Uses iterative redistribution: when maximum_ms caps prevent a pause
    # from absorbing its full allocation, the residual is redistributed
    # across the remaining uncapped pauses.
    remaining_budget_ms = int(pause_budget_s * 1000)
    uncapped = set(range(len(pause_events)))

    # Initialize all pauses to their minimum
    for pe in pause_events:
        pe.resolved_ms = pe.minimum_ms
    remaining_budget_ms -= sum(pe.minimum_ms for pe in pause_events)

    # Iteratively distribute remaining budget by weight
    for _ in range(len(pause_events)):  # max iterations = number of pauses
        if remaining_budget_ms <= 0 or not uncapped:
            break

        uncapped_weight = sum(pause_events[i].weight for i in uncapped)
        if uncapped_weight == 0:
            break

        newly_capped = set()
        distributed_ms = 0

        for i in list(uncapped):
            pe = pause_events[i]
            max_ms = PAUSE_WEIGHTS.get(pe.pause_type.value, {}).get(
                "maximum_ms", FALLBACK_MAX_PAUSE_MS
            )
            # Allocate additional time proportionally
            extra_ms = int((pe.weight / uncapped_weight) * remaining_budget_ms)
            desired_ms = pe.resolved_ms + extra_ms

            if desired_ms >= max_ms:
                # This pause hit its cap — mark it and account for the excess
                distributed_ms += max_ms - pe.resolved_ms
                pe.resolved_ms = max_ms
                newly_capped.add(i)
            else:
                distributed_ms += extra_ms
                pe.resolved_ms = desired_ms

        remaining_budget_ms -= distributed_ms
        uncapped -= newly_capped

        # If no pauses were newly capped, distribution is stable
        if not newly_capped:
            break

    # Step 3b: If significant budget remains after all pauses hit their caps,
    # insert extra breath cycles to fill the gap. This happens when the script
    # has few segments and the total maximum_ms capacity can't absorb the budget.
    actual_pause_s = sum(e.resolved_ms / 1000 for e in pause_events)
    unallocated_s = pause_budget_s - actual_pause_s

    if unallocated_s > 10.0 and not uncapped:
        logger.info(
            f"All pauses at maximum caps, {unallocated_s:.1f}s unallocated. "
            f"Inserting breath cycle to fill gap."
        )
        timeline = insert_extra_breath_cycle(
            timeline, target_s, speech_total_s, breath_total_s
        )
        # Recalculate breath total after insertion
        breath_total_s = sum(
            e.duration_s for e in timeline.events if isinstance(e, BreathEvent)
        )

    # Step 4: Reconcile rounding errors across multiple pauses
    actual_pause_s = sum(e.resolved_ms / 1000 for e in pause_events)
    rounding_error_ms = int((pause_budget_s - actual_pause_s) * 1000)

    if rounding_error_ms > 0:
        # Spread positive rounding error across uncapped pauses
        for i in uncapped:
            if rounding_error_ms <= 0:
                break
            pe = pause_events[i]
            max_ms = PAUSE_WEIGHTS.get(pe.pause_type.value, {}).get(
                "maximum_ms", FALLBACK_MAX_PAUSE_MS
            )
            add_ms = min(rounding_error_ms, max_ms - pe.resolved_ms)
            pe.resolved_ms += add_ms
            rounding_error_ms -= add_ms
    elif rounding_error_ms < 0:
        # Absorb negative rounding error from the largest pause
        largest_pause = max(pause_events, key=lambda e: e.weight)
        largest_pause.resolved_ms = max(
            largest_pause.resolved_ms + rounding_error_ms,
            largest_pause.minimum_ms,
        )

    if rounding_error_ms != 0:
        logger.debug(f"Rounding residual: {rounding_error_ms}ms (within tolerance)")

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
