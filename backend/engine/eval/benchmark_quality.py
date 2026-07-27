"""Automated Script Quality Benchmark Suite for Unblock Focus.

Runs benchmark stressors through classifier -> script generator -> flow detector -> judge,
producing a detailed quality report.
"""

import sys
import asyncio
import logging
from pathlib import Path

backend_root = str(Path(__file__).resolve().parents[2])
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from engine.nodes.n01_classifier import classifier_node
from engine.nodes.n02_script_generator import script_generator_node
from engine.eval.repetition_detector import analyze_script_flow
from engine.eval.script_judge import evaluate_script_quality

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

BENCHMARK_DATASET = [
    {"stressor": "Stuck on pricing strategy and overthinking competitors", "preset": "unblock_reel"},
    {"stressor": "Terrified of launching on Product Hunt tomorrow morning", "preset": "unblock_reel"},
    {"stressor": "Overwhelmed by 50 unread customer support tickets and bug reports", "preset": "guided_session"},
    {"stressor": "Procrastinating on writing the pitch deck for investors", "preset": "unblock_reel"},
    {"stressor": "Feeling imposter syndrome after a brutal investor rejection", "preset": "guided_session"},
]


async def run_quality_benchmark(preset_filter: str = None):
    print("=================================================================")
    print("      🧪 UNBLOCK FOCUS — SCRIPT QUALITY BENCHMARK RUNNER          ")
    print("=================================================================\n")

    items = BENCHMARK_DATASET
    if preset_filter:
        items = [i for i in items if i.get("preset") == preset_filter]

    total_judge_scores = []
    total_flow_scores = []
    reports = []

    for idx, test_case in enumerate(items, 1):
        stressor = test_case["stressor"]
        preset = test_case["preset"]

        print(f"[{idx}/{len(items)}] Testing preset='{preset}' for stressor:")
        print(f"     \"{stressor}\"")

        state = {
            "job_id": f"bench_{idx}",
            "stressor": stressor,
            "preset": preset,
            "fix_attempts": 0,
        }

        # 1. Classify
        c_res = await classifier_node(state)
        state.update(c_res)

        # 2. Generate script
        g_res = await script_generator_node(state)
        sections = g_res.get("sections", [])

        # 3. Flow & Repetition Analysis
        flow_res = analyze_script_flow(sections)
        total_flow_scores.append(flow_res["flow_score"])

        # 4. LLM Judge Evaluation
        judge_res = await evaluate_script_quality(stressor, sections)
        total_judge_scores.append(judge_res.overall_score)

        print(f"     📊 Flow Repetition Score: {flow_res['flow_score']}/100")
        print(f"     ⭐ Judge Quality Score:  {judge_res.overall_score:.1f}/10.0")
        print(f"     💬 Critique: {judge_res.critique}")

        if flow_res["diagnostics"]:
            print(f"     ⚠️  Diagnostics:")
            for d in flow_res["diagnostics"]:
                print(f"        - {d}")

        print(f"     💡 Fix Suggestion: {judge_res.concrete_improvement}")
        print("-" * 65)

        reports.append({
            "stressor": stressor,
            "preset": preset,
            "flow_score": flow_res["flow_score"],
            "judge_score": judge_res.overall_score,
            "critique": judge_res.critique,
            "improvement": judge_res.concrete_improvement,
        })

    avg_flow = sum(total_flow_scores) / len(total_flow_scores)
    avg_judge = sum(total_judge_scores) / len(total_judge_scores)

    print("\n=================================================================")
    print("                      📊 BENCHMARK SUMMARY                       ")
    print("=================================================================")
    print(f"  Overall Avg Flow Score:  {avg_flow:.1f} / 100")
    print(f"  Overall Avg Judge Score: {avg_judge:.1f} / 10.0")
    print("=================================================================\n")
    return reports


if __name__ == "__main__":
    asyncio.run(run_quality_benchmark())
