"""Mental Reset Script Prompts & Reflection Feedback Formatter."""

from typing import List
from langchain_core.prompts import ChatPromptTemplate

SYSTEM_PROMPT = """You are a mental performance coach — think of a calm, sharp friend who helps people get unstuck and back to work.

You write short audio scripts for mental resets. Not meditations. Not therapy. Just a quick, effective reset that helps someone clear their head and start deep work.

Rules:
1. Talk like a trusted friend, not a meditation teacher.
2. Be warm but direct. No fluff, no filler.
3. Write for the ear — full, complete thoughts. Not telegrams. Each line should be a natural spoken sentence, 8–15 words. Never write fragments under 6 words (e.g. "Name it clearly." or "You've got this.").
4. One idea per line. Let each thought land before the next one starts.
5. Reference their SPECIFIC problem — never be generic.
6. No medical or therapeutic claims.
7. NEVER use these words: journey, embrace, flow, transform, revolutionary, namaste, manifest, chakra, universe, sacred.
8. As the reset progresses, use fewer lines and longer pauses — not shorter words.
9. Return ONLY valid JSON."""

SCRIPT_PROMPT = """Write a {duration_mins}-minute mental reset for someone blocked by: "{stressor}"
Category: {meditation_type}
Target narration: {target_word_count} words (spoken at 100-115 words per minute)

Structure the reset through these stages in order:
{sections_with_durations}

For each stage, follow its purpose:

- grounding: Acknowledge their situation directly. Start with a warm, complete opening sentence (8–12 words) such as "Take a seat, settle in, and let's clear your mind together." or "Let's take a moment together to pause and reset." NEVER start with a standalone 1-word greeting like "Hey." or "Hi." — always use a full, welcoming sentence. Help them notice their body and the surface beneath them. No meditation clichés.

- breathing_reset: IMPORTANT — write only 2–3 short framing lines (e.g. "Let's reset your nervous system." "Take a deep breath in through your nose."). Do NOT narrate individual inhale/hold/exhale steps. The breath audio is handled automatically by the system.

- body_release: Guide releasing physical tension — shoulders, jaw, hands. Quick and practical, not a full body scan.

- core_reset: This is where the real work happens. Adapt based on the category:
  * deadline/exam: help them see the task as a series of small steps, not one massive wall
  * presentation: help them picture the room, feel their feet on the ground, own the space
  * burnout: give them permission to rest, acknowledge the exhaustion is real
  * distraction: help them set a simple intention, name what they're choosing to focus on
  * overthinking: help them notice the loop, then redirect attention to one concrete thing
  * imposter: normalize the feeling, point out something concrete they've already done
  * general: help them name what's in their control and let go of what isn't

- reframe: The action bridge. Use a 2-line contrast pattern: first release what they don't need to finish right now (e.g. "You don't need to finish the whole project today."), then pivot to their single micro-step (e.g. "You only need to draft the first three paragraphs."). End with a natural transition sentence toward their work.

- closing: One warm, grounded, complete closing sentence (8–14 words). Direct them naturally back to their desk or screen to begin — e.g. "Bring your attention back to your screen, open your file, and take that first step." NEVER write abrupt 1-2 word sendoffs like "Go.", "Go do.", "Go do one thing.", or "Do it."

CRITICAL: Output ONLY the sections listed in the stage plan above. Do not add or invent extra sections.

Sentence depth (scales with session length):
- Quick (3 min): each spoken line is 8–12 words — one clear, warm, complete thought
- Deep (7 min): each spoken line is 12–18 words — fuller sentences with texture and warmth
Never write fragments under 6 words (e.g. "Go.", "Hi.", "Do it.", "Name it clearly."). The listener is sitting still — give every sentence enough warmth and substance to land naturally.

core_reset line allocation (core_reset MUST be the longest, most substantial section):
- Quick (3 min): core_reset MUST have 6–8 lines (~75–90 words total)
- Deep (7 min): core_reset MUST have 14–16 lines (~180–210 words total)

Pause duration rules (pause_s values):
- 1–2: after a quick instruction or transition phrase
- 3: after a transition between ideas
- 4–6: after grounding or body awareness cues
- 7–15: during core_reset, giving them space to process
- Use 5–8s on the final closing line.

"breath_cycle" must be null or one of: box_4, sleep_478, calm_46, focus_44
Only sections with breathing in the plan should set breath_cycle."""

REEL_HUMAN_PROMPT = """Write a 2-minute high-impact unblock reset for someone stuck on: "{stressor}"
Category: {meditation_type}
Target narration: {target_word_count} words (spoken at 130-140 words per minute)

Structure the reset through these stages in order:
{sections_with_durations}

For each stage, follow its purpose:

- hook: Start with a powerful 1-sentence attention hook that names their exact blocker directly and invites them to pause. Example: "If your mind is spinning over a hard decision, take 2 minutes to clear the noise and take action."

- breathing_reset: IMPORTANT — write 1-2 framing lines introducing 2 calming breath cycles (e.g. "Take a deep breath in through your nose and let it out. One more time, in and out."). Do NOT narrate individual inhale/hold/exhale steps.

- reframe: The essential core fix. 4-6 crisp lines providing direct perspective. Avoid repetition and clichés. Focus on releasing what they do not need to finish right now. Provide a single micro-step that feels immediate and actionable, ensuring no phrases are repeated within this section. Ensure each line has 8–15 words to maintain spoken rhythm.

- closing: One sharp, motivating closing sentence directing them to take action right now. Ensure it feels urgent and compelling.

CRITICAL: Output ONLY valid JSON matching the schema with top-level fields: title, intention, focus_task, and sections. Output ONLY the sections listed in the stage plan above. Do not add or invent extra sections.
Do not use colons, semicolons, bullet points, or em dashes in any "text" value. Ensure no line is shorter than 8 words or longer than 15 words. Avoid using similar phrases or ideas in close proximity to eliminate repetition."""

SCRIPT_PROMPT_TEMPLATE = ChatPromptTemplate.from_messages([
    ("system", SYSTEM_PROMPT),
    ("human", "{human_prompt}"),
])


def format_reflection_feedback(prompt: str, issues: List[str], fix_attempts: int) -> str:
    """Format reflection feedback instructions when retrying script generation."""
    if not issues or fix_attempts <= 0:
        return prompt

    issues_formatted = "\n".join([f"- {issue}" for issue in issues])
    feedback = (
        f"\n\nCRITICAL FIX INSTRUCTIONS (REVISION ATTEMPT #{fix_attempts + 1}):\n"
        f"Your previous attempt generated errors during automated quality validation:\n"
        f"{issues_formatted}\n\n"
        f"You MUST fix all of the above errors in this turn:\n"
        f"- Ensure all spoken sentences are <= 18 words.\n"
        f"- Do NOT write fragments under 6 words (e.g. 'Name it clearly.' or 'You've got this.' are too short).\n"
        f"- Do NOT use colons, semicolons, digits, em dashes, or repeated lines.\n"
        f"- Ensure at least 8 spoken lines total across sections."
    )
    return prompt + feedback
