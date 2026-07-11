"""Phase 3 Tests — TTS Generation + Caching

Tests provider abstraction, cache hit/miss, fallback chain, and segment generation.
Uses edge_tts for real generation tests (no API key needed).
"""
import pytest
import asyncio
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

from engine.tts.base import TTSProvider
from engine.tts.cache import TTSCache
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

    async def generate(self, text: str, voice_id: str, output_path: str) -> None:
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

    async def generate(self, text: str, voice_id: str, output_path: str) -> None:
        raise RuntimeError("This provider always fails")


# ── Cache tests ─────────────────────────────────────────────────────


def test_cache_miss_returns_none():
    cache = TTSCache()  # no redis, uses in-memory fallback
    result = cache.get("hello", "voice", "provider")
    assert result is None


def test_cache_set_and_get():
    cache = TTSCache()
    audio_bytes = b"fake audio data"
    cache.set("hello", "voice", "provider", audio_bytes)
    result = cache.get("hello", "voice", "provider")
    assert result == audio_bytes


def test_cache_different_keys():
    cache = TTSCache()
    cache.set("hello", "voice1", "provider", b"audio1")
    cache.set("hello", "voice2", "provider", b"audio2")
    assert cache.get("hello", "voice1", "provider") == b"audio1"
    assert cache.get("hello", "voice2", "provider") == b"audio2"


# ── generate_one_segment tests ──────────────────────────────────────


@pytest.mark.asyncio
async def test_generate_segment_with_mock_provider(tmp_path):
    """Mock provider should produce a valid audio file."""
    cache = TTSCache()
    provider = MockTTSProvider()
    out = tmp_path / "test.mp3"

    duration = await generate_one_segment(
        text="Find a comfortable position.",
        voice_key="gentle_female",
        output_path=str(out),
        cache=cache,
        provider_chain=[provider],
    )

    assert out.exists()
    assert out.stat().st_size > 100
    assert duration > 0
    assert provider.call_count == 1


@pytest.mark.asyncio
async def test_cache_returns_hit_on_second_call(tmp_path):
    """Second call for same text must use cache, not call provider again."""
    cache = TTSCache()
    provider = MockTTSProvider()

    out1 = tmp_path / "seg1.mp3"
    out2 = tmp_path / "seg2.mp3"

    await generate_one_segment(
        "Allow your eyes to gently close.",
        "gentle_female", str(out1), cache, [provider],
    )
    await generate_one_segment(
        "Allow your eyes to gently close.",
        "gentle_female", str(out2), cache, [provider],
    )

    assert provider.call_count == 1  # second call used cache
    assert out2.exists()


@pytest.mark.asyncio
async def test_fallback_provider_on_primary_failure(tmp_path):
    """When primary fails, fallback provider must produce audio."""
    cache = TTSCache()
    failing = MockFailingProvider()
    fallback = MockTTSProvider()
    out = tmp_path / "fallback.mp3"

    duration = await generate_one_segment(
        "Take a slow breath in.",
        "gentle_female", str(out), cache, [failing, fallback],
    )

    assert out.exists()
    assert duration > 0
    assert fallback.call_count == 1


@pytest.mark.asyncio
async def test_all_providers_fail_raises(tmp_path):
    """When all providers fail, must raise RuntimeError."""
    cache = TTSCache()
    out = tmp_path / "fail.mp3"

    with pytest.raises(RuntimeError, match="All TTS providers failed"):
        await generate_one_segment(
            "This will fail.",
            "gentle_female", str(out), cache,
            [MockFailingProvider(), MockFailingProvider()],
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
    cache = TTSCache()
    provider = EdgeTTSProvider()
    out = tmp_path / "full_test.mp3"

    duration = await generate_one_segment(
        text="Allow your body to relax.",
        voice_key="gentle_female",
        output_path=str(out),
        cache=cache,
        provider_chain=[provider],
    )

    assert out.exists()
    assert duration > 0

    # Verify cache was populated
    cached = cache.get("Allow your body to relax.", "gentle_female", "edge_tts")
    assert cached is not None
    assert len(cached) > 0


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
