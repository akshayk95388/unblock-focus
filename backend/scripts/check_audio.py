#!/usr/bin/env python3
"""CLI: Check audio quality metrics of a meditation file.

Usage:
    python scripts/check_audio.py /tmp/test_meditation.mp3
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def get_audio_info(path: str) -> dict:
    """Use ffprobe to get format info."""
    cmd = [
        "ffprobe", "-v", "quiet", "-print_format", "json",
        "-show_format", "-show_streams", path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"❌ ffprobe failed: {result.stderr[:200]}")
        return {}
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


def get_peak(path: str) -> float:
    """Get true peak in dBFS."""
    cmd = [
        "ffmpeg", "-i", path,
        "-filter:a", "loudnorm=print_format=json",
        "-f", "null", "-",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    match = re.search(r'"input_tp"\s*:\s*"([-\d.]+)"', result.stderr)
    return float(match.group(1)) if match else None


def check_silent_gaps(path: str, threshold_s: float = 20.0) -> int:
    """Count silent gaps longer than threshold."""
    cmd = [
        "ffmpeg", "-i", path,
        "-filter:a", f"silencedetect=noise=-40dB:d={threshold_s}",
        "-f", "null", "-",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.stderr.count("silence_end")


def main():
    parser = argparse.ArgumentParser(description="Check audio quality")
    parser.add_argument("path", help="Path to audio file")
    parser.add_argument("--target", type=float, default=None, help="Target duration in seconds")
    args = parser.parse_args()

    path = args.path
    if not Path(path).exists():
        print(f"❌ File not found: {path}")
        sys.exit(1)

    print(f"\n🔍 Checking: {path}\n")

    info = get_audio_info(path)
    if not info:
        sys.exit(1)

    fmt = info.get("format", {})
    stream = info.get("streams", [{}])[0] if info.get("streams") else {}

    # Format
    format_name = fmt.get("format_name", "unknown")
    ok = "✅" if "mp3" in format_name else "⚠️"
    print(f"   Format:    {format_name} {ok}")

    # Duration
    duration_s = float(fmt.get("duration", 0))
    if args.target:
        delta = abs(duration_s - args.target)
        ok = "✅" if delta <= 15 else "❌"
        print(f"   Duration:  {duration_s:.1f}s (target: {args.target:.0f}s, delta: {delta:.1f}s) {ok}")
    else:
        print(f"   Duration:  {duration_s:.1f}s")

    # Bitrate
    bitrate = int(fmt.get("bit_rate", 0)) // 1000
    ok = "✅" if 180 <= bitrate <= 210 else "⚠️"
    print(f"   Bitrate:   {bitrate}kbps {ok}")

    # Loudness
    lufs = get_loudness(path)
    if lufs is not None:
        ok = "✅" if -15.5 <= lufs <= -12.5 else "⚠️"
        print(f"   LUFS:      {lufs:.1f} (target: -14, range: ±1.5) {ok}")

    # Peak
    peak = get_peak(path)
    if peak is not None:
        ok = "✅" if peak <= -1.0 else "⚠️"
        print(f"   Peak:      {peak:.1f}dBFS (below -1.5 limit) {ok}")

    # Silent gaps
    gaps = check_silent_gaps(path)
    ok = "✅" if gaps == 0 else "⚠️"
    print(f"   Silence:   {gaps} silent gaps > 20s {ok}")

    print()


if __name__ == "__main__":
    main()
