"""Unblock Reel Golden Examples.

Handcrafted reference scripts that teach the LLM the snappy, direct,
high-impact rhythm needed for 2-minute social media reels.

Section structure: hook → breathing_reset → reframe → closing
Pacing: 130–140 WPM, 8–15 word sentences, snappy 1–2s pauses.
"""

from dataclasses import dataclass
from typing import Dict, List, Tuple


# ── Data Model ──────────────────────────────────────────────────────

@dataclass(frozen=True)
class ReelExample:
    """A single handcrafted reference script (unblock reels)."""
    tag: str             # descriptive tag, e.g. "overthinking_decision"
    category: str        # e.g. "overthinking", "deadline"
    intent: str          # "work" or "decompress"
    stressor: str        # The fictional stressor used in this example
    script: str          # Human-readable script text


# ── Golden Scripts ──────────────────────────────────────────────────
# Structure mirrors reel sections:
#   hook → breathing_reset → reframe → closing
# Each script targets ~120–140 words of narration for a 2-minute reel.

_REEL_OVERTHINKING = ReelExample(
    tag="overthinking_decision",
    category="overthinking",
    intent="work",
    stressor="Can't decide on pricing strategy, been going back and forth all day",
    script="""\
Title: Stop Spinning, Start Moving
Intention: Break the overthinking loop and commit to a decision.
Focus task: Pick a pricing option and go with it

[hook]
- If your mind is spinning over a tough decision, take two minutes right here.

[breathing_reset]
- Let's slow down and take a few breaths together before we continue.
- Just follow along with me and let everything else fade out.

[reframe]
- You're not stuck because you don't know the answer.
- You're stuck because you're hunting for the perfect one.
- There is no perfect option and waiting won't create one.
- The longer you circle the same choices the heavier they feel.
- Pick the one that feels eighty percent right and commit to it.
- You can always adjust later once you have real data to work with.

[closing]
- Go make that call right now and stop circling the same loop.""",
)


_REEL_LAUNCH_ANXIETY = ReelExample(
    tag="launch_anxiety",
    category="deadline",
    intent="work",
    stressor="Terrified of launching on Product Hunt tomorrow morning",
    script="""\
Title: Ship It Scared
Intention: Release the paralysis of launch fear and press the button.
Focus task: Finalize the launch page and submit

[hook]
- If you're terrified of shipping something tomorrow, give me two minutes.

[breathing_reset]
- Let's pause right here and take a few slow breaths together.
- Follow along with me and let the rush quiet down for a moment.

[reframe]
- That fear you're feeling right now is not a warning sign.
- It means you care enough about this to feel something real.
- Nobody launches feeling fully ready and that includes the people you admire.
- Your product doesn't need to be perfect to be valuable to someone.
- It just needs to be out there where real people can use it.
- The version in your head will always feel better than the one you ship.

[closing]
- Open your launch page right now and hit the button you've been avoiding.""",
)


_REEL_PROCRASTINATION = ReelExample(
    tag="procrastination_writing",
    category="deadline",
    intent="work",
    stressor="Procrastinating on writing the investor pitch deck",
    script="""\
Title: Shrink It Down
Intention: Collapse the overwhelming task into one tiny starting move.
Focus task: Open the deck and draft the first slide

[hook]
- If you've been avoiding that one task all day, stop and listen.

[breathing_reset]
- Let's take a moment to breathe before we deal with this.
- Just follow along with me and let your shoulders drop down.

[reframe]
- You're not lazy and this isn't a motivation problem at all.
- Your brain is avoiding the task because it feels too big right now.
- So let's make it smaller than your brain thinks it is.
- You don't need to finish the whole thing in one sitting today.
- You just need to open the file and write one rough sentence.
- Once you start moving the resistance almost always fades on its own.

[closing]
- Open your file right now and write that first rough sentence.""",
)


# ── Registry ────────────────────────────────────────────────────────
# Keyed by (category, intent) for matching, same pattern as guided.

REEL_EXAMPLES: Dict[Tuple[str, str], ReelExample] = {
    ("overthinking", "work"): _REEL_OVERTHINKING,
    ("deadline", "work"):     _REEL_LAUNCH_ANXIETY,
    # Procrastination also falls under deadline category;
    # store as a secondary for use when max_examples > 1
}

# Default fallback — used when no category/intent match is found.
_DEFAULT_REEL = _REEL_PROCRASTINATION

# All examples in a flat list (for iteration and multi-example pulls).
_ALL_REEL_EXAMPLES: List[ReelExample] = [
    _REEL_OVERTHINKING,
    _REEL_LAUNCH_ANXIETY,
    _REEL_PROCRASTINATION,
]


# ── Selector ────────────────────────────────────────────────────────

def get_reel_examples(
    category: str = "general",
    intent: str = "work",
    max_examples: int = 1,
) -> List[ReelExample]:
    """Return reel golden example(s), matched by category and intent.

    Selection priority:
      1. Exact (category, intent) match
      2. Any same-intent example
      3. Default fallback (_REEL_PROCRASTINATION)

    Args:
        category: The classifier's category output.
        intent:   The classifier's intent output ("work" or "decompress").
        max_examples: Maximum number of examples to return (default 1).

    Returns:
        A list of 1..max_examples ReelExample instances.
    """
    # 1. Try exact match
    exact = REEL_EXAMPLES.get((category, intent))

    # 2. Collect all same-intent examples (for multi-example and fallback)
    same_intent = [
        ex for (cat, intn), ex in REEL_EXAMPLES.items()
        if intn == intent and (cat, intn) != (category, intent)
    ]

    # Build the result list
    result: List[ReelExample] = []

    if exact:
        result.append(exact)
    elif same_intent:
        # No exact match — use first same-intent as primary
        result.append(same_intent.pop(0))
    else:
        # No intent match at all — universal fallback
        result.append(_DEFAULT_REEL)
        return result[:max_examples]

    # Fill remaining slots with same-intent examples (if max_examples > 1)
    for ex in same_intent:
        if len(result) >= max_examples:
            break
        if ex not in result:
            result.append(ex)

    # If still need more, add the default if not already present
    if len(result) < max_examples and _DEFAULT_REEL not in result:
        result.append(_DEFAULT_REEL)

    return result[:max_examples]


# ── Formatter ───────────────────────────────────────────────────────

def format_reel_examples_block(examples: List[ReelExample]) -> str:
    """Format selected reel examples into the prompt injection block.

    Same XML structure as guided/visualization examples but adapted
    for the reel's snappy, direct tone.
    """
    if not examples:
        return ""

    parts = []
    for ex in examples:
        parts.append(
            f"<example>\n"
            f"Stressor: \"{ex.stressor}\"\n"
            f"Category: {ex.category}\n"
            f"Intent: {ex.intent}\n"
            f"Duration: 2 minutes\n"
            f"\n"
            f"{ex.script}\n"
            f"</example>"
        )

    count_word = "an example" if len(examples) == 1 else f"{len(examples)} examples"
    header = f"Here is {count_word} of the snappy, direct, high-impact rhythm you should match:"
    footer = (
        "Now write a reel for this person. Match the example's punchy rhythm, "
        "crisp sentences, and direct tone — but adapt fully for "
        "their unique situation."
    )

    return f"{header}\n\n" + "\n\n".join(parts) + f"\n\n{footer}"
