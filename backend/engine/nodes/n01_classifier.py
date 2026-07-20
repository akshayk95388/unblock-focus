"""Node 01 — Classifier: Maps a stressor string to a reset category."""

import json
import logging
from typing import List, Optional

from engine.state import MeditationEngineState, SectionPlan
from engine.profiles.pacing import PACING_PROFILES, SPEECH_DENSITY
from engine.profiles.section_templates import get_template_for_duration
from engine.utils.llm_factory import get_chat_model
from engine.models.schemas import ClassifierResponseSchema
from engine.prompts.classifier_prompts import (
    CLASSIFY_PROMPT,
    CLASSIFIER_PROMPT_TEMPLATE,
    VALID_TYPES,
)

logger = logging.getLogger(__name__)


def parse_type(response_text: str) -> str:
    """Extract stressor category from LLM response string. Default to 'general' on parse failure."""
    try:
        data = json.loads(response_text.strip())
        if isinstance(data, dict) and data.get("type") in VALID_TYPES:
            return data["type"]
    except (json.JSONDecodeError, TypeError):
        pass

    text_lower = response_text.lower()
    for t in VALID_TYPES:
        if t in text_lower:
            return t

    logger.warning(f"Could not parse stressor category from: {response_text[:100]}")
    return "general"


def scale_sections(template: list, total_duration_s: float) -> List[SectionPlan]:
    """Convert section templates to SectionPlan with scaled durations."""
    return [
        SectionPlan(
            name=s.name,
            duration_s=round(s.duration_weight * total_duration_s, 1),
            breath_pattern=s.default_breath_pattern,
            breath_cycles=s.default_breath_cycles,
        )
        for s in template
    ]


async def classifier_node(state: MeditationEngineState, config: Optional[dict] = None) -> dict:
    """Classify the stressor and build a section plan using ChatPromptTemplate and structured output."""
    llm = get_chat_model(config=config, temperature=0.1)
    structured_llm = llm.with_structured_output(ClassifierResponseSchema)

    messages = CLASSIFIER_PROMPT_TEMPLATE.format_messages(stressor=state["stressor"])

    try:
        response: ClassifierResponseSchema = await structured_llm.ainvoke(messages, config=config)
        meditation_type = response.type
    except Exception as e:
        logger.warning(f"Structured output classification failed ({e}), falling back to direct invoke: {e}")
        raw_res = await llm.ainvoke(messages, config=config)
        meditation_type = parse_type(str(raw_res.content))

    duration_mins = state["duration_mins"]
    template = get_template_for_duration(meditation_type, duration_mins)
    pacing = PACING_PROFILES[meditation_type]
    density = SPEECH_DENSITY[meditation_type]

    total_s = duration_mins * 60
    target_speech_s = total_s * density
    target_words = int((target_speech_s / 60) * pacing["wpm"])

    return {
        "meditation_type": meditation_type,
        "section_plan": scale_sections(template, total_s),
        "pacing_profile": pacing["profile"],
        "target_word_count": target_words,
        "current_stage": "classifying",
        "progress_pct": 10.0,
    }
