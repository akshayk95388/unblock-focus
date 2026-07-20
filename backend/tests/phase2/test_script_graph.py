"""Phase 2 Tests — LangGraph Script Generator Agent

Tests the graph topology, state dictionary transitions, reflection routing logic,
and checkpointer support for engine.graphs.script_generator.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from langgraph.graph import END
from langgraph.checkpoint.memory import MemorySaver

from engine.graphs.script_generator import (
    build_script_generator_graph,
    graph_validator_router,
    run_script_generator_agent,
    ScriptGeneratorState,
    ScriptProseSchema,
)
from engine.models.events import SpeechEvent, PauseEvent, PauseType
from engine.models.timeline import MeditationTimeline
from engine.nodes.n03_validator import validate_timeline


# ── Test Graph Construction & Topology ─────────────────────────────────────

def test_build_script_generator_graph_structure():
    """Verify StateGraph compiles with correct nodes and start/end transitions."""
    graph = build_script_generator_graph()
    assert graph is not None

    nodes = graph.nodes
    assert "classifier" in nodes
    assert "script_generator" in nodes
    assert "validator" in nodes


def test_build_script_generator_graph_with_checkpointer():
    """Verify checkpointer initialization with MemorySaver."""
    checkpointer = MemorySaver()
    graph = build_script_generator_graph(checkpointer=checkpointer)
    assert graph.checkpointer is checkpointer


# ── Test Conditional Router Logic ─────────────────────────────────────────

def test_graph_validator_router_retries_when_issues_exist():
    """Router must route back to script_generator when validation issues exist and fix_attempts < 3."""
    state: ScriptGeneratorState = {
        "validation_issues": ["Line 1: colon/semicolon in text"],
        "fix_attempts": 1,
    }
    next_node = graph_validator_router(state)
    assert next_node == "script_generator"


def test_graph_validator_router_ends_when_clean():
    """Router must route to END when no validation issues exist."""
    state: ScriptGeneratorState = {
        "validation_issues": [],
        "fix_attempts": 1,
    }
    next_node = graph_validator_router(state)
    assert next_node == END


def test_graph_validator_router_ends_after_max_retries():
    """Router must route to END when fix_attempts reaches max (3)."""
    state: ScriptGeneratorState = {
        "validation_issues": ["Line 1: colon/semicolon in text"],
        "fix_attempts": 3,
    }
    next_node = graph_validator_router(state)
    assert next_node == END


# ── Test Execution with Mocked LLM Node ───────────────────────────────────

@pytest.mark.asyncio
async def test_run_script_generator_agent_pipeline():
    """Run full graph execution using mocks for classifier and script generator LLM calls."""

    mock_classifier_res = {
        "meditation_type": "deadline",
        "section_plan": [
            {"name": "grounding", "duration_s": 30.0, "breath_pattern": None, "breath_cycles": 0},
            {"name": "reframe", "duration_s": 150.0, "breath_pattern": None, "breath_cycles": 0},
        ],
        "pacing_profile": "normal",
        "target_word_count": 150,
        "current_stage": "classifying",
        "progress_pct": 10.0,
    }

    mock_prose = {
        "title": "Deadline Calm",
        "intention": "Reset focus under pressure.",
        "focus_task": "Code the core logic next",
        "sections": [
            {
                "name": "grounding",
                "lines": [
                    {"text": "Find a comfortable position wherever you sit.", "pause_s": 3},
                    {"text": "Allow your shoulders to soften and drop.", "pause_s": 4},
                    {"text": "Notice your feet firmly on the ground.", "pause_s": 4},
                    {"text": "You are safe and present in this space.", "pause_s": 5},
                ],
                "breath_cycle": None,
                "breath_repetitions": 0,
            },
            {
                "name": "reframe",
                "lines": [
                    {"text": "One task at a time is all you need.", "pause_s": 4},
                    {"text": "Focus only on the immediate next line of code.", "pause_s": 5},
                    {"text": "Break down the wall into small steps.", "pause_s": 5},
                    {"text": "You have done this successfully many times before.", "pause_s": 6},
                ],
                "breath_cycle": None,
                "breath_repetitions": 0,
            },
        ],
    }

    with patch("engine.graphs.script_generator.classifier_node", new_callable=AsyncMock) as mock_class, \
         patch("engine.graphs.script_generator.script_generator_node", new_callable=AsyncMock) as mock_script:

        mock_class.return_value = mock_classifier_res

        # Build timeline from mock prose
        from engine.nodes.n02_script_generator import build_timeline_from_prose
        mock_state_for_timeline = {
            "job_id": "test-job-123",
            "meditation_type": "deadline",
            "duration_mins": 3,
            "pacing_profile": "normal",
        }
        timeline = build_timeline_from_prose(mock_prose, mock_state_for_timeline)

        mock_script.return_value = {
            "timeline": timeline,
            "raw_prose": mock_prose,
            "current_stage": "script_generated",
            "progress_pct": 30.0,
        }

        final_state = await run_script_generator_agent(
            stressor="I am stressed about a work deadline and shipping pressure",
            duration_mins=3,
            job_id="test-job-123",
        )

        assert final_state["job_id"] == "test-job-123"
        assert final_state["meditation_type"] == "deadline"
        assert final_state["timeline"].title == "Deadline Calm"
        assert len(final_state["validation_issues"]) == 0
        assert mock_class.called
        assert mock_script.called


def test_get_chat_model_configuration():
    """Verify model-agnostic model factory responds to RunnableConfig parameters."""
    from engine.utils.llm_factory import get_chat_model

    default_model = get_chat_model()
    assert default_model is not None

    config = {"configurable": {"model": "gpt-4o", "model_provider": "openai"}}
    custom_model = get_chat_model(config=config)
    assert getattr(custom_model, "model_name", getattr(custom_model, "model", None)) == "gpt-4o"


def test_graph_validator_router_custom_max_retries():
    """Verify router respects configurable max_retries parameter."""
    state = {
        "validation_issues": ["Line 1: colon/semicolon in text"],
        "fix_attempts": 1,
    }
    # With max_retries = 1, should stop at attempt 1
    config = {"configurable": {"max_retries": 1}}
    next_node = graph_validator_router(state, config=config)
    assert next_node == END


@pytest.mark.asyncio
async def test_stream_script_generator_agent_yields_events():
    """Verify stream_script_generator_agent yields node updates asynchronously."""
    from engine.graphs.script_generator import stream_script_generator_agent

    mock_classifier_res = {
        "meditation_type": "burnout",
        "section_plan": [],
        "pacing_profile": "slow",
        "target_word_count": 100,
        "current_stage": "classifying",
        "progress_pct": 10.0,
    }

    with patch("engine.graphs.script_generator.classifier_node", new_callable=AsyncMock) as mock_class, \
         patch("engine.graphs.script_generator.script_generator_node", new_callable=AsyncMock) as mock_script, \
         patch("engine.graphs.script_generator.validator_node", new_callable=AsyncMock) as mock_val:

        mock_class.return_value = mock_classifier_res
        mock_script.return_value = {"current_stage": "script_generated"}
        mock_val.return_value = {"validation_issues": [], "fix_attempts": 0}

        events = []
        async for node_name, update in stream_script_generator_agent("I feel burned out"):
            events.append((node_name, update))

        assert len(events) >= 3
        node_names = [e[0] for e in events]
        assert "classifier" in node_names
        assert "script_generator" in node_names
        assert "validator" in node_names
