"""Preset profiles for session types (e.g. guided sessions, 60s video reels, founder journeys)."""

from dataclasses import dataclass
from typing import Optional, List, Dict
from engine.profiles.section_templates import (
    SectionTemplate,
    UNBLOCK_REEL,
)


@dataclass
class PresetProfile:
    name: str
    target_duration_s: Optional[float]  # None = dynamic scaling from duration_mins
    target_words: Optional[int]         # None = dynamic calculation from WPM
    pause_mode: str                     # "guided" | "snappy"
    template: Optional[List[SectionTemplate]]  # None = dynamic choice via duration_category


PRESET_PROFILES: Dict[str, PresetProfile] = {
    "guided_session": PresetProfile(
        name="guided_session",
        target_duration_s=None,
        target_words=None,
        pause_mode="guided",
        template=None,
    ),
    "unblock_reel": PresetProfile(
        name="unblock_reel",
        target_duration_s=120.0,
        target_words=150,
        pause_mode="snappy",
        template=UNBLOCK_REEL,
    ),
}


def get_preset_profile(preset_name: Optional[str]) -> PresetProfile:
    """Return PresetProfile for given preset name, defaulting to guided_session."""
    return PRESET_PROFILES.get(preset_name or "guided_session", PRESET_PROFILES["guided_session"])
