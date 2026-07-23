"""Phase 3 Tests — TTS Generation

Tests provider abstraction, segment generation, and adaptive timestamp slicing.
Uses edge_tts for real generation tests (no API key needed).
"""
import pytest
import asyncio
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

from engine.tts.base import TTSProvider
from engine.tts.edge_tts_provider import EdgeTTSProvider
from engine.tts.gtts_provider import GTTSProvider
from engine.tts.factory import build_provider_chain
from engine.nodes.n04_tts_generator import generate_one_segment, get_audio_duration_s
from engine.profiles.breath_patterns import BREATH_PATTERNS


# ── Mock providers ──────────────────────────────────────────────────


class MockTTSProvider(TTSProvider):
    """Provider that writes a tiny valid MP3 file."""

    def __init__(self, should_fail: bool = False):
        self._should_fail = should_fail
        self.call_count = 0

    @property
    def provider_id(self) -> str:
        return "mock"

    @property
    def voice_map(self) -> dict[str, str]:
        return {}

    async def generate(self, text: str, voice_id: str, output_path: str, *args, **kwargs) -> None:
        self.call_count += 1
        if self._should_fail:
            raise RuntimeError("Mock provider failure")
        # Write a minimal valid MP3-like file using pydub
        from pydub import AudioSegment
        from pydub.generators import Sine

        # Generate a short sine wave (500ms) to simulate TTS output
        duration_ms = max(200, len(text.split()) * 200)  # rough estimate
        tone = Sine(440).to_audio_segment(duration=duration_ms).apply_gain(-20)
        tone.export(output_path, format="mp3")


class MockFailingProvider(TTSProvider):
    """Provider that always fails."""

    @property
    def provider_id(self) -> str:
        return "failing"

    @property
    def voice_map(self) -> dict[str, str]:
        return {}

    async def generate(self, text: str, voice_id: str, output_path: str, *args, **kwargs) -> None:
        raise RuntimeError("This provider always fails")


# ── generate_one_segment tests ──────────────────────────────────────


@pytest.mark.asyncio
async def test_generate_segment_with_mock_provider(tmp_path):
    """Mock provider should produce a valid audio file."""
    provider = MockTTSProvider()
    out = tmp_path / "test.mp3"

    duration = await generate_one_segment(
        text="Find a comfortable position.",
        voice_key="gentle_female",
        output_path=str(out),
        provider=provider,
    )

    assert out.exists()
    assert out.stat().st_size > 100
    assert duration > 0
    assert provider.call_count == 1


@pytest.mark.asyncio
async def test_provider_failure_raises(tmp_path):
    """When a provider fails all retries, must raise RuntimeError."""
    out = tmp_path / "fail.mp3"

    with pytest.raises(RuntimeError, match="TTS provider 'failing' failed"):
        await generate_one_segment(
            "This will fail.",
            "gentle_female", str(out),
            provider=MockFailingProvider(),
        )


# ── Real Edge TTS test ──────────────────────────────────────────────


@pytest.mark.asyncio
async def test_edge_tts_generates_real_audio(tmp_path):
    """Edge TTS must produce a valid audio file (real network call)."""
    provider = EdgeTTSProvider()
    out = tmp_path / "edge_test.mp3"

    await provider.generate(
        text="Find a comfortable position.",
        voice_id="gentle_female",
        output_path=str(out),
    )

    assert out.exists()
    assert out.stat().st_size > 1000  # at least 1KB
    duration = get_audio_duration_s(str(out))
    assert 0.5 <= duration <= 5.0


@pytest.mark.asyncio
async def test_edge_tts_full_segment_flow(tmp_path):
    """Full generate_one_segment flow with Edge TTS."""
    provider = EdgeTTSProvider()
    out = tmp_path / "full_test.mp3"

    duration = await generate_one_segment(
        text="Allow your body to relax.",
        voice_key="gentle_female",
        output_path=str(out),
        provider=provider,
    )

    assert out.exists()
    assert duration > 0


# ── Factory tests ───────────────────────────────────────────────────


def test_factory_builds_edge_tts_primary():
    """When TTS_PRIMARY=edge_tts, Edge TTS should be first in chain."""
    settings = MagicMock()
    settings.tts_primary = "edge_tts"
    settings.elevenlabs_api_key = ""

    chain = build_provider_chain(settings)
    assert len(chain) >= 2
    assert chain[0].provider_id == "edge_tts"


def test_factory_builds_elevenlabs_primary():
    """When TTS_PRIMARY=elevenlabs with key, ElevenLabs should be first."""
    settings = MagicMock()
    settings.tts_primary = "elevenlabs"
    settings.elevenlabs_api_key = "test-key-123"

    chain = build_provider_chain(settings)
    assert any(p.provider_id == "elevenlabs" for p in chain)
    # gtts should be last resort
    assert chain[-1].provider_id == "gtts"


@pytest.mark.asyncio
async def test_try_generate_adaptive_tts(tmp_path):
    """Test try_generate_adaptive_tts generates audio and slices segments cleanly."""
    from engine.models.events import SpeechEvent, SectionMarkerEvent
    from engine.models.timeline import MeditationTimeline
    from engine.nodes.n04_tts_generator import try_generate_adaptive_tts
    from pydub import AudioSegment
    from pydub.generators import Sine
    import io

    # Mock provider supporting generate_with_timestamps
    provider = MagicMock()
    provider.provider_id = "mock_elevenlabs"

    # Generate 3 seconds of dummy sine wave audio bytes
    sine_audio = Sine(440).to_audio_segment(duration=3000)
    buf = io.BytesIO()
    sine_audio.export(buf, format="mp3")
    audio_bytes = buf.getvalue()

    # Mock timestamps alignment response
    provider.generate_with_timestamps = AsyncMock(return_value={
        "audio_bytes": audio_bytes,
        "char_start": [0.0, 0.5, 1.0, 1.5, 2.0, 2.5],
        "char_end": [0.5, 1.0, 1.5, 2.0, 2.5, 3.0],
        "characters": ["L", "i", "n", "e", "1", "."],
    })

    timeline = MeditationTimeline(
        version="1.0",
        job_id="test",
        meditation_type="anxiety",
        title="Test",
        duration_target_s=180,
        pacing_profile="general",
        events=[
            SectionMarkerEvent(type="section_marker", section_name="grounding", section_index=0),
            SpeechEvent(type="speech", segment_id="seg_000", text="Line 1."),
            SpeechEvent(type="speech", segment_id="seg_001", text="Line 2."),
        ],
    )

    segments = await try_generate_adaptive_tts(
        timeline=timeline,
        voice_key="calm_male",
        tmp_dir=tmp_path,
        provider=provider,
    )

    assert segments is not None
    assert len(segments) == 2
    assert (tmp_path / "seg_000.mp3").exists()
    assert (tmp_path / "seg_001.mp3").exists()
