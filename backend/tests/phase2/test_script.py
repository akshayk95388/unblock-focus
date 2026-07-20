"""Phase 2 Tests — LLM Script Generation

Tests the classifier, script generator DSL builder, and validator.
Uses both unit tests (no LLM) and integration tests (marked with @pytest.mark.llm).
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from engine.models.events import (
    SpeechEvent,
    PauseEvent,
    PauseType,
    BreathEvent,
    SectionMarkerEvent,
)
from engine.models.timeline import MeditationTimeline
from engine.nodes.n01_classifier import parse_type, scale_sections, classifier_node
from engine.nodes.n02_script_generator import (
    build_timeline_from_prose,
    parse_llm_json,
    format_sections_for_prompt,
)
from engine.nodes.n03_validator import validate_timeline, validator_router
from engine.profiles.pacing import PAUSE_WEIGHTS
from engine.profiles.breath_patterns import BREATH_PATTERNS
from engine.profiles.section_templates import SECTION_TEMPLATES


# ── Helpers ──────────────────────────────────────────────────────────


def make_test_timeline(events):
    """Create a MeditationTimeline from a list of events for testing."""
    return MeditationTimeline(
        job_id="test",
        meditation_type="anxiety",
        duration_target_s=300,
        events=events,
    )


def make_clean_test_timeline():
    """Create a well-formed timeline that should pass validation."""
    texts = [
        "Find a comfortable position wherever you are.",
        "Allow your eyes to gently close.",
        "Take a moment to simply arrive here.",
        "Notice the weight of your body.",
        "Feel the surface supporting you.",
        "Let your shoulders drop and soften.",
        "You are safe in this moment.",
        "Each breath brings more peace.",
        "Trust in your own inner wisdom.",
        "Open your eyes when you are ready.",
    ]
    events = []
    events.append(SectionMarkerEvent(section_name="arrival", section_index=0))
    for i, text in enumerate(texts):
        events.append(SpeechEvent(segment_id=f"seg_{i:03d}", text=text))
        pause_type = "section_end" if i == len(texts) - 1 else "reflection"
        events.append(PauseEvent(
            pause_type=PauseType(pause_type),
            weight=PAUSE_WEIGHTS[pause_type]["weight"],
            minimum_ms=PAUSE_WEIGHTS[pause_type]["minimum_ms"],
        ))
    return make_test_timeline(events)


SAMPLE_PROSE = {
    "title": "Finding Calm Before the Storm",
    "sections": [
        {
            "name": "arrival",
            "lines": [
                {"text": "Find a comfortable position.", "pause_after": "short"},
                {"text": "Allow your eyes to gently close.", "pause_after": "reflection"},
                {"text": "Take a moment to simply arrive.", "pause_after": "section_end"},
            ],
            "breath_cycle": None,
            "breath_repetitions": 0,
        },
        {
            "name": "grounding",
            "lines": [
                {"text": "Notice the weight of your body.", "pause_after": "reflection"},
                {"text": "Feel the surface beneath you.", "pause_after": "reflection"},
                {"text": "You are supported right now.", "pause_after": "deep_reflection"},
                {"text": "Let your shoulders drop and soften.", "pause_after": "section_end"},
            ],
            "breath_cycle": None,
            "breath_repetitions": 0,
        },
        {
            "name": "breathing",
            "lines": [
                {"text": "Now bring attention to your breath.", "pause_after": "transition"},
                {"text": "Follow along as we breathe together.", "pause_after": "reflection"},
            ],
            "breath_cycle": "calm_46",
            "breath_repetitions": 3,
        },
        {
            "name": "affirmations",
            "lines": [
                {"text": "You have everything you need within.", "pause_after": "reflection"},
                {"text": "Each breath brings more peace.", "pause_after": "reflection"},
                {"text": "You are safe in this moment.", "pause_after": "deep_reflection"},
                {"text": "Trust in your own inner wisdom.", "pause_after": "section_end"},
            ],
            "breath_cycle": None,
            "breath_repetitions": 0,
        },
        {
            "name": "closing",
            "lines": [
                {"text": "Begin to notice the sounds around you.", "pause_after": "transition"},
                {"text": "Gently wiggle your fingers and toes.", "pause_after": "reflection"},
                {"text": "Open your eyes when you are ready.", "pause_after": "section_end"},
            ],
            "breath_cycle": None,
            "breath_repetitions": 0,
        },
    ],
}


# ── Classifier unit tests ───────────────────────────────────────────


def test_parse_type_valid_json():
    assert parse_type('{"type": "deadline"}') == "deadline"
    assert parse_type('{"type": "burnout"}') == "burnout"
    assert parse_type('{"type": "distraction"}') == "distraction"


def test_parse_type_fallback_keyword():
    assert parse_type("The type is burnout based on the stressor") == "burnout"
    assert parse_type("This is distraction related") == "distraction"


def test_parse_type_default_to_general():
    assert parse_type("gibberish response") == "general"
    assert parse_type("") == "general"


def test_scale_sections_produces_correct_count():
    template = SECTION_TEMPLATES["deadline"]
    plans = scale_sections(template, 300)
    assert len(plans) == len(template)


def test_scale_sections_durations_sum_to_total():
    template = SECTION_TEMPLATES["deadline"]
    plans = scale_sections(template, 300)
    total = sum(p["duration_s"] for p in plans)
    assert abs(total - 300) < 1.0


# ── Script generator unit tests ─────────────────────────────────────


def test_parse_llm_json_clean():
    result = parse_llm_json('{"title": "Test"}')
    assert result["title"] == "Test"


def test_parse_llm_json_with_markdown_fences():
    result = parse_llm_json('```json\n{"title": "Test"}\n```')
    assert result["title"] == "Test"


def test_build_timeline_from_prose_structure():
    """build_timeline_from_prose must produce correct event sequence."""
    state = {
        "job_id": "test-123",
        "meditation_type": "anxiety",
        "duration_mins": 5,
        "pacing_profile": "slow",
    }
    timeline = build_timeline_from_prose(SAMPLE_PROSE, state)

    # Check basic fields
    assert timeline.meditation_type == "anxiety"
    assert timeline.title == "Finding Calm Before the Storm"
    assert timeline.duration_target_s == 300

    # Count event types
    speech_events = [e for e in timeline.events if isinstance(e, SpeechEvent)]
    pause_events = [e for e in timeline.events if isinstance(e, PauseEvent)]
    breath_events = [e for e in timeline.events if isinstance(e, BreathEvent)]
    section_markers = [e for e in timeline.events if isinstance(e, SectionMarkerEvent)]

    # 16 lines in SAMPLE_PROSE → 16 speech events
    assert len(speech_events) == 16
    # Each speech event followed by a pause → 16 pause events
    assert len(pause_events) == 16
    # 1 breath cycle in the breathing section
    assert len(breath_events) == 1
    # 5 sections
    assert len(section_markers) == 5


def test_build_timeline_pause_weights_match():
    """Pause events must have weights from PAUSE_WEIGHTS, not LLM-assigned."""
    state = {"job_id": "test", "meditation_type": "anxiety", "duration_mins": 5}
    timeline = build_timeline_from_prose(SAMPLE_PROSE, state)

    for event in timeline.events:
        if isinstance(event, PauseEvent):
            expected_weight = PAUSE_WEIGHTS[event.pause_type.value]["weight"]
            expected_min = PAUSE_WEIGHTS[event.pause_type.value]["minimum_ms"]
            assert event.weight == expected_weight
            assert event.minimum_ms == expected_min


def test_build_timeline_breath_duration_is_exact():
    """Breath event duration must equal pattern.cycle_duration_s × cycles."""
    state = {"job_id": "test", "meditation_type": "anxiety", "duration_mins": 5}
    timeline = build_timeline_from_prose(SAMPLE_PROSE, state)

    for event in timeline.events:
        if isinstance(event, BreathEvent):
            pattern = BREATH_PATTERNS[event.pattern]
            expected = pattern.cycle_duration_s * event.cycles
            assert event.duration_s == expected


def test_build_timeline_speech_pause_alternation():
    """After every SpeechEvent there must be a PauseEvent (except possibly at section end)."""
    state = {"job_id": "test", "meditation_type": "anxiety", "duration_mins": 5}
    timeline = build_timeline_from_prose(SAMPLE_PROSE, state)

    for i, event in enumerate(timeline.events):
        if isinstance(event, SpeechEvent):
            # Next event must be PauseEvent
            assert i + 1 < len(timeline.events)
            assert isinstance(timeline.events[i + 1], PauseEvent), (
                f"Event after SpeechEvent at index {i} is {type(timeline.events[i + 1]).__name__}, "
                f"not PauseEvent"
            )


def test_build_timeline_segment_ids_are_unique():
    """All segment IDs must be unique."""
    state = {"job_id": "test", "meditation_type": "anxiety", "duration_mins": 5}
    timeline = build_timeline_from_prose(SAMPLE_PROSE, state)

    ids = [e.segment_id for e in timeline.events if isinstance(e, SpeechEvent)]
    assert len(ids) == len(set(ids)), f"Duplicate segment IDs: {ids}"


# ── Validator unit tests ────────────────────────────────────────────


def test_validator_catches_long_sentences():
    timeline = make_test_timeline([
        SpeechEvent(
            segment_id="s1",
            text="This is a very long sentence that has way too many words in it for spoken meditation use and keeps going on.",
        ),
    ] + [
        SpeechEvent(segment_id=f"s{i}", text=f"Short line {i}.")
        for i in range(2, 10)
    ])
    issues = validate_timeline(timeline)
    assert any("words" in i for i in issues)


def test_validator_catches_colons():
    events = [SpeechEvent(segment_id=f"s{i}", text=f"Good line {i}.") for i in range(8)]
    events[0] = SpeechEvent(segment_id="s0", text="Focus on: your breath.")
    timeline = make_test_timeline(events)
    issues = validate_timeline(timeline)
    assert any("colon" in i for i in issues)


def test_validator_catches_digits():
    events = [SpeechEvent(segment_id=f"s{i}", text=f"Good line {i}.") for i in range(8)]
    events[0] = SpeechEvent(segment_id="s0", text="Count to 10 slowly.")
    timeline = make_test_timeline(events)
    issues = validate_timeline(timeline)
    assert any("digit" in i for i in issues)


def test_validator_catches_missing_pauses():
    """4 consecutive speech events with no pause should be flagged."""
    events = [SpeechEvent(segment_id=f"s{i}", text=f"Line number {i}.") for i in range(8)]
    timeline = make_test_timeline(events)
    issues = validate_timeline(timeline)
    assert any("pause" in i.lower() for i in issues)


def test_validator_catches_repetition():
    events = [
        SpeechEvent(segment_id="s0", text="Breathe in deeply."),
        PauseEvent(pause_type=PauseType.REFLECTION),
        SpeechEvent(segment_id="s1", text="Breathe in deeply."),
        PauseEvent(pause_type=PauseType.REFLECTION),
    ] + [
        SpeechEvent(segment_id=f"s{i}", text=f"Unique line {i}.")
        for i in range(2, 10)
    ]
    timeline = make_test_timeline(events)
    issues = validate_timeline(timeline)
    assert any("repeated" in i.lower() for i in issues)


def test_validator_catches_too_few_lines():
    events = [SpeechEvent(segment_id=f"s{i}", text=f"Short.") for i in range(3)]
    timeline = make_test_timeline(events)
    issues = validate_timeline(timeline)
    assert any("too few" in i.lower() for i in issues)


def test_validator_passes_clean_timeline():
    """A well-formed timeline should have zero issues."""
    timeline = make_clean_test_timeline()
    issues = validate_timeline(timeline)
    assert len(issues) == 0, f"Unexpected issues: {issues}"


# ── Validator router tests ──────────────────────────────────────────


def test_validator_router_retries_on_issues():
    state = {"validation_issues": ["some issue"], "fix_attempts": 0}
    assert validator_router(state) == "script_generator"


def test_validator_router_continues_after_max_retries():
    state = {"validation_issues": ["some issue"], "fix_attempts": 2}
    assert validator_router(state) == "tts_generator"


def test_validator_router_continues_when_clean():
    state = {"validation_issues": [], "fix_attempts": 0}
    assert validator_router(state) == "tts_generator"


# ── Format helper tests ─────────────────────────────────────────────


def test_format_sections_for_prompt():
    plans = [
        {"name": "arrival", "duration_s": 30.0, "breath_pattern": None, "breath_cycles": 0},
        {"name": "breathing", "duration_s": 75.0, "breath_pattern": "calm_46", "breath_cycles": 3},
    ]
    text = format_sections_for_prompt(plans)
    assert "arrival" in text
    assert "breathing" in text
    assert "calm_46" in text
