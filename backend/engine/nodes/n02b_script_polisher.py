"""Node 02b — Script Polisher / Reviewer: Polishes raw prose script via gpt-4o

Takes the structured timeline draft from Node 02 and uses a high-capacity LLM (gpt-4o)
to refine tone, conversational rhythm, warmth, and cadence without altering section
structures or pause timing.

Toggleable via state["enable_polisher"] or config["configurable"]["enable_polisher"].
"""

import json
import logging
from typing import Optional

from engine.state import MeditationEngineState
from engine.utils.llm_factory import get_chat_model
from engine.models.schemas import ScriptProseSchema
from engine.prompts.script_prompts import SCRIPT_POLISH_PROMPT_TEMPLATE
from engine.builders.timeline_builder import build_timeline_from_prose, parse_llm_json

logger = logging.getLogger(__name__)


async def script_polisher_node(state: MeditationEngineState, config: Optional[dict] = None) -> dict:
    """Polish a generated meditation script prose using a high-capacity LLM (default: gpt-4o).
    
    If enable_polisher is set to False in state or config, this node is bypassed (no-op).
    """
    configurable = config.get("configurable", {}) if config else {}
    enable_polisher = configurable.get(
        "enable_polisher", state.get("enable_polisher", True)
    )

    if not enable_polisher:
        logger.info("Script Polisher Node is disabled. Bypassing polish pass.")
        return {"current_stage": state.get("current_stage", "script_generated")}

    raw_prose = state.get("raw_prose")
    if not raw_prose:
        logger.warning("No raw_prose found in state for script_polisher_node. Bypassing.")
        return {"current_stage": state.get("current_stage", "script_generated")}

    stressor = state.get("stressor", "feeling overwhelmed")

    # Use high-capacity model (claude-sonnet-4.6) for creative polishing
    llm = get_chat_model(config=config, temperature=0.7, default_model="claude-sonnet-4.6")
    structured_llm = llm.with_structured_output(ScriptProseSchema)

    messages = SCRIPT_POLISH_PROMPT_TEMPLATE.format_messages(
        stressor=stressor,
        raw_prose_json=json.dumps(raw_prose, indent=2),
    )

    logger.info(f"[{state.get('job_id', 'local')[:8]}] Polishing script with LLM (claude-sonnet-4.6)...")

    try:
        res: ScriptProseSchema = await structured_llm.ainvoke(messages, config=config)
        polished_prose = res.model_dump()
    except Exception as e:
        logger.warning(f"Structured output polishing failed ({e}), falling back to raw invocation parsing: {e}")
        raw_result = await llm.ainvoke(messages, config=config)
        polished_prose = parse_llm_json(str(raw_result.content))

    timeline = build_timeline_from_prose(polished_prose, state)

    return {
        "timeline": timeline,
        "raw_prose": polished_prose,
        "current_stage": "script_polished",
        "progress_pct": 32.0,
    }
