"""Preset profiles for session types (e.g. guided sessions, 60s video reels, founder journeys)."""

from dataclasses import dataclass
from typing import Optional, List, Dict
from engine.profiles.section_templates import (
    SectionTemplate,
    UNBLOCK_REEL,
    VISUALIZATION,
    GUIDED_VIDEO,
    VISUALIZATION_VIDEO,
)
from engine.prompts.script_prompts import (
    SCRIPT_PROMPT,
    REEL_HUMAN_PROMPT,
    VISUALIZATION_PROMPT,
    GUIDED_VIDEO_PROMPT,
    VISUALIZATION_VIDEO_PROMPT,
)


@dataclass
class PresetProfile:
    name: str
    target_duration_s: Optional[float]  # None = dynamic scaling from duration_mins
    target_words: Optional[int]         # None = dynamic calculation from WPM
    pause_mode: str                     # "guided" | "snappy"
    template: Optional[List[SectionTemplate]]  # None = dynamic choice via duration_category
    prompt_template: str                # Prompt template string for LLM script generation


PRESET_PROFILES: Dict[str, PresetProfile] = {
    "guided_session": PresetProfile(
        name="guided_session",
        target_duration_s=None,
        target_words=None,
        pause_mode="guided",
        template=None,
        prompt_template=SCRIPT_PROMPT,
    ),
    "unblock_reel": PresetProfile(
        name="unblock_reel",
        target_duration_s=120.0,
        target_words=150,
        pause_mode="snappy",
        template=UNBLOCK_REEL,
        prompt_template=REEL_HUMAN_PROMPT,
    ),
    "visualization": PresetProfile(
        name="visualization",
        target_duration_s=None,        # Dynamic — scales with Quick/Deep
        target_words=None,             # Dynamic — calculated from WPM
        pause_mode="guided",           # Long pauses for mental imagery
        template=VISUALIZATION,
        prompt_template=VISUALIZATION_PROMPT,
    ),
    # ── Social media video presets (deep sessions with viral hook) ──
    "guided_video": PresetProfile(
        name="guided_video",
        target_duration_s=420.0,       # Fixed 7 minutes (deep)
        target_words=385,              # ~105 WPM × 0.52 density × 420s
        pause_mode="guided",
        template=GUIDED_VIDEO,
        prompt_template=GUIDED_VIDEO_PROMPT,
    ),
    "visualization_video": PresetProfile(
        name="visualization_video",
        target_duration_s=420.0,       # Fixed 7 minutes (deep)
        target_words=315,              # ~100 WPM × 0.45 density × 420s
        pause_mode="guided",
        template=VISUALIZATION_VIDEO,
        prompt_template=VISUALIZATION_VIDEO_PROMPT,
    ),
}


def get_preset_profile(preset_name: Optional[str]) -> PresetProfile:
    """Return PresetProfile for given preset name, defaulting to guided_session."""
    return PRESET_PROFILES.get(preset_name or "guided_session", PRESET_PROFILES["guided_session"])

