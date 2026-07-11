from dataclasses import dataclass, field
from typing import List

from .events import MeditationEvent


@dataclass
class MeditationTimeline:
    version: str = "1.0"
    job_id: str = ""
    meditation_type: str = ""       # anxiety | sleep | focus
    title: str = ""
    duration_target_s: int = 0      # user's requested duration in seconds
    pacing_profile: str = ""        # normal | slow | very_slow
    events: List[MeditationEvent] = field(default_factory=list)

    # Filled by reconciler after TTS
    speech_total_s: float = 0.0
    breath_total_s: float = 0.0
    pause_budget_s: float = 0.0
    actual_duration_s: float = 0.0  # final assembled duration
