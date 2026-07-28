"""Karpathy-Style AutoResearch Prompt Optimizer for Unblock Focus.

Features:
- Train / Validation dataset split to prevent overfitting.
- Automated Git state management (git commit on score improvement, git checkout on regression).
- Unit test guardrails (runs pytest before accepting prompt candidate).
- Structured experiment ledger (JSON + Markdown leaderboard) with commit hashes and prompt snapshots.
- Timeout guard to prevent indefinite hangs.
"""

import re
import sys
import json
import asyncio
import logging
import subprocess
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Tuple

backend_root = str(Path(__file__).resolve().parents[2])
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from engine.nodes.n01_classifier import classifier_node
from engine.nodes.n02_script_generator import script_generator_node
from engine.eval.repetition_detector import analyze_script_flow
from engine.eval.script_judge import evaluate_script_quality
from engine.eval.prompt_optimizer import generate_improved_prompt
from engine.profiles.preset_profiles import get_preset_profile

logger = logging.getLogger(__name__)

# --- Configuration ---
EVAL_TIMEOUT_SECONDS = 120  # Kill evaluation if it exceeds 2 minutes per dataset

# --- Mapping from Preset Name to prompt string variable in script_prompts.py ---
PRESET_TO_VARIABLE_MAP = {
    "unblock_reel": "REEL_HUMAN_PROMPT",
    "guided_session": "SCRIPT_PROMPT",
}

# --- MASTER BENCHMARK DATASET (Train / Validation Split) ---
MASTER_BENCHMARK_SET = [
    # preset: unblock_reel (2-minute snappy reset)
    {"stressor": "Stuck on pricing strategy and overthinking competitors", "preset": "unblock_reel", "split": "train"},
    # {"stressor": "Terrified of launching on Product Hunt tomorrow morning", "preset": "unblock_reel", "split": "train"},
    # {"stressor": "Procrastinating on writing the investor pitch deck", "preset": "unblock_reel", "split": "train"},
    {"stressor": "Overwhelmed by 50 unread customer support tickets and bug reports", "preset": "unblock_reel", "split": "val"},
    # {"stressor": "Feeling imposter syndrome after a brutal investor rejection", "preset": "unblock_reel", "split": "val"},

    # preset: guided_session (multi-minute deep/standard guided session)
    {"stressor": "Stuck on pricing strategy and overthinking competitors", "preset": "guided_session", "split": "train"},
    # {"stressor": "Terrified of launching on Product Hunt tomorrow morning", "preset": "guided_session", "split": "train"},
    # {"stressor": "Procrastinating on writing the investor pitch deck", "preset": "guided_session", "split": "train"},
    {"stressor": "Overwhelmed by 50 unread customer support tickets and bug reports", "preset": "guided_session", "split": "val"},
    # {"stressor": "Feeling imposter syndrome after a brutal investor rejection", "preset": "guided_session", "split": "val"},
]

EXPERIMENTS_DIR = Path(backend_root) / "engine" / "eval" / "experiments"
LEDGER_FILE = EXPERIMENTS_DIR / "ledger.json"
LEADERBOARD_FILE = EXPERIMENTS_DIR / "leaderboard.md"


# --- Git Helpers ---

def setup_experiment_branch(run_tag: str = None) -> str:
    """Create and checkout an isolated experiment branch (e.g. autoresearch/jul28), falling back to current branch on conflict."""
    # Get current branch
    branch_res = subprocess.run(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=backend_root, capture_output=True, text=True)
    current_branch = branch_res.stdout.strip() if branch_res.returncode == 0 else "main"

    if not run_tag:
        run_tag = datetime.now().strftime("%b%d").lower()
    branch_name = f"autoresearch/{run_tag}"

    if current_branch == branch_name:
        logger.info(f"Already on experiment branch: {branch_name}")
        return branch_name

    # Check if branch exists
    res = subprocess.run(["git", "branch", "--list", branch_name], cwd=backend_root, capture_output=True, text=True)
    if branch_name in res.stdout:
        checkout_res = subprocess.run(["git", "checkout", branch_name], cwd=backend_root, capture_output=True, text=True)
    else:
        checkout_res = subprocess.run(["git", "checkout", "-b", branch_name], cwd=backend_root, capture_output=True, text=True)

    if checkout_res.returncode != 0:
        print(
            f"  ⚠️ Could not switch to experiment branch '{branch_name}' due to local changes.\n"
            f"  Running AutoResearch directly on current active branch: '{current_branch}'."
        )
        return current_branch

    logger.info(f"Using experiment branch: {branch_name}")
    return branch_name


def get_git_commit_hash() -> str:
    """Get the current short git commit hash (7 chars)."""
    try:
        res = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=backend_root, capture_output=True, text=True,
        )
        return res.stdout.strip() if res.returncode == 0 else "unknown"
    except Exception:
        return "unknown"


def write_prompt_to_disk(variable_name: str, new_prompt: str):
    """Write updated prompt string directly to engine/prompts/script_prompts.py."""
    file_path = Path(backend_root) / "engine" / "prompts" / "script_prompts.py"
    content = file_path.read_text()

    # Match target_variable = """...""" block dynamically
    pattern = rf'{variable_name} = """.*?"""'
    replacement = f'{variable_name} = """{new_prompt}"""'
    updated_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    file_path.write_text(updated_content)


def git_commit_experiment(exp_id: int, val_score: float, rationale: str):
    """Commit accepted prompt candidate to Git (Karpathy AutoResearch pattern)."""
    msg = f"exp(id={exp_id}, score={val_score:.2f}): {rationale[:50]}"
    subprocess.run(["git", "add", "engine/prompts/script_prompts.py"], cwd=backend_root, capture_output=True, text=True)
    subprocess.run(["git", "commit", "-m", msg], cwd=backend_root, capture_output=True, text=True)


def git_revert_experiment():
    """Revert rejected prompt candidate on disk using Git (Karpathy AutoResearch pattern)."""
    subprocess.run(["git", "checkout", "--", "engine/prompts/script_prompts.py"], cwd=backend_root, capture_output=True, text=True)


# --- Evaluation ---

async def evaluate_dataset(dataset: List[Dict[str, str]], candidate_prompt: str, preset_name: str) -> Tuple[float, List[str]]:
    """Evaluate candidate prompt across a dataset with timeout guard.

    Returns (average_score, list_of_critiques).
    """
    profile = get_preset_profile(preset_name)
    scores = []
    critiques = []

    for idx, item in enumerate(dataset, 1):
        state = {
            "job_id": f"eval_{idx}",
            "stressor": item["stressor"],
            "preset": preset_name,
            "fix_attempts": 0,
        }

        # Rate-limit retry wrapper
        for attempt in range(3):
            try:
                c_res = await asyncio.wait_for(classifier_node(state), timeout=EVAL_TIMEOUT_SECONDS)
                state.update(c_res)

                profile.prompt_template = candidate_prompt
                g_res = await asyncio.wait_for(script_generator_node(state), timeout=EVAL_TIMEOUT_SECONDS)
                prose = g_res.get("raw_prose", {})
                sections = prose.get("sections", [])

                flow = analyze_script_flow(sections)
                judge = await asyncio.wait_for(
                    evaluate_script_quality(item["stressor"], sections),
                    timeout=EVAL_TIMEOUT_SECONDS,
                )

                scores.append(judge.overall_score)
                if flow["diagnostics"]:
                    critiques.extend(flow["diagnostics"])
                critiques.append(f"[{item['stressor'][:30]}...]: {judge.critique}")
                break
            except asyncio.TimeoutError:
                print(f"  ⏱️ Timeout on sample '{item['stressor'][:30]}...' (Attempt {attempt + 1}/3)")
            except Exception as e:
                if "ResourceExhausted" in str(e) or "429" in str(e):
                    print(f"  ⚠️ Rate limit hit. Pausing 15s before retry (Attempt {attempt + 1}/3)...")
                    await asyncio.sleep(15)
                else:
                    raise e
        else:
            # All 3 retries exhausted — record a failing score instead of silently skipping
            print(f"  ❌ Sample '{item['stressor'][:30]}...' failed after 3 retries. Recording score 0.0.")
            scores.append(0.0)
            critiques.append(f"[{item['stressor'][:30]}...]: FAILED — all retries exhausted")
        await asyncio.sleep(1.0)

    avg_score = sum(scores) / len(scores) if scores else 0.0
    return avg_score, critiques


# --- Guardrails ---

def run_unit_tests() -> bool:
    """Hard Guardrail Check: Unit tests MUST pass before accepting any prompt candidate."""
    try:
        res = subprocess.run(
            [str(Path(backend_root) / "venv" / "bin" / "python"), "-m", "pytest", "tests/phase2/test_script.py", "-q"],
            cwd=backend_root,
            capture_output=True,
            text=True,
            timeout=30,
        )
        return res.returncode == 0
    except Exception as e:
        logger.error(f"Guardrail unit test check error: {e}")
        return False


# --- Experiment Logging ---

def log_experiment_to_ledger(entry: Dict[str, Any]):
    """Save experiment details to ledger.json and leaderboard.md."""
    EXPERIMENTS_DIR.mkdir(parents=True, exist_ok=True)
    ledger = []
    if LEDGER_FILE.exists():
        try:
            with open(LEDGER_FILE, "r") as f:
                ledger = json.load(f)
        except Exception:
            ledger = []

    ledger.append(entry)
    with open(LEDGER_FILE, "w") as f:
        json.dump(ledger, f, indent=2)

    # Rebuild Leaderboard Markdown
    with open(LEADERBOARD_FILE, "w") as f:
        f.write("# 🔬 AutoResearch Prompt Optimization Leaderboard\n\n")
        f.write("| Exp | Commit | Status | Train | Val | Rationale | Timestamp |\n")
        f.write("|---|---|---|---|---|---|---|\n")
        for e in ledger:
            commit = e.get("commit", "—")
            f.write(f"| {e['exp_id']} | {commit} | {e['status']} | {e['train_score']:.2f} | {e['val_score']:.2f} | {e['rationale'][:40]}... | {e['timestamp']} |\n")


# --- Main Loop ---

async def run_autoresearch_optimization(preset_name: str = "unblock_reel", max_experiments: int = 3, target_val_score: float = 9.0):
    """Run full Karpathy-style AutoResearch loop."""
    if preset_name not in PRESET_TO_VARIABLE_MAP:
        raise ValueError(f"Preset '{preset_name}' is not registered in PRESET_TO_VARIABLE_MAP.")

    target_var = PRESET_TO_VARIABLE_MAP[preset_name]

    # Filter train/val sets dynamically from the Master Benchmark Set
    train_set = [x for x in MASTER_BENCHMARK_SET if x["preset"] == preset_name and x["split"] == "train"]
    val_set = [x for x in MASTER_BENCHMARK_SET if x["preset"] == preset_name and x["split"] == "val"]

    # Karpathy Pattern: Automatically switch to isolated experiment branch (e.g. autoresearch/jul28)
    exp_branch = setup_experiment_branch()

    profile = get_preset_profile(preset_name)
    current_prompt = profile.prompt_template
    best_prompt = current_prompt

    print("=================================================================")
    print("      🔬 UNBLOCK FOCUS — KARPATHY AUTORESEARCH OPTIMIZER         ")
    print("=================================================================\n")
    print(f"  Target Preset:   {preset_name} (Variable: {target_var})")
    print(f"  Train samples:   {len(train_set)}  |  Val samples: {len(val_set)}")
    print(f"  Max experiments: {max_experiments}  |  Target val score: {target_val_score}")
    print(f"  Eval timeout:    {EVAL_TIMEOUT_SECONDS}s per LLM call\n")

    # Initial Baseline Evaluation
    print("📊 Evaluating Baseline Prompt on Train & Validation sets...")
    train_score, train_critiques = await evaluate_dataset(train_set, current_prompt, preset_name)
    val_score, _ = await evaluate_dataset(val_set, current_prompt, preset_name)
    best_val_score = val_score

    print(f"  Baseline Train Score: {train_score:.2f} / 10.0")
    print(f"  Baseline Val Score:   {val_score:.2f} / 10.0\n")

    log_experiment_to_ledger({
        "exp_id": 0,
        "commit": get_git_commit_hash(),
        "status": "BASELINE",
        "train_score": train_score,
        "val_score": val_score,
        "rationale": "Initial baseline prompt",
        "prompt_snapshot": current_prompt[:200] + "...",
        "timestamp": datetime.now().isoformat(),
    })

    for exp_id in range(1, max_experiments + 1):
        print(f"--- 🧪 Experiment #{exp_id}/{max_experiments} ---")

        # 1. Mutate Prompt Candidate & Write to Disk
        print("🧠 Optimizer LLM generating mutated prompt candidate...")
        mutation = await generate_improved_prompt(current_prompt, train_critiques[:4])
        candidate_prompt = mutation.improved_prompt_template
        print(f"📝 Rationale: {mutation.rationale}")

        # Update physical file on disk (Karpathy AutoResearch pattern)
        write_prompt_to_disk(target_var, candidate_prompt)

        # 2. Evaluate Candidate on Train & Validation sets
        print("📊 Evaluating candidate on Train set...")
        candidate_train_score, candidate_critiques = await evaluate_dataset(train_set, candidate_prompt, preset_name)
        print("📊 Evaluating candidate on Validation set...")
        candidate_val_score, _ = await evaluate_dataset(val_set, candidate_prompt, preset_name)

        print(f"  Candidate Train Score: {candidate_train_score:.2f} (Baseline: {train_score:.2f})")
        print(f"  Candidate Val Score:   {candidate_val_score:.2f} (Best Val: {best_val_score:.2f})")

        # 3. Guardrail Check (Unit tests)
        print("🛡️ Running unit test guardrails...")
        profile.prompt_template = candidate_prompt
        tests_passed = run_unit_tests()
        print(f"  Tests: {'✅ PASSED' if tests_passed else '❌ FAILED'}")

        # 4. Karpathy Decision Rule (Val score MUST improve & unit tests MUST pass)
        accepted = candidate_val_score > best_val_score and tests_passed

        if accepted:
            status = "ACCEPTED"
            best_val_score = candidate_val_score
            best_prompt = candidate_prompt
            current_prompt = candidate_prompt
            train_critiques = candidate_critiques
            git_commit_experiment(exp_id, best_val_score, mutation.rationale)
            commit_hash = get_git_commit_hash()
            print(f"🎉 ACCEPTED! Committed as {commit_hash} (Score: {best_val_score:.2f}/10.0)")
        else:
            status = "REJECTED"
            commit_hash = get_git_commit_hash()
            reason = "Failed Unit Tests" if not tests_passed else "Score Regressed"
            print(f"❌ REJECTED ({reason}). Reverting file via Git.")
            git_revert_experiment()
            profile.prompt_template = best_prompt

        log_experiment_to_ledger({
            "exp_id": exp_id,
            "commit": commit_hash,
            "status": status,
            "train_score": candidate_train_score,
            "val_score": candidate_val_score,
            "rationale": mutation.rationale,
            "prompt_snapshot": candidate_prompt[:200] + "...",
            "timestamp": datetime.now().isoformat(),
        })

        if best_val_score >= target_val_score:
            print(f"\n🎯 Target Validation Score of {target_val_score} achieved! AutoResearch Complete.")
            break

    print("\n=================================================================")
    print(f"  🏆 AUTORESEARCH COMPLETE! Best Validation Score: {best_val_score:.2f}/10.0")
    print("=================================================================\n")
    return best_prompt


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="🔬 AutoResearch Prompt Optimization Runner")
    parser.add_argument(
        "--preset", 
        type=str, 
        default="unblock_reel", 
        choices=["unblock_reel", "guided_session"], 
        help="Target preset profile to optimize"
    )
    parser.add_argument(
        "--experiments", 
        type=int, 
        default=3, 
        help="Maximum number of mutation iterations to run"
    )
    parser.add_argument(
        "--target-score", 
        type=float, 
        default=9.0, 
        help="Validation score threshold to stop early"
    )
    args = parser.parse_args()

    asyncio.run(run_autoresearch_optimization(
        preset_name=args.preset, 
        max_experiments=args.experiments, 
        target_val_score=args.target_score
    ))
