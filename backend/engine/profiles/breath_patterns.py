from dataclasses import dataclass, field
from typing import List, Dict


@dataclass
class BreathPhase:
    phase: str          # inhale | hold_in | exhale | hold_out
    duration_s: float   # exact seconds (not estimated)
    cue_text: str       # what TTS speaks


@dataclass
class BreathPattern:
    id: str
    name: str
    phases: List[BreathPhase] = field(default_factory=list)

    @property
    def cycle_duration_s(self) -> float:
        """Exact duration of one cycle. Used by reconciler."""
        return sum(p.duration_s for p in self.phases)


BREATH_PATTERNS: Dict[str, BreathPattern] = {
    "box_4": BreathPattern(
        id="box_4", name="Box Breathing",
        phases=[
            BreathPhase("inhale",   4.0, "Breathe in..."),
            BreathPhase("hold_in",  4.0, "Hold..."),
            BreathPhase("exhale",   4.0, "Breathe out..."),
            BreathPhase("hold_out", 4.0, "Hold..."),
        ]
    ),
    "sleep_478": BreathPattern(
        id="sleep_478", name="4-7-8 Breathing",
        phases=[
            BreathPhase("inhale",  4.0, "Breathe in slowly..."),
            BreathPhase("hold_in", 7.0, "Hold..."),
            BreathPhase("exhale",  8.0, "And slowly release..."),
        ]
    ),
    "calm_46": BreathPattern(
        id="calm_46", name="Calming Breath",
        phases=[
            BreathPhase("inhale", 4.0, "Breathe in..."),
            BreathPhase("exhale", 6.0, "And breathe out..."),
        ]
    ),
    "focus_44": BreathPattern(
        id="focus_44", name="Equal Breathing",
        phases=[
            BreathPhase("inhale", 4.0, "In..."),
            BreathPhase("exhale", 4.0, "Out..."),
        ]
    ),
}
