from dataclasses import dataclass, field
from typing import Optional, Literal, Union
from enum import Enum

from engine.profiles.pacing import PAUSE_WEIGHTS, DEFAULT_PAUSE_TYPE


class PauseType(str, Enum):
    SHORT = "short"
    TRANSITION = "transition"
    REFLECTION = "reflection"
    DEEP_REFLECTION = "deep_reflection"
    SECTION_END = "section_end"


class DeliveryStyle(str, Enum):
    WARM = "warm"
    SOFT = "soft"
    GROUNDING = "grounding"
    REASSURING = "reassuring"
    BREATH_GUIDANCE = "breath_guidance"


# Derive defaults from pacing config so they stay in sync
_DEFAULT_PAUSE = PAUSE_WEIGHTS[DEFAULT_PAUSE_TYPE]


@dataclass
class SpeechEvent:
    type: Literal["speech"] = "speech"
    segment_id: str = ""
    text: str = ""
    delivery: DeliveryStyle = DeliveryStyle.WARM


@dataclass
class PauseEvent:
    type: Literal["pause"] = "pause"
    pause_type: PauseType = PauseType.REFLECTION
    weight: int = _DEFAULT_PAUSE["weight"]           # derived from pacing config
    minimum_ms: int = _DEFAULT_PAUSE["minimum_ms"]   # derived from pacing config
    resolved_ms: int = 0      # set by reconciler after TTS


@dataclass
class BreathEvent:
    type: Literal["breath"] = "breath"
    pattern: str = "calm_46"  # key in BREATH_PATTERNS
    cycles: int = 3
    duration_s: float = 0.0   # calculated at build time (exact)


@dataclass
class SectionMarkerEvent:
    type: Literal["section_marker"] = "section_marker"
    section_name: str = ""
    section_index: int = 0


MeditationEvent = Union[SpeechEvent, PauseEvent, BreathEvent, SectionMarkerEvent]
