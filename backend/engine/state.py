"""MeditationEngineState — the TypedDict flowing through LangGraph."""
from typing import TypedDict, Optional, List, Any

from engine.models.events import MeditationEvent
from engine.models.timeline import MeditationTimeline
from engine.models.job import SpeechSegment, SubtitleEntry


class SectionPlan(TypedDict):
    name: str
    duration_s: float
    breath_pattern: Optional[str]
    breath_cycles: int


class MeditationEngineState(TypedDict, total=False):
    # ── Input ──
    job_id: str
    stressor: str
    duration_mins: int
    voice_key: str
    music_key: str

    # ── Classifier output ──
    meditation_type: str          # anxiety | sleep | focus
    section_plan: List[SectionPlan]
    pacing_profile: str           # normal | slow | very_slow
    target_word_count: int

    # ── Script generator output ──
    timeline: MeditationTimeline
    raw_prose: dict               # raw JSON from LLM

    # ── Validator output ──
    validation_issues: List[str]
    fix_attempts: int

    # ── TTS output ──
    speech_segments: List[SpeechSegment]
    total_speech_s: float
    breath_cues: dict             # pattern_id -> {phase_name -> audio_path}

    # ── Composer output ──
    assembled_path: str
    actual_duration_s: float

    # ── Mastering output ──
    mastered_path: str

    # ── Storage output ──
    storage_url: str
    subtitles: List[SubtitleEntry]

    # ── Status ──
    status: str                   # pending | running | complete | failed
    error: Optional[str]
    current_stage: str
    progress_pct: float
