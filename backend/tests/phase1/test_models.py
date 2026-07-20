"""Phase 1 Tests — Foundation & Models

Validates that all data models, pacing profiles, breath patterns, and
section templates are correctly defined and self-consistent.
"""
import pytest

from engine.models.events import (
    PauseType,
    DeliveryStyle,
    SpeechEvent,
    PauseEvent,
    BreathEvent,
    SectionMarkerEvent,
)
from engine.models.timeline import MeditationTimeline
from engine.models.prose import ProseLine, ProseSection, ProseScript
from engine.models.job import SpeechSegment, SubtitleEntry
from engine.profiles.pacing import PAUSE_WEIGHTS, PACING_PROFILES, SPEECH_DENSITY
from engine.profiles.breath_patterns import BREATH_PATTERNS, BreathPhase, BreathPattern
from engine.profiles.section_templates import SECTION_TEMPLATES, SectionTemplate


# ── Pause weight tests ──────────────────────────────────────────────


def test_pause_event_weights_are_ordered():
    """Higher-intensity pauses must have higher weights."""
    weights = [
        PAUSE_WEIGHTS[p]["weight"]
        for p in ["short", "transition", "reflection", "deep_reflection", "section_end"]
    ]
    assert weights == sorted(weights), f"Weights are not monotonically increasing: {weights}"


def test_pause_weights_cover_all_pause_types():
    """Every PauseType enum value must have a corresponding entry in PAUSE_WEIGHTS."""
    for pt in PauseType:
        assert pt.value in PAUSE_WEIGHTS, f"PauseType.{pt.name} missing from PAUSE_WEIGHTS"


def test_pause_weights_have_required_keys():
    """Each pause weight entry must have 'weight' and 'minimum_ms'."""
    for name, pw in PAUSE_WEIGHTS.items():
        assert "weight" in pw, f"{name} missing 'weight'"
        assert "minimum_ms" in pw, f"{name} missing 'minimum_ms'"
        assert isinstance(pw["weight"], int) and pw["weight"] > 0
        assert isinstance(pw["minimum_ms"], int) and pw["minimum_ms"] > 0


# ── Breath pattern tests ────────────────────────────────────────────


def test_breath_cycle_duration_is_exact():
    """Cycle duration must be sum of phase durations (no estimation)."""
    pattern = BREATH_PATTERNS["sleep_478"]
    assert pattern.cycle_duration_s == 4.0 + 7.0 + 8.0  # = 19.0


def test_breath_pattern_cue_texts_are_short():
    """Cue texts must be ≤5 words (TTS should be brief)."""
    for pattern in BREATH_PATTERNS.values():
        for phase in pattern.phases:
            word_count = len(phase.cue_text.split())
            assert word_count <= 5, f"'{phase.cue_text}' is {word_count} words"


def test_breath_patterns_have_valid_phases():
    """All breath patterns must have at least 2 phases (inhale + exhale)."""
    for name, pattern in BREATH_PATTERNS.items():
        assert len(pattern.phases) >= 2, f"Pattern '{name}' has fewer than 2 phases"
        phase_types = {p.phase for p in pattern.phases}
        assert "inhale" in phase_types, f"Pattern '{name}' missing 'inhale' phase"
        assert "exhale" in phase_types, f"Pattern '{name}' missing 'exhale' phase"


def test_breath_cycle_duration_positive():
    """All breath cycle durations must be positive."""
    for name, pattern in BREATH_PATTERNS.items():
        assert pattern.cycle_duration_s > 0, f"Pattern '{name}' has zero/negative duration"
        for phase in pattern.phases:
            assert phase.duration_s > 0, f"Pattern '{name}' phase '{phase.phase}' has non-positive duration"


def test_all_four_breath_patterns_present():
    """Exactly the four expected breath patterns must exist."""
    expected = {"box_4", "sleep_478", "calm_46", "focus_44"}
    assert set(BREATH_PATTERNS.keys()) == expected


# ── Section template tests ──────────────────────────────────────────


def test_section_template_weights_sum_to_one():
    """Section duration weights must sum to 1.0 for each meditation type."""
    for med_type, sections in SECTION_TEMPLATES.items():
        total = sum(s.duration_weight for s in sections)
        assert abs(total - 1.0) < 0.001, f"{med_type} weights sum to {total}"


def test_section_templates_cover_all_meditation_types():
    """Templates must exist for all valid stressor categories."""
    for med_type in ["deadline", "presentation", "burnout", "distraction", "overthinking", "imposter", "exam", "general"]:
        assert med_type in SECTION_TEMPLATES, f"Missing template for '{med_type}'"


def test_section_templates_have_arrival_and_closing():
    """Every meditation type starts with grounding/arrival and ends with closing."""
    for med_type, sections in SECTION_TEMPLATES.items():
        assert sections[0].name in ["grounding", "arrival"], f"{med_type} doesn't start with 'grounding' or 'arrival'"
        assert sections[-1].name == "closing", f"{med_type} doesn't end with 'closing'"


def test_section_breath_patterns_reference_valid_patterns():
    """Any breath pattern referenced in a section must exist in BREATH_PATTERNS."""
    for med_type, sections in SECTION_TEMPLATES.items():
        for section in sections:
            if section.default_breath_pattern is not None:
                assert section.default_breath_pattern in BREATH_PATTERNS, (
                    f"{med_type}/{section.name} references unknown pattern "
                    f"'{section.default_breath_pattern}'"
                )


# ── Pacing profile tests ────────────────────────────────────────────


def test_pacing_profiles_have_wpm_and_profile():
    """Each pacing profile must have 'wpm' and 'profile' keys."""
    for med_type, profile in PACING_PROFILES.items():
        assert "wpm" in profile, f"{med_type} missing 'wpm'"
        assert "profile" in profile, f"{med_type} missing 'profile'"
        assert profile["wpm"] > 0


def test_speech_density_values_in_range():
    """Speech density must be between 0 and 1."""
    for med_type, density in SPEECH_DENSITY.items():
        assert 0 < density < 1, f"{med_type} density {density} out of range (0, 1)"


def test_pacing_profiles_cover_all_types():
    """Pacing profiles and speech density must exist for all types."""
    for med_type in ["deadline", "presentation", "burnout", "distraction"]:
        assert med_type in PACING_PROFILES
        assert med_type in SPEECH_DENSITY


# ── Timeline + Event serialization tests ─────────────────────────────


def test_timeline_serializes_all_event_types():
    """MeditationTimeline can hold all four event types."""
    timeline = MeditationTimeline(
        job_id="test",
        meditation_type="anxiety",
        duration_target_s=300,
        events=[
            SpeechEvent(segment_id="s1", text="Hello."),
            PauseEvent(pause_type=PauseType.REFLECTION),
            BreathEvent(pattern="calm_46", cycles=2),
            SectionMarkerEvent(section_name="arrival"),
        ],
    )
    assert len(timeline.events) == 4


def test_speech_event_defaults():
    """SpeechEvent should have sensible defaults."""
    event = SpeechEvent()
    assert event.type == "speech"
    assert event.delivery == DeliveryStyle.WARM


def test_pause_event_defaults():
    """PauseEvent defaults should match REFLECTION weights."""
    event = PauseEvent()
    assert event.type == "pause"
    assert event.pause_type == PauseType.REFLECTION
    assert event.weight == 4
    assert event.minimum_ms == 4000
    assert event.resolved_ms == 0


def test_breath_event_defaults():
    """BreathEvent defaults to calm_46 with 3 cycles."""
    event = BreathEvent()
    assert event.type == "breath"
    assert event.pattern == "calm_46"
    assert event.cycles == 3


def test_timeline_budget_fields_default_to_zero():
    """Budget fields must start at zero before reconciler runs."""
    timeline = MeditationTimeline()
    assert timeline.speech_total_s == 0.0
    assert timeline.breath_total_s == 0.0
    assert timeline.pause_budget_s == 0.0
    assert timeline.actual_duration_s == 0.0


# ── Prose model tests ───────────────────────────────────────────────


def test_prose_script_structure():
    """ProseScript can hold sections with lines."""
    script = ProseScript(
        title="Finding Calm",
        sections=[
            ProseSection(
                name="arrival",
                lines=[
                    ProseLine(text="Welcome.", pause_after="short"),
                    ProseLine(text="Find comfort.", pause_after="reflection"),
                ],
            )
        ],
    )
    assert len(script.sections) == 1
    assert len(script.sections[0].lines) == 2


# ── Job model tests ─────────────────────────────────────────────────


def test_speech_segment_stores_duration():
    """SpeechSegment must track path and duration."""
    seg = SpeechSegment(segment_id="seg_001", path="/tmp/seg_001.mp3", duration_s=2.5)
    assert seg.duration_s == 2.5


def test_subtitle_entry_stores_timing():
    """SubtitleEntry must track start/end in milliseconds."""
    sub = SubtitleEntry(segment_id="seg_001", text="Hello.", start_ms=0, end_ms=2500)
    assert sub.end_ms - sub.start_ms == 2500
