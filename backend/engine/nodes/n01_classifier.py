"""Node 01 — Classifier: Maps a stressor string to a reset category."""
import json
import logging
from typing import List

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

from engine.state import MeditationEngineState, SectionPlan
from engine.profiles.pacing import PACING_PROFILES, SPEECH_DENSITY
from engine.profiles.section_templates import get_template_for_duration
from config.settings import get_settings

logger = logging.getLogger(__name__)

CLASSIFY_PROMPT = """
Classify this person's blocker into exactly one category.

What's blocking them: "{stressor}"

Categories:
- deadline: work deadline pressure, time crunch, too much to do, shipping pressure
- presentation: public speaking, pitch anxiety, meeting nerves, demo fear
- burnout: exhaustion, fatigue, no energy, been working too long, feeling depleted
- distraction: can't focus, phone addiction, social media, procrastination, scattered
- overthinking: racing mind, can't stop thinking, analysis paralysis, decision fatigue
- imposter: self-doubt, not good enough, comparing to others, feeling like a fraud
- exam: test anxiety, study pressure, academic stress, grades
- general: anything that doesn't clearly fit the categories above

Return JSON only: {{"type": "<category>"}}
"""

VALID_TYPES = {"deadline", "presentation", "burnout", "distraction",
               "overthinking", "imposter", "exam", "general"}


def parse_type(response_text: str) -> str:
    """Extract stressor category from LLM response. Default to 'general' on parse failure."""
    try:
        data = json.loads(response_text.strip())
        if isinstance(data, dict) and data.get("type") in VALID_TYPES:
            return data["type"]
    except (json.JSONDecodeError, TypeError):
        pass

    # Fallback: look for the category keyword in the response
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


async def classifier_node(state: MeditationEngineState) -> dict:
    """Classify the stressor and build a section plan."""
    settings = get_settings()

    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.1,
        api_key=settings.openai_api_key,
    )

    prompt = CLASSIFY_PROMPT.format(stressor=state["stressor"])
    result = await llm.ainvoke([HumanMessage(content=prompt)])
    meditation_type = parse_type(result.content)

    duration_mins = state["duration_mins"]
    template = get_template_for_duration(meditation_type, duration_mins)
    pacing = PACING_PROFILES[meditation_type]
    density = SPEECH_DENSITY[meditation_type]

    # Calculate target word count for LLM prompt
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
