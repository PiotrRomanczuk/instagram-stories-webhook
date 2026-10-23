"""Load and persist per-device behaviour profile to tiktok_devices.behaviour_profile."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

from .browse import BrowseRates
from .tap import ThumbProfile


@dataclass(frozen=True)
class BehaviourProfile:
    thumb: ThumbProfile
    browse: BrowseRates
    diurnal_shift_hours: float = 0.0  # ± offset from default peak times

    @staticmethod
    def seed_for_device(device_id: str) -> "BehaviourProfile":
        # Hash the UUID into a stable integer seed.
        seed = abs(hash(device_id))
        return BehaviourProfile(
            thumb=ThumbProfile.seed_for_device(seed),
            browse=BrowseRates.seed_for_device(seed ^ 0xDEADBEEF),
            diurnal_shift_hours=((seed % 121) - 60) / 60.0,  # ±1.0h
        )

    @staticmethod
    def from_dict(payload: dict[str, Any] | None, device_id: str) -> "BehaviourProfile":
        if not payload:
            return BehaviourProfile.seed_for_device(device_id)
        try:
            return BehaviourProfile(
                thumb=ThumbProfile(**payload["thumb"]),
                browse=BrowseRates(**payload["browse"]),
                diurnal_shift_hours=float(payload.get("diurnal_shift_hours", 0.0)),
            )
        except (KeyError, TypeError):
            return BehaviourProfile.seed_for_device(device_id)

    def to_dict(self) -> dict[str, Any]:
        return {
            "thumb": asdict(self.thumb),
            "browse": asdict(self.browse),
            "diurnal_shift_hours": self.diurnal_shift_hours,
        }
