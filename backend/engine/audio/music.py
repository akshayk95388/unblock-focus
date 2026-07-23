"""Music track selection and synthetic ambient generation."""
import logging
import random
from pathlib import Path
from typing import Optional

import numpy as np
from pydub import AudioSegment

logger = logging.getLogger(__name__)


def select_music_track(
    meditation_type: str,
    music_key: str,
    assets_dir: str,
) -> Optional[str]:
    """Select a music track for the meditation.

    Supports flat assets/music/ directory with direct music keys,
    subfolder lookup for backward compatibility, and synthetic fallback.
    """
    if music_key in ("none", "", None):
        return None

    music_root = Path(assets_dir) / "music"
    if not music_root.exists():
        return generate_synthetic_ambient_to_file(meditation_type)

    # 1. Direct file match in music_root (e.g. music_key="meditation_impromptu" -> assets/music/meditation_impromptu.mp3)
    for ext in (".mp3", ".wav"):
        direct_file = music_root / f"{music_key}{ext}"
        if direct_file.exists():
            return str(direct_file)

    # 2. Substring match in music_root
    for track in music_root.glob("*.mp3"):
        if music_key.lower() in track.stem.lower():
            return str(track)

    # 3. Subfolder match if subfolders exist
    sub_dir = music_root / music_key
    if sub_dir.is_dir():
        tracks = list(sub_dir.glob("*.mp3"))
        if tracks:
            return str(random.choice(tracks))

    # 4. Fallback to any available MP3 file in music_root or subfolders
    all_tracks = list(music_root.glob("*.mp3")) + list(music_root.glob("**/*.mp3"))
    if all_tracks:
        return str(random.choice(all_tracks))

    # Synthetic fallback
    return generate_synthetic_ambient_to_file(meditation_type)


def generate_synthetic_ambient_to_file(
    meditation_type: str,
    duration_s: float = 60.0,
) -> str:
    """Generate a synthetic ambient audio file using numpy.

    Creates a warm, droning pad sound that loops well.
    """
    import tempfile

    sample_rate = 44100
    num_samples = int(duration_s * sample_rate)
    t = np.linspace(0, duration_s, num_samples, dtype=np.float32)

    # Base frequencies for different meditation types
    freqs = {
        "anxiety": [110, 165, 220],     # A2, E3, A3 — warm, grounding
        "sleep":   [82.41, 123.47, 164.81],  # E2, B2, E3 — deep, slow
        "focus":   [130.81, 196, 261.63],     # C3, G3, C4 — clear, centered
    }

    base_freqs = freqs.get(meditation_type, freqs["anxiety"])

    # Generate layered sine waves with slow modulation
    signal = np.zeros(num_samples, dtype=np.float32)
    for freq in base_freqs:
        # Add vibrato (slow pitch modulation)
        vibrato = 1 + 0.002 * np.sin(2 * np.pi * 0.1 * t)
        signal += 0.15 * np.sin(2 * np.pi * freq * vibrato * t)

    # Apply gentle fade in/out
    fade_samples = int(3.0 * sample_rate)
    signal[:fade_samples] *= np.linspace(0, 1, fade_samples)
    signal[-fade_samples:] *= np.linspace(1, 0, fade_samples)

    # Normalize
    max_val = np.max(np.abs(signal))
    if max_val > 0:
        signal = signal / max_val * 0.5  # -6dB headroom

    # Convert to 16-bit PCM
    samples_16bit = (signal * 32767).astype(np.int16)

    # Create AudioSegment and export
    audio = AudioSegment(
        data=samples_16bit.tobytes(),
        sample_width=2,
        frame_rate=sample_rate,
        channels=1,
    )

    out_path = Path(tempfile.mktemp(suffix=".mp3", prefix=f"ambient_{meditation_type}_"))
    audio.export(str(out_path), format="mp3", bitrate="128k")

    logger.debug(f"Generated synthetic ambient: {out_path} ({duration_s}s)")
    return str(out_path)
