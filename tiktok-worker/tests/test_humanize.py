"""Distribution-shape tests for the humaniser.

These don't validate "the worker doesn't get caught" — that's
empirical and the wrong thing to test. They validate that the
samplers produce distributions of the *right shape* so a regression
that flattens timings (e.g. accidentally introducing a uniform
delay) gets caught.
"""

from __future__ import annotations

import math
import random
import statistics

import pytest

from tiktok_worker.humanize.timing import DelayContext, sample_delay
from tiktok_worker.humanize.tap import BBox, ThumbProfile, humanised_tap_point
from tiktok_worker.humanize.swipe import SwipeShape, bezier_swipe_points
from tiktok_worker.humanize.session import (
    SessionType,
    choose_session_type,
    is_within_active_hours,
)
from datetime import datetime


def test_intra_screen_delays_have_heavy_tail() -> None:
    """LogNormal samples must show a long right tail, not be flat."""
    rng = random.Random(42)
    samples = [sample_delay(DelayContext.INTRA_SCREEN_TAP, rng=rng) for _ in range(2000)]
    median = statistics.median(samples)
    p95 = sorted(samples)[int(0.95 * len(samples))]
    # p95 / median for LogNormal(σ=0.4) is ~1.93; for uniform it would be ~1.05.
    assert p95 / median > 1.4, f"distribution too flat: p95/median={p95/median:.2f}"


def test_dwell_distribution_spans_target_range() -> None:
    """Scrolling dwell should cover 3-60s with most mass in 3-15s."""
    rng = random.Random(123)
    samples = [sample_delay(DelayContext.BETWEEN_SCROLLS, rng=rng) for _ in range(2000)]
    # Median should sit in the human range.
    median = statistics.median(samples)
    assert 3 < median < 15, f"median {median:.1f}s out of range"
    # We should see some long-tail dwells.
    assert max(samples) > 30, "no long dwells observed"


def test_no_two_consecutive_identical_samples() -> None:
    """Sanity: consecutive samples must vary (cheap check that we're not bugged)."""
    rng = random.Random(0)
    prev = None
    for _ in range(500):
        s = sample_delay(DelayContext.INTRA_SCREEN_TAP, rng=rng)
        assert s != prev, "consecutive samples were identical — sampler is broken"
        prev = s


def test_tap_points_stay_inside_bbox() -> None:
    """Humanised tap points must never escape the target bbox."""
    rng = random.Random(7)
    bbox = BBox(100, 200, 300, 280)
    profile = ThumbProfile()
    for _ in range(500):
        x, y = humanised_tap_point(bbox, profile, rng=rng)
        assert bbox.left <= x <= bbox.right
        assert bbox.top <= y <= bbox.bottom


def test_tap_points_show_spread() -> None:
    """500 taps on the same button should cover a meaningful area, not one pixel."""
    rng = random.Random(9)
    bbox = BBox(0, 0, 200, 100)
    profile = ThumbProfile()
    points = [humanised_tap_point(bbox, profile, rng=rng) for _ in range(500)]
    xs, ys = zip(*points)
    assert len(set(xs)) > 20, "x-coordinate has insufficient spread"
    assert len(set(ys)) > 10, "y-coordinate has insufficient spread"


def test_tap_points_respect_thumb_bias() -> None:
    """A right-biased thumb should yield a mean to the right of centre."""
    rng = random.Random(11)
    bbox = BBox(0, 0, 1000, 1000)
    biased = ThumbProfile(bias_x_frac=0.2, bias_y_frac=0.0, spread_frac=0.1)
    xs = [humanised_tap_point(bbox, biased, rng=rng)[0] for _ in range(500)]
    mean_x = statistics.mean(xs)
    centre = bbox.centre[0]
    # Bias of 0.2 * width = 200px to the right of centre.
    assert mean_x > centre + 100, f"bias not reflected (mean_x={mean_x:.0f}, centre={centre})"


def test_swipe_path_is_curved() -> None:
    """A Bézier swipe must have a sagitta > 0 — straight-line swipes are bot tells."""
    shape = SwipeShape(curve_offset_px=40, duration_ms=400, point_count=24, tremor_px=0)
    points = bezier_swipe_points((100, 1800), (100, 600), shape, rng=random.Random(3))
    xs = [p[0] for p in points]
    # If perfectly straight, all xs equal 100. We expect deviation.
    assert max(xs) - min(xs) > 10, "swipe path is straight (no curve)"


def test_swipe_velocity_is_non_uniform() -> None:
    """Ease-in/out means inter-point ms intervals vary across the path."""
    shape = SwipeShape(curve_offset_px=30, duration_ms=500, point_count=30, tremor_px=0)
    points = bezier_swipe_points((0, 0), (500, 1500), shape, rng=random.Random(5))
    intervals = [points[i + 1][2] - points[i][2] for i in range(len(points) - 1)]
    # Endpoints should be slow (small intervals), middle should be fast (large intervals).
    assert max(intervals) > 1.4 * min(intervals), "velocity profile is too flat"


def test_session_chooser_returns_post_when_due() -> None:
    rng = random.Random(0)
    for _ in range(50):
        assert choose_session_type(has_pending_post=True, rng=rng) is SessionType.STORY_POST


def test_session_chooser_distributes_across_types() -> None:
    rng = random.Random(0)
    counts = {SessionType.IDLE_BROWSE: 0, SessionType.APP_SWITCH_NOISE: 0, SessionType.COLD: 0}
    for _ in range(2000):
        s = choose_session_type(has_pending_post=False, rng=rng)
        counts[s] += 1
    # No single category should dominate completely.
    total = sum(counts.values())
    for s, n in counts.items():
        assert n / total > 0.10, f"{s} under-represented: {n}/{total}"


def test_active_hours_excludes_sleep_window() -> None:
    assert not is_within_active_hours(datetime(2026, 5, 12, 3, 0))
    assert is_within_active_hours(datetime(2026, 5, 12, 8, 0))
    assert is_within_active_hours(datetime(2026, 5, 12, 22, 0))
