from dataclasses import dataclass
from typing import Optional, List, Dict


@dataclass
class SectionTemplate:
    name: str
    duration_weight: float              # relative weight for duration distribution
    default_breath_pattern: Optional[str]  # None if no breath cycle
    default_breath_cycles: int


# Duration-adaptive templates:
# Short resets (1-3 min) use the "short" variant
# Standard resets (4-6 min) use the "standard" variant
# Long resets (7-10 min) use the "long" variant
#
# All categories share the same reset structure.
# The script generator prompt adapts the *content* per stressor category.

_SHORT_RESET = [
    SectionTemplate("grounding",        0.15, None,       0),
    SectionTemplate("breathing_reset",  0.25, "calm_46",  2),
    SectionTemplate("core_reset",       0.40, None,       0),
    SectionTemplate("reframe",          0.20, None,       0),
]

_STANDARD_RESET = [
    SectionTemplate("grounding",        0.10, None,       0),
    SectionTemplate("breathing_reset",  0.20, "calm_46",  3),
    SectionTemplate("core_reset",       0.40, None,       0),
    SectionTemplate("reframe",          0.20, None,       0),
    SectionTemplate("closing",          0.10, None,       0),
]

_LONG_RESET = [
    SectionTemplate("grounding",        0.10, None,       0),
    SectionTemplate("breathing_reset",  0.20, "calm_46",  4),
    SectionTemplate("core_reset",       0.40, None,       0),
    SectionTemplate("reframe",          0.20, None,       0),
    SectionTemplate("closing",          0.10, None,       0),
]

# Every stressor category uses the same structural templates.
# The per-category differentiation happens in the script generator prompt,
# not in the section structure.
SECTION_TEMPLATES: Dict[str, List[SectionTemplate]] = {
    "deadline":     _STANDARD_RESET,
    "presentation": _STANDARD_RESET,
    "burnout":      _STANDARD_RESET,
    "distraction":  _STANDARD_RESET,
    "overthinking": _STANDARD_RESET,
    "imposter":     _STANDARD_RESET,
    "exam":         _STANDARD_RESET,
    "general":      _STANDARD_RESET,
}


def get_template_for_duration(category: str, duration_mins: int) -> List[SectionTemplate]:
    """Return the right template variant based on reset duration."""
    if duration_mins <= 3:
        return _SHORT_RESET
    elif duration_mins <= 6:
        return SECTION_TEMPLATES.get(category, _STANDARD_RESET)
    else:
        return _LONG_RESET
