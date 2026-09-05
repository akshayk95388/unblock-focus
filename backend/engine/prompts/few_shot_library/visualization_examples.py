"""Visualization Session Golden Examples.

Handcrafted reference scripts that teach the LLM tone, imagery, and
immersive depth for goal visualization sessions.
"""

from dataclasses import dataclass
from typing import List


# ── Data Model ──────────────────────────────────────────────────────

@dataclass(frozen=True)
class VisualizationExample:
    """A single handcrafted reference script (visualization sessions)."""
    tag: str             # descriptive tag, e.g. "career_launch"
    goal: str            # The fictional goal used in this example
    script: str          # Human-readable script text


# ── Golden Scripts ──────────────────────────────────────────────────
# Structure mirrors visualization sections:
#   intention_clarity → breathing_anchor → sensory_immersion →
#   identity_anchor → execution_bridge

_VIZ_CAREER_LAUNCH = VisualizationExample(
    tag="career_launch",
    goal="Launch my SaaS app and reach 10,000 users",
    script="""\
Title: Launch to 10,000 Users
Intention: Visualize successfully launching your app to 10,000 users.
Focus task: Plan next feature

[intention_clarity]
- Right now, you're on the path to launching your SaaS app.
- Picture it reaching ten thousand users, each finding value in what you built.
- Imagine the impact and satisfaction of seeing your vision come to life.

[breathing_anchor]
- Let's take a moment to breathe and settle into this.
- Feel each breath bringing focus and clarity to your mind.

[sensory_immersion]
- You're in a bright room, filled with the hum of excitement and energy.
- Your computer screen displays a dashboard showing ten thousand active users.
- You hear notifications of new sign-ups and positive feedback rolling in.
- The air is filled with a sense of achievement and validation.
- You feel the warmth of a smile spreading across your face.
- Colleagues around you congratulate you, sharing in the success and joy.

[identity_anchor]
- You are the confident creator who brought this vision into reality.
- Feel the gratitude for your hard work and dedication.
- This is who you are now — capable, driven, and successful.

[execution_bridge]
- Take a deep breath, returning to the present moment.
- Plan the next feature that will engage and delight your users.
- You're moving steadily towards your goal, one step at a time.""",
)


_VIZ_FITNESS_GOAL = VisualizationExample(
    tag="fitness_milestone",
    goal="Run my first marathon and cross that finish line",
    script="""\
Title: Cross the Finish Line
Intention: Feel the moment you complete your first marathon.
Focus task: Lace up and run today's training miles

[intention_clarity]
- You've been training for this marathon, putting in the miles week after week.
- Picture yourself on race day, standing at the starting line with thousands of runners.
- This isn't a dream anymore — it's a date on the calendar.

[breathing_anchor]
- Let's slow your breathing down and settle into this moment.
- Just follow along with me and let everything else quiet down.

[sensory_immersion]
- It's early morning and the air is cool against your skin.
- You can hear the crowd cheering along the course, strangers calling your name.
- Your legs are tired but they know what to do, carrying you forward.
- You round the final corner and the finish line banner comes into view.
- Your chest swells with something you can't quite name — pride mixed with disbelief.
- You cross the line and feel the medal placed around your neck, cool and heavy.
- Someone hands you water and you laugh, still catching your breath.

[identity_anchor]
- You're not someone who talks about running a marathon someday.
- You're a person who trained, showed up, and finished what they started.
- That quiet confidence stays with you long after the race is over.

[execution_bridge]
- Take a slow breath and come back to right now.
- Lace up your shoes and go run today's training miles.
- Every run between now and race day is building the person who finishes.""",
)


_VIZ_CREATIVE_ACHIEVEMENT = VisualizationExample(
    tag="creative_achievement",
    goal="Finish writing my novel and hold the published book in my hands",
    script="""\
Title: Hold Your Book
Intention: Feel the moment you hold your finished, published novel.
Focus task: Write the next chapter

[intention_clarity]
- You've been carrying this story inside you for a long time now.
- Picture the moment it's no longer just an idea but a real book.
- Imagine holding it in your hands, your name printed on the cover.

[breathing_anchor]
- Let's take a few slow breaths together before we go deeper.
- Just breathe along with me and let your mind open up.

[sensory_immersion]
- You're sitting in your favorite chair, holding a hardcover book with your name on it.
- The pages smell like fresh ink and the cover feels smooth under your fingers.
- You flip to the dedication page and read the words you wrote for someone you love.
- Friends are texting you screenshots of your book on their shelves.
- You remember the late nights, the doubt, the chapters you rewrote three times.
- None of that weight is here now — just the quiet satisfaction of having finished.

[identity_anchor]
- You're not someone who wanted to write a book but never did.
- You're a writer who sat down, struggled through the hard parts, and finished.
- That identity doesn't come from talent — it comes from not quitting.

[execution_bridge]
- Take a breath and come back to today.
- Open your manuscript and write the next chapter, even if it's rough.
- The finished book is built one honest writing session at a time.""",
)


# ── Registry ────────────────────────────────────────────────────────
# A flat list — we always pick one at random or rotate through.

VISUALIZATION_EXAMPLES: List[VisualizationExample] = [
    _VIZ_CAREER_LAUNCH,
    _VIZ_FITNESS_GOAL,
    _VIZ_CREATIVE_ACHIEVEMENT,
]


# ── Selector ────────────────────────────────────────────────────────

def get_visualization_examples(max_examples: int = 1) -> List[VisualizationExample]:
    """Return visualization golden example(s).

    Picks the first N examples from the registry. When the library
    grows, this can be upgraded to semantic similarity selection.

    Args:
        max_examples: Maximum number of examples to return (default 1).

    Returns:
        A list of 1..max_examples VisualizationExample instances.
    """
    return VISUALIZATION_EXAMPLES[:max_examples]


# ── Formatter ───────────────────────────────────────────────────────

def format_visualization_examples_block(examples: List[VisualizationExample]) -> str:
    """Format selected visualization examples into the prompt injection block.

    Same XML structure as guided examples but adapted for visualization
    fields (goal instead of stressor/category/intent).
    """
    if not examples:
        return ""

    parts = []
    for ex in examples:
        parts.append(
            f"<example>\n"
            f"Goal: \"{ex.goal}\"\n"
            f"Duration: 3 minutes\n"
            f"\n"
            f"{ex.script}\n"
            f"</example>"
        )

    count_word = "an example" if len(examples) == 1 else f"{len(examples)} examples"
    header = f"Here is {count_word} of the tone, imagery, and immersive depth you should match:"
    footer = (
        "Now write a visualization for this person. Match the example's vividness, "
        "sensory detail, and natural spoken rhythm — but adapt fully for "
        "their unique goal."
    )

    return f"{header}\n\n" + "\n\n".join(parts) + f"\n\n{footer}"
