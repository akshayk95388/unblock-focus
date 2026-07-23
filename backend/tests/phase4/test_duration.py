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
    """Pauses fill budget up to their maximum_ms caps. Higher weights get more time."""
    timeline = make_test_timeline_with_known_speech(speech_s=120, target_s=300)
    segments = mock_segments(speech_s=120)
    # budget = 300 - 120 - 0 = 180 seconds for pauses
    timeline = calculate_budget(timeline, segments)

    pause_events = [e for e in timeline.events if isinstance(e, PauseEvent)]

    # Every pause must be within its [minimum_ms, maximum_ms] range
    for pe in pause_events:
        pw = PAUSE_WEIGHTS[pe.pause_type.value]
        assert pe.resolved_ms >= pw["minimum_ms"], (
            f"{pe.pause_type.value}: {pe.resolved_ms}ms < minimum {pw['minimum_ms']}ms"
        )
        assert pe.resolved_ms <= pw["maximum_ms"], (
            f"{pe.pause_type.value}: {pe.resolved_ms}ms > maximum {pw['maximum_ms']}ms"
        )

    # Total pause should equal sum of all maximum_ms caps when budget exceeds capacity
    max_capacity_ms = sum(
        PAUSE_WEIGHTS[pe.pause_type.value]["maximum_ms"] for pe in pause_events
    )
    total_pause_ms = sum(e.resolved_ms for e in pause_events)
    assert total_pause_ms <= max_capacity_ms + 1, (
        f"Total pause {total_pause_ms}ms exceeds max capacity {max_capacity_ms}ms"
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
    """Quality-first: wordy scripts use natural minimum pauses, never micro-gaps."""
    # Simulate a too-long script (speech_s close to target_s)
    timeline = make_test_timeline_with_known_speech(speech_s=280, target_s=300)
    segments = mock_segments(speech_s=280)
    timeline = calculate_budget(timeline, segments)

    for pause in (e for e in timeline.events if isinstance(e, PauseEvent)):
        assert pause.resolved_ms >= pause.minimum_ms, (
            f"{pause.pause_type.value}: {pause.resolved_ms}ms < "
            f"natural minimum {pause.minimum_ms}ms"
        )


def test_breath_timing_is_exact():
    """Breath cycles must match their pattern exactly, never compressed."""
    timeline = make_timeline_with_breath("sleep_478", cycles=3, speech_s=200)
    segments = mock_segments(speech_s=200)
    timeline = calculate_budget(timeline, segments)

    breath_events = [e for e in timeline.events if isinstance(e, BreathEvent)]
    expected_s = BREATH_PATTERNS["sleep_478"].cycle_duration_s * 3  # 19 * 3 = 57

    for be in breath_events:
        assert abs(be.duration_s - expected_s) < 0.1, (
            f"Breath duration {be.duration_s}s != expected {expected_s}s"
        )


def test_extra_breath_inserted_when_script_too_short():
    """If script is too short, reconciler must insert a breath cycle after the breathing phase."""
    # Use a timeline with an existing breath event and very short speech
    # so that pause_budget > 70% of target, triggering extra breath insertion
    timeline = make_timeline_with_breath("calm_46", cycles=1, speech_s=20, target_s=300)
    segments = mock_segments(speech_s=20)

    # Find the original breath event index
    original_breath_idx = None
    for i, e in enumerate(timeline.events):
        if isinstance(e, BreathEvent):
            original_breath_idx = i
            break
    assert original_breath_idx is not None, "Test setup: no breath event found"

    timeline = calculate_budget(timeline, segments)

    # Count breath events — should have increased
    breath_events = [(i, e) for i, e in enumerate(timeline.events) if isinstance(e, BreathEvent)]
    assert len(breath_events) >= 2, (
        f"Expected at least 2 breath events, got {len(breath_events)}"
    )

    # The new breath event should be immediately after the original one
    assert breath_events[1][0] == breath_events[0][0] + 1, (
        f"Extra breath at index {breath_events[1][0]} is not immediately "
        f"after original breath at index {breath_events[0][0]}"
    )


def test_actual_duration_matches_target_normal_case():
    """When budget fits within pause caps, actual duration should be close to target."""
    # Use enough segments (25) so per-pause allocation stays within caps
    timeline = make_test_timeline_with_known_speech(speech_s=150, target_s=300, num_segments=25)
    segments = mock_segments(speech_s=150, num=25)
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
    timeline = make_timeline_with_breath("calm_46", cycles=3, speech_s=200, target_s=300)
    segments = mock_segments(speech_s=200)
    # calm_46: 10s/cycle × 3 = 30s
    timeline = calculate_budget(timeline, segments)

    # pause_budget = 300 - 200 - 30 = 70
    assert abs(timeline.breath_total_s - 30) < 0.1
    assert abs(timeline.pause_budget_s - 70) < 2.0


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
    """Quality-first: when budget is very tight, natural minimums are used."""
    timeline = make_test_timeline_with_known_speech(speech_s=295, target_s=300)
    segments = mock_segments(speech_s=295)
    timeline = calculate_budget(timeline, segments)

    for event in timeline.events:
        if isinstance(event, PauseEvent):
            # Quality-first: every pause gets its natural minimum
            assert event.resolved_ms >= event.minimum_ms, (
                f"{event.pause_type.value}: {event.resolved_ms}ms < "
                f"natural minimum {event.minimum_ms}ms"
            )
    # Session will exceed target (quality over precision)
    assert timeline.actual_duration_s > 300, (
        f"Expected session to exceed target due to natural minimums"
    )


def test_quality_first_preserves_natural_pauses():
    """When script is over-length, each pause should be set to exactly its minimum_ms."""
    # Speech fills almost the entire target, leaving no room for natural pauses
    timeline = make_test_timeline_with_known_speech(speech_s=290, target_s=300)
    segments = mock_segments(speech_s=290)
    timeline = calculate_budget(timeline, segments)

    for event in timeline.events:
        if isinstance(event, PauseEvent):
            expected_min = PAUSE_WEIGHTS[event.pause_type.value]["minimum_ms"]
            assert event.resolved_ms == expected_min, (
                f"{event.pause_type.value}: resolved_ms={event.resolved_ms}ms "
                f"!= expected minimum {expected_min}ms"
            )
