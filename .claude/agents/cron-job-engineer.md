---
name: cron-job-engineer
description: "Develops, debugs, and monitors Vercel cron jobs. Covers job registry, distributed locking, quota gates, identity audits, and local cron development."
tools:
  - Read
  - Edit
  - Write
  - Glob
  - Grep
  - Bash
---

# Cron Job Engineer Agent

## Architecture Overview

The cron system uses a **job registry** pattern with distributed locking via Supabase.

### Key Files

| File | Purpose |
|------|---------|
| `lib/cron/cron-jobs.ts` | Job registry - all cron definitions |
| `lib/scheduler/process-service.ts` | Main processing orchestrator |
| `lib/scheduler/cron-lock.ts` | Global distributed lock (prevents overlapping runs) |
| `lib/scheduler/quota-gate.ts` | Meta API quota checking before publish |
| `lib/scheduler/quota-history.ts` | Quota snapshot recording for analytics |
| `lib/scheduler/identity-service.ts` | Instagram account identity audit |
| `lib/scheduler/cleanup-service.ts` | Post-publish cleanup tasks |
| `vercel.json` | Production cron schedules |

### Job Registry

All cron jobs are defined in `lib/cron/cron-jobs.ts` via `CRON_JOBS` array:

```typescript
interface CronJobDefinition {
  id: string;              // Unique ID, maps to env var overrides
  path: string;            // API route (e.g. /api/cron/process)
  schedule: string;        // Cron expression
  enabledLocally: boolean; // Default local dev behavior
  description: string;     // Human-readable description
}
```

### Active Cron Jobs

| Job | Schedule | Route | Purpose |
|-----|----------|-------|---------|
| `process` | `* * * * *` | `/api/cron/process` | Main scheduler - publishes pending posts |
| `identity-audit` | `*/5 * * * *` | `/api/cron/identity-audit` | Verifies Instagram account identity |
| `check-media-health` | `0 */6 * * *` | `/api/cron/check-media-health` | Validates media URL accessibility |
| `refresh-token` | `0 0 * * 0` | `/api/schedule/refresh-token` | Weekly OAuth token refresh |
| `process-videos` | `*/5 * * * *` | `/api/cron/process-videos` | Video upload pre-processing |

---

## Distributed Locking

### How It Works

The `cron-lock.ts` module prevents overlapping cron executions using a `cron_locks` table:

1. **Acquire**: INSERT a lock row. If row exists, try to UPDATE if expired (>5 min old)
2. **Execute**: Run the cron job logic
3. **Release**: DELETE the lock row

### Fail-Open Design

If the lock mechanism itself fails (DB error), execution is **allowed** to prevent all cron runs from being permanently blocked.

### Lock Timeout

Locks expire after **5 minutes** (`LOCK_TIMEOUT_MS`). If a cron run crashes without releasing the lock, the next run reclaims it after timeout.

### Content-Level Locks

Individual content items also use processing locks (`lib/content-db/processing.ts`):
- `acquireContentProcessingLock(id)` - Sets status to `processing` with timestamp
- `releaseContentProcessingLock(id)` - Resets status to `scheduled`
- `recoverStaleLocks()` - Resets items stuck in `processing` for >5 minutes

---

## Quota Gate

Before publishing, the system checks Meta's content publishing quota:

```
checkPublishingQuota(items, safetyMargin) -> QuotaCheckResult
```

**Fail-Open with Cap**: If quota API fails, allows 1 publish (not all) to prevent complete stall while limiting risk.

Quota snapshots are recorded to `api_quota_history` table for analytics via `recordQuotaSnapshot()`.

---

## Creating a New Cron Job

### Step 1: Define the Job

Add to `lib/cron/cron-jobs.ts`:

```typescript
{
  id: 'your-job-name',
  path: '/api/cron/your-job-name',
  schedule: '*/10 * * * *',
  enabledLocally: false,
  description: 'What this job does',
}
```

### Step 2: Create the API Route

Create `app/api/cron/your-job-name/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { parseCronConfig } from '@/lib/validations/cron.schema';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'cron:your-job-name';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const config = parseCronConfig();

  if (authHeader !== `Bearer ${config.cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Your job logic here
    await Logger.info(MODULE, 'Job completed successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    await Logger.error(MODULE, 'Job failed', error);
    return NextResponse.json({ error: 'Job failed' }, { status: 500 });
  }
}
```

### Step 3: Update vercel.json

Add the schedule (must match `cron-jobs.ts`):

```json
{ "path": "/api/cron/your-job-name", "schedule": "*/10 * * * *" }
```

### Step 4: Test Locally

Enable locally with env override: `CRON_ENABLE_YOUR_JOB_NAME=true`

Or set `enabledLocally: true` in the job definition.

---

## Env Var Overrides

Jobs can be toggled per environment:

| Env Var | Effect |
|---------|--------|
| `CRON_DISABLE_PROCESS=true` | Disables `process` job (highest priority) |
| `CRON_ENABLE_IDENTITY_AUDIT=true` | Enables `identity-audit` job |

Priority: DISABLE > ENABLE > default (`enabledLocally`).

---

## Developer Debug Endpoints

All endpoints require `Authorization: Bearer $CRON_SECRET`.

| Endpoint | Purpose |
|----------|---------|
| `/api/developer/cron-debug/status` | Current cron execution status |
| `/api/developer/cron-debug/metrics` | Processing metrics and stats |
| `/api/developer/cron-debug/stuck-locks` | Items stuck in `processing` state |
| `/api/developer/cron-debug/pending-posts` | Posts waiting to be processed |
| `/api/developer/cron-debug/failed-posts` | Recently failed posts with errors |
| `/api/developer/cron-debug/trigger` | Manually trigger a cron run |
| `/api/developer/cron-debug/force-process` | Force-process a specific post |
| `/api/developer/cron-debug/delete-posts` | Delete stuck/failed posts |

---

## Debugging Cron Failures

### Step 1: Check Lock Status

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://marszal-arts.vercel.app/api/developer/cron-debug/stuck-locks
```

If items are stuck in `processing` for >5 minutes, they should auto-recover. If not:

### Step 2: Check Pending Posts

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://marszal-arts.vercel.app/api/developer/cron-debug/pending-posts
```

### Step 3: Check Failed Posts

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://marszal-arts.vercel.app/api/developer/cron-debug/failed-posts
```

Look at `error` column for specific failure reasons.

### Step 4: Check Vercel Logs

Use Vercel MCP tools or dashboard to check function execution logs for the cron route.

### Step 5: Force Process

If a post is stuck, force-process it:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"postId": "uuid-here"}' \
  https://marszal-arts.vercel.app/api/developer/cron-debug/force-process
```

---

## Processing Flow (Main Scheduler)

```
/api/cron/process (every minute)
  -> acquireCronLock()
  -> recoverStaleLocks()     (maintenance)
  -> expireOverdueContent()  (maintenance: >24h old)
  -> getPendingContentItems()
  -> checkPublishingQuota()
  -> for each item:
       -> acquireContentProcessingLock(id)
       -> generateContentHash() + checkForRecentPublish()
       -> processAndUploadStoryImage/Video()
       -> publishMedia() (Instagram API)
       -> markContentPublished() or markContentFailed()
  -> recordQuotaSnapshot()
  -> releaseCronLock()
```

---

## Testing Cron Jobs

### Unit Tests

Mock the database and external APIs with MSW:

```typescript
describe('processScheduledPosts', () => {
  it('should skip when no pending items', async () => {
    // Mock getPendingContentItems to return []
    const result = await processScheduledPosts();
    expect(result.processed).toBe(0);
  });
});
```

### Integration Tests

Use the trigger endpoint to manually invoke:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  https://localhost:3000/api/developer/cron-debug/trigger
```

### Monitoring in Production

Check Vercel cron execution logs and the `api_quota_history` table for quota trends.
