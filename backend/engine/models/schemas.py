"""Pydantic schemas for LangChain structured outputs (Classifier and Script Generator)."""

from typing import List, Optional, Literal
from pydantic import BaseModel, Field


# ── Node 01: Classifier Schema ─────────────────────────────────────────────

CategoryType = Literal[
    "deadline",
    "presentation",
    "burnout",
    "distraction",
    "overthinking",
    "imposter",
    "exam",
    "general",
]


class ClassifierResponseSchema(BaseModel):
    """Schema for LLM stressor category classification."""
    type: CategoryType = Field(
        description="Exact category of the blocker: deadline, presentation, burnout, distraction, overthinking, imposter, exam, or general."
    )


# ── Node 02: Script Generator Schemas ─────────────────────────────────────

class ScriptLineSchema(BaseModel):
    """Schema for a single spoken sentence line in a mental reset script."""
    text: str = Field(
        description="One spoken sentence, max 18 words. Written for the ear. No colons, semicolons, digits, or em dashes."
    )
    pause_s: int = Field(
        default=4,
        description="Pause in seconds after this line (2 to 15 seconds)."
    )


class ScriptSectionSchema(BaseModel):
    """Schema for a stage section in the mental reset script."""
    name: str = Field(
        description="Stage name matching the stage plan (grounding, breathing_reset, body_release, core_reset, reframe, closing)."
    )
    lines: List[ScriptLineSchema] = Field(
        description="List of spoken lines in this stage section."
    )
    breath_cycle: Optional[str] = Field(
        default=None,
        description="Breath pattern ID if applicable (box_4, sleep_478, calm_46, focus_44) or null.",
    )
    breath_repetitions: int = Field(
        default=0,
        description="Number of breath repetitions if breath_cycle is specified.",
    )


class ScriptProseSchema(BaseModel):
    """Schema for the full mental reset script output."""
    title: str = Field(
        description="Short direct title, 2 to 5 words."
    )
    intention: str = Field(
        description="One sentence describing what this reset accomplishes."
    )
    focus_task: str = Field(
        description="Action-oriented next task (3 to 7 words, starting with a strong verb like Write, Code, Draft, Debug)."
    )
    sections: List[ScriptSectionSchema] = Field(
        description="Sequential list of script stage sections."
    )
