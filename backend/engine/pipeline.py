"""LangGraph pipeline — wires all nodes into a StateGraph.

Note: For Phase 1 (dev), we use a simplified sequential pipeline
via run_full_pipeline() without LangGraph checkpointing. The LangGraph
StateGraph is defined but used only when you want checkpoint/resume
support.
"""
import logging
import uuid
from typing import Optional

from engine.state import MeditationEngineState
from engine.nodes.n01_classifier import classifier_node
from engine.nodes.n02_script_generator import script_generator_node
from engine.nodes.n03_validator import validator_node, validator_router
from engine.nodes.n04_tts_generator import tts_generator_node
from engine.nodes.n05_audio_composer import audio_composer_node
from engine.nodes.n06_mastering import mastering_node
from engine.nodes.n07_storage_notify import storage_notify_node

logger = logging.getLogger(__name__)


async def run_full_pipeline(
    stressor: str,
    duration_mins: int,
    voice_key: str = "gentle_female",
    music_key: str = "none",
    job_id: Optional[str] = None,
) -> dict:
    """Run the full meditation generation pipeline sequentially.

    Returns a result dict with status, path, title, type, etc.
    """
    if job_id is None:
        job_id = str(uuid.uuid4())

    state: dict = {
        "job_id": job_id,
        "stressor": stressor,
        "duration_mins": duration_mins,
        "voice_key": voice_key,
        "music_key": music_key,
        "fix_attempts": 0,
    }

    try:
        # Steps 1-3: Execute LangGraph Script Generator Agent (Classifier -> Script Generator -> Validator)
        logger.info(f"[{job_id[:8]}] Running Script Generator Graph Agent for: '{stressor[:50]}'")
        from engine.graphs.script_generator import run_script_generator_agent
        script_agent_result = await run_script_generator_agent(
            stressor=stressor,
            duration_mins=duration_mins,
            voice_key=voice_key,
            music_key=music_key,
            job_id=job_id,
        )
        state.update(script_agent_result)

        timeline = state["timeline"]
        speech_count = sum(1 for e in timeline.events
                          if hasattr(e, 'type') and e.type == 'speech')
        logger.info(
            f"[{job_id[:8]}] Script: \"{timeline.title}\" — "
            f"{speech_count} segments"
        )

        # Step 4: TTS
        logger.info(f"[{job_id[:8]}] Generating TTS...")
        result = await tts_generator_node(state)
        state.update(result)
        logger.info(
            f"[{job_id[:8]}] TTS complete: "
            f"{len(state['speech_segments'])} segments, "
            f"{state['total_speech_s']:.1f}s speech"
        )

        # Step 5: Audio assembly
        logger.info(f"[{job_id[:8]}] Composing audio...")
        result = await audio_composer_node(state)
        state.update(result)
        logger.info(
            f"[{job_id[:8]}] Composed: {state['actual_duration_s']:.1f}s "
            f"(target: {duration_mins * 60}s)"
        )

        # Step 6: Mastering
        logger.info(f"[{job_id[:8]}] Mastering...")
        result = await mastering_node(state)
        state.update(result)

        # Step 7: Storage
        logger.info(f"[{job_id[:8]}] Storing...")
        result = await storage_notify_node(state)
        state.update(result)

        logger.info(f"[{job_id[:8]}] Complete: {state.get('storage_url')}")

        return {
            "status": "complete",
            "job_id": job_id,
            "meditation_type": state.get("meditation_type"),
            "title": state.get("timeline", {}).title if hasattr(state.get("timeline"), "title") else "",
            "local_path": state.get("mastered_path"),
            "storage_url": state.get("storage_url"),
            "actual_duration_s": state.get("actual_duration_s"),
            "total_segments": len(state.get("speech_segments", [])),
            "subtitles": [
                {"segment_id": s.segment_id, "text": s.text,
                 "start_ms": s.start_ms, "end_ms": s.end_ms}
                for s in state.get("subtitles", [])
            ],
            "timeline": state.get("timeline"),
        }

    except Exception as e:
        logger.error(f"[{job_id[:8]}] Pipeline failed: {e}", exc_info=True)
        return {
            "status": "failed",
            "job_id": job_id,
            "error": str(e),
        }
