from dataclasses import dataclass, field
from typing import Optional, Literal, Union
from enum import Enum


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
    weight: int = 4           # derived from pause_type at build time
    minimum_ms: int = 4000    # derived from pause_type at build time
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
