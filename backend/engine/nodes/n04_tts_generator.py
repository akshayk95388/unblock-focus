"""Node 04 — TTS Generator: Generates audio for every SpeechEvent and breath cue."""
import asyncio
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import List, Dict, Optional

from pydub import AudioSegment

from engine.state import MeditationEngineState
from engine.models.events import SpeechEvent, BreathEvent, SectionMarkerEvent
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
    rate: str = "+0%",
    speed: float = 1.0,
    previous_text: Optional[str] = None,
    next_text: Optional[str] = None,
) -> float:
    """Generate TTS for a single text segment. Returns actual audio duration in seconds.

    Tries each provider in the chain with retry logic.
    """
    # Use first provider's ID for cache key
    primary_provider_id = provider_chain[0].provider_id if provider_chain else "unknown"

    # Cache check (incorporating context into key if present)
    if previous_text or next_text:
        cache_key_text = f"{previous_text or ''}||{text}||{next_text or ''}"
    else:
        cache_key_text = text

    cached = cache.get(cache_key_text, voice_key, primary_provider_id)
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
                await provider.generate(
                    text=text,
                    voice_id=voice_key,
                    output_path=output_path,
                    rate=rate,
                    speed=speed,
                    previous_text=previous_text,
                    next_text=next_text,
                )
                audio_bytes = Path(output_path).read_bytes()
                cache.set(cache_key_text, voice_key, primary_provider_id, audio_bytes)
                logger.debug(f"Generated via {provider.provider_id} (ctx={bool(previous_text)}): '{text[:40]}...'")
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


@dataclass
class SectionPhase:
    section_name: str
    speech_events: List[SpeechEvent]


def extract_section_phases(timeline) -> List[SectionPhase]:
    """Group SpeechEvent items into SectionPhases using SectionMarkerEvent."""
    phases: List[SectionPhase] = []
    current_section = "grounding"
    current_speech: List[SpeechEvent] = []

    for event in timeline.events:
        if isinstance(event, SectionMarkerEvent):
            if current_speech:
                phases.append(SectionPhase(
                    section_name=current_section,
                    speech_events=current_speech,
                ))
                current_speech = []
            current_section = event.section_name
        elif isinstance(event, SpeechEvent):
            current_speech.append(event)

    if current_speech:
        phases.append(SectionPhase(
            section_name=current_section,
            speech_events=current_speech,
        ))

    return phases


async def _generate_single_shot_session(
    all_speech: List[SpeechEvent],
    voice_key: str,
    tmp_dir: Path,
    provider: TTSProvider,
) -> Optional[List[SpeechSegment]]:
    """Single continuous call for scripts <= 1,800 characters (0 seams)."""
    import io
    full_script = ""
    offsets = []
    for i, event in enumerate(all_speech):
        start = len(full_script)
        full_script += event.text.strip()
        end = len(full_script)
        offsets.append((start, end, event.segment_id))
        if i < len(all_speech) - 1:
            full_script += " "

    ts_res = await provider.generate_with_timestamps(
        text=full_script,
        voice_id=voice_key,
        speed=0.94,
    )

    audio_bytes = ts_res.get("audio_bytes")
    char_start = ts_res.get("char_start")
    char_end = ts_res.get("char_end")

    if not audio_bytes or not char_end:
        return None

    full_audio = AudioSegment.from_file(io.BytesIO(audio_bytes))
    num_chars = len(char_end)
    speech_segments: List[SpeechSegment] = []

    for start_c, end_c, segment_id in offsets:
        s_idx = min(start_c, num_chars - 1)
        e_idx = min(end_c - 1, num_chars - 1)

        start_s = char_start[s_idx] if s_idx < len(char_start) else 0.0
        end_s = char_end[e_idx] if e_idx < len(char_end) else (len(full_audio) / 1000.0)

        start_ms = int(start_s * 1000)
        end_ms = int(end_s * 1000)

        if end_ms <= start_ms:
            end_ms = start_ms + 500

        slice_clip = full_audio[start_ms:end_ms]
        path = tmp_dir / f"{segment_id}.mp3"
        slice_clip.export(str(path), format="mp3", bitrate="128k")

        speech_segments.append(SpeechSegment(
            segment_id=segment_id,
            path=str(path),
            duration_s=len(slice_clip) / 1000.0,
        ))

    logger.info(f"Single-Shot Session successful! Sliced {len(speech_segments)} segments from 1 continuous request (0 seams).")
    return speech_segments


async def _generate_chunked_session(
    phases: List[SectionPhase],
    voice_key: str,
    tmp_dir: Path,
    provider: TTSProvider,
) -> Optional[List[SpeechSegment]]:
    """Phase-merged chunked generation for scripts > 1,800 characters."""
    import io
    speech_segments: List[SpeechSegment] = []

    # Merge adjacent section phases into minimal chunks <= 1,500 chars
    chunks: List[List[SectionPhase]] = []
    current_chunk: List[SectionPhase] = []
    current_len = 0

    for phase in phases:
        phase_len = sum(len(e.text.strip()) for e in phase.speech_events)
        if current_chunk and (current_len + phase_len > 1500):
            chunks.append(current_chunk)
            current_chunk = [phase]
            current_len = phase_len
        else:
            current_chunk.append(phase)
            current_len += phase_len

    if current_chunk:
        chunks.append(current_chunk)

    chunk_texts = [
        " ".join(e.text.strip() for p in chunk for e in p.speech_events)
        for chunk in chunks
    ]

    for idx, chunk in enumerate(chunks):
        prev_text = chunk_texts[idx - 1] if idx > 0 else None
        next_text = chunk_texts[idx + 1] if idx < len(chunks) - 1 else None

        chunk_speech = [e for p in chunk for e in p.speech_events]
        chunk_script = ""
        offsets = []
        for j, event in enumerate(chunk_speech):
            start = len(chunk_script)
            chunk_script += event.text.strip()
            end = len(chunk_script)
            offsets.append((start, end, event.segment_id))
            if j < len(chunk_speech) - 1:
                chunk_script += " "

        ts_res = await provider.generate_with_timestamps(
            text=chunk_script,
            voice_id=voice_key,
            speed=0.94,
            previous_text=prev_text,
            next_text=next_text,
        )

        audio_bytes = ts_res.get("audio_bytes")
        char_start = ts_res.get("char_start")
        char_end = ts_res.get("char_end")

        if not audio_bytes or not char_end:
            return None

        chunk_audio = AudioSegment.from_file(io.BytesIO(audio_bytes))
        num_chars = len(char_end)

        for start_c, end_c, segment_id in offsets:
            s_idx = min(start_c, num_chars - 1)
            e_idx = min(end_c - 1, num_chars - 1)

            start_s = char_start[s_idx] if s_idx < len(char_start) else 0.0
            end_s = char_end[e_idx] if e_idx < len(char_end) else (len(chunk_audio) / 1000.0)

            start_ms = int(start_s * 1000)
            end_ms = int(end_s * 1000)

            if end_ms <= start_ms:
                end_ms = start_ms + 500

            slice_clip = chunk_audio[start_ms:end_ms]
            path = tmp_dir / f"{segment_id}.mp3"
            slice_clip.export(str(path), format="mp3", bitrate="128k")

            speech_segments.append(SpeechSegment(
                segment_id=segment_id,
                path=str(path),
                duration_s=len(slice_clip) / 1000.0,
            ))

    logger.info(f"Chunked Session successful! Generated {len(speech_segments)} segments across {len(chunks)} stitched chunks.")
    return speech_segments


async def try_generate_adaptive_tts(
    timeline,
    voice_key: str,
    tmp_dir: Path,
    provider_chain: List[TTSProvider],
) -> Optional[List[SpeechSegment]]:
    """Smart Length-Adaptive TTS Generation.

    - Scripts <= 1,800 chars (3-min & 5-min sessions): 1 single continuous call (0 seams).
    - Scripts > 1,800 chars (10-min sessions): Phase-merged chunks <= 1,500 chars with context stitching.
    - Slices segment MP3 files via character alignment timestamps.
    """
    primary_provider = provider_chain[0] if provider_chain else None
    if not hasattr(primary_provider, "generate_with_timestamps"):
        return None

    phases = extract_section_phases(timeline)
    if not phases:
        return None

    all_speech = [e for p in phases for e in p.speech_events]
    if not all_speech:
        return None

    total_chars = sum(len(e.text.strip()) for e in all_speech) + len(all_speech)

    try:
        if total_chars <= 1800:
            logger.info(f"Length-Adaptive TTS: Script length ({total_chars} chars) <= 1,800. Executing Single-Shot Call (0 seams)...")
            return await _generate_single_shot_session(
                all_speech=all_speech,
                voice_key=voice_key,
                tmp_dir=tmp_dir,
                provider=primary_provider,
            )
        else:
            logger.info(f"Length-Adaptive TTS: Script length ({total_chars} chars) > 1,800. Executing Phase-Chunked Stitching...")
            return await _generate_chunked_session(
                phases=phases,
                voice_key=voice_key,
                tmp_dir=tmp_dir,
                provider=primary_provider,
            )
    except Exception as e:
        logger.warning(f"Length-Adaptive TTS failed ({e}). Falling back to per-segment generation.")
        return None


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

    speech_events = [e for e in timeline.events if isinstance(e, SpeechEvent)]
    total_segments = len(speech_events)
    voice_key = state.get("voice_key", "gentle_female")

    # Attempt Smart Length-Adaptive single-take generation first
    phase_segments = await try_generate_adaptive_tts(
        timeline=timeline,
        voice_key=voice_key,
        tmp_dir=tmp_dir,
        provider_chain=provider_chain,
    )

    if phase_segments:
        speech_segments = phase_segments
        total_speech_s = sum(s.duration_s for s in speech_segments)
    else:
        # Fallback per-segment generation loop with context stitching (previous_text / next_text)
        speech_segments: List[SpeechSegment] = []
        total_speech_s = 0.0
        current_section = "grounding"
        speech_idx = 0

        for event in timeline.events:
            if isinstance(event, SectionMarkerEvent):
                current_section = event.section_name
                continue
            if not isinstance(event, SpeechEvent):
                continue

            prev_event = speech_events[speech_idx - 1] if speech_idx > 0 else None
            next_event = speech_events[speech_idx + 1] if speech_idx < total_segments - 1 else None
            speech_idx += 1

            prev_text = prev_event.text if prev_event else None
            next_text = next_event.text if next_event else None

            if current_section in ("breathing_reset", "body_release", "core_reset", "breathing"):
                rate = "-6%"
                speed = 0.94
            elif current_section in ("reframe", "closing"):
                rate = "+4%"
                speed = 1.04
            else:
                rate = "+0%"
                speed = 1.0

            path = tmp_dir / f"{event.segment_id}.mp3"
            duration = await generate_one_segment(
                text=event.text,
                voice_key=voice_key,
                output_path=str(path),
                cache=cache,
                provider_chain=provider_chain,
                rate=rate,
                speed=speed,
                previous_text=prev_text,
                next_text=next_text,
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
