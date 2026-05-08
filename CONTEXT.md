# Context: Instagram Stories Publishing

This repo programmatically publishes Instagram Stories on a schedule via the Meta Graph API. The vocabulary below is opinionated — when you write code or a PR, use these terms (and avoid the listed aliases) so future maintainers and AI agents share one mental model.

The deepest concepts live in `lib/scheduler/` and `lib/content-db/`; this glossary leans toward those areas because that's where the architecture review found the most ambiguity.

## Language

### Content & lifecycle

**Content Item**:
A row in `content_items` representing one piece of media that may be published to Instagram. It has a `publishingStatus` (scheduled → processing → published / failed) and a `mediaType` (IMAGE | VIDEO).
_Avoid_: "post" (ambiguous with IG-side concepts), "scheduled post" (implies status), "meme" (legacy term, kept for table name only).

**Submission**:
A Content Item with `source = 'submission'` — submitted by a user without IG credentials, awaiting review by a developer/admin who will publish under their own credentials.
_Avoid_: "user-generated content", "pending post".

**Direct Post**:
A Content Item with `source = 'direct'` — created by an authenticated user who owns the IG account that will publish it.

**Story Ready**:
A boolean on a video Content Item indicating it has already been transcoded into Instagram Stories format (9:16, ≤60s, supported codec). When `storyReady = true`, the per-item flow skips the (expensive) processing step.
_Avoid_: "video processed", "transcoded".

**Overdue**:
A Content Item still in `scheduled` status more than 24 hours past its `scheduledTime`. The Cron Batch expires these at the start of each run.

### Orchestration

**Cron Batch**:
One execution of `runCronBatch()`: stale-lock recovery → overdue expiry → quota gate → iterate due items via Publish Content Item → record snapshots. Triggered by Vercel Cron.
_Avoid_: "cron run" (ambiguous with cron-run-id), "batch process".

**Publish Content Item**:
The per-item flow in `publishContentItem(item, lifecycle, options)`: lock acquisition → content-hash → duplicate check → media processing → publish-user resolution → IG publish → terminal transition. Returns one Process Outcome.
_Avoid_: "publish flow", "post job".

**Process Outcome**:
The discriminated union returned by Publish Content Item:
- `published` — reached IG, DB reconciled
- `skipped-locked` — another worker holds the processing lock
- `skipped-duplicate` — content hash matches a recent publish; item is cancelled
- `skipped-stale-status` — item's status moved out of `scheduled` between fetch and lock (currently unreachable in the cron path; surfaces when force-processing)
- `failed-retryable` — failed; retry budget remains; lifecycle has bumped `scheduledTime` by the backoff interval
- `failed-terminal` — failed; retry budget exhausted; admins alerted

**Content Lifecycle**:
The seam (interface) between the orchestrator and the `content_items` state machine. Two adapters: the Supabase-backed `supabaseContentLifecycle` (production) and `InMemoryContentLifecycle` (tests).
_Avoid_: "content service", "DAO", "repository".

**Force Process**:
Manual trigger to publish one Content Item now, used by the developer cron-debug tool and by the user-facing "Submit Now" action. Bypasses duplicate detection; surfaces a 409 if the lock is held.

### Gates & rate limits

**Publishing Toggle**:
A global on/off switch (`config_kv` row) consulted at the start of each Cron Batch. When off, the batch returns immediately without fetching items.
_Avoid_: "publishing flag", "kill switch".

**Quota Gate**:
Pre-batch check that fetches Instagram's daily content publishing limit and aborts (or caps) the batch if it would exceed it. Records a snapshot at start and end of every Cron Batch.

**Stale Lock**:
A `content_items` row stuck in `processing` status whose worker died (timeout > 5 min). The Cron Batch reclaims these at the start of each run.

### Reliability terms

**Reconciliation Failure**:
The state where Instagram has accepted a publish (returned a media id) but the DB write to mark `published` has exhausted its 3 internal retries. Logged as `CRITICAL`; an operator must manually align the two.
_Avoid_: "publish failure" (ambiguous; that means the IG call failed).

**Retry Backoff**:
Non-terminal failures push `scheduledTime` into the future by `[1m, 5m, 15m]` indexed on `retryCount`, so `getPendingItems` won't re-pick them until the backoff elapses. The in-memory test adapter mirrors this so orchestrator tests pass on a faithful model.

## Relationships

- A **Cron Batch** publishes 0..N **Content Items** via **Publish Content Item** per item, each producing one **Process Outcome**.
- A **Content Item** is either a **Submission** (publishes under a reviewer's IG credentials) or a **Direct Post** (publishes under the owner's).
- All state transitions go through a **Content Lifecycle** adapter; the orchestrator never writes to `content_items` directly.
- **Force Process** calls **Publish Content Item** directly, skipping the **Cron Batch** envelope (no toggle, no quota gate, no snapshots).
- A `failed-retryable` **Process Outcome** triggers **Retry Backoff** via `markFailed`; the next **Cron Batch** picks the item up only after the backoff elapses.

## Example dialogue

> **Dev:** "If a content item is locked when the batch runs, does it count as failed?"
> **Maintainer:** "No — it gets a `skipped-locked` **Process Outcome** and shows up in the batch's `skippedLocked` count, not in `results` and not in `failed`. The `failed` total only counts `failed-retryable` + `failed-terminal`."
>
> **Dev:** "What about Force Process — does it also skip locked items?"
> **Maintainer:** "Force Process surfaces `skipped-locked` as a 409 to the caller. We never break the lock — that risks double-publish, which is the worst possible outcome."

## Flagged ambiguities

- **"Post"** was historically used for both pre-publish Content Items and IG-side media. Resolved: **Content Item** for ours, **IG media** (or `igMediaId`) for theirs. Existing code still uses "post" in a few log strings; tolerated, not preferred.
- **"Failed"** could mean `failed-retryable` or `failed-terminal`. Use the discriminator when it matters; reserve unqualified "failed" for the aggregate count in `BatchResult.failed`.
- **`markCancelled` writes `publishing_status = 'failed'`** in the Supabase adapter — a duplicate-detected item and a terminally-failed item end up indistinguishable in the DB column. Pre-existing; flagged for future cleanup. The **Process Outcome** distinguishes them at the orchestrator level (`skipped-duplicate` vs `failed-terminal`), so callers should branch on outcome, not on status.
