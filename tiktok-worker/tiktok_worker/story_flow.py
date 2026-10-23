"""TikTok Story creation flow on Android.

This is the most fragile part of the worker — the UI changes between
TikTok releases. Locators use resource-id/text where available, with
content-desc fallbacks. Coordinate-only taps are avoided.

The flow is intentionally written as a sequence of small steps so each
can be screenshotted and re-classified independently when it fails.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from .humanize import (
    DelayContext,
    SwipeShape,
    ThumbProfile,
    bezier_swipe_points,
    humanised_tap_point,
    sleep_humanised,
)
from .humanize.tap import BBox

log = logging.getLogger(__name__)


@dataclass
class StoryFlowResult:
    success: bool
    tiktok_post_id: str | None = None
    failure_step: str | None = None
    error: str | None = None


def _tap_element(u2: Any, locator: dict[str, Any], thumb: ThumbProfile) -> None:
    """Tap a UI element resolved by uiautomator2 selector, with humanised offset."""
    element = u2(**locator)
    info = element.info  # raises if not found
    bounds = info["bounds"]
    bbox = BBox(bounds["left"], bounds["top"], bounds["right"], bounds["bottom"])
    x, y = humanised_tap_point(bbox, thumb)
    u2.click(x, y)


def _swipe(u2: Any, start: tuple[int, int], end: tuple[int, int]) -> None:
    shape = SwipeShape.natural_scroll()
    points = bezier_swipe_points(start, end, shape)
    # uiautomator2 swipe_points wants [(x, y), ...] + a single duration. We
    # drop the per-point timing and let the shape's total duration drive it.
    u2.swipe_points([(x, y) for x, y, _ in points], duration=shape.duration_ms / 1000)


def post_story(u2: Any, thumb: ThumbProfile, package: str) -> StoryFlowResult:
    """Execute the Story create flow on a freshly-foregrounded TikTok app."""
    try:
        # 1. Tap the central "+" create tab.
        log.debug("step: open create tray")
        _tap_element(u2, {"description": "Create TikTok video"}, thumb)
        sleep_humanised(DelayContext.POST_NAV_WAIT)

        # 2. Swipe the bottom carousel to the "Story" mode.
        log.debug("step: swipe to Story mode")
        info = u2.info
        screen_w = info.get("displayWidth", 1080)
        screen_h = info.get("displayHeight", 2400)
        y_carousel = int(screen_h * 0.86)
        _swipe(
            u2,
            (int(screen_w * 0.75), y_carousel),
            (int(screen_w * 0.25), y_carousel),
        )
        sleep_humanised(DelayContext.INTRA_SCREEN_TAP)

        # 3. Open the gallery picker.
        log.debug("step: open gallery picker")
        _tap_element(u2, {"description": "Upload"}, thumb)
        sleep_humanised(DelayContext.POST_NAV_WAIT)

        # 4. Pick the most recently added file (top-left thumbnail).
        log.debug("step: select most recent thumbnail")
        thumb_bbox = BBox(
            int(screen_w * 0.02),
            int(screen_h * 0.18),
            int(screen_w * 0.34),
            int(screen_h * 0.34),
        )
        x, y = humanised_tap_point(thumb_bbox, thumb)
        u2.click(x, y)
        sleep_humanised(DelayContext.SCAN_THUMBNAILS)

        # 5. Next → "Your Story".
        log.debug("step: next")
        _tap_element(u2, {"text": "Next"}, thumb)
        sleep_humanised(DelayContext.POST_NAV_WAIT)

        log.debug("step: pick 'Your Story'")
        _tap_element(u2, {"text": "Your Story"}, thumb)
        sleep_humanised(DelayContext.BEFORE_DESTRUCTIVE)

        # 6. Post.
        log.debug("step: post")
        _tap_element(u2, {"text": "Post"}, thumb)
        sleep_humanised(DelayContext.POST_NAV_WAIT)

        # The detection / id capture happens at the caller level using
        # screenshots; this function returns success on flow completion.
        return StoryFlowResult(success=True)

    except Exception as exc:  # broad — every step can fail differently
        log.exception("Story flow failed")
        return StoryFlowResult(success=False, failure_step="unknown", error=str(exc))
