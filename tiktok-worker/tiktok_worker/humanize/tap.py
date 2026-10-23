"""Off-centre Gaussian tap inside a UI element's bounding box.

Real thumbs:
- never hit dead-centre, especially for one-handed use;
- have a consistent personal bias (a right-handed user holding the phone
  one-handed tends to hit slightly low-and-right on every button);
- still have within-target spread (you don't hit the same pixel twice).

We model this as: pick a per-device mean offset (the "thumb profile"),
then draw each tap from a 2D Gaussian around (centre + bias) with
sigma proportional to the box size. The point is clamped to stay
inside the bbox.
"""

from __future__ import annotations

import random
from dataclasses import dataclass


@dataclass(frozen=True)
class BBox:
    left: int
    top: int
    right: int
    bottom: int

    @property
    def width(self) -> int:
        return self.right - self.left

    @property
    def height(self) -> int:
        return self.bottom - self.top

    @property
    def centre(self) -> tuple[float, float]:
        return ((self.left + self.right) / 2.0, (self.top + self.bottom) / 2.0)


@dataclass(frozen=True)
class ThumbProfile:
    """Per-device bias and spread, as fractions of box size.

    `bias_x_frac` / `bias_y_frac` are mean offsets from box centre as a
    fraction of width/height. Positive bias_x = right, positive bias_y =
    down. Spread is the standard deviation of taps inside the box, also
    as a fraction of box size.
    """

    bias_x_frac: float = 0.15
    bias_y_frac: float = 0.10
    spread_frac: float = 0.22

    @staticmethod
    def seed_for_device(seed: int) -> "ThumbProfile":
        """Deterministically generate a stable thumb profile for one device.

        Called once at install. Persisted in tiktok_devices.behaviour_profile.
        """
        rng = random.Random(seed)
        return ThumbProfile(
            bias_x_frac=rng.uniform(0.05, 0.25),
            bias_y_frac=rng.uniform(0.00, 0.20),
            spread_frac=rng.uniform(0.18, 0.28),
        )


def humanised_tap_point(
    bbox: BBox,
    profile: ThumbProfile,
    *,
    rng: random.Random | None = None,
) -> tuple[int, int]:
    """Return an (x, y) coordinate inside bbox to tap."""
    rng = rng or random
    cx, cy = bbox.centre
    mean_x = cx + profile.bias_x_frac * bbox.width
    mean_y = cy + profile.bias_y_frac * bbox.height
    sigma_x = profile.spread_frac * bbox.width
    sigma_y = profile.spread_frac * bbox.height

    # Reject-sample until inside the box. Almost always hits on the first try.
    for _ in range(8):
        x = rng.gauss(mean_x, sigma_x)
        y = rng.gauss(mean_y, sigma_y)
        if bbox.left <= x <= bbox.right and bbox.top <= y <= bbox.bottom:
            return int(round(x)), int(round(y))

    # Fallback: clamp.
    return (
        int(round(min(bbox.right - 1, max(bbox.left + 1, mean_x)))),
        int(round(min(bbox.bottom - 1, max(bbox.top + 1, mean_y)))),
    )
