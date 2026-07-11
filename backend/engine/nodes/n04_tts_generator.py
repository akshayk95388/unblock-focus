"""Node 04 — TTS Generator: Generates audio for every SpeechEvent and breath cue."""
import asyncio
import logging
from pathlib import Path
from typing import List, Dict, Optional

from pydub import AudioSegment

from engine.state import MeditationEngineState
from engine.models.events import SpeechEvent, BreathEvent
from engine.models.job import SpeechSegment
from engine.tts.base import TTSProvider
from engine.tts.cache import TTSCache
from engine.tts.factory import build_provider_chain
from engine.profiles.breath_patterns import BREATH_PATTERNS
from config.settings import get_settings

logger = logging.getLogger(__name__)


def get_audio_duration_s(path: str) -> float:
    """Measure audio file duration in seconds using pydub."""
    audio = AudioSegment.from_file(path)
    return len(audio) / 1000.0


async def generate_one_segment(
    text: str,
    voice_key: str,
    output_path: str,
    cache: TTSCache,
    provider_chain: List[TTSProvider],
) -> float:
    """Generate TTS for a single text segment. Returns actual audio duration in seconds.

    Tries each provider in the chain with retry logic.
    """
    # Use first provider's ID for cache key
    primary_provider_id = provider_chain[0].provider_id if provider_chain else "unknown"

    # Cache check
    cached = cache.get(text, voice_key, primary_provider_id)
    if cached:
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        Path(output_path).write_bytes(cached)
        logger.debug(f"Cache hit for: '{text[:40]}...'")
        return get_audio_duration_s(output_path)

    # Try providers in order
    last_error = None
    for provider in provider_chain:
        for attempt in range(3):
            try:
                await provider.generate(text, voice_key, output_path)
                audio_bytes = Path(output_path).read_bytes()
                cache.set(text, voice_key, primary_provider_id, audio_bytes)
                logger.debug(f"Generated via {provider.provider_id}: '{text[:40]}...'")
                return get_audio_duration_s(output_path)
            except Exception as e:
                last_error = e
                logger.warning(
                    f"TTS attempt {attempt + 1}/3 failed ({provider.provider_id}): {e}"
                )
                if attempt < 2:
                    await asyncio.sleep(2 ** attempt)

    raise RuntimeError(f"All TTS providers failed for: '{text[:40]}' — last error: {last_error}")


async def generate_breath_cues(
    timeline,
    voice_key: str,
    tmp_dir: Path,
    cache: TTSCache,
    provider_chain: List[TTSProvider],
) -> Dict[str, Dict[str, str]]:
    """Generate TTS audio for all breath cue texts.

    Returns: {pattern_id: {phase_name: audio_path}}
    """
    breath_cues: Dict[str, Dict[str, str]] = {}

    for event in timeline.events:
        if not isinstance(event, BreathEvent):
            continue
        if event.pattern in breath_cues:
            continue  # already generated

        pattern = BREATH_PATTERNS.get(event.pattern)
        if not pattern:
            continue

        cues: Dict[str, str] = {}
        for phase in pattern.phases:
            cue_path = tmp_dir / f"breath_{event.pattern}_{phase.phase}.mp3"
            if not cue_path.exists():
                await generate_one_segment(
                    text=phase.cue_text,
                    voice_key=voice_key,
                    output_path=str(cue_path),
                    cache=cache,
                    provider_chain=provider_chain,
                )
            cues[phase.phase] = str(cue_path)

        breath_cues[event.pattern] = cues

    return breath_cues


async def tts_generator_node(state: MeditationEngineState) -> dict:
    """Generate TTS audio for all speech events and breath cues."""
    settings = get_settings()
    timeline = state["timeline"]
    job_id = state.get("job_id", "default")

    tmp_dir = Path(f"/tmp/meditation_{job_id}/segments")
    tmp_dir.mkdir(parents=True, exist_ok=True)

    # Build provider chain and cache
    provider_chain = build_provider_chain(settings)
    cache = TTSCache(redis_url=settings.redis_url, ttl_days=settings.tts_cache_ttl_days)

    # Count total speech events for progress
    speech_events = [e for e in timeline.events if isinstance(e, SpeechEvent)]
    total_segments = len(speech_events)

    speech_segments: List[SpeechSegment] = []
    total_speech_s = 0.0

    for idx, event in enumerate(timeline.events):
        if not isinstance(event, SpeechEvent):
            continue

        path = tmp_dir / f"{event.segment_id}.mp3"
        duration = await generate_one_segment(
            text=event.text,
            voice_key=state.get("voice_key", "gentle_female"),
            output_path=str(path),
            cache=cache,
            provider_chain=provider_chain,
        )

        speech_segments.append(SpeechSegment(
            segment_id=event.segment_id,
            path=str(path),
            duration_s=duration,
        ))
        total_speech_s += duration

        logger.info(
            f"TTS [{len(speech_segments)}/{total_segments}] "
            f"'{event.text[:30]}...' → {duration:.1f}s"
        )

    # Generate breath cues
    breath_cues = await generate_breath_cues(
        timeline=timeline,
        voice_key=state.get("voice_key", "gentle_female"),
        tmp_dir=tmp_dir,
        cache=cache,
        provider_chain=provider_chain,
    )

    return {
        "speech_segments": speech_segments,
        "total_speech_s": total_speech_s,
        "breath_cues": breath_cues,
        "current_stage": "tts_complete",
        "progress_pct": 60.0,
    }
