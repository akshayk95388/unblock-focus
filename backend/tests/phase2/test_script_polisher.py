"""Phase 2 Tests — Node 02b Script Polisher / Reviewer

Tests script_polisher_node behavior, toggle functionality (enable_polisher),
and fallback invocation parsing.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from engine.nodes.n02b_script_polisher import script_polisher_node
from engine.models.schemas import ScriptProseSchema


@pytest.fixture
def sample_state():
    return {
        "job_id": "test-job-polisher-123",
        "stressor": "I am feeling overwhelmed by complex bugs",
        "duration_mins": 3,
        "meditation_type": "burnout",
        "pacing_profile": "normal",
        "raw_prose": {
            "title": "Bug Reset",
            "intention": "Clear your head from debugging stress.",
            "focus_task": "Debug line 42 next",
            "sections": [
                {
                    "name": "grounding",
                    "lines": [
                        {"text": "Take a seat and settle into your chair.", "pause_s": 3},
                        {"text": "Allow your eyes to gently rest.", "pause_s": 4},
                    ],
                    "breath_cycle": None,
                    "breath_repetitions": 0,
                },
                {
                    "name": "reframe",
                    "lines": [
                        {"text": "Bugs are just logic steps waiting to be fixed.", "pause_s": 4},
                        {"text": "Focus on one single function right now.", "pause_s": 5},
                    ],
                    "breath_cycle": None,
                    "breath_repetitions": 0,
                },
            ],
        },
    }


@pytest.mark.asyncio
async def test_script_polisher_node_disabled(sample_state):
    """When enable_polisher is False in state, node should log and return current_stage update (bypass)."""
    sample_state["enable_polisher"] = False
    result = await script_polisher_node(sample_state)
    assert result == {"current_stage": "script_generated"}


@pytest.mark.asyncio
async def test_script_polisher_node_disabled_via_config(sample_state):
    """When enable_polisher is False in RunnableConfig, node should bypass."""
    config = {"configurable": {"enable_polisher": False}}
    result = await script_polisher_node(sample_state, config=config)
    assert result == {"current_stage": "script_generated"}


@pytest.mark.asyncio
async def test_script_polisher_node_execution(sample_state):
    """Verify script_polisher_node invokes LLM and updates state with polished timeline & prose."""
    polished_prose = {
        "title": "Calm Bug Fix",
        "intention": "Clear your mind and address one line of code at a time.",
        "focus_task": "Focus on line 42",
        "sections": [
            {
                "name": "grounding",
                "lines": [
                    {"text": "Take a breath, settle in, and let your body relax.", "pause_s": 3},
                    {"text": "Let go of the tension in your shoulders now.", "pause_s": 4},
                ],
                "breath_cycle": None,
                "breath_repetitions": 0,
            },
            {
                "name": "reframe",
                "lines": [
                    {"text": "Every complex bug breaks down into small logical steps.", "pause_s": 4},
                    {"text": "Address just this one function right in front of you.", "pause_s": 5},
                ],
                "breath_cycle": None,
                "breath_repetitions": 0,
            },
        ],
    }

    mock_llm = MagicMock()
    mock_structured_llm = MagicMock()
    mock_structured_llm.ainvoke = AsyncMock(return_value=ScriptProseSchema(**polished_prose))
    mock_llm.with_structured_output.return_value = mock_structured_llm

    with patch("engine.nodes.n02b_script_polisher.get_chat_model", return_value=mock_llm):
        result = await script_polisher_node(sample_state)

    assert result["current_stage"] == "script_polished"
    assert result["raw_prose"]["title"] == "Calm Bug Fix"
    assert result["timeline"] is not None
    assert result["timeline"].title == "Calm Bug Fix"
