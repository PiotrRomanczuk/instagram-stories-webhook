"""Main worker loop.

Usage:
    python -m tiktok_worker.main                  # run forever
    python -m tiktok_worker.main --once           # do one pass and exit
    python -m tiktok_worker.main --once --dry-run # connect, screenshot, exit
    python -m tiktok_worker.main --shadow-mode    # never post (browse only)
"""

from __future__ import annotations

import argparse
import logging
import signal
import sys
import time
from datetime import datetime
from typing import Any

from .config import Settings
from .device import Device
from .humanize import (
    DelayContext,
    SessionType,
    choose_session_type,
    sample_delay,
)
from .humanize.session import diurnal_session_density, is_within_active_hours
from .humanize.profile import BehaviourProfile
from .queue import Queue
from .story_flow import post_story

log = logging.getLogger("tiktok_worker")

_shutdown = False


def _install_signal_handlers() -> None:
    def handler(signum: int, _frame: Any) -> None:
        global _shutdown
        log.info("Received signal %d — shutting down", signum)
        _shutdown = True

    signal.signal(signal.SIGINT, handler)
    signal.signal(signal.SIGTERM, handler)


def _build_supabase(settings: Settings) -> Any:
    from supabase import create_client

    return create_client(settings.supabase_url, settings.supabase_service_key)


def _load_profile(sb: Any, device_id: str) -> BehaviourProfile:
    result = (
        sb.table("tiktok_devices")
        .select("behaviour_profile")
        .eq("id", device_id)
        .single()
        .execute()
    )
    payload = (result.data or {}).get("behaviour_profile") if result.data else None
    profile = BehaviourProfile.from_dict(payload, device_id)
    if not payload:
        # First-run seed — persist so future sessions stay consistent.
        sb.table("tiktok_devices").update(
            {"behaviour_profile": profile.to_dict()}
        ).eq("id", device_id).execute()
    return profile


def _run_pass(
    settings: Settings,
    sb: Any,
    queue: Queue,
    device: Device,
    profile: BehaviourProfile,
    *,
    dry_run: bool,
    shadow_mode: bool,
) -> None:
    now_local = datetime.now()  # naive local-clock for diurnal model
    if not is_within_active_hours(now_local):
        log.info("Within sleep window — skipping")
        return

    density = diurnal_session_density(now_local)
    if density < 0.15:
        log.debug("Low diurnal density (%.2f) — skipping wake-up", density)
        return

    if queue.published_in_last_24h() >= settings.daily_post_cap and not shadow_mode:
        log.info("Daily cap reached — skipping")
        return

    pending = None if shadow_mode else queue.claim_next_due()
    session_type = choose_session_type(has_pending_post=pending is not None)
    log.info("Session: %s (pending=%s)", session_type.value, pending.id if pending else None)

    if session_type == SessionType.COLD:
        return

    if dry_run:
        device.wake_and_unlock()
        device.open_tiktok()
        time.sleep(2)
        device.screenshot(f"/tmp/tiktok-dry-{int(time.time())}.png")
        device.stop_tiktok()
        return

    device.wake_and_unlock()
    device.open_tiktok()
    u2 = device.connect()

    try:
        # Always start with an idle-browse prelude.
        # (Concrete browse loop wiring lives in the device-side runner; here
        # we just sleep a humanised amount as a placeholder for the real
        # implementation that operators iterate on against the device.)
        time.sleep(sample_delay(DelayContext.POST_NAV_WAIT))

        if session_type == SessionType.STORY_POST and pending is not None:
            result = post_story(u2, profile.thumb, settings.tiktok_package)
            if result.success:
                # Real id capture requires screenshot OCR; until that lands
                # we record a placeholder id derived from the row id.
                queue.mark_published(pending.id, tiktok_post_id=f"phone-{pending.id[:8]}")
            else:
                queue.mark_failed(
                    pending.id,
                    error=result.error or "unknown failure",
                    retry_count=pending.retry_count + 1,
                )
    finally:
        device.stop_tiktok()


def cli() -> int:
    parser = argparse.ArgumentParser(description="TikTok phone worker")
    parser.add_argument("--once", action="store_true", help="Run a single pass and exit")
    parser.add_argument(
        "--dry-run", action="store_true", help="Don't publish; just connect + screenshot"
    )
    parser.add_argument(
        "--shadow-mode",
        action="store_true",
        help="Run the full session loop but never post (humaniser validation)",
    )
    parser.add_argument(
        "--log-level", default="INFO", help="Python logging level (DEBUG/INFO/WARN)"
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=args.log_level.upper(),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    _install_signal_handlers()

    settings = Settings.load()
    sb = _build_supabase(settings)
    queue = Queue(sb, device_id=settings.device_id)
    device = Device(serial=settings.device_serial, package=settings.tiktok_package)
    profile = _load_profile(sb, settings.device_id)

    last_heartbeat = 0.0
    while not _shutdown:
        try:
            _run_pass(
                settings, sb, queue, device, profile,
                dry_run=args.dry_run, shadow_mode=args.shadow_mode,
            )
        except Exception:
            log.exception("Pass failed — continuing")

        now = time.monotonic()
        if now - last_heartbeat >= settings.heartbeat_interval_sec:
            try:
                queue.heartbeat()
                last_heartbeat = now
            except Exception:
                log.exception("Heartbeat failed")

        if args.once:
            return 0

        # Short sleep — the diurnal model and session-type chooser do the
        # heavy lifting around whether to actually act on each tick.
        for _ in range(settings.poll_interval_sec):
            if _shutdown:
                break
            time.sleep(1)

    return 0


if __name__ == "__main__":  # pragma: no cover
    sys.exit(cli())
