"""Phase 4 Tests — Audio Assembly + Duration Control

These are the most important tests in the project.
They validate the budget reconciler and audio composer.
"""
import pytest
from typing import Dict
from pydub import AudioSegment
from pydub.generators import Sine

from engine.models.events import (
    SpeechEvent,
    PauseEvent,
    PauseType,
    BreathEvent,
    SectionMarkerEvent,
)
from engine.models.timeline import MeditationTimeline
from engine.models.job import SpeechSegment
from engine.audio.reconciler import calculate_budget, insert_extra_breath_cycle
from engine.profiles.pacing import PAUSE_WEIGHTS
from engine.profiles.breath_patterns import BREATH_PATTERNS


# ── Test helpers ────────────────────────────────────────────────────


def make_test_timeline_with_known_speech(
    speech_s: float,
    target_s: float,
    num_segments: int = 10,
) -> MeditationTimeline:
    """Create a timeline with known speech durations for reconciler testing."""
    events = []
    events.append(SectionMarkerEvent(section_name="test", section_index=0))

    for i in range(num_segments):
        events.append(SpeechEvent(segment_id=f"seg_{i:03d}", text=f"Line {i}."))
        # Alternate pause types for weight variety
        if i == num_segments - 1:
            pt = "section_end"
        elif i % 5 == 0:
            pt = "deep_reflection"
        elif i % 3 == 0:
            pt = "transition"
        elif i % 2 == 0:
            pt = "reflection"
        else:
            pt = "short"
        events.append(PauseEvent(
            pause_type=PauseType(pt),
            weight=PAUSE_WEIGHTS[pt]["weight"],
            minimum_ms=PAUSE_WEIGHTS[pt]["minimum_ms"],
        ))

    return MeditationTimeline(
        job_id="test",
        meditation_type="anxiety",
        duration_target_s=int(target_s),
        events=events,
    )


def make_timeline_with_breath(
    pattern_id: str,
    cycles: int,
    speech_s: float = 100,
    target_s: float = 300,
) -> MeditationTimeline:
    """Create a timeline with a breath event and known speech."""
    pattern = BREATH_PATTERNS[pattern_id]
    breath_duration = pattern.cycle_duration_s * cycles

    events = [
        SectionMarkerEvent(section_name="test", section_index=0),
    ]
    for i in range(5):
        events.append(SpeechEvent(segment_id=f"seg_{i:03d}", text=f"Line {i}."))
        events.append(PauseEvent(
            pause_type=PauseType.REFLECTION,
            weight=PAUSE_WEIGHTS["reflection"]["weight"],
            minimum_ms=PAUSE_WEIGHTS["reflection"]["minimum_ms"],
        ))

    events.append(BreathEvent(
        pattern=pattern_id,
        cycles=cycles,
        duration_s=breath_duration,
    ))

    for i in range(5, 10):
        events.append(SpeechEvent(segment_id=f"seg_{i:03d}", text=f"Line {i}."))
        pt = "section_end" if i == 9 else "reflection"
        events.append(PauseEvent(
            pause_type=PauseType(pt),
            weight=PAUSE_WEIGHTS[pt]["weight"],
            minimum_ms=PAUSE_WEIGHTS[pt]["minimum_ms"],
        ))

    return MeditationTimeline(
        job_id="test",
        meditation_type="anxiety",
        duration_target_s=int(target_s),
        events=events,
    )


def mock_segments(speech_s: float, num: int = 10) -> Dict[str, SpeechSegment]:
    """Create mock SpeechSegments with evenly distributed duration."""
    per_segment = speech_s / num
    return {
        f"seg_{i:03d}": SpeechSegment(
            segment_id=f"seg_{i:03d}",
            path=f"/tmp/seg_{i:03d}.mp3",
            duration_s=per_segment,
        )
        for i in range(num)
    }


# ── Budget calculation tests ────────────────────────────────────────


def test_budget_calculation_distributes_correctly():
    """Pause weights must be proportional to their allocation."""
    timeline = make_test_timeline_with_known_speech(speech_s=120, target_s=300)
    segments = mock_segments(speech_s=120)
    # budget = 300 - 120 - 0 = 180 seconds for pauses
    timeline = calculate_budget(timeline, segments)

    pause_events = [e for e in timeline.events if isinstance(e, PauseEvent)]
    total_pause_ms = sum(e.resolved_ms for e in pause_events)
    assert abs(total_pause_ms / 1000 - 180) < 1.0, (
        f"Total pause {total_pause_ms / 1000:.1f}s != expected ~180s"
    )


def test_budget_proportionality():
    """Higher-weight pauses should get more time than lower-weight ones."""
    timeline = make_test_timeline_with_known_speech(speech_s=120, target_s=300)
    segments = mock_segments(speech_s=120)
    timeline = calculate_budget(timeline, segments)

    pause_events = [e for e in timeline.events if isinstance(e, PauseEvent)]

    deep = [e for e in pause_events if e.pause_type == PauseType.DEEP_REFLECTION]
    reflection = [e for e in pause_events if e.pause_type == PauseType.REFLECTION]

    if deep and reflection:
        assert deep[0].resolved_ms > reflection[0].resolved_ms, (
            f"deep_reflection ({deep[0].resolved_ms}ms) should be > "
            f"reflection ({reflection[0].resolved_ms}ms)"
        )


def test_no_pause_below_minimum():
    """When budget is tight, pauses scale down but never below 200ms micro-pause."""
    # Simulate a too-long script (speech_s close to target_s)
    timeline = make_test_timeline_with_known_speech(speech_s=280, target_s=300)
    segments = mock_segments(speech_s=280)
    timeline = calculate_budget(timeline, segments)

    for pause in (e for e in timeline.events if isinstance(e, PauseEvent)):
        assert pause.resolved_ms >= 200, (
            f"{pause.pause_type.value}: {pause.resolved_ms}ms < "
            f"200ms micro-pause floor"
        )
    # Total should stay close to target
    assert timeline.actual_duration_s <= 310, (
        f"Over-budget: {timeline.actual_duration_s:.1f}s > 310s"
    )


def test_breath_timing_is_exact():
    """Breath cycles must match their pattern exactly, never compressed."""
    timeline = make_timeline_with_breath("sleep_478", cycles=3)
    segments = mock_segments(speech_s=100)
    timeline = calculate_budget(timeline, segments)

    breath_events = [e for e in timeline.events if isinstance(e, BreathEvent)]
    expected_s = BREATH_PATTERNS["sleep_478"].cycle_duration_s * 3  # 19 * 3 = 57

    for be in breath_events:
        assert abs(be.duration_s - expected_s) < 0.1, (
            f"Breath duration {be.duration_s}s != expected {expected_s}s"
        )


def test_extra_breath_inserted_when_script_too_short():
    """If script is too short, reconciler must insert a breath cycle."""
    timeline = make_test_timeline_with_known_speech(speech_s=30, target_s=300)
    segments = mock_segments(speech_s=30)
    original_breath_count = sum(
        1 for e in timeline.events if isinstance(e, BreathEvent)
    )
    timeline = calculate_budget(timeline, segments)
    new_breath_count = sum(
        1 for e in timeline.events if isinstance(e, BreathEvent)
    )
    assert new_breath_count > original_breath_count, (
        "No breath cycle was inserted for a too-short script"
    )


def test_actual_duration_matches_target_normal_case():
    """In a normal case, actual duration should be close to target."""
    timeline = make_test_timeline_with_known_speech(speech_s=150, target_s=300)
    segments = mock_segments(speech_s=150)
    timeline = calculate_budget(timeline, segments)

    delta = abs(timeline.actual_duration_s - 300)
    assert delta < 2.0, (
        f"actual={timeline.actual_duration_s:.1f}s, "
        f"target=300s, delta={delta:.1f}s"
    )


def test_budget_fields_are_set():
    """All budget tracking fields must be populated."""
    timeline = make_test_timeline_with_known_speech(speech_s=150, target_s=300)
    segments = mock_segments(speech_s=150)
    timeline = calculate_budget(timeline, segments)

    assert timeline.speech_total_s > 0
    assert timeline.pause_budget_s > 0
    assert timeline.actual_duration_s > 0


def test_all_pauses_have_resolved_ms():
    """After reconciliation, every PauseEvent must have resolved_ms > 0."""
    timeline = make_test_timeline_with_known_speech(speech_s=150, target_s=300)
    segments = mock_segments(speech_s=150)
    timeline = calculate_budget(timeline, segments)

    for event in timeline.events:
        if isinstance(event, PauseEvent):
            assert event.resolved_ms > 0, (
                f"{event.pause_type.value}: resolved_ms is 0"
            )


def test_budget_with_breath_cycle():
    """Budget should account for breath cycle duration."""
    timeline = make_timeline_with_breath("calm_46", cycles=3, speech_s=100, target_s=300)
    segments = mock_segments(speech_s=100)
    # calm_46: 10s/cycle × 3 = 30s
    timeline = calculate_budget(timeline, segments)

    # pause_budget = 300 - 100 - 30 = 170
    assert abs(timeline.breath_total_s - 30) < 0.1
    assert abs(timeline.pause_budget_s - 170) < 2.0


# ── Edge cases ──────────────────────────────────────────────────────


def test_budget_with_no_pause_events():
    """Timeline with no pause events should not crash."""
    timeline = MeditationTimeline(
        job_id="test",
        meditation_type="anxiety",
        duration_target_s=300,
        events=[
            SpeechEvent(segment_id="seg_000", text="Hello."),
        ],
    )
    segments = mock_segments(speech_s=2, num=1)
    segments = {"seg_000": SpeechSegment(segment_id="seg_000", path="/tmp/seg.mp3", duration_s=2)}
    timeline = calculate_budget(timeline, segments)
    assert timeline.actual_duration_s == 2.0


def test_budget_all_minimum_pauses():
    """When budget is very tight, pauses are scaled down to fit."""
    timeline = make_test_timeline_with_known_speech(speech_s=295, target_s=300)
    segments = mock_segments(speech_s=295)
    timeline = calculate_budget(timeline, segments)

    for event in timeline.events:
        if isinstance(event, PauseEvent):
            # Pauses should be scaled proportionally, at least 200ms
            assert event.resolved_ms >= 200
    # Total must stay close to target
    assert timeline.actual_duration_s <= 310, (
        f"Over-budget: {timeline.actual_duration_s:.1f}s > 310s"
    )
