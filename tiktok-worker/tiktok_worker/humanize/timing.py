"""Context-aware delay sampling.

A single global "delay between actions" is a bot tell. Real human
timings are heavy-tailed and differ by context: tapping a button you
already see is fast, waiting for a screen to load is slow, scanning
a thumbnail grid is slower still. We sample from per-context
distributions (mostly log-normal, which matches observed dwell-time
data on social-media apps).
"""

from __future__ import annotations

import math
import random
import time
from enum import Enum


class DelayContext(str, Enum):
    INTRA_SCREEN_TAP = "intra_screen_tap"   # tap-to-tap on the same screen
    POST_NAV_WAIT = "post_nav_wait"          # waiting for a new screen to load
    SCAN_THUMBNAILS = "scan_thumbnails"      # picking a thumbnail in the gallery
    BETWEEN_SCROLLS = "between_scrolls"      # dwell on a FYP video
    BEFORE_DESTRUCTIVE = "before_destructive"  # the "am I sure" beat before Post
    BETWEEN_SESSIONS = "between_sessions"    # macro-level idle gap


# (mu of underlying normal, sigma, hard min, hard max) for LogNormal.
# Multiplied by 1.0 = seconds. The mu values were tuned to land medians
# inside the ranges given in the plan.
_LOG_NORMAL_PARAMS: dict[DelayContext, tuple[float, float, float, float]] = {
    DelayContext.INTRA_SCREEN_TAP:   (math.log(0.45), 0.40, 0.15, 2.5),
    DelayContext.POST_NAV_WAIT:      (math.log(1.40), 0.50, 0.50, 6.0),
    DelayContext.SCAN_THUMBNAILS:    (math.log(2.50), 0.60, 0.80, 12.0),
    DelayContext.BETWEEN_SCROLLS:    (math.log(6.00), 0.80, 1.50, 90.0),
    DelayContext.BEFORE_DESTRUCTIVE: (math.log(2.20), 0.35, 1.00, 5.0),
    DelayContext.BETWEEN_SESSIONS:   (math.log(22 * 60), 0.95, 60.0, 2 * 60 * 60),
}


def sample_delay(context: DelayContext, *, rng: random.Random | None = None) -> float:
    """Sample a humanised delay in seconds for the given context."""
    rng = rng or random
    mu, sigma, lo, hi = _LOG_NORMAL_PARAMS[context]
    value = rng.lognormvariate(mu, sigma)
    return min(hi, max(lo, value))


def sleep_humanised(
    context: DelayContext, *, rng: random.Random | None = None
) -> float:
    """Sample a delay and actually sleep. Returns the slept duration."""
    delay = sample_delay(context, rng=rng)
    time.sleep(delay)
    return delay
