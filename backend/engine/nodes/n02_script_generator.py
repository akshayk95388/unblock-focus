"""Node 02 — Script Generator: Generates a meditation prose script via LLM
and deterministically builds the MeditationTimeline DSL from it."""
import sys
from pathlib import Path
# Support running/debugging from workspace root
backend_root = str(Path(__file__).resolve().parents[2])
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

import json
import logging
from typing import List

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

from engine.state import MeditationEngineState
from engine.models.events import (
    SpeechEvent,
    PauseEvent,
    PauseType,
    BreathEvent,
    SectionMarkerEvent,
)
from engine.models.timeline import MeditationTimeline
from engine.profiles.pacing import PAUSE_WEIGHTS
from engine.profiles.breath_patterns import BREATH_PATTERNS
from config.settings import get_settings

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = """You are a mental performance coach — think of a calm, sharp friend who helps people get unstuck and back to work.

You write short audio scripts for mental resets. Not meditations. Not therapy. Just a quick, effective reset that helps someone clear their head and start deep work.

Rules:
1. Talk like a trusted friend, not a meditation teacher.
2. Be warm but direct. No fluff, no filler.
3. Short sentences. Written for the ear, not the eye.
4. One instruction at a time. Never rush.
5. Reference their SPECIFIC problem — never be generic.
6. No medical or therapeutic claims.
7. NEVER use these words: journey, embrace, flow, transform, revolutionary, namaste, manifest, chakra, universe, sacred.
8. As the reset progresses, use fewer words and longer pauses.
9. Return ONLY valid JSON. No markdown, no code fences, no explanation."""

SCRIPT_PROMPT = """Write a {duration_mins}-minute mental reset for someone blocked by: "{stressor}"
Category: {meditation_type}
Target narration: {target_word_count} words (spoken at 100-115 words per minute)

Structure the reset through these stages in order:
{sections_with_durations}

For each stage, follow its purpose:

- grounding: Acknowledge their situation directly. Use a warm opening like "Hey." or "Alright." followed by naming what they're feeling. Help them notice their body and the surface beneath them. No meditation clichés.

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

- reframe: The action bridge. Shift from "I'm stuck" to "I know what to do next." End with something that transitions them toward their work — not a motivational speech, just a clear, grounded nudge. Something like "You know what to do. Go do one thing."

- closing: One short, complete sentence. No dangling phrases. Make it feel like a friend sending them off. Something like "You've got this. Go." Not a summary, not a speech.

CRITICAL: Output ONLY the sections listed in the stage plan above. Do not add or invent extra sections.

Return this exact JSON structure:
{{
  "title": "<short, direct title — 2-5 words>",
  "intention": "<one sentence describing what this reset does>",
  "focus_task": "<a single action-oriented task to work on next, based on their blocker — 3-7 words, starting with a strong verb like Write, Design, Code, Draft, Debug, Review>",
  "sections": [
    {{
      "name": "<stage name>",
      "lines": [
        {{"text": "<one spoken sentence, max 18 words>", "pause_s": <pause in seconds as integer>}},
        ...
      ],
      "breath_cycle": "<pattern_id or null>",
      "breath_repetitions": <int or 0>
    }}
  ]
}}

Pause duration rules (pause_s values):
- 2–3: after a quick instruction or transition
- 4–6: after grounding or body awareness cues
- 7–10: during core_reset, giving them space to process
- 10–15: in reframe, letting the shift land
- Use 5–8s on the final closing line.

"breath_cycle" must be null or one of: box_4, sleep_478, calm_46, focus_44
Only sections with breathing in the plan should set breath_cycle.

Do not use: colons, semicolons, bullet points, em dashes in any "text" value.
Return ONLY valid JSON."""


def _pause_s_to_type(seconds: int) -> str:
    """Map explicit pause seconds from LLM to our pause-type enum."""
    if seconds <= 2:
        return "short"
    elif seconds <= 4:
        return "transition"
    elif seconds <= 9:
        return "reflection"
    elif seconds <= 18:
        return "deep_reflection"
    else:
        return "section_end"


def format_sections_for_prompt(section_plan: list) -> str:
    """Format section plan into readable prompt text."""
    lines = []
    for s in section_plan:
        breath_info = ""
        if s.get("breath_pattern"):
            breath_info = f" (breath exercise: {s['breath_pattern']}, {s['breath_cycles']} cycles)"
        lines.append(f"  - {s['name']}: ~{s['duration_s']:.0f}s{breath_info}")
    return "\n".join(lines)


def parse_llm_json(response_text: str) -> dict:
    """Parse LLM response as JSON, handling markdown fences."""
    text = response_text.strip()

    # Strip markdown code fences
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines)

    return json.loads(text)


def build_timeline_from_prose(prose: dict, state: MeditationEngineState) -> MeditationTimeline:
    """Deterministically convert LLM prose JSON into a MeditationTimeline DSL."""
    events = []
    speech_count = 0

    for i, section in enumerate(prose["sections"]):
        events.append(SectionMarkerEvent(
            section_name=section["name"],
            section_index=i,
        ))

        lines = section.get("lines", [])
        for j, line in enumerate(lines):
            segment_id = f"seg_{speech_count:03d}"
            speech_count += 1

            events.append(SpeechEvent(
                segment_id=segment_id,
                text=line["text"],
            ))

            # Use explicit pause_s from LLM if present, else fall back to last-line logic
            if "pause_s" in line:
                pause_type_str = _pause_s_to_type(int(line["pause_s"]))
            else:
                # Legacy fallback: use pause_after field or infer from position
                pause_type_str = line.get("pause_after", "reflection")
                if pause_type_str not in PAUSE_WEIGHTS:
                    pause_type_str = "reflection"
                # Force section_end on the last line of a section
                if j == len(lines) - 1:
                    pause_type_str = "section_end"

            events.append(PauseEvent(
                pause_type=PauseType(pause_type_str),
                weight=PAUSE_WEIGHTS[pause_type_str]["weight"],
                minimum_ms=PAUSE_WEIGHTS[pause_type_str]["minimum_ms"],
            ))

        # Add breath cycle if specified
        breath_cycle = section.get("breath_cycle")
        breath_reps = section.get("breath_repetitions", 0)
        if breath_cycle and breath_reps > 0 and breath_cycle in BREATH_PATTERNS:
            pattern = BREATH_PATTERNS[breath_cycle]
            cycle_s = pattern.cycle_duration_s * breath_reps
            events.append(BreathEvent(
                pattern=breath_cycle,
                cycles=breath_reps,
                duration_s=cycle_s,
            ))

    return MeditationTimeline(
        job_id=state.get("job_id", ""),
        meditation_type=state["meditation_type"],
        title=prose.get("title", "Guided Meditation"),
        duration_target_s=state["duration_mins"] * 60,
        pacing_profile=state.get("pacing_profile", ""),
        events=events,
    )


async def script_generator_node(state: MeditationEngineState) -> dict:
    """Generate a meditation script via LLM and build the timeline DSL."""
    settings = get_settings()

    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.7,
        api_key=settings.openai_api_key,
    )

    sections_text = format_sections_for_prompt(state["section_plan"])
    prompt = SCRIPT_PROMPT.format(
        stressor=state["stressor"],
        meditation_type=state["meditation_type"],
        duration_mins=state["duration_mins"],
        sections_with_durations=sections_text,
        target_word_count=state["target_word_count"],
    )

    from langchain_core.messages import SystemMessage
    result = await llm.ainvoke([
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=prompt),
    ])

    try:
        prose = parse_llm_json(result.content)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse LLM response as JSON: {e}")
        logger.error(f"Response: {result.content[:500]}")
        raise ValueError(f"LLM returned invalid JSON: {e}")

    timeline = build_timeline_from_prose(prose, state)

    return {
        "timeline": timeline,
        "raw_prose": prose,
        "current_stage": "script_generated",
        "progress_pct": 30.0,
    }



if __name__ == "__main__":
    import asyncio
    import argparse
    from dotenv import load_dotenv
    from engine.nodes.n01_classifier import classifier_node

    # Load environment variables (gets OPENAI_API_KEY from .env)
    load_dotenv()

    async def main():
        parser = argparse.ArgumentParser(description="Test Meditation Script Generator (Node 02)")
        parser.add_argument(
            "--stressor",
            type=str,
            default="I feel overwhelmed by too many bugs in my code and a tight deadline.",
            help="Stressor description"
        )
        parser.add_argument(
            "--duration",
            type=int,
            default=3,
            help="Meditation duration in minutes"
        )
        parser.add_argument(
            "--type",
            type=str,
            default="auto",
            choices=["auto", "deadline", "presentation", "burnout", "distraction",
                     "overthinking", "imposter", "exam", "general"],
            help="Stressor category"
        )
        args = parser.parse_args()

        print("\n=== Meditation Script Generator Test ===")
        print(f"Stressor: {args.stressor}")
        print(f"Duration: {args.duration} mins")

        # Create initial state
        state = {
            "stressor": args.stressor,
            "duration_mins": args.duration,
        }

        # Determine type
        if args.type == "auto":
            print("Classifying stressor...")
            classifier_res = await classifier_node(state)
            state.update(classifier_res)
        else:
            from engine.profiles.section_templates import get_template_for_duration
            from engine.profiles.pacing import PACING_PROFILES, SPEECH_DENSITY
            from engine.nodes.n01_classifier import scale_sections
            
            meditation_type = args.type
            template = get_template_for_duration(meditation_type, args.duration)
            pacing = PACING_PROFILES[meditation_type]
            density = SPEECH_DENSITY[meditation_type]
            total_s = args.duration * 60
            target_words = int(((total_s * density) / 60) * pacing["wpm"])
            
            state.update({
                "meditation_type": meditation_type,
                "section_plan": scale_sections(template, total_s),
                "pacing_profile": pacing["profile"],
                "target_word_count": target_words,
            })

        print(f"Type: {state['meditation_type']}")
        print(f"Target word count: {state['target_word_count']} words")
        print("Section plan:")
        for s in state["section_plan"]:
            breath = f" (breath: {s.get('breath_pattern')} x {s.get('breath_cycles')})" if s.get('breath_pattern') else ""
            print(f"  - {s['name']}: {s['duration_s']}s{breath}")

        print("\nGenerating script via OpenAI...")
        try:
            # We configure logging to see node warnings/infos
            logging.basicConfig(level=logging.INFO)
            result = await script_generator_node(state)
            prose = result["raw_prose"]
            timeline = result["timeline"]

            print("\n=== GENERATED SCRIPT ===")
            print(f"Title: {prose.get('title')}")
            if prose.get('intention'):
                print(f"Intention: {prose.get('intention')}")
            for sec in prose.get("sections", []):
                print(f"\n[{sec.get('name').upper()}]")
                if sec.get("breath_cycle"):
                    print(f"  * Breathing Cycle: {sec['breath_cycle']} ({sec.get('breath_repetitions')} repetitions)")
                for idx, line in enumerate(sec.get("lines", [])):
                    pause = line.get('pause_s', line.get('pause_after', '?'))
                    pause_label = f"{pause}s" if isinstance(pause, int) else pause
                    print(f"  {idx+1}. \"{line.get('text')}\" (pause: {pause_label})")

            print("\n=== TIMELINE VALIDATION ===")
            from engine.nodes.n03_validator import validate_timeline
            issues = validate_timeline(timeline)
            if issues:
                print("⚠️ Validation issues found:")
                for issue in issues:
                    print(f"  - {issue}")
            else:
                print("✅ Timeline passes all validation rules!")

        except Exception as e:
            print(f"\n❌ Error during script generation: {e}")
            import traceback
            traceback.print_exc()

    asyncio.run(main())
