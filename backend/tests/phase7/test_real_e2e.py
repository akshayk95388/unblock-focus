"""Real E2E test — uses actual OpenAI API + Edge TTS + FFmpeg.

This test exercises the complete pipeline without any mocking.
Requires OPENAI_API_KEY in .env.

Run:
    cd backend
    source venv/bin/activate
    python -m pytest tests/phase7/test_real_e2e.py -v -s --timeout=300
"""
import pytest
import subprocess
import json
from pathlib import Path

from pydub import AudioSegment

from engine.pipeline import run_full_pipeline


@pytest.mark.asyncio
async def test_real_e2e_anxiety_3min():
    """Full pipeline with real OpenAI + Edge TTS: 3-minute anxiety meditation."""
    result = await run_full_pipeline(
        stressor="anxiety about presenting to a large audience tomorrow",
        duration_mins=3,
        voice_key="gentle_female",
        music_key="none",
    )

    print(f"\n{'='*60}")
    print(f"REAL E2E RESULT")
    print(f"{'='*60}")
    print(f"  Status:     {result['status']}")

    if result["status"] == "failed":
        print(f"  Error:      {result.get('error')}")
        pytest.fail(f"Pipeline failed: {result.get('error')}")

    print(f"  Type:       {result.get('meditation_type')}")
    print(f"  Title:      {result.get('title')}")
    print(f"  Segments:   {result.get('total_segments')}")

    audio_path = result.get("local_path")
    assert audio_path is not None, "No output file path"
    assert Path(audio_path).exists(), f"File not found: {audio_path}"

    # Check audio properties
    audio = AudioSegment.from_file(audio_path)
    actual_s = len(audio) / 1000.0
    target_s = 180.0
    delta_s = abs(actual_s - target_s)

    print(f"  Target:     {target_s}s")
    print(f"  Actual:     {actual_s:.1f}s")
    print(f"  Delta:      {delta_s:.1f}s")
    print(f"  Path:       {audio_path}")

    # Check MP3 validity
    probe = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json",
         "-show_format", audio_path],
        capture_output=True, text=True,
    )
    info = json.loads(probe.stdout)
    assert "mp3" in info["format"]["format_name"], "Output is not MP3"

    bitrate = int(info["format"]["bit_rate"]) // 1000
    print(f"  Bitrate:    {bitrate}kbps")
    print(f"  Format:     {info['format']['format_name']}")

    # Subtitles
    subtitles = result.get("subtitles", [])
    print(f"  Subtitles:  {len(subtitles)}")

    if subtitles:
        print(f"\n  First 3 subtitle lines:")
        for s in subtitles[:3]:
            print(f"    [{s['start_ms']}ms] {s['text']}")

    print(f"{'='*60}\n")

    # Assertions
    assert result["meditation_type"] in ("anxiety", "sleep", "focus")
    assert delta_s <= 30.0, f"Duration error {delta_s:.1f}s exceeds ±30s tolerance"
    assert result.get("total_segments", 0) >= 8, "Too few segments"
    assert 150 <= bitrate <= 220, f"Bitrate {bitrate}kbps out of range"
    assert len(subtitles) >= 5, "Too few subtitles"


@pytest.mark.asyncio
async def test_real_e2e_sleep_5min():
    """Full pipeline with real OpenAI + Edge TTS: 5-minute sleep meditation."""
    result = await run_full_pipeline(
        stressor="racing thoughts keeping me up at night",
        duration_mins=5,
        voice_key="gentle_female",
        music_key="none",
    )

    print(f"\n{'='*60}")
    print(f"REAL E2E — SLEEP 5min")
    print(f"{'='*60}")
    print(f"  Status:     {result['status']}")

    if result["status"] == "failed":
        print(f"  Error:      {result.get('error')}")
        pytest.fail(f"Pipeline failed: {result.get('error')}")

    audio_path = result.get("local_path")
    audio = AudioSegment.from_file(audio_path)
    actual_s = len(audio) / 1000.0
    delta_s = abs(actual_s - 300.0)

    print(f"  Type:       {result.get('meditation_type')}")
    print(f"  Title:      {result.get('title')}")
    print(f"  Target:     300s")
    print(f"  Actual:     {actual_s:.1f}s")
    print(f"  Delta:      {delta_s:.1f}s")
    print(f"  Segments:   {result.get('total_segments')}")
    print(f"{'='*60}\n")

    assert result["status"] == "complete"
    assert result.get("meditation_type") in ("anxiety", "sleep", "focus")
    assert delta_s <= 30.0, f"Duration error {delta_s:.1f}s exceeds ±30s tolerance"
