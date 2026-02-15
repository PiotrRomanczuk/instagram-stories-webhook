---
name: content-lifecycle-specialist
description: "Manages the content queue state machine, bulk operations, processing locks, Kanban workflows, and content lifecycle from submission to publishing."
tools:
  - Read
  - Edit
  - Write
  - Glob
  - Grep
  - Bash
---

# Content Lifecycle Specialist Agent

## Architecture Overview

Content flows through a state machine from submission to publishing, managed by the `content_items` table and `lib/content-db/` modules.

### Key Files

| File | Purpose |
|------|---------|
| `lib/content-db/index.ts` | Barrel exports for all content operations |
| `lib/content-db/queries.ts` | Read operations (get, list, filter) |
| `lib/content-db/mutations.ts` | Write operations (create, update, delete) |
| `lib/content-db/bulk.ts` | Bulk operations (status updates, reorder) |
| `lib/content-db/processing.ts` | Cron/publishing lock management |
| `lib/content-db/stats.ts` | Content statistics and archiving |
| `lib/scheduler/process-service.ts` | Publishing orchestration |
| `app/components/content-queue/` | Queue UI components |

---

## Content State Machine

```
  submission
      |
      v
   pending  <-- initial state (awaiting review)
      |
      v
   approved  --> scheduled (with scheduled_time)
      |              |
      v              v
   rejected     processing (lock acquired)
                     |
                 +---+---+
                 |       |
                 v       v
            published  failed
                         |
                         v
                    (retry up to 3x -> back to scheduled)
                    (after 3 retries -> permanent failed)
```

### Publishing Statuses

| Status | Meaning | Next States |
|--------|---------|-------------|
| `pending` | Awaiting review | `approved`, `rejected` |
| `approved` | Reviewed, not scheduled | `scheduled` |
| `rejected` | Review rejected | (terminal) |
| `scheduled` | Scheduled for publishing | `processing` |
| `processing` | Lock acquired, publishing in progress | `published`, `failed`, `scheduled` (retry) |
| `published` | Successfully published to Instagram | (terminal) |
| `failed` | Publishing failed after 3 retries or expired | (terminal) |

---

## Processing Lock Mechanism

### Content-Level Locks (lib/content-db/processing.ts)

Each content item has its own processing lock via the `publishing_status` and `processing_started_at` columns:

**Acquire Lock** (`acquireContentProcessingLock`):
1. Try UPDATE where status = `scheduled` -> set to `processing`
2. If fail, try UPDATE where status = `processing` AND `processing_started_at` > 5min ago (stale)
3. If both fail, lock is held by another process

**Release Lock** (`releaseContentProcessingLock`):
- Reset status to `scheduled`, clear `processing_started_at`

**Recover Stale Locks** (`recoverStaleLocks`):
- Called at start of each cron cycle
- Resets items stuck in `processing` for >5 minutes back to `scheduled`

**Expire Overdue Content** (`expireOverdueContent`):
- Called at start of each cron cycle
- Marks `scheduled` items >24 hours past their `scheduled_time` as `failed`

---

## Retry Logic

When publishing fails, the retry count determines behavior:

```
retryCount < 3:
  -> status = 'scheduled' (back in queue)
  -> processing_started_at = null
  -> error = error message (preserved for debugging)

retryCount >= 3:
  -> status = 'failed' (permanent)
  -> error = error message
```

---

## Bulk Operations

### Bulk Status Update (`bulkUpdateSubmissionStatus`)

Updates multiple items' submission status in a single operation. Used by the review UI for batch approve/reject.

### Reorder Scheduled Items (`reorderScheduledItems`)

Reorders the scheduled queue by updating `scheduled_time` values to match new positions.

---

## Content Database Operations

### Queries (lib/content-db/queries.ts)

| Function | Purpose |
|----------|---------|
| `getContentItems(filters)` | List with filtering, pagination |
| `getContentItemById(id)` | Single item by ID |
| `getReviewQueue()` | Items pending review |
| `getScheduledItems()` | Items in scheduled queue |
| `getContentItemForProcessing(id)` | Item with processing context |

### Mutations (lib/content-db/mutations.ts)

| Function | Purpose |
|----------|---------|
| `createContentItem(data)` | Create new content |
| `updateContentItem(id, data)` | Update content fields |
| `updateSubmissionStatus(id, status)` | Change review status |
| `updatePublishingStatus(id, status)` | Change publishing status |
| `updateScheduledTime(id, time)` | Reschedule |
| `deleteContentItem(id)` | Remove content |

### Stats (lib/content-db/stats.ts)

| Function | Purpose |
|----------|---------|
| `getContentStats()` | Counts by status |
| `getOverdueCount()` | Items past scheduled time |
| `archiveContentItem(id)` | Archive published content |

---

## Kanban UI Integration

The content queue uses a Kanban board UI in `app/components/content-queue/kanban/`:

- Columns map to publishing statuses
- Drag-and-drop reorders within `scheduled` column
- Status transitions are validated against the state machine
- Optimistic UI updates with server confirmation

---

## Adding New Content States

### Step 1: Update Types

Add the new status to the `PublishingStatus` type in `lib/types/`:

```typescript
type PublishingStatus = 'pending' | 'approved' | 'rejected' | 'scheduled' | 'processing' | 'published' | 'failed' | 'your_new_status';
```

### Step 2: Update Processing Logic

Update `lib/content-db/processing.ts` to handle transitions to/from the new state.

### Step 3: Update Queries

Add filtering for the new status in `lib/content-db/queries.ts`.

### Step 4: Update UI

Add the new column to the Kanban board and any status badges/filters.

### Step 5: Migration

Create a Supabase migration if the status needs a DB constraint update.

---

## Debugging Stuck Content

### Symptoms

- Content stays in `processing` indefinitely
- Content never moves from `scheduled` to `processing`
- Content moves to `failed` unexpectedly

### Step 1: Check Processing Status

```sql
SELECT id, publishing_status, processing_started_at, error, retry_count
FROM content_items
WHERE publishing_status IN ('processing', 'scheduled', 'failed')
ORDER BY updated_at DESC
LIMIT 20;
```

### Step 2: Check for Stale Locks

Items in `processing` with `processing_started_at` > 5 minutes ago are stale:

```sql
SELECT id, processing_started_at,
  EXTRACT(EPOCH FROM (now() - processing_started_at::timestamp)) / 60 as minutes_locked
FROM content_items
WHERE publishing_status = 'processing'
  AND processing_started_at < (now() - interval '5 minutes');
```

### Step 3: Check Error Messages

```sql
SELECT id, error, retry_count, updated_at
FROM content_items
WHERE error IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;
```

### Step 4: Force Recovery

Use the cron debug endpoint to manually recover or force-process:

```bash
# Check stuck locks
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://marszal-arts.vercel.app/api/developer/cron-debug/stuck-locks

# Force process a specific item
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"postId": "uuid"}' \
  https://marszal-arts.vercel.app/api/developer/cron-debug/force-process
```

---

## Duplicate Detection

Before publishing, the system checks for recently published identical content:

1. `generateContentHash(mediaUrl)` - Creates a hash of the media content
2. `checkForRecentPublish(hash, 24h)` - Checks `content_items` for same hash in last 24 hours
3. If duplicate found, item is **cancelled** (not failed) with reason

This can be bypassed with `bypassDuplicateCheck: true` for intentional re-publishes.
