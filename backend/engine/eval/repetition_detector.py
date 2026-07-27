"""Advanced Repetition & Flow Analysis for Mental Reset Scripts."""

import re
from typing import List, Dict, Any


def extract_ngrams(text: str, n: int = 3) -> List[str]:
    """Extract word n-grams from a lowercase string."""
    words = re.findall(r'\w+', text.lower())
    return [" ".join(words[i:i + n]) for i in range(len(words) - n + 1)]


def analyze_script_flow(sections: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze script sections for n-gram repetition, section overlap, and length monotony.
    
    Returns score (0-100) and specific quality diagnostics.
    """
    diagnostics = []
    all_lines = []
    
    for section in sections:
        sec_name = section.get("section_name", "unknown")
        lines = section.get("text", [])
        if isinstance(lines, str):
            lines = [lines]
        for line in lines:
            all_lines.append({"section": sec_name, "text": line})

    # 1. Check duplicate / near-duplicate n-grams (3-grams) across sections
    ngram_counts: Dict[str, List[str]] = {}
    for item in all_lines:
        ngrams = extract_ngrams(item["text"], 3)
        for ng in ngrams:
            # Skip common filler transitions
            if ng in {"take a deep", "in through your", "out through your", "let it go"}:
                continue
            if ng not in ngram_counts:
                ngram_counts[ng] = []
            ngram_counts[ng].append(item["section"])

    repeated_ngrams = {ng: secs for ng, secs in ngram_counts.items() if len(secs) > 1}
    for ng, secs in repeated_ngrams.items():
        diagnostics.append(f"Repeated phrase '{ng}' across sections: {', '.join(secs)}")

    # 2. Check line length variation (monotony check)
    word_counts = [len(item["text"].split()) for item in all_lines]
    if word_counts:
        avg_len = sum(word_counts) / len(word_counts)
        # Standard deviation of line lengths
        variance = sum((x - avg_len) ** 2 for x in word_counts) / len(word_counts)
        std_dev = variance ** 0.5
        if std_dev < 1.5 and len(word_counts) > 4:
            diagnostics.append(f"Monotonous line lengths (StdDev={std_dev:.1f}). Vary sentence lengths for better rhythm.")

    # 3. Check for standalone 1-3 word fragments
    for item in all_lines:
        wc = len(item["text"].split())
        if wc < 5:
            diagnostics.append(f"Short fragment ({wc} words) in '{item['section']}': '{item['text']}'")

    # Score calculation
    penalty = len(diagnostics) * 15
    score = max(0, 100 - penalty)

    return {
        "flow_score": score,
        "is_clean": len(diagnostics) == 0,
        "diagnostics": diagnostics,
        "total_lines": len(all_lines),
    }
