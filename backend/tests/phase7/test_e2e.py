"""Phase 7 Tests — End-to-End Integration

Tests the full pipeline from stressor text to mastered MP3.

These tests use the full pipeline with mock LLM responses to avoid
requiring API keys for CI. The mock responses use the same SAMPLE_PROSE
structure that a real LLM would produce.

For real E2E testing with actual OpenAI API, set OPENAI_API_KEY and run:
    pytest tests/phase7/ -v -s -m real_e2e --timeout=300
"""
import pytest
import pytest_asyncio
import asyncio
from pathlib import Path
from unittest.mock import AsyncMock, patch, MagicMock

from pydub import AudioSegment

from engine.pipeline import run_full_pipeline
from engine.models.events import SpeechEvent, PauseEvent, BreathEvent
from engine.profiles.breath_patterns import BREATH_PATTERNS


# ── Sample prose for mock LLM ──────────────────────────────────────

MOCK_PROSE_ANXIETY = {
    "title": "Finding Calm Before the Storm",
    "sections": [
        {
            "name": "arrival",
            "lines": [
                {"text": "Find a comfortable position wherever you are.", "pause_after": "short"},
                {"text": "Allow your eyes to gently close.", "pause_after": "reflection"},
                {"text": "Take a moment to simply arrive here.", "pause_after": "section_end"},
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

MOCK_PROSE_SLEEP = {
    "title": "Drifting Into Peaceful Rest",
    "sections": [
        {
            "name": "arrival",
            "lines": [
                {"text": "Settle into your bed and get comfortable.", "pause_after": "reflection"},
                {"text": "Let the weight of the day melt away.", "pause_after": "section_end"},
            ],
            "breath_cycle": None,
            "breath_repetitions": 0,
        },
        {
            "name": "breathing",
            "lines": [
                {"text": "Let us begin with some calming breaths.", "pause_after": "transition"},
                {"text": "Breathe naturally and without effort.", "pause_after": "reflection"},
            ],
            "breath_cycle": "sleep_478",
            "breath_repetitions": 3,
        },
        {
            "name": "body_relaxation",
            "lines": [
                {"text": "Feel your feet becoming heavy and warm.", "pause_after": "reflection"},
                {"text": "This warmth spreads up through your legs.", "pause_after": "reflection"},
                {"text": "Your hips and lower back release tension.", "pause_after": "deep_reflection"},
                {"text": "Your chest rises and falls gently.", "pause_after": "reflection"},
                {"text": "Your arms grow soft and relaxed.", "pause_after": "section_end"},
            ],
            "breath_cycle": None,
            "breath_repetitions": 0,
        },
        {
            "name": "letting_go",
            "lines": [
                {"text": "Release any remaining thoughts.", "pause_after": "reflection"},
                {"text": "There is nothing to do right now.", "pause_after": "deep_reflection"},
                {"text": "You are safe to let go completely.", "pause_after": "section_end"},
            ],
            "breath_cycle": "calm_46",
            "breath_repetitions": 2,
        },
        {
            "name": "closing",
            "lines": [
                {"text": "Allow sleep to gently wash over you.", "pause_after": "reflection"},
                {"text": "Rest now in complete peace.", "pause_after": "section_end"},
            ],
            "breath_cycle": None,
            "breath_repetitions": 0,
        },
    ],
}

MOCK_PROSE_FOCUS = {
    "title": "Sharpening Your Inner Clarity",
    "sections": [
        {
            "name": "arrival",
            "lines": [
                {"text": "Take your seat with intention.", "pause_after": "short"},
                {"text": "Plant your feet firmly on the ground.", "pause_after": "reflection"},
                {"text": "You are here to find your center.", "pause_after": "section_end"},
            ],
            "breath_cycle": None,
            "breath_repetitions": 0,
        },
        {
            "name": "centering",
            "lines": [
                {"text": "Notice where your attention naturally goes.", "pause_after": "reflection"},
                {"text": "Gently guide it back to this moment.", "pause_after": "reflection"},
                {"text": "There is only right here and right now.", "pause_after": "section_end"},
            ],
            "breath_cycle": None,
            "breath_repetitions": 0,
        },
        {
            "name": "breathing",
            "lines": [
                {"text": "Let us anchor with rhythmic breathing.", "pause_after": "transition"},
                {"text": "Match each breath to a steady count.", "pause_after": "reflection"},
            ],
            "breath_cycle": "focus_44",
            "breath_repetitions": 3,
        },
        {
            "name": "visualization",
            "lines": [
                {"text": "Imagine a clear beam of white light above you.", "pause_after": "reflection"},
                {"text": "It flows down through the top of your head.", "pause_after": "reflection"},
                {"text": "Feel it illuminating every thought.", "pause_after": "deep_reflection"},
                {"text": "Your mind becomes sharp and focused.", "pause_after": "reflection"},
                {"text": "Hold this clarity like a lens.", "pause_after": "section_end"},
            ],
            "breath_cycle": None,
            "breath_repetitions": 0,
        },
        {
            "name": "closing",
            "lines": [
                {"text": "Carry this focus with you now.", "pause_after": "transition"},
                {"text": "Open your eyes feeling sharp and ready.", "pause_after": "section_end"},
            ],
            "breath_cycle": None,
            "breath_repetitions": 0,
        },
    ],
}

MOCK_PROSE_MAP = {
    "anxiety": MOCK_PROSE_ANXIETY,
    "sleep": MOCK_PROSE_SLEEP,
    "focus": MOCK_PROSE_FOCUS,
}


# ── Mock helpers ───────────────────────────────────────────────────

def make_mock_classifier(expected_type: str):
    """Create a mock classifier that returns the given type."""
    import json
    async def mock_classifier_node(state):
        from engine.nodes.n01_classifier import scale_sections
        from engine.profiles.pacing import PACING_PROFILES, SPEECH_DENSITY
        from engine.profiles.section_templates import SECTION_TEMPLATES

        meditation_type = expected_type
        template = SECTION_TEMPLATES[meditation_type]
        pacing = PACING_PROFILES[meditation_type]
        density = SPEECH_DENSITY[meditation_type]
        total_s = state["duration_mins"] * 60
        target_speech_s = total_s * density
        target_words = int((target_speech_s / 60) * pacing["wpm"])

        return {
            "meditation_type": meditation_type,
            "section_plan": scale_sections(template, total_s),
            "pacing_profile": pacing["profile"],
            "target_word_count": target_words,
            "current_stage": "classifying",
            "progress_pct": 10.0,
        }
    return mock_classifier_node


def make_mock_script_generator(med_type: str):
    """Create a mock script generator that returns pre-built prose."""
    async def mock_script_generator_node(state):
        from engine.nodes.n02_script_generator import build_timeline_from_prose
        prose = MOCK_PROSE_MAP[med_type]
        timeline = build_timeline_from_prose(prose, state)
        return {
            "timeline": timeline,
            "raw_prose": prose,
            "current_stage": "script_generated",
            "progress_pct": 30.0,
        }
    return mock_script_generator_node


# ── E2E tests with mocked LLM ─────────────────────────────────────

E2E_CASES = [
    ("anxiety before a job interview", 3, "anxiety"),
    ("racing thoughts before bed",     5, "sleep"),
    ("can't focus while working",      3, "focus"),
]


@pytest.mark.asyncio
@pytest.mark.parametrize("stressor,duration_mins,expected_type", E2E_CASES)
async def test_full_pipeline_mock_llm(stressor, duration_mins, expected_type):
    """Full pipeline with mocked LLM: classifier → script → TTS → compose → master → storage.

    This test uses Edge TTS (real network call) but mocks the OpenAI LLM
    to avoid needing an API key.
    """
    mock_classifier = make_mock_classifier(expected_type)
    mock_script_gen = make_mock_script_generator(expected_type)

    with patch("engine.pipeline.classifier_node", mock_classifier), \
         patch("engine.pipeline.script_generator_node", mock_script_gen):

        result = await run_full_pipeline(
            stressor=stressor,
            duration_mins=duration_mins,
            voice_key="gentle_female",
            music_key="none",
        )

    assert result["status"] == "complete", f"Pipeline failed: {result.get('error')}"

    # Check output file exists
    audio_path = result.get("local_path")
    assert audio_path is not None
    assert Path(audio_path).exists(), f"Output file not found: {audio_path}"

    # Check audio properties
    audio = AudioSegment.from_file(audio_path)
    actual_s = len(audio) / 1000.0
    target_s = duration_mins * 60
    delta_s = abs(actual_s - target_s)

    print(f"\n[{expected_type} {duration_mins}min]")
    print(f"  Title:    {result.get('title')}")
    print(f"  Type:     {result.get('meditation_type')} (expected: {expected_type})")
    print(f"  Target:   {target_s}s")
    print(f"  Actual:   {actual_s:.1f}s")
    print(f"  Delta:    {delta_s:.1f}s")
    print(f"  Segments: {result.get('total_segments')}")

    assert result["meditation_type"] == expected_type, "Wrong meditation type"
    assert delta_s <= 30.0, f"Duration error too large: {delta_s:.1f}s"
    assert result.get("total_segments", 0) >= 8, "Too few speech segments"
    assert len(result.get("subtitles", [])) >= 8, "Too few subtitle entries"


@pytest.mark.asyncio
async def test_pipeline_produces_valid_mp3():
    """The mastered output must be a valid MP3 with correct properties."""
    mock_classifier = make_mock_classifier("anxiety")
    mock_script_gen = make_mock_script_generator("anxiety")

    with patch("engine.pipeline.classifier_node", mock_classifier), \
         patch("engine.pipeline.script_generator_node", mock_script_gen):

        result = await run_full_pipeline(
            stressor="test anxiety",
            duration_mins=3,
            voice_key="gentle_female",
            music_key="none",
        )

    assert result["status"] == "complete"
    audio_path = result["local_path"]

    # Check it's a valid MP3
    import subprocess, json
    probe = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json",
         "-show_format", audio_path],
        capture_output=True, text=True,
    )
    info = json.loads(probe.stdout)
    assert "mp3" in info["format"]["format_name"]

    bitrate = int(info["format"]["bit_rate"]) // 1000
    assert 150 <= bitrate <= 220, f"Bitrate {bitrate}kbps unexpected"


@pytest.mark.asyncio
async def test_pipeline_subtitles_have_timing():
    """Subtitle entries must have valid timing information."""
    mock_classifier = make_mock_classifier("focus")
    mock_script_gen = make_mock_script_generator("focus")

    with patch("engine.pipeline.classifier_node", mock_classifier), \
         patch("engine.pipeline.script_generator_node", mock_script_gen):

        result = await run_full_pipeline(
            stressor="need to focus",
            duration_mins=3,
            voice_key="gentle_female",
            music_key="none",
        )

    assert result["status"] == "complete"
    subtitles = result.get("subtitles", [])
    assert len(subtitles) >= 5

    # Check monotonic timing
    for i in range(1, len(subtitles)):
        assert subtitles[i]["start_ms"] >= subtitles[i - 1]["start_ms"], (
            f"Subtitle timing not monotonic at index {i}"
        )

    # Check all have text
    for sub in subtitles:
        assert len(sub["text"]) > 0


@pytest.mark.asyncio
async def test_pipeline_error_handling():
    """Pipeline should return status='failed' on error, not crash."""
    async def failing_classifier(state):
        raise RuntimeError("Simulated classifier failure")

    with patch("engine.pipeline.classifier_node", failing_classifier):
        result = await run_full_pipeline(
            stressor="test",
            duration_mins=3,
        )

    assert result["status"] == "failed"
    assert "error" in result
    assert "Simulated" in result["error"]
