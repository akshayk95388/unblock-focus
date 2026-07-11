#!/usr/bin/env python3
"""CLI: Generate one meditation end-to-end.

Usage:
    python scripts/generate_test_meditation.py \
        --stressor "anxiety before presenting to 100 people" \
        --duration 5 \
        --voice gentle_female \
        --music none \
        --output /tmp/test_meditation.mp3
"""
import argparse
import asyncio
import logging
import shutil
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from engine.pipeline import run_full_pipeline


def main():
    parser = argparse.ArgumentParser(description="Generate a test meditation")
    parser.add_argument("--stressor", required=True, help="What the user is dealing with")
    parser.add_argument("--duration", type=int, required=True, help="Duration in minutes")
    parser.add_argument("--voice", default="gentle_female", help="Voice key")
    parser.add_argument("--music", default="none", help="Music key (none|ambient)")
    parser.add_argument("--output", default="/tmp/test_meditation.mp3", help="Output path")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    print(f"\n🧘 Generating {args.duration}-minute meditation...")
    print(f"   Stressor: \"{args.stressor}\"")
    print(f"   Voice: {args.voice}")
    print(f"   Music: {args.music}")
    print()

    result = asyncio.run(run_full_pipeline(
        stressor=args.stressor,
        duration_mins=args.duration,
        voice_key=args.voice,
        music_key=args.music,
    ))

    if result["status"] != "complete":
        print(f"\n❌ Pipeline failed: {result.get('error')}")
        sys.exit(1)

    # Copy to output path
    if result.get("local_path"):
        shutil.copy2(result["local_path"], args.output)

    timeline = result.get("timeline")
    target_s = args.duration * 60
    actual_s = result.get("actual_duration_s", 0)
    delta_s = abs(actual_s - target_s)

    print(f"\n✅ Generation complete!")
    print(f"   [Classifier]  {result.get('meditation_type')}")
    print(f"   [Script]      \"{result.get('title')}\" — {result.get('total_segments')} segments")
    print(f"   [Duration]    target={target_s}s actual={actual_s:.1f}s delta={delta_s:.1f}s")
    print(f"   [Output]      {args.output}")
    print()
    print("   LISTEN CHECKLIST:")
    print("   [ ] Pauses feel natural between sentences")
    print("   [ ] Breathing sections guide properly")
    print("   [ ] Music (if any) is comfortable in background")
    print("   [ ] Fade in/out is smooth")
    print("   [ ] Voice is clear throughout")
    print("   [ ] Duration feels like requested time")


if __name__ == "__main__":
    main()
