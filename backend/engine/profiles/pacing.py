PAUSE_WEIGHTS = {
    "short":           {"weight": 1,  "minimum_ms": 800,   "maximum_ms": 2500,  "max_prompt_s": 2},
    "transition":      {"weight": 2,  "minimum_ms": 1500,  "maximum_ms": 4500,  "max_prompt_s": 3},
    "reflection":      {"weight": 4,  "minimum_ms": 4000,  "maximum_ms": 7000,  "max_prompt_s": 6},
    "deep_reflection": {"weight": 7,  "minimum_ms": 8000,  "maximum_ms": 12000, "max_prompt_s": 15},
    "section_end":     {"weight": 10, "minimum_ms": 12000, "maximum_ms": 15000, "max_prompt_s": 30},
}

# Default pause type when LLM output is missing or invalid.
DEFAULT_PAUSE_TYPE = "reflection"

# Safety ceiling for unrecognized pause types in the reconciler.
# Matches section_end's maximum_ms — the largest valid pause cap.
FALLBACK_MAX_PAUSE_MS = 15000

# Threshold: if pause budget exceeds this fraction of target duration,
# the script is too short and an extra breath cycle is inserted.
SHORT_SCRIPT_PAUSE_THRESHOLD = 0.70

# Target WPM per stressor category
# Resets are conversational (100-120 WPM) vs meditations (65-95 WPM)
PACING_PROFILES = {
    "deadline":      {"wpm": 110, "profile": "conversational"},
    "presentation":  {"wpm": 105, "profile": "conversational"},
    "burnout":       {"wpm": 95,  "profile": "gentle"},
    "distraction":   {"wpm": 110, "profile": "conversational"},
    "overthinking":  {"wpm": 100, "profile": "steady"},
    "imposter":      {"wpm": 100, "profile": "steady"},
    "exam":          {"wpm": 110, "profile": "conversational"},
    "general":       {"wpm": 105, "profile": "conversational"},
}

# Speech density: what fraction of total duration should be speech
SPEECH_DENSITY = {
    "deadline":      0.55,
    "presentation":  0.55,
    "burnout":       0.45,   # more silence — they need rest
    "distraction":   0.55,
    "overthinking":  0.50,
    "imposter":      0.50,
    "exam":          0.55,
    "general":       0.50,
}
