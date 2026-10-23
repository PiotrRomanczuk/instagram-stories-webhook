"""Supabase claim / mark / heartbeat operations for tiktok-device rows.

Mirrors the Instagram lifecycle: a row stays `scheduled` until claimed
(atomic UPDATE setting `processing` + `processing_started_at`), then
either flips to `published` with the TikTok post id or `failed` with an
error. Stale locks are recovered by the existing IG-side
`recoverStaleLocks` cron (which doesn't filter by channel) — no extra
recovery code needed here.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Optional, Protocol


@dataclass(frozen=True)
class PendingItem:
    id: str
    user_id: str
    media_url: str
    media_type: str  # 'IMAGE' | 'VIDEO'
    caption: Optional[str]
    retry_count: int


class SupabaseLike(Protocol):
    """Minimal subset of the supabase-py client this module uses."""

    def table(self, name: str) -> Any: ...


class Queue:
    """Channel-scoped queue operations for a single device."""

    CHANNEL = "tiktok-device"

    def __init__(self, sb: SupabaseLike, device_id: str) -> None:
        self._sb = sb
        self._device_id = device_id

    def claim_next_due(self) -> Optional[PendingItem]:
        """Atomically claim the oldest due tiktok-device row.

        We rely on Postgres SELECT ... FOR UPDATE SKIP LOCKED semantics
        via a conditional UPDATE — supabase-py doesn't expose row locks
        directly, so we use the same pattern as the IG side: UPDATE WHERE
        publishing_status='scheduled' and pick the row by smallest
        scheduled_time. If two workers race, only one wins.
        """
        now_ms = int(datetime.now(tz=timezone.utc).timestamp() * 1000)
        now_iso = datetime.now(tz=timezone.utc).isoformat()

        candidates = (
            self._sb.table("content_items")
            .select("id, user_id, media_url, media_type, caption, retry_count")
            .eq("publishing_channel", self.CHANNEL)
            .eq("publishing_status", "scheduled")
            .lte("scheduled_time", now_ms)
            .order("scheduled_time", desc=False)
            .limit(5)
            .execute()
        )

        for row in candidates.data or []:
            updated = (
                self._sb.table("content_items")
                .update(
                    {
                        "publishing_status": "processing",
                        "processing_started_at": now_iso,
                        "updated_at": now_iso,
                    }
                )
                .eq("id", row["id"])
                .eq("publishing_status", "scheduled")
                .execute()
            )
            if updated.data:
                return PendingItem(
                    id=row["id"],
                    user_id=row["user_id"],
                    media_url=row["media_url"],
                    media_type=row["media_type"],
                    caption=row.get("caption"),
                    retry_count=row.get("retry_count") or 0,
                )
        return None

    def mark_published(self, item_id: str, tiktok_post_id: str) -> None:
        now_iso = datetime.now(tz=timezone.utc).isoformat()
        (
            self._sb.table("content_items")
            .update(
                {
                    "publishing_status": "published",
                    "published_at": now_iso,
                    "tiktok_post_id": tiktok_post_id,
                    "processing_started_at": None,
                    "error": None,
                    "updated_at": now_iso,
                }
            )
            .eq("id", item_id)
            .eq("publishing_status", "processing")
            .execute()
        )

    def mark_failed(
        self,
        item_id: str,
        error: str,
        *,
        retry_count: int,
        max_retries: int = 3,
    ) -> None:
        terminal = retry_count >= max_retries
        now_iso = datetime.now(tz=timezone.utc).isoformat()
        update: dict[str, Any] = {
            "error": error,
            "retry_count": retry_count,
            "updated_at": now_iso,
        }
        if terminal:
            update["publishing_status"] = "failed"
        else:
            update["publishing_status"] = "scheduled"
            update["processing_started_at"] = None
        (
            self._sb.table("content_items")
            .update(update)
            .eq("id", item_id)
            .eq("publishing_status", "processing")
            .execute()
        )

    def heartbeat(self, *, status: str = "online") -> None:
        now_iso = datetime.now(tz=timezone.utc).isoformat()
        (
            self._sb.table("tiktok_devices")
            .update({"last_heartbeat_at": now_iso, "status": status})
            .eq("id", self._device_id)
            .execute()
        )

    def published_in_last_24h(self) -> int:
        cutoff_iso = datetime.now(tz=timezone.utc).isoformat()
        # 24h window enforced in SQL.
        result = (
            self._sb.table("content_items")
            .select("id", count="exact")
            .eq("publishing_channel", self.CHANNEL)
            .eq("publishing_status", "published")
            .gte("published_at", _iso_minus_seconds(cutoff_iso, 86400))
            .execute()
        )
        return result.count or 0


def _iso_minus_seconds(iso: str, seconds: int) -> str:
    """Subtract `seconds` from an ISO-8601 timestamp string."""
    from datetime import timedelta

    dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    return (dt - timedelta(seconds=seconds)).isoformat()
