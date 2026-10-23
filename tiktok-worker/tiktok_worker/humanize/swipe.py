"""Curved, variable-velocity swipe paths.

`adb shell input swipe x1 y1 x2 y2 duration` draws a straight line with
constant velocity — that's one of the best-known bot signatures. We
replace it with a curved Bézier path sampled at non-uniform `t` to give
ease-in/out velocity, plus per-point tremor jitter.

The returned list is consumed by uiautomator2.swipe_points(), which
preserves the inter-point timing through the Android motion-event stream.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass


@dataclass(frozen=True)
class SwipeShape:
    """How curved and how fast a swipe is."""

    curve_offset_px: float       # perpendicular Bézier control-point offset
    duration_ms: int             # total motion-event duration
    point_count: int             # number of intermediate samples
    tremor_px: float = 2.0       # per-point jitter

    @staticmethod
    def natural_scroll() -> "SwipeShape":
        return SwipeShape(
            curve_offset_px=random.uniform(20, 55),
            duration_ms=random.randint(280, 520),
            point_count=random.randint(20, 32),
        )

    @staticmethod
    def slow_drag() -> "SwipeShape":
        return SwipeShape(
            curve_offset_px=random.uniform(15, 40),
            duration_ms=random.randint(700, 1200),
            point_count=random.randint(24, 36),
        )


def _ease_in_out(t: float) -> float:
    """Smoothstep — slow start, fast middle, slow finish."""
    return t * t * (3.0 - 2.0 * t)


def bezier_swipe_points(
    start: tuple[int, int],
    end: tuple[int, int],
    shape: SwipeShape,
    *,
    rng: random.Random | None = None,
) -> list[tuple[int, int, int]]:
    """Generate (x, y, ms_offset) tuples for a humanised swipe.

    Returns a list ready to feed to uiautomator2's swipe_points() —
    each tuple is the absolute coordinate plus elapsed ms since the
    start of the gesture.
    """
    rng = rng or random
    x0, y0 = start
    x1, y1 = end

    # Perpendicular offset for the Bézier control point. Sign random so
    # the arc is sometimes left, sometimes right of the straight line.
    dx, dy = x1 - x0, y1 - y0
    length = math.hypot(dx, dy) or 1.0
    perp_x, perp_y = -dy / length, dx / length
    sign = 1 if rng.random() < 0.5 else -1
    offset = sign * shape.curve_offset_px
    cx = (x0 + x1) / 2.0 + perp_x * offset
    cy = (y0 + y1) / 2.0 + perp_y * offset

    points: list[tuple[int, int, int]] = []
    for i in range(shape.point_count):
        # Linear progress through point indices.
        linear_t = i / max(1, shape.point_count - 1)
        # Apply ease-in/out to map to the actual position along the curve.
        t = _ease_in_out(linear_t)
        # Quadratic Bézier.
        u = 1.0 - t
        bx = u * u * x0 + 2.0 * u * t * cx + t * t * x1
        by = u * u * y0 + 2.0 * u * t * cy + t * t * y1
        # Tremor.
        bx += rng.uniform(-shape.tremor_px, shape.tremor_px)
        by += rng.uniform(-shape.tremor_px, shape.tremor_px)
        # Timing also follows ease-in/out so velocity is non-uniform.
        ms_offset = int(round(t * shape.duration_ms))
        points.append((int(round(bx)), int(round(by)), ms_offset))

    return points
