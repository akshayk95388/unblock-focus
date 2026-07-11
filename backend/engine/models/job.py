from dataclasses import dataclass, field
from typing import Optional, List


@dataclass
class SpeechSegment:
    """Represents one generated TTS audio file for a SpeechEvent."""
    segment_id: str = ""
    path: str = ""
    duration_s: float = 0.0


@dataclass
class SubtitleEntry:
    """One subtitle cue tied to a speech segment."""
    segment_id: str = ""
    text: str = ""
    start_ms: int = 0
    end_ms: int = 0
