"""Idle-browse behaviour generators.

These produce *sequences of intents* — `scroll`, `like`, `back_scroll`,
`profile_peek`, `dwell`, `exit` — that the device adapter executes.
Keeping the behaviour generator separate from the device adapter lets
us unit-test the distribution shape without an actual phone.
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from enum import Enum


class BrowseAction(str, Enum):
    DWELL = "dwell"
    SCROLL = "scroll"
    BACK_SCROLL = "back_scroll"
    LIKE = "like"
    COMMENT_PEEK = "comment_peek"
    PROFILE_PEEK = "profile_peek"
    EXIT = "exit"


@dataclass(frozen=True)
class BrowseRates:
    """Per-device personality rates. Drift slowly across weeks."""

    like_rate: float = 0.10           # of videos
    back_scroll_rate: float = 0.05    # of scrolls
    comment_peek_rate: float = 0.03   # of videos
    profile_peek_rate: float = 0.01   # of videos

    @staticmethod
    def seed_for_device(seed: int) -> "BrowseRates":
        rng = random.Random(seed)
        return BrowseRates(
            like_rate=rng.uniform(0.05, 0.15),
            back_scroll_rate=rng.uniform(0.02, 0.08),
            comment_peek_rate=rng.uniform(0.01, 0.06),
            profile_peek_rate=rng.uniform(0.005, 0.02),
        )


def browse_sequence(
    rates: BrowseRates,
    *,
    target_video_count: int,
    rng: random.Random | None = None,
) -> list[BrowseAction]:
    """Generate the action sequence for a single idle-browse session.

    `target_video_count` is the approximate number of FYP videos to
    consume — actual count varies because back-scrolls revisit prior
    videos. We never emit two LIKEs back-to-back on the same video.
    """
    rng = rng or random
    seq: list[BrowseAction] = []
    consumed = 0

    while consumed < target_video_count:
        seq.append(BrowseAction.DWELL)
        # While on this video, decide what (if anything) to do.
        if rng.random() < rates.like_rate:
            seq.append(BrowseAction.LIKE)
        if rng.random() < rates.comment_peek_rate:
            seq.append(BrowseAction.COMMENT_PEEK)
        if rng.random() < rates.profile_peek_rate:
            seq.append(BrowseAction.PROFILE_PEEK)

        # Move on. Rare back-scroll instead of forward.
        if rng.random() < rates.back_scroll_rate:
            seq.append(BrowseAction.BACK_SCROLL)
            # Back-scroll doesn't consume a new video.
        else:
            seq.append(BrowseAction.SCROLL)
            consumed += 1

    seq.append(BrowseAction.EXIT)
    return seq
