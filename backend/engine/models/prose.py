from dataclasses import dataclass, field
from typing import Optional, List

from engine.profiles.pacing import DEFAULT_PAUSE_TYPE


@dataclass
class ProseLine:
    text: str = ""
    pause_after: str = DEFAULT_PAUSE_TYPE  # short | transition | reflection | deep_reflection | section_end


@dataclass
class ProseSection:
    name: str = ""
    lines: List[ProseLine] = field(default_factory=list)
    breath_cycle: Optional[str] = None   # pattern_id or None
    breath_repetitions: int = 0


@dataclass
class ProseScript:
    title: str = ""
    sections: List[ProseSection] = field(default_factory=list)
