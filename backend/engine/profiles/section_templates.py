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
    SectionTemplate("grounding",        0.10, None,       0),
    SectionTemplate("breathing_reset",  0.20, "calm_46",  2),
    SectionTemplate("core_reset",       0.40, None,       0),
    SectionTemplate("reframe",          0.20, None,       0),
    SectionTemplate("closing",          0.10, None,       0),
]

DEEP_RESET = [
    SectionTemplate("grounding",        0.10, None,       0),
    SectionTemplate("breathing_reset",  0.20, "calm_46",  4),
    SectionTemplate("core_reset",       0.40, None,       0),
    SectionTemplate("reframe",          0.20, None,       0),
    SectionTemplate("closing",          0.10, None,       0),
]

UNBLOCK_REEL = [
    SectionTemplate("hook",            0.15, None,       0),
    SectionTemplate("breathing_reset", 0.25, "calm_46",  2),
    SectionTemplate("reframe",         0.45, None,       0),
    SectionTemplate("closing",         0.15, None,       0),
]

VISUALIZATION = [
    SectionTemplate("intention_clarity",    0.15, None,       0),  # Name the goal clearly
    SectionTemplate("breathing_anchor",     0.15, "calm_46",  3),  # Deep calm state
    SectionTemplate("sensory_immersion",    0.35, None,       0),  # Vividly picture having achieved it
    SectionTemplate("identity_anchor",      0.20, None,       0),  # Feel the gratitude & confidence
    SectionTemplate("execution_bridge",     0.15, None,       0),  # Bridge back to one action today
]

# ── Social media video templates ────────────────────────────────────
# Same structure as guided/visualization deep sessions but with a single
# 1-line viral_hook prepended directly before breathing.

GUIDED_VIDEO = [
    SectionTemplate("viral_hook",       0.05, None,       0),  # Single 1-line hook
    SectionTemplate("breathing_reset",  0.20, "calm_46",  4),  # Deep: 4 breath cycles
    SectionTemplate("core_reset",       0.40, None,       0),
    SectionTemplate("reframe",          0.20, None,       0),
    SectionTemplate("closing",          0.10, None,       0),
]

VISUALIZATION_VIDEO = [
    SectionTemplate("viral_hook",           0.05, None,       0),  # Single 1-line hook
    SectionTemplate("breathing_anchor",     0.15, "calm_46",  4),  # Deep: 4 breath cycles
    SectionTemplate("sensory_immersion",    0.35, None,       0),
    SectionTemplate("identity_anchor",      0.20, None,       0),
    SectionTemplate("execution_bridge",     0.15, None,       0),
]


def get_template_for_preset(preset: str, duration_category: str) -> List[SectionTemplate]:
    """Return structural template based on preset or duration category."""
    if preset == "unblock_reel":
        return UNBLOCK_REEL
    return DEEP_RESET if duration_category == "deep" else QUICK_RESET


def get_template_for_category(duration_category: str) -> List[SectionTemplate]:
    """Return the structural template for a duration category."""
    return DEEP_RESET if duration_category == "deep" else QUICK_RESET
