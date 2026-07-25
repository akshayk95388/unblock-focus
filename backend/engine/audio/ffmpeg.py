"""FFmpeg mastering commands for final audio processing."""
import asyncio
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)

# ── Sidechain ducking parameters ──────────────────────────────────────
# Tuned specifically for meditation / guided reset audio:
# - Subtle gain reduction (ratio 1.8:1) so music dips gently by ~2-3dB (no harsh plunging)
# - Slower attack (0.6s) and long release (2.2s) to prevent "pumping" between short spoken sentences
# - Music stays stably dipped during speech flow and only swells during long pauses/breathing
DUCK_THRESHOLD = 0.03   # ~-30dB; sensitive trigger for voice activity
DUCK_RATIO = 1.8        # Gentle 1.8:1 gain reduction (subtle dip, not muted)
DUCK_ATTACK_S = 0.6     # 600ms smooth onset — glides down naturally
DUCK_RELEASE_S = 2.2    # 2.2s long release — prevents rapid pumping between sentences
DUCK_KNEE = 4.0         # Soft knee for transparent transitions


def build_mastering_command(
    voice_path: str,
    music_path: Optional[str],
    output_path: str,
    duration_s: float,
    music_db: float = -23.0,
) -> List[str]:
    """Builds an FFmpeg command that:
    1. Mixes voice + music with sidechain ducking (music dips during speech,
       swells back during pauses and breathing)
    2. Normalizes loudness to -14 LUFS (streaming standard)
    3. Applies 3s fade-in on background music only (voice stays at full volume)
    4. Applies 3s fade-out on the master track
    5. Exports 192kbps MP3
    """
    fade_out_start = max(0, duration_s - 3)

    if music_path:
        filter_graph = (
            # Split voice: one copy for mixing, one as sidechain trigger
            f"[0:a]asplit=2[voice][sc];"
            # Prepare music: attenuate, fade in, and loop to match voice length
            f"[1:a]volume={music_db}dB,afade=t=in:d=3,"
            f"aloop=loop=-1:size=2000000000[music];"
            # Sidechain compress: duck music when voice is active
            f"[music][sc]sidechaincompress="
            f"threshold={DUCK_THRESHOLD}:ratio={DUCK_RATIO}:"
            f"attack={DUCK_ATTACK_S}:release={DUCK_RELEASE_S}:"
            f"knee={DUCK_KNEE}[ducked];"
            # Mix voice + ducked music
            f"[voice][ducked]amix=inputs=2:duration=first:weights=1 1[mixed];"
            # Normalize loudness and apply final fade-out
            f"[mixed]loudnorm=I=-14:TP=-1.5:LRA=7[normed];"
            f"[normed]afade=t=out:st={fade_out_start:.1f}:d=3[final]"
        )
        inputs = ["-i", voice_path, "-i", music_path]
    else:
        filter_graph = (
            f"[0:a]loudnorm=I=-14:TP=-1.5:LRA=7[normed];"
            f"[normed]afade=t=out:st={fade_out_start:.1f}:d=3[final]"
        )
        inputs = ["-i", voice_path]

    return [
        "ffmpeg", "-y",
        *inputs,
        "-filter_complex", filter_graph,
        "-map", "[final]",
        "-codec:a", "libmp3lame",
        "-b:a", "192k",
        output_path,
    ]


async def run_ffmpeg(cmd: List[str]) -> None:
    """Run an FFmpeg command asynchronously."""
    logger.info(f"Running FFmpeg: {' '.join(cmd[:6])}...")

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()

    if proc.returncode != 0:
        error_text = stderr.decode()[-500:]
        logger.error(f"FFmpeg failed: {error_text}")
        raise RuntimeError(f"FFmpeg failed: {error_text}")

    logger.debug("FFmpeg completed successfully")
