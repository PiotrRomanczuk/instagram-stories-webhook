"""Queue claim/mark logic against a fake supabase client."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

import pytest

from tiktok_worker.queue import Queue


@dataclass
class _Result:
    data: list[dict[str, Any]] = field(default_factory=list)
    count: int | None = None


class _Builder:
    def __init__(self, fake: "_FakeSupabase", table: str) -> None:
        self._fake = fake
        self._table = table
        self._filters: list[tuple[str, str, Any]] = []
        self._select: str | None = None
        self._order: tuple[str, bool] | None = None
        self._limit: int | None = None
        self._update_payload: dict[str, Any] | None = None
        self._count_mode: str | None = None
        self._single: bool = False

    def select(self, columns: str, count: str | None = None) -> "_Builder":
        self._select = columns
        if count:
            self._count_mode = count
        return self

    def eq(self, col: str, val: Any) -> "_Builder":
        self._filters.append(("eq", col, val))
        return self

    def lte(self, col: str, val: Any) -> "_Builder":
        self._filters.append(("lte", col, val))
        return self

    def gte(self, col: str, val: Any) -> "_Builder":
        self._filters.append(("gte", col, val))
        return self

    def order(self, col: str, desc: bool = False) -> "_Builder":
        self._order = (col, desc)
        return self

    def limit(self, n: int) -> "_Builder":
        self._limit = n
        return self

    def single(self) -> "_Builder":
        self._single = True
        return self

    def update(self, payload: dict[str, Any]) -> "_Builder":
        self._update_payload = payload
        return self

    def _matches(self, row: dict[str, Any]) -> bool:
        for op, col, val in self._filters:
            cell = row.get(col)
            if op == "eq" and cell != val:
                return False
            if op == "lte" and (cell is None or cell > val):
                return False
            if op == "gte" and (cell is None or cell < val):
                return False
        return True

    def execute(self) -> _Result:
        rows = self._fake.tables[self._table]
        if self._update_payload is not None:
            updated = []
            for row in rows:
                if self._matches(row):
                    row.update(self._update_payload)
                    updated.append(dict(row))
            return _Result(data=updated)
        matched = [dict(r) for r in rows if self._matches(r)]
        if self._order:
            col, desc = self._order
            matched.sort(key=lambda r: r.get(col), reverse=desc)
        if self._limit is not None:
            matched = matched[: self._limit]
        return _Result(
            data=matched,
            count=len(matched) if self._count_mode else None,
        )


class _FakeSupabase:
    def __init__(self) -> None:
        self.tables: dict[str, list[dict[str, Any]]] = {
            "content_items": [],
            "tiktok_devices": [],
        }

    def table(self, name: str) -> _Builder:
        return _Builder(self, name)


def _now_ms() -> int:
    return int(datetime.now(tz=timezone.utc).timestamp() * 1000)


def test_claim_returns_oldest_due_row() -> None:
    sb = _FakeSupabase()
    now = _now_ms()
    sb.tables["content_items"] = [
        {
            "id": "b",
            "user_id": "u1",
            "media_url": "x",
            "media_type": "IMAGE",
            "caption": None,
            "retry_count": 0,
            "publishing_channel": "tiktok-device",
            "publishing_status": "scheduled",
            "scheduled_time": now - 1000,
        },
        {
            "id": "a",
            "user_id": "u1",
            "media_url": "y",
            "media_type": "IMAGE",
            "caption": None,
            "retry_count": 0,
            "publishing_channel": "tiktok-device",
            "publishing_status": "scheduled",
            "scheduled_time": now - 5000,  # older
        },
    ]
    q = Queue(sb, device_id="dev-1")
    claimed = q.claim_next_due()
    assert claimed is not None
    assert claimed.id == "a"
    # The row should now be in processing status.
    assert sb.tables["content_items"][1]["publishing_status"] == "processing"


def test_claim_ignores_instagram_rows() -> None:
    sb = _FakeSupabase()
    sb.tables["content_items"] = [
        {
            "id": "ig",
            "user_id": "u1",
            "media_url": "x",
            "media_type": "IMAGE",
            "caption": None,
            "retry_count": 0,
            "publishing_channel": "instagram",
            "publishing_status": "scheduled",
            "scheduled_time": _now_ms() - 1000,
        },
    ]
    q = Queue(sb, device_id="dev-1")
    assert q.claim_next_due() is None


def test_mark_published_flips_status_and_records_id() -> None:
    sb = _FakeSupabase()
    sb.tables["content_items"] = [
        {
            "id": "p",
            "publishing_channel": "tiktok-device",
            "publishing_status": "processing",
        }
    ]
    q = Queue(sb, device_id="dev-1")
    q.mark_published("p", tiktok_post_id="tt-123")
    row = sb.tables["content_items"][0]
    assert row["publishing_status"] == "published"
    assert row["tiktok_post_id"] == "tt-123"


def test_mark_failed_retryable_resets_to_scheduled() -> None:
    sb = _FakeSupabase()
    sb.tables["content_items"] = [
        {
            "id": "f",
            "publishing_channel": "tiktok-device",
            "publishing_status": "processing",
            "retry_count": 0,
        }
    ]
    q = Queue(sb, device_id="dev-1")
    q.mark_failed("f", error="boom", retry_count=1)
    row = sb.tables["content_items"][0]
    assert row["publishing_status"] == "scheduled"
    assert row["retry_count"] == 1
    assert row["error"] == "boom"


def test_mark_failed_terminal_after_max_retries() -> None:
    sb = _FakeSupabase()
    sb.tables["content_items"] = [
        {
            "id": "t",
            "publishing_channel": "tiktok-device",
            "publishing_status": "processing",
            "retry_count": 2,
        }
    ]
    q = Queue(sb, device_id="dev-1")
    q.mark_failed("t", error="boom", retry_count=3)
    row = sb.tables["content_items"][0]
    assert row["publishing_status"] == "failed"
