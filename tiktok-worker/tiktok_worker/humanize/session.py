"""Session-type chooser and diurnal sampler.

A device that only ever wakes up to post is trivially detectable.
The worker spends *most* of its time idle-browsing, occasionally
just opens-and-closes TikTok, and sometimes does nothing at all.
A real post happens inside a longer browsing ritual.
"""

from __future__ import annotations

import math
import random
from datetime import datetime, time, timedelta
from enum import Enum

try:
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover — only on stdlib <3.9
    ZoneInfo = None  # type: ignore[assignment]


class SessionType(str, Enum):
    IDLE_BROWSE = "idle_browse"
    STORY_POST = "story_post"
    APP_SWITCH_NOISE = "app_switch_noise"
    COLD = "cold"


_DEFAULT_WEIGHTS = {
    SessionType.IDLE_BROWSE: 0.55,
    SessionType.APP_SWITCH_NOISE: 0.20,
    SessionType.COLD: 0.25,
}


def choose_session_type(
    *,
    has_pending_post: bool,
    rng: random.Random | None = None,
) -> SessionType:
    """Pick what the device will do this wake-up.

    If there's a pending post that should go out soon, posting wins —
    but the caller is expected to wrap the post in an idle-browse
    prelude/epilogue so it doesn't look like a drive-by.
    """
    if has_pending_post:
        return SessionType.STORY_POST

    rng = rng or random
    roll = rng.random()
    cumulative = 0.0
    for stype, weight in _DEFAULT_WEIGHTS.items():
        cumulative += weight
        if roll <= cumulative:
            return stype
    return SessionType.COLD


# Two-mode mixture for diurnal wake-up times (local clock).
# Morning ~08:30 and evening ~20:30, sigma 90 min each, plus a thin
# uniform background across waking hours.
_MORNING_PEAK_HOUR = 8.5
_EVENING_PEAK_HOUR = 20.5
_PEAK_SIGMA_HOURS = 1.5
_UNIFORM_WEIGHT = 0.10
_SLEEP_WINDOW = (time(1, 0), time(7, 0))  # do nothing between 01:00 and 07:00


def is_within_active_hours(now_local: datetime) -> bool:
    """Return True if the local clock is outside the configured sleep window."""
    t = now_local.time()
    lo, hi = _SLEEP_WINDOW
    if lo < hi:
        return not (lo <= t < hi)
    # Wrap-around window (e.g. 22:00 - 06:00).
    return not (t >= lo or t < hi)


def diurnal_session_density(now_local: datetime) -> float:
    """Probability-density-like score for waking up at the current time.

    Used by the main loop to decide whether to even *consider* a wake-up
    on this poll tick. Returns 0 during the sleep window.
    """
    if not is_within_active_hours(now_local):
        return 0.0

    hour = now_local.hour + now_local.minute / 60.0
    morning = math.exp(-((hour - _MORNING_PEAK_HOUR) ** 2) / (2 * _PEAK_SIGMA_HOURS**2))
    evening = math.exp(-((hour - _EVENING_PEAK_HOUR) ** 2) / (2 * _PEAK_SIGMA_HOURS**2))
    peak = (morning + evening) / 2.0
    return (1 - _UNIFORM_WEIGHT) * peak + _UNIFORM_WEIGHT


def next_active_time(now_local: datetime) -> datetime:
    """Return the next datetime we should be active, given the sleep window."""
    if is_within_active_hours(now_local):
        return now_local
    sleep_end = now_local.replace(
        hour=_SLEEP_WINDOW[1].hour, minute=_SLEEP_WINDOW[1].minute, second=0, microsecond=0
    )
    if sleep_end <= now_local:
        sleep_end += timedelta(days=1)
    return sleep_end
