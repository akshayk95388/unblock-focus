"""FFmpeg mastering commands for final audio processing."""
import asyncio
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)


def build_mastering_command(
    voice_path: str,
    music_path: Optional[str],
    output_path: str,
    duration_s: float,
    music_db: float = -20.0,
) -> List[str]:
    """Builds an FFmpeg command that:
    1. Mixes voice + music (music at -20dB)
    2. Normalizes loudness to -14 LUFS (streaming standard)
    3. Applies 3s fade-in on background music only (voice stays at full volume)
    4. Applies 3s fade-out on the master track
    5. Exports 192kbps MP3
    """
    fade_out_start = max(0, duration_s - 3)

    if music_path:
        filter_graph = (
            f"[1:a]volume={music_db}dB,afade=t=in:d=3,aloop=loop=-1:size=2000000000[music];"
            f"[0:a][music]amix=inputs=2:duration=first:weights=1 1[mixed];"
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
