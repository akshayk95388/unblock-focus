"""LangGraph Script Generator Agent.

Combines Node 01 (Classifier), Node 02 (Script Generator), and Node 03 (Validator)
into a structured, reflection-driven LangGraph agent.

Features:
- StateGraph architecture with clear node boundaries
- Reflection / Feedback loop (validation failures feed back into script generator)
- Support for Pydantic structured output validation
- Support for in-memory checkpointer (MemorySaver) for inspection & time travel
"""

import sys
import logging
import uuid
from typing import TypedDict, List, Optional, Any, Dict

from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver

from engine.state import MeditationEngineState, SectionPlan
from engine.models.timeline import MeditationTimeline
from engine.models.schemas import (
    ScriptLineSchema,
    ScriptSectionSchema,
    ScriptProseSchema,
    ClassifierResponseSchema,
)
from engine.nodes.n01_classifier import classifier_node
from engine.nodes.n02_script_generator import script_generator_node
from engine.nodes.n03_validator import validator_node

logger = logging.getLogger(__name__)


import inspect


async def _graph_classifier_node(state: MeditationEngineState, config: Optional[dict] = None) -> dict:
    target = sys.modules[__name__].classifier_node
    sig = inspect.signature(target)
    if "config" in sig.parameters:
        return await target(state, config=config)
    return await target(state)


async def _graph_script_generator_node(state: MeditationEngineState, config: Optional[dict] = None) -> dict:
    target = sys.modules[__name__].script_generator_node
    sig = inspect.signature(target)
    if "config" in sig.parameters:
        return await target(state, config=config)
    return await target(state)


async def _graph_validator_node(state: MeditationEngineState) -> dict:
    target = sys.modules[__name__].validator_node
    return await target(state)

class ScriptGeneratorState(TypedDict, total=False):
    job_id: str
    stressor: str
    duration_mins: int
    voice_key: str
    music_key: str

    # Classifier output
    meditation_type: str
    section_plan: List[SectionPlan]
    pacing_profile: str
    target_word_count: int

    # Script generator output
    timeline: MeditationTimeline
    raw_prose: dict

    # Validator output & reflection loop state
    validation_issues: List[str]
    fix_attempts: int

    # Stage tracking
    current_stage: str
    progress_pct: float
    error: Optional[str]


# ── Conditional Router ─────────────────────────────────────────────────────

def graph_validator_router(state: ScriptGeneratorState, config: Optional[Dict[str, Any]] = None) -> str:
    """Conditional edge router:
    If validation issues exist and fix_attempts < max retries, route back to script_generator
    with feedback. Otherwise proceed to END.
    """
    configurable = config.get("configurable", {}) if config else {}
    max_retries = configurable.get("max_retries", 3)

    issues = state.get("validation_issues", [])
    fix_attempts = state.get("fix_attempts", 0)

    if issues and fix_attempts < max_retries:
        logger.info(f"Validator Router: {len(issues)} issue(s) detected. Retrying script_generator (attempt {fix_attempts}/{max_retries})")
        return "script_generator"

    if issues:
        logger.warning(f"Validator Router: Max retries ({fix_attempts}/{max_retries}) reached. Proceeding to END with remaining issues: {issues}")
    else:
        logger.info("Validator Router: Script validation passed successfully!")

    return END


# ── Graph Builder ──────────────────────────────────────────────────────────

def build_script_generator_graph(checkpointer: Optional[Any] = None) -> StateGraph:
    """Construct and compile the LangGraph Script Generator StateGraph."""
    workflow = StateGraph(ScriptGeneratorState)

    # Add nodes with dynamic resolution to respect test mocks
    workflow.add_node("classifier", _graph_classifier_node)
    workflow.add_node("script_generator", _graph_script_generator_node)
    workflow.add_node("validator", _graph_validator_node)

    # Define edges
    workflow.add_edge(START, "classifier")
    workflow.add_edge("classifier", "script_generator")
    workflow.add_edge("script_generator", "validator")

    # Conditional feedback / reflection loop from validator
    workflow.add_conditional_edges(
        "validator",
        graph_validator_router,
        {
            "script_generator": "script_generator",
            END: END,
        },
    )

    return workflow.compile(checkpointer=checkpointer)


# ── Convenience Run & Stream Helpers ─────────────────────────────────────

async def run_script_generator_agent(
    stressor: str,
    duration_mins: int = 3,
    voice_key: str = "gentle_female",
    music_key: str = "none",
    job_id: Optional[str] = None,
    checkpointer: Optional[Any] = None,
    thread_id: Optional[str] = None,
    config_override: Optional[Dict[str, Any]] = None,
) -> ScriptGeneratorState:
    """Execute the Script Generator Agent graph asynchronously.

    Args:
        stressor: Blocker description from user.
        duration_mins: Target duration in minutes.
        voice_key: Selected voice profile.
        music_key: Selected ambient music track.
        job_id: Optional unique job identifier.
        checkpointer: Optional LangGraph checkpointer (e.g., MemorySaver()).
        thread_id: Optional thread ID for checkpointer state tracking.
        config_override: Optional override dict for configurable parameters (model, max_retries, etc.).

    Returns:
        Final state dictionary containing timeline, raw_prose, validation_issues, etc.
    """
    if job_id is None:
        job_id = str(uuid.uuid4())

    if thread_id is None:
        thread_id = job_id

    app = build_script_generator_graph(checkpointer=checkpointer)

    initial_state: ScriptGeneratorState = {
        "job_id": job_id,
        "stressor": stressor,
        "duration_mins": duration_mins,
        "voice_key": voice_key,
        "music_key": music_key,
        "fix_attempts": 0,
        "validation_issues": [],
    }

    config = {"configurable": {"thread_id": thread_id}}
    if config_override:
        config["configurable"].update(config_override)

    final_state = await app.ainvoke(initial_state, config=config)
    return final_state


from typing import AsyncGenerator, Tuple

async def stream_script_generator_agent(
    stressor: str,
    duration_mins: int = 3,
    voice_key: str = "gentle_female",
    music_key: str = "none",
    job_id: Optional[str] = None,
    checkpointer: Optional[Any] = None,
    thread_id: Optional[str] = None,
    config_override: Optional[Dict[str, Any]] = None,
) -> AsyncGenerator[Tuple[str, Dict[str, Any]], None]:
    """Stream execution updates node-by-node using LangGraph app.astream(..., stream_mode="updates").

    Yields:
        (node_name, state_update_dict) tuples in real time.
    """
    if job_id is None:
        job_id = str(uuid.uuid4())

    if thread_id is None:
        thread_id = job_id

    app = build_script_generator_graph(checkpointer=checkpointer)

    initial_state: ScriptGeneratorState = {
        "job_id": job_id,
        "stressor": stressor,
        "duration_mins": duration_mins,
        "voice_key": voice_key,
        "music_key": music_key,
        "fix_attempts": 0,
        "validation_issues": [],
    }

    config = {"configurable": {"thread_id": thread_id}}
    if config_override:
        config["configurable"].update(config_override)

    async for chunk in app.astream(initial_state, config=config, stream_mode="updates"):
        for node_name, node_update in chunk.items():
            yield node_name, node_update
