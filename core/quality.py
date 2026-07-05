"""Quality scoring for OCR / text extraction output.

Uses multiple heuristic signals to score extraction quality (0.0–1.0).
Inspired by pdfmux quality scoring and paper-farm's five-signal scorer.
"""

from __future__ import annotations

import re
import string
from typing import Dict, List, Optional


# Common garbage / mojibake patterns
_GARBAGE_PATTERNS = [
    re.compile(r"[�\ufffd]"),  # Unicode replacement character
    re.compile(r"[\x80-\xff]+"),  # Latin-1 supplement (often mojibake)
    re.compile(r"[\uff00-\uffef]+"),  # Fullwidth forms (often wrong)
    re.compile(r"([\ue000-\uf8ff]{2,})"),  # Repeated Unicode private use chars
    re.compile(r"[•·]{4,}"),  # Repeated bullet chars (OCR noise)
]

# Known-bad OCR output indicators
_BAD_WORDS = {
    "lorem ipsum", "xxxxx", "test page", "undefined", "null",
}

# Repeated punctuation (OCR hallucination)
_REPEATED_PUNCT_RE = re.compile(r"([!@#$%^&*()_+=\[\]{}|;:',.<>?/~`-])\1{3,}")


def score_text(text: str, min_word_count: int = 10) -> Dict[str, float]:
    """Score extracted text quality on multiple signals.

    Args:
        text: Extracted text to evaluate.
        min_word_count: Minimum expected word count.

    Returns:
        Dict with scores: `overall` (0.0–1.0), and per-signal breakdown.
    """
    if not text or not text.strip():
        return {"overall": 0.0, "signals": {
            "word_count": 0.0, "garbage_ratio": 0.0,
            "repetition": 0.0, "avg_word_length": 0.0,
            "bad_phrases": 0.0,
        }}

    signals: Dict[str, float] = {}

    # 1. Word count density
    words = text.split()
    word_count = len(words)
    char_count = len(text)
    signals["word_count"] = min(1.0, word_count / max(min_word_count, 1))

    # 2. Garbage character ratio
    garbage_chars = sum(1 for c in text if ord(c) > 0x7F and c not in string.printable)
    signals["garbage_ratio"] = 1.0 - min(1.0, garbage_chars / max(char_count, 1) * 10)

    # 3. Repeated punctuation / noise
    repeat_matches = _REPEATED_PUNCT_RE.findall(text)
    signals["repetition"] = 1.0 - min(1.0, len(repeat_matches) / max(min_word_count, 1))

    # 4. Average word length (too short = garbage, too long = concatenated)
    if words:
        avg_len = sum(len(w) for w in words) / len(words)
        signals["avg_word_length"] = 1.0 - abs(avg_len - 5.0) / 10.0
    else:
        signals["avg_word_length"] = 0.0

    # 5. Known bad phrases
    lower_text = text.lower()
    bad_count = sum(1 for phrase in _BAD_WORDS if phrase in lower_text)
    signals["bad_phrases"] = 1.0 - min(1.0, bad_count / 5.0)

    # Weighted overall score
    weights = {
        "word_count": 0.25,
        "garbage_ratio": 0.30,
        "repetition": 0.15,
        "avg_word_length": 0.10,
        "bad_phrases": 0.20,
    }
    overall = sum(signals[k] * weights[k] for k in weights)

    return {"overall": round(overall, 3), "signals": signals}


def is_quality_acceptable(score: float, threshold: float = 0.6) -> bool:
    """Check if quality score meets threshold."""
    return score >= threshold


def needs_fallback(text: str, threshold: float = 0.6, min_word_count: int = 10) -> bool:
    """Determine if the extraction was poor enough to need a fallback."""
    result = score_text(text, min_word_count)
    return result["overall"] < threshold
