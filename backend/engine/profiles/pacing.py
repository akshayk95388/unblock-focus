PAUSE_WEIGHTS = {
    "short":           {"weight": 1,  "minimum_ms": 800},
    "transition":      {"weight": 2,  "minimum_ms": 1500},
    "reflection":      {"weight": 4,  "minimum_ms": 4000},
    "deep_reflection": {"weight": 7,  "minimum_ms": 8000},
    "section_end":     {"weight": 10, "minimum_ms": 12000},
}

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
