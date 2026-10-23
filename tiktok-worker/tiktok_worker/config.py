"""Worker configuration loaded from environment."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

_ENV_LOADED = False


def _load_env_once() -> None:
    global _ENV_LOADED
    if _ENV_LOADED:
        return
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
    _ENV_LOADED = True


@dataclass(frozen=True)
class Settings:
    supabase_url: str
    supabase_service_key: str
    device_serial: str
    device_id: str
    poll_interval_sec: int
    heartbeat_interval_sec: int
    daily_post_cap: int
    local_tz: str
    tiktok_package: str

    @classmethod
    def load(cls) -> "Settings":
        _load_env_once()
        return cls(
            supabase_url=_require("SUPABASE_URL"),
            supabase_service_key=_require("SUPABASE_SERVICE_KEY"),
            device_serial=_require("DEVICE_SERIAL"),
            device_id=_require("DEVICE_ID"),
            poll_interval_sec=int(os.environ.get("POLL_INTERVAL_SEC", "30")),
            heartbeat_interval_sec=int(os.environ.get("HEARTBEAT_INTERVAL_SEC", "60")),
            daily_post_cap=int(os.environ.get("DAILY_POST_CAP", "10")),
            local_tz=os.environ.get("LOCAL_TZ", "UTC"),
            tiktok_package=os.environ.get("TIKTOK_PACKAGE", "com.zhiliaoapp.musically"),
        )


def _require(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value
