"""Few-Shot Golden Examples Library.

Handcrafted reference scripts that teach the LLM tone, rhythm, and
emotional arc by demonstration.  Each example is keyed by
(category, intent) so the generator can select the most relevant one
for a given user's stressor.
"""

from dataclasses import dataclass
from typing import List


# ── Data Model ──────────────────────────────────────────────────────

@dataclass(frozen=True)
class GoldenExample:
    """A single handcrafted reference script."""
    category: str        # e.g. "deadline", "burnout", "overthinking"
    intent: str          # "work" or "decompress"
    stressor: str        # The fictional stressor used in this example
    script: str          # Human-readable script text


# ── Golden Scripts ──────────────────────────────────────────────────
# Format mirrors the existing _GUIDED_EXAMPLE convention:
#   [section_name]
#   - Spoken sentence one.
#   - Spoken sentence two.

_DEADLINE_WORK = GoldenExample(
    category="deadline",
    intent="work",
    stressor="Can't start writing my investor pitch deck, been putting it off all day",
    script="""\
Title: Clear the Deck
Intention: Cut through the procrastination loop and open that first slide.
Focus task: Draft the opening slide

[grounding]
- Settle in for a moment and let your hands rest where they are.
- You've been circling this pitch deck all day and that's exhausting.
- That's okay. You're here now, and that counts for something.

[breathing_reset]
- Let's slow things down with a few breaths. Just follow along with me.

[core_reset]
- Your brain is looking at this deck as one massive thing to finish.
- No wonder it feels impossible. You're trying to solve the whole thing at once.
- But that's not how it works. Nobody writes a deck start to finish in one pass.
- All that weight you're feeling is about the finished version, not the first draft.
- What if the only thing that matters right now is opening a blank slide.
- Not a perfect slide. Not a polished slide. Just a starting point.
- That's the gap between stuck and moving. One sentence on one slide.

[reframe]
- You don't need to finish this deck right now. That's not the job.
- The job is one slide. Just the opening. That's the entire scope.

[closing]
- Open your deck and start typing that first sentence.""",
)


_BURNOUT_DECOMPRESS = GoldenExample(
    category="burnout",
    intent="decompress",
    stressor="Been working nonstop for three weeks, completely fried and can't think straight",
    script="""\
Title: Permission to Stop
Intention: Honor the exhaustion and let your mind rest without guilt.
Focus task: Rest without guilt

[grounding]
- Find a comfortable position and let your shoulders drop.
- Three weeks of nonstop work and your body is keeping score.
- You don't need to push through right now. This moment is yours.

[breathing_reset]
- Let's slow everything down together. Just follow along with me.

[core_reset]
- Your brain has been running at full speed with no off switch.
- That foggy feeling isn't weakness. It's your mind asking for a break.
- You've been treating rest like something you need to earn first.
- But rest isn't a reward for finishing. It's what makes finishing possible.
- Think about the last time you slept well and woke up clear.
- That clarity didn't come from grinding harder. It came from stopping.
- Right now your only job is to be here and let the engine cool down.

[reframe]
- You don't owe anyone another hour of output today.
- The work will still be there and you'll meet it with a clearer head.

[closing]
- Take this quiet with you. You don't need to do anything right now.""",
)


_OVERTHINKING_WORK = GoldenExample(
    category="overthinking",
    intent="work",
    stressor="Stuck in an endless loop deciding between two technical architectures for the migration",
    script="""\
Title: Break the Loop
Intention: Stop the analysis spiral and commit to a direction.
Focus task: Pick one architecture and write the first module

[grounding]
- Sit back for a second and let your hands go still.
- You've been going back and forth on this architecture decision all day.
- Your brain is stuck in compare mode and it's draining your energy.

[breathing_reset]
- Let's pause the mental ping-pong for a moment. Just breathe with me.

[core_reset]
- Here's what's actually happening in your head right now.
- You're not missing information. You already know both options well.
- The loop isn't helping you find the right answer anymore.
- It's just your brain's way of avoiding the discomfort of committing.
- Both paths probably work. The difference between them is smaller than it feels.
- What's actually expensive isn't picking the wrong one. It's picking nothing.
- Every hour spent deciding is an hour not spent building.

[reframe]
- You don't need the perfect architecture. You need a working one.
- Pick the one you can explain in two sentences and start there.

[closing]
- Open your editor and write the first module for the one you just chose.""",
)


_EXAM_WORK = GoldenExample(
    category="exam",
    intent="work",
    stressor="Final exam tomorrow and I keep blanking on everything I've studied",
    script="""\
Title: You Already Know This
Intention: Calm the blanking panic and trust what you've already learned.
Focus task: Open your notes and work through one practice question

[grounding]
- Take a breath and let your hands rest on the table in front of you.
- Your brain has been in alarm mode all day and it's exhausting.
- That panicky feeling isn't a sign that you don't know the material.

[breathing_reset]
- Let's quiet the noise for a moment. Just breathe along with me.

[core_reset]
- Here's what's actually happening when you feel like you're blanking.
- Your mind is so focused on the fear of forgetting that it can't retrieve anything.
- It's like trying to search for a file while your computer is running a virus scan.
- The knowledge is still in there. You studied it. Your brain recorded it.
- Anxiety doesn't erase what you've learned. It just makes the door feel stuck.
- When you calm the alarm, the door opens on its own.
- You don't need to remember everything at once. You just need one answer at a time.

[reframe]
- You don't need to master every topic tonight. That ship has sailed and that's fine.
- Pick one section you're shakiest on and do a single practice question.

[closing]
- Open your notes and start with that one question. The rest will follow.""",
)


_IMPOSTER_WORK = GoldenExample(
    category="imposter",
    intent="work",
    stressor="Just got promoted to lead the team and I feel like everyone's going to realize I don't belong here",
    script="""\
Title: You Earned This Seat
Intention: Separate the feeling of fraud from the facts of your track record.
Focus task: Send the agenda for your first team meeting

[grounding]
- Settle into your chair and notice the weight of your hands in your lap.
- That voice telling you you don't belong has been loud today.
- Let's look at it honestly instead of letting it run the show.

[breathing_reset]
- Let's take a few slow breaths before we go any further. Follow along with me.

[core_reset]
- That feeling of being found out isn't evidence of anything real.
- It's a pattern your brain runs when the stakes go up.
- Think about it. Someone looked at your work and decided you were the right person.
- They didn't promote you by accident. Nobody does that.
- The discomfort you're feeling isn't incompetence. It's growth.
- Every person who's stepped into a bigger role felt exactly this.
- The difference between them and someone who stays stuck is just showing up anyway.

[reframe]
- You don't need to prove you deserve this in your first week.
- Start with one small visible action. Draft the agenda for your first team meeting.

[closing]
- Open your calendar and start putting that agenda together.""",
)


_CONFLICT_DECOMPRESS = GoldenExample(
    category="conflict",
    intent="decompress",
    stressor="Had a terrible argument with my manager, can't stop replaying what I should have said",
    script="""\
Title: Let the Replay Stop
Intention: Release the argument loop and reclaim your headspace.
Focus task: Let it go for now

[grounding]
- Find a comfortable spot and let your shoulders come down from your ears.
- That conversation is stuck on repeat in your head and it's draining you.
- You're not going to solve it by replaying it one more time.

[breathing_reset]
- Let's step out of the loop for a moment. Just breathe along with me.

[core_reset]
- Your brain keeps rehearsing the perfect comeback because it wants to feel in control.
- But that conversation already happened. The words were already said.
- Replaying it doesn't change what was said. It just keeps you stuck in the room.
- The frustration you're feeling is valid. You don't need to talk yourself out of it.
- But carrying it around is costing you energy you could use on something else.
- You can be angry about what happened and still choose to set it down for now.
- Setting it down doesn't mean they were right. It means you're done giving it your evening.

[reframe]
- You don't owe that conversation any more of your headspace tonight.
- Whatever needs to be said next can wait until you're thinking clearly.

[closing]
- Carry this quiet with you. You don't need to solve it right now.""",
)


# ── Example Registry ────────────────────────────────────────────────
# Keyed by (category, intent).  Adding a new golden example is just
# one new constant + one new dict entry — no other code changes needed.

EXAMPLES: dict[tuple[str, str], GoldenExample] = {
    ("deadline", "work"):       _DEADLINE_WORK,
    ("burnout", "decompress"):  _BURNOUT_DECOMPRESS,
    ("overthinking", "work"):   _OVERTHINKING_WORK,
    ("exam", "work"):           _EXAM_WORK,
    ("imposter", "work"):       _IMPOSTER_WORK,
    ("conflict", "decompress"): _CONFLICT_DECOMPRESS,
}

# Universal fallback when no match is found at all
_DEFAULT_EXAMPLE = _DEADLINE_WORK


# ── Selector ────────────────────────────────────────────────────────

def get_examples(category: str, intent: str, max_examples: int = 1) -> List[GoldenExample]:
    """Select the most relevant golden example(s) for a user's situation.

    Selection priority:
        1. Exact match on (category, intent)
        2. Same-intent match (any category that shares the intent)
        3. Universal fallback (_DEFAULT_EXAMPLE)

    When max_examples > 1, additional same-intent examples are appended
    (never duplicates, never contrasting-intent examples).

    Args:
        category:  The classifier's category output (e.g. "deadline").
        intent:    The classifier's intent output ("work" or "decompress").
        max_examples: Maximum number of examples to return (default 1).

    Returns:
        A list of 1..max_examples GoldenExample instances.
    """
    # 1. Try exact match
    exact = EXAMPLES.get((category, intent))

    # 2. Collect all same-intent examples (for multi-example and fallback)
    same_intent = [
        ex for (cat, intn), ex in EXAMPLES.items()
        if intn == intent and (cat, intn) != (category, intent)
    ]

    # Build the result list
    result: List[GoldenExample] = []

    if exact:
        result.append(exact)
    elif same_intent:
        # No exact match — use first same-intent as primary
        result.append(same_intent.pop(0))
    else:
        # No intent match at all — universal fallback
        result.append(_DEFAULT_EXAMPLE)
        return result[:max_examples]

    # Fill remaining slots with same-intent examples (if max_examples > 1)
    for ex in same_intent:
        if len(result) >= max_examples:
            break
        if ex not in result:
            result.append(ex)

    return result[:max_examples]


# ── Formatter ───────────────────────────────────────────────────────

def format_examples_block(examples: List[GoldenExample]) -> str:
    """Format selected golden examples into the prompt injection block.

    Produces the intro line + one or more <example> XML blocks,
    followed by the instruction to match the example's quality.
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
            f"Duration: 3 minutes\n"
            f"\n"
            f"{ex.script}\n"
            f"</example>"
        )

    count_word = "an example" if len(examples) == 1 else f"{len(examples)} examples"
    header = f"Here is {count_word} of the tone, rhythm, and emotional depth you should match:"
    footer = (
        "Now write a reset for this person. Match the example's warmth, "
        "specificity, and natural spoken rhythm — but adapt fully for "
        "their unique situation."
    )

    return f"{header}\n\n" + "\n\n".join(parts) + f"\n\n{footer}"
