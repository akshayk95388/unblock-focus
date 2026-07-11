"""Node 06 — Mastering: Takes assembled WAV, normalizes, adds music, exports MP3."""
import logging
from pathlib import Path
from typing import Optional

from engine.state import MeditationEngineState
from engine.audio.ffmpeg import build_mastering_command, run_ffmpeg
from engine.audio.music import select_music_track

logger = logging.getLogger(__name__)


async def mastering_node(state: MeditationEngineState) -> dict:
    """Master the assembled audio: normalize, add music, fade, export MP3."""
    job_id = state.get("job_id", "default")
    assembled_path = state["assembled_path"]
    duration_s = state["actual_duration_s"]

    output_dir = Path(f"/tmp/meditation_{job_id}")
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = str(output_dir / "mastered.mp3")

    # Select music track
    music_key = state.get("music_key", "none")
    music_path: Optional[str] = None

    if music_key != "none":
        from config.settings import get_settings
        settings = get_settings()
        music_path = select_music_track(
            meditation_type=state.get("meditation_type", "anxiety"),
            music_key=music_key,
            assets_dir=str(settings.assets_path),
        )

    # Build and run FFmpeg mastering command
    cmd = build_mastering_command(
        voice_path=assembled_path,
        music_path=music_path,
        output_path=output_path,
        duration_s=duration_s,
    )

    await run_ffmpeg(cmd)

    logger.info(f"Mastered audio: {output_path}")

    return {
        "mastered_path": output_path,
        "current_stage": "mastered",
        "progress_pct": 90.0,
    }
