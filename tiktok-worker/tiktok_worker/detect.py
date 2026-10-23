"""Detect outcome of a UI flow from a screenshot.

Returns a coarse classification used by the orchestrator to decide
published vs. retry vs. terminal failure. Initial implementation is
text-presence heuristics over a fast OCR pass; can be swapped for a
trained classifier later.
"""

from __future__ import annotations

from enum import Enum


class DetectOutcome(str, Enum):
    POSTED = "posted"
    LOGIN_REQUIRED = "login_required"
    BLOCKED = "blocked"            # e.g. captcha, age gate
    UNKNOWN = "unknown"


# Substrings (case-insensitive) that, if present anywhere in the OCR
# output of a screenshot, classify the screen. Order matters: BLOCKED
# patterns are checked before POSTED because a captcha can appear over
# a successful screen.
_BLOCKED_HINTS = (
    "verify it's you",
    "captcha",
    "verify your account",
    "we couldn't post",
    "try again later",
)
_LOGIN_HINTS = (
    "log in",
    "sign up to tiktok",
    "your account has been logged out",
)
_POSTED_HINTS = (
    "posted to your story",
    "added to your story",
    "story shared",
)


def classify_text(ocr_text: str) -> DetectOutcome:
    """Classify a screen given its already-OCR'd text."""
    lowered = ocr_text.lower()
    for hint in _BLOCKED_HINTS:
        if hint in lowered:
            return DetectOutcome.BLOCKED
    for hint in _LOGIN_HINTS:
        if hint in lowered:
            return DetectOutcome.LOGIN_REQUIRED
    for hint in _POSTED_HINTS:
        if hint in lowered:
            return DetectOutcome.POSTED
    return DetectOutcome.UNKNOWN
