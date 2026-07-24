from dataclasses import dataclass
from typing import Optional, List


@dataclass
class SectionTemplate:
    name: str
    duration_weight: float              # relative weight for duration distribution
    default_breath_pattern: Optional[str]  # None if no breath cycle
    default_breath_cycles: int


# Category-based templates:
# Quick resets (2-5 min) use QUICK_RESET (target ~3.5 min)
# Deep resets (5-10 min) use DEEP_RESET (target ~7.5 min)

QUICK_RESET = [
    SectionTemplate("grounding",        0.15, None,       0),
    SectionTemplate("breathing_reset",  0.25, "calm_46",  2),
    SectionTemplate("core_reset",       0.40, None,       0),
    SectionTemplate("reframe",          0.20, None,       0),
]

DEEP_RESET = [
    SectionTemplate("grounding",        0.10, None,       0),
    SectionTemplate("breathing_reset",  0.20, "calm_46",  4),
    SectionTemplate("core_reset",       0.40, None,       0),
    SectionTemplate("reframe",          0.20, None,       0),
    SectionTemplate("closing",          0.10, None,       0),
]


def get_template_for_category(duration_category: str) -> List[SectionTemplate]:
    """Return the structural template for a duration category."""
    return DEEP_RESET if duration_category == "deep" else QUICK_RESET

