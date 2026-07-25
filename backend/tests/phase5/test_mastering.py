"""Phase 5 Tests — Audio Mastering + Music

Tests FFmpeg mastering pipeline: loudness normalization, bitrate, fades, and music overlay.
"""
import pytest
import subprocess
import json
import re
from pathlib import Path

from pydub import AudioSegment
from pydub.generators import Sine

from engine.audio.ffmpeg import build_mastering_command, run_ffmpeg
from engine.audio.music import generate_synthetic_ambient_to_file, select_music_track


# ── Helpers ──────────────────────────────────────────────────────────


def create_test_wav(path: Path, duration_s: float = 10) -> None:
    """Create a test WAV file with speech-like characteristics."""
    # Mix multiple frequencies to simulate speech spectrum
    tone1 = Sine(200).to_audio_segment(duration=int(duration_s * 1000)).apply_gain(-12)
    tone2 = Sine(400).to_audio_segment(duration=int(duration_s * 1000)).apply_gain(-18)
    tone3 = Sine(800).to_audio_segment(duration=int(duration_s * 1000)).apply_gain(-24)
    mixed = tone1.overlay(tone2).overlay(tone3)
    mixed.export(str(path), format="wav")


def create_test_music(path: Path, duration_s: float = 10) -> None:
    """Create a test music MP3 file."""
    tone = Sine(220).to_audio_segment(duration=int(duration_s * 1000)).apply_gain(-15)
    tone.export(str(path), format="mp3")


def get_audio_info(path: str) -> dict:
    """Use ffprobe to get format info."""
    probe_cmd = [
        "ffprobe", "-v", "quiet", "-print_format", "json",
        "-show_format", "-show_streams", path,
    ]
    result = subprocess.run(probe_cmd, capture_output=True, text=True)
    return json.loads(result.stdout)


def get_loudness(path: str) -> float:
    """Get integrated loudness via ffmpeg loudnorm analysis."""
    cmd = [
        "ffmpeg", "-i", path,
        "-filter:a", "loudnorm=print_format=json",
        "-f", "null", "-",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    match = re.search(r'"input_i"\s*:\s*"([-\d.]+)"', result.stderr)
    return float(match.group(1)) if match else None


async def run_mastering(
    voice_path: str,
    output_path: str,
    music_path: str = None,
) -> None:
    """Helper to run the mastering pipeline."""
    from pydub import AudioSegment as AS
    voice_audio = AS.from_file(voice_path)
    duration_s = len(voice_audio) / 1000.0

    cmd = build_mastering_command(
        voice_path=voice_path,
        music_path=music_path,
        output_path=output_path,
        duration_s=duration_s,
    )
    await run_ffmpeg(cmd)


# ── FFmpeg command builder tests ────────────────────────────────────


def test_build_command_no_music():
    """Command without music should have one input and no ducking."""
    cmd = build_mastering_command(
        voice_path="/tmp/voice.wav",
        music_path=None,
        output_path="/tmp/out.mp3",
        duration_s=60.0,
    )
    assert cmd[0] == "ffmpeg"
    assert cmd.count("-i") == 1
    assert "libmp3lame" in cmd
    assert "192k" in cmd
    filter_str = " ".join(cmd)
    assert "sidechaincompress" not in filter_str
    assert "asplit" not in filter_str


def test_build_command_with_music():
    """Command with music should have two inputs and sidechain ducking."""
    cmd = build_mastering_command(
        voice_path="/tmp/voice.wav",
        music_path="/tmp/music.mp3",
        output_path="/tmp/out.mp3",
        duration_s=60.0,
    )
    filter_str = " ".join(cmd)
    assert cmd.count("-i") == 2
    assert "amix" in filter_str
    # Sidechain ducking: voice is split, music is compressed by voice level
    assert "asplit" in filter_str
    assert "sidechaincompress" in filter_str


def test_build_subtitles_includes_words():
    """Verify build_subtitles calculates global word timestamps correctly."""
    from engine.models.job import SpeechSegment
    from engine.models.events import SpeechEvent
    from engine.models.timeline import MeditationTimeline
    from engine.nodes.n07_storage_notify import build_subtitles

    timeline = MeditationTimeline(
        events=[
            SpeechEvent(segment_id="seg_0", text="Breathe in deeply.")
        ]
    )
    speech_segments = [
        SpeechSegment(
            segment_id="seg_0",
            path="/tmp/seg_0.mp3",
            duration_s=3.0,
            words=[
                {"word": "Breathe", "start_ms": 0, "end_ms": 500},
                {"word": "in", "start_ms": 520, "end_ms": 700},
                {"word": "deeply.", "start_ms": 710, "end_ms": 1400},
            ],
        )
    ]

    state = {
        "timeline": timeline,
        "speech_segments": speech_segments,
    }

    subtitles = build_subtitles(state)
    assert len(subtitles) == 1
    assert subtitles[0].segment_id == "seg_0"
    assert subtitles[0].start_ms == 1500  # Starts after leading silence
    assert subtitles[0].words is not None
    assert len(subtitles[0].words) == 3
    # Word timestamps should be offset by 1500ms leading silence
    assert subtitles[0].words[0] == {"word": "Breathe", "start_ms": 1500, "end_ms": 2000}
    assert subtitles[0].words[1] == {"word": "in", "start_ms": 2020, "end_ms": 2200}
    assert subtitles[0].words[2] == {"word": "deeply.", "start_ms": 2210, "end_ms": 2900}


def test_build_subtitles_includes_breath_cue_words():
    """Verify build_subtitles generates word timestamps for breath cues."""
    from engine.models.events import BreathEvent
    from engine.models.timeline import MeditationTimeline
    from engine.nodes.n07_storage_notify import build_subtitles

    timeline = MeditationTimeline(
        events=[
            BreathEvent(pattern="box_4", cycles=1)
        ]
    )
    state = {
        "timeline": timeline,
        "speech_segments": [],
    }

    subtitles = build_subtitles(state)
    assert len(subtitles) == 4  # box_4 has 4 phases: inhale, hold_in, exhale, hold_out
    # Inhale cue: "Breathe in..."
    inhale_sub = subtitles[0]
    assert inhale_sub.text == "Breathe in..."
    assert inhale_sub.words is not None
    assert len(inhale_sub.words) == 2
    assert inhale_sub.words[0]["word"] == "Breathe"
    assert inhale_sub.words[1]["word"] == "in..."
    assert inhale_sub.words[0]["start_ms"] == 1500


def test_build_command_fade_positions():
    """Fade out should start 3s before duration end for voice-only mastering."""
    cmd = build_mastering_command(
        voice_path="/tmp/voice.wav",
        music_path=None,
        output_path="/tmp/out.mp3",
        duration_s=60.0,
    )
    filter_str = " ".join(cmd)
    assert "afade=t=out:st=57.0:d=3" in filter_str

    # Test fade in when music track is provided
    cmd_music = build_mastering_command(
        voice_path="/tmp/voice.wav",
        music_path="/tmp/music.mp3",
        output_path="/tmp/out.mp3",
        duration_s=60.0,
    )
    filter_music_str = " ".join(cmd_music)
    assert "afade=t=in:d=3" in filter_music_str
    assert "afade=t=out:st=57.0:d=3" in filter_music_str



# ── Mastering pipeline tests ───────────────────────────────────────


@pytest.mark.asyncio
async def test_mastered_output_is_mp3(tmp_path):
    """Mastered output must be a valid MP3."""
    voice = tmp_path / "voice.wav"
    output = tmp_path / "mastered.mp3"
    create_test_wav(voice, duration_s=10)
    await run_mastering(str(voice), str(output))

    assert output.exists()
    info = get_audio_info(str(output))
    assert "mp3" in info["format"]["format_name"]


@pytest.mark.asyncio
async def test_mastered_bitrate_is_192k(tmp_path):
    """Output bitrate should be near 192kbps."""
    voice = tmp_path / "voice.wav"
    output = tmp_path / "mastered.mp3"
    create_test_wav(voice, duration_s=30)
    await run_mastering(str(voice), str(output))

    info = get_audio_info(str(output))
    bitrate = int(info["format"]["bit_rate"]) // 1000
    assert 180 <= bitrate <= 210, f"Bitrate {bitrate}kbps not near 192kbps"


@pytest.mark.asyncio
async def test_output_duration_matches_input(tmp_path):
    """Mastering must not change audio duration by more than 1s."""
    voice = tmp_path / "voice.wav"
    output = tmp_path / "mastered.mp3"
    create_test_wav(voice, duration_s=30)
    await run_mastering(str(voice), str(output))

    voice_audio = AudioSegment.from_file(str(voice))
    output_audio = AudioSegment.from_file(str(output))
    delta = abs(len(output_audio) - len(voice_audio)) / 1000.0
    assert delta < 1.0, f"Duration changed by {delta}s"


@pytest.mark.asyncio
async def test_normalized_loudness_within_range(tmp_path):
    """LUFS should be near -14 after normalization."""
    voice = tmp_path / "voice.wav"
    output = tmp_path / "mastered.mp3"
    create_test_wav(voice, duration_s=30)
    await run_mastering(str(voice), str(output))

    lufs = get_loudness(str(output))
    assert lufs is not None, "Could not measure loudness"
    assert -17.0 <= lufs <= -11.0, f"LUFS {lufs} not in target range"


@pytest.mark.asyncio
async def test_music_overlay_produces_output(tmp_path):
    """Music overlay must succeed and produce valid output."""
    voice = tmp_path / "voice.wav"
    music = tmp_path / "music.mp3"
    output = tmp_path / "mastered.mp3"
    create_test_wav(voice, duration_s=20)
    create_test_music(music, duration_s=10)

    await run_mastering(str(voice), str(output), music_path=str(music))

    assert output.exists()
    audio = AudioSegment.from_file(str(output))
    assert len(audio) > 15000  # at least 15 seconds


# ── Synthetic music tests ──────────────────────────────────────────


def test_synthetic_ambient_generates_file():
    """Synthetic ambient generator must produce an MP3 file."""
    path = generate_synthetic_ambient_to_file("anxiety", duration_s=5.0)
    assert Path(path).exists()
    audio = AudioSegment.from_file(path)
    assert 4000 <= len(audio) <= 6000  # ~5 seconds


def test_select_music_none():
    """music_key='none' should return None."""
    result = select_music_track("anxiety", "none", "/tmp/nonexistent")
    assert result is None


def test_select_music_fallback_to_synthetic():
    """When no music files exist, should fall back to synthetic."""
    result = select_music_track("anxiety", "ambient", "/tmp/no_assets_here_12345")
    assert result is not None
    assert Path(result).exists()


def test_select_music_from_assets_directory(tmp_path):
    """When music files exist in assets_dir/music/{meditation_type}, select one."""
    type_dir = tmp_path / "music" / "anxiety"
    type_dir.mkdir(parents=True)
    track1 = type_dir / "ambient1.mp3"
    create_test_music(track1, duration_s=5)

    selected = select_music_track("anxiety", "ambient", str(tmp_path))
    assert selected == str(track1)


def test_populate_and_verify_real_assets(tmp_path):
    """Verify track selection works with music tracks in assets directory structure."""
    music_dir = tmp_path / "music"
    music_dir.mkdir(parents=True)
    track_file = music_dir / "meditation_impromptu.mp3"
    create_test_music(track_file, duration_s=5)

    selected = select_music_track(meditation_type="anxiety", music_key="meditation_impromptu", assets_dir=str(tmp_path))
    assert selected == str(track_file)



