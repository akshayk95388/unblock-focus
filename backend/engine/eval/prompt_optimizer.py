"""Prompt Mutation Engine for AutoResearch Optimization.

Contains the Optimizer LLM prompt, schema, and mutation function
that generates improved prompt candidates based on benchmark critiques.
"""

import sys
import asyncio
import logging
from pathlib import Path
from typing import List
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate

backend_root = str(Path(__file__).resolve().parents[2])
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from engine.utils.llm_factory import get_chat_model

logger = logging.getLogger(__name__)


class MutatedPromptSchema(BaseModel):
    improved_prompt_template: str = Field(..., description="The revised prompt template retaining all placeholder keys.")
    rationale: str = Field(..., description="Why these specific rule additions/edits solve the observed weaknesses.")


OPTIMIZER_SYSTEM_PROMPT = """You are an expert AI Prompt Engineer and Dialogue Director.
Your task is to refine and optimize an LLM prompt template used for generating 2-minute audio mental reset scripts.

You will be given:
1. Current Prompt Template
2. Quality Judge Critiques and Repetition Warnings from benchmark runs.

Rules for Mutation:
- Must preserve ALL string formatting placeholders: {{stressor}}, {{meditation_type}}, {{sections_with_durations}}, {{target_word_count}}, {{duration_mins}}.
- Add specific negative rules or explicit formatting constraints to eliminate repeated lines and cliché phrasing.
- Ensure spoken rhythm rules (8–15 words per line) are clear and enforced.
- Do NOT remove output schema requirements.
- SIMPLICITY CRITERION: Prefer removing or tightening existing rules over adding new ones. A cleaner, shorter prompt that scores equally is better than a longer one."""


async def generate_improved_prompt(current_prompt: str, critiques: List[str]) -> MutatedPromptSchema:
    """Generate a mutated prompt candidate using Optimizer LLM."""
    llm = get_chat_model(temperature=0.3)
    optimizer = llm.with_structured_output(MutatedPromptSchema)

    formatted_critiques = "\n".join(f"- {c}" for c in critiques)

    prompt = ChatPromptTemplate.from_messages([
        ("system", OPTIMIZER_SYSTEM_PROMPT),
        ("human", "Current Prompt Template:\n```\n{current_prompt}\n```\n\nBenchmark Failures & Critiques:\n{critiques}\n\nGenerate an improved prompt template that directly fixes these issues.")
    ])

    chain = prompt | optimizer
    return await chain.ainvoke({"current_prompt": current_prompt, "critiques": formatted_critiques})


if __name__ == "__main__":
    from engine.eval.autoresearch_runner import run_autoresearch_optimization
    asyncio.run(run_autoresearch_optimization())
