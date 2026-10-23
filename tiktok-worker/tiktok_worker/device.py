"""uiautomator2 device adapter — wakes, unlocks, foregrounds TikTok.

Thin wrapper so tests can substitute a fake. Actual uiautomator2 calls
are isolated here so the rest of the codebase stays Python-pure.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Protocol

log = logging.getLogger(__name__)


class U2DeviceLike(Protocol):
    """Subset of the uiautomator2 Device API this worker uses."""

    info: dict[str, Any]

    def app_start(self, package: str, stop: bool = False) -> None: ...
    def app_stop(self, package: str) -> None: ...
    def screen_on(self) -> None: ...
    def screenshot(self, filename: str | None = None) -> Any: ...
    def swipe_points(self, points: list[tuple[int, int]], duration: float = 0.5) -> None: ...
    def click(self, x: int, y: int) -> None: ...
    def __call__(self, **kwargs: Any) -> Any: ...


@dataclass
class Device:
    """Lazily-connected uiautomator2 handle for a single phone."""

    serial: str
    package: str
    _u2: U2DeviceLike | None = None

    def connect(self) -> U2DeviceLike:
        if self._u2 is None:
            import uiautomator2 as u2  # imported lazily so tests don't need adb

            self._u2 = u2.connect(self.serial)
            log.info("Connected to %s: %s", self.serial, self._u2.info.get("productName"))
        return self._u2

    def wake_and_unlock(self, pin: str | None = None) -> None:
        u2 = self.connect()
        u2.screen_on()
        if pin:
            # Swipe up to dismiss lockscreen, type pin. Caller is responsible
            # for setting "Stay awake" so this is normally a no-op.
            u2.swipe_points([(540, 1800), (540, 600)], duration=0.4)
            u2(resourceId="com.android.systemui:id/lockPassword").set_text(pin)

    def open_tiktok(self) -> None:
        self.connect().app_start(self.package, stop=False)

    def stop_tiktok(self) -> None:
        self.connect().app_stop(self.package)

    def screenshot(self, path: str) -> None:
        self.connect().screenshot(path)
