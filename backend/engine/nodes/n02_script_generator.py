"""Node 02 — Script Generator: Generates a mental reset prose script via LLM
and compiles the MeditationTimeline DSL from it."""

import sys
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any

# Support running/debugging from workspace root
backend_root = str(Path(__file__).resolve().parents[2])
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from engine.state import MeditationEngineState
from engine.profiles.preset_profiles import get_preset_profile
from engine.utils.llm_factory import get_chat_model
from engine.models.schemas import ScriptProseSchema
from engine.prompts.script_prompts import (
    get_prompt_template,
    format_reflection_feedback,
)
from engine.prompts.few_shot_library import (
    get_examples,
    format_examples_block,
    get_visualization_examples,
    format_visualization_examples_block,
    get_reel_examples,
    format_reel_examples_block,
)
from engine.builders.timeline_builder import (
    build_timeline_from_prose,
    parse_llm_json,
    format_sections_for_prompt,
    _pause_s_to_type,
)

logger = logging.getLogger(__name__)


async def script_generator_node(state: MeditationEngineState, config: Optional[dict] = None) -> dict:
    """Generate a meditation script via model-agnostic LLM with structured output."""
    llm = get_chat_model(config=config, temperature=0.7, default_model="gpt-4o")
    structured_llm = llm.with_structured_output(ScriptProseSchema)

    profile = get_preset_profile(state.get("preset"))
    script_prompt_template = profile.prompt_template

    sections_text = format_sections_for_prompt(state["section_plan"])

    # Select golden example(s) — visualization presets use their own library
    preset = state.get("preset", "guided_session")
    category = state.get("meditation_type", "general")
    intent = state.get("intent", "work")

    if preset in ("visualization", "visualization_video"):
        viz_examples = get_visualization_examples()
        golden_examples_text = format_visualization_examples_block(viz_examples)
    elif preset == "unblock_reel":
        reel_examples = get_reel_examples(category=category, intent=intent)
        golden_examples_text = format_reel_examples_block(reel_examples)
    else:
        # guided_session and guided_video share the same guided examples
        examples = get_examples(category=category, intent=intent)
        golden_examples_text = format_examples_block(examples)

    # Build format kwargs — only include golden_examples if the template uses it
    format_kwargs = dict(
        stressor=state["stressor"],
        meditation_type=category,
        intent=intent,
        duration_mins=state["duration_mins"],
        sections_with_durations=sections_text,
        target_word_count=state["target_word_count"],
    )
    if "{golden_examples}" in script_prompt_template:
        format_kwargs["golden_examples"] = golden_examples_text

    prompt = script_prompt_template.format(**format_kwargs)

    # Reflection / Feedback loop: Append previous validation issues if retrying
    issues = state.get("validation_issues", [])
    fix_attempts = state.get("fix_attempts", 0)
    prompt = format_reflection_feedback(prompt, issues, fix_attempts)

    messages = get_prompt_template(state.get("preset", "guided_session")).format_messages(human_prompt=prompt)

    try:
        res: ScriptProseSchema = await structured_llm.ainvoke(messages, config=config)
        prose = res.model_dump()
    except Exception as e:
        logger.warning(f"Structured output script generation failed ({e}), falling back to direct invoke parsing: {e}")
        raw_result = await llm.ainvoke(messages, config=config)
        prose = parse_llm_json(str(raw_result.content))

    timeline = build_timeline_from_prose(prose, state)

    return {
        "timeline": timeline,
        "raw_prose": prose,
        "current_stage": "script_generated",
        "progress_pct": 30.0,
    }


if __name__ == "__main__":
    import asyncio
    import argparse
    from dotenv import load_dotenv
    from engine.nodes.n01_classifier import classifier_node

    load_dotenv()

    async def main():
        parser = argparse.ArgumentParser(description="Test Meditation Script Generator (Node 02)")
        parser.add_argument("--stressor", type=str, default="I feel overwhelmed by bugs.", help="Stressor description")
        parser.add_argument("--duration", type=int, default=3, help="Duration in minutes")
        args = parser.parse_args()

        state = {"stressor": args.stressor, "duration_mins": args.duration}
        classifier_res = await classifier_node(state)
        state.update(classifier_res)

        result = await script_generator_node(state)
        prose = result["raw_prose"]
        print(f"Title: {prose.get('title')}")
        print(f"Next Action: {prose.get('focus_task')}")

    asyncio.run(main())
