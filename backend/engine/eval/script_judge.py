"""LLM-as-a-Judge Evaluator for Mental Reset Script Quality."""

import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from engine.utils.llm_factory import get_chat_model

logger = logging.getLogger(__name__)


class ScriptJudgeScore(BaseModel):
    tone_empathy_score: int = Field(..., description="1-10 rating for warmth, directness, and anti-cliché tone.")
    spoken_rhythm_score: int = Field(..., description="1-10 rating for how natural and rhythmic the lines sound when read aloud.")
    reframe_actionability_score: int = Field(..., description="1-10 rating for how actionable and crisp the reframe pivot is.")
    repetition_penalty: int = Field(..., description="0 to -5 penalty if ideas or phrases repeat unnecessarily across sections.")
    overall_score: float = Field(..., description="Calculated final score out of 10.0.")
    critique: str = Field(..., description="Concise analysis of strengths and flaws.")
    concrete_improvement: str = Field(..., description="One specific rule to add to the generator prompt to fix any flaw.")


JUDGE_SYSTEM_PROMPT = """You are a master audio director and performance coach evaluating scripts for a mental reset app.

Your goal is to evaluate if the script is:
1. Spoken Audio Quality: Reads like a calm, sharp friend talking directly into headphones — NOT a meditation app, therapy session, or written blog post.
2. Zero Repetition: Every single line must introduce a NEW angle or clear step. No repeating the same thought in different words.
3. Rhythm & Cadence: Natural line lengths (8–15 words). No robotic fragments ('Go.', 'Hi.', 'Do it.') and no 25-word run-on sentences.
4. Sharp Action Bridge: The reframe section MUST give a concrete micro-step to start deep work immediately.

Rate strictly and objectively from 1 to 10."""


async def evaluate_script_quality(stressor: str, sections_json: List[Dict[str, Any]], config: Optional[dict] = None) -> ScriptJudgeScore:
    """Evaluate a generated script using LLM-as-a-Judge."""
    llm = get_chat_model(config=config, temperature=0.1)
    judge = llm.with_structured_output(ScriptJudgeScore)

    formatted_script = ""
    for sec in sections_json:
        name = sec.get("name") or sec.get("section_name") or "section"
        raw_lines = sec.get("lines") or sec.get("text") or []
        lines_text = []
        for l in raw_lines:
            if isinstance(l, dict):
                lines_text.append(l.get("text", ""))
            elif isinstance(l, str):
                lines_text.append(l)
        formatted_script += f"\n[{name.upper()}]\n" + "\n".join(f"- {t}" for t in lines_text if t)

    prompt = ChatPromptTemplate.from_messages([
        ("system", JUDGE_SYSTEM_PROMPT),
        ("human", "Stressor: \"{stressor}\"\n\nGenerated Reset Script:\n{script}")
    ])

    chain = prompt | judge
    res = await chain.ainvoke({"stressor": stressor, "script": formatted_script})
    # Compute overall_score deterministically from subscores to avoid LLM rounding stagnation
    raw_calc = (res.tone_empathy_score + res.spoken_rhythm_score + res.reframe_actionability_score) / 3.0 + res.repetition_penalty
    res.overall_score = round(max(0.0, min(10.0, raw_calc)), 2)
    return res
