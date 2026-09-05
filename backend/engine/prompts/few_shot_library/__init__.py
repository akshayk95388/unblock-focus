"""Few-Shot Golden Examples Library.

Handcrafted reference scripts that teach the LLM tone, rhythm, and
emotional arc by demonstration.

- Guided examples: keyed by (category, intent) — see guided_examples.py
- Visualization examples: keyed by tag — see visualization_examples.py
- Reel examples: keyed by (category, intent) — see reel_examples.py
"""

# Guided session exports
from engine.prompts.few_shot_library.guided_examples import (
    GoldenExample,
    EXAMPLES,
    get_examples,
    format_examples_block,
)

# Visualization session exports
from engine.prompts.few_shot_library.visualization_examples import (
    VisualizationExample,
    VISUALIZATION_EXAMPLES,
    get_visualization_examples,
    format_visualization_examples_block,
)

# Reel session exports
from engine.prompts.few_shot_library.reel_examples import (
    ReelExample,
    REEL_EXAMPLES,
    get_reel_examples,
    format_reel_examples_block,
)

__all__ = [
    # Guided
    "GoldenExample",
    "EXAMPLES",
    "get_examples",
    "format_examples_block",
    # Visualization
    "VisualizationExample",
    "VISUALIZATION_EXAMPLES",
    "get_visualization_examples",
    "format_visualization_examples_block",
    # Reel
    "ReelExample",
    "REEL_EXAMPLES",
    "get_reel_examples",
    "format_reel_examples_block",
]
