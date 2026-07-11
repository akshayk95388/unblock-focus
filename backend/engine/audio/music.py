"""Music track selection and synthetic ambient generation."""
import logging
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import numpy as np
from pydub import AudioSegment

logger = logging.getLogger(__name__)


@dataclass
class MusicTrack:
    file: str
    type: str           # anxiety | sleep | focus
    energy: float       # 0.0-1.0
    loopable: bool
    loop_start_s: float = 0.0
    loop_end_s: float = 0.0


def select_music_track(
    meditation_type: str,
    music_key: str,
    assets_dir: str,
) -> Optional[str]:
    """Select a music track for the meditation.

    Returns path to the music file, or None if no music.
    """
    if music_key == "none":
        return None

    type_dir = Path(assets_dir) / "music" / meditation_type
    if type_dir.exists():
        tracks = list(type_dir.glob("*.mp3"))
        if tracks:
            return str(random.choice(tracks))

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
