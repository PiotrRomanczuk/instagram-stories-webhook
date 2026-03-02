# Vercel Cron Testing Guide

Complete guide for testing Vercel cron jobs locally and in production.

---

## 📋 Your Cron Jobs

From `vercel.json`:

| Path | Schedule | Frequency | Purpose |
|------|----------|-----------|---------|
| `/api/cron/process` | `* * * * *` | Every minute | Process scheduled posts |
| `/api/cron/identity-audit` | `*/5 * * * *` | Every 5 minutes | User identity audit |
| `/api/cron/check-media-health` | `0 */6 * * *` | Every 6 hours | Media health check |
| `/api/schedule/refresh-token` | `0 0 * * 0` | Weekly (Sunday) | Refresh Instagram tokens |
| `/api/cron/process-videos` | `*/5 * * * *` | Every 5 minutes | Process video queue |

---

## 🎯 Best Testing Strategies

### Strategy 1: Direct HTTP Call (Recommended)

**Pros**: Fast, works locally and in production
**Cons**: Need to handle authentication

```bash
# Local testing
curl -X GET http://localhost:3000/api/cron/process \
  -H "Authorization: Bearer ${CRON_SECRET}"

# Production testing
curl -X GET https://stories-webhook.vercel.app/api/cron/process \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

---

### Strategy 2: Test Helper Script

Create a reusable test script:

**File**: `scripts/test-cron.sh`

```bash
#!/bin/bash

# Test Vercel Cron Jobs
# Usage: ./scripts/test-cron.sh [job-name] [environment]
# Example: ./scripts/test-cron.sh process local
# Example: ./scripts/test-cron.sh process-videos production

JOB=$1
ENV=${2:-local}

if [ "$ENV" = "production" ]; then
  BASE_URL="https://stories-webhook.vercel.app"
else
  BASE_URL="http://localhost:3000"
fi

# Load secrets
if [ "$ENV" = "local" ]; then
  source .env.local
else
  # For production, use vercel env pull
  echo "⚠️ Make sure you have CRON_SECRET in your environment"
fi

echo "🧪 Testing cron job: $JOB"
echo "Environment: $ENV"
echo "URL: $BASE_URL/api/cron/$JOB"
echo ""

# Make request
curl -X GET "$BASE_URL/api/cron/$JOB" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -v

echo ""
echo "✅ Test complete"
```

---

### Strategy 3: Separate Test Endpoint

Create a dedicated test endpoint that bypasses auth in development:

**File**: `app/api/test/trigger-cron/route.ts`

```typescript
import { NextResponse } from 'next/server';

// ONLY works in development
export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Test endpoint not available in production' },
      { status: 403 }
    );
  }

  const { job } = await request.json();

  // Import and run the cron logic directly
  let result;
  switch (job) {
    case 'process':
      const { processScheduledPosts } = await import('@/lib/scheduler/process-service');
      result = await processScheduledPosts();
      break;
    case 'process-videos':
      const { processVideos } = await import('@/lib/jobs/process-videos');
      result = await processVideos();
      break;
    // Add other jobs...
    default:
      return NextResponse.json({ error: 'Unknown job' }, { status: 400 });
  }

  return NextResponse.json({ success: true, result });
}
```

**Usage**:
```bash
# Local only
curl -X POST http://localhost:3000/api/test/trigger-cron \
  -H "Content-Type: application/json" \
  -d '{"job": "process"}'
```

---

### Strategy 4: Unit Test the Core Logic

**Separate HTTP handler from business logic:**

```typescript
// ❌ BAD: Logic in route handler
export async function GET(request: Request) {
  // Auth check...

  // Business logic here (hard to test)
  const posts = await db.query(...);
  for (const post of posts) {
    await publishPost(post);
  }
}

// ✅ GOOD: Separate logic
export async function GET(request: Request) {
  // Auth check...

  // Call testable function
  const result = await processScheduledPosts();
  return NextResponse.json(result);
}
```

**Then unit test the logic:**

```typescript
// __tests__/lib/scheduler/process-service.test.ts
import { processScheduledPosts } from '@/lib/scheduler/process-service';

describe('processScheduledPosts', () => {
  it('processes posts correctly', async () => {
    const result = await processScheduledPosts();
    expect(result.processed).toBeGreaterThan(0);
  });
});
```

---

### Strategy 5: E2E Test with Playwright

**Test the cron endpoint like a regular API:**

```typescript
// __tests__/e2e/cron-jobs.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Cron Jobs', () => {
  test('process cron returns success', async ({ request }) => {
    const response = await request.get('/api/cron/process', {
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`
      }
    });

    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty('processed');
  });
});
```

---

### Strategy 6: Vercel CLI Trigger

**Use Vercel CLI to trigger production crons:**

```bash
# This doesn't exist yet, but you can:

# 1. Get production env vars
vercel env pull .env.production

# 2. Call production endpoint
source .env.production
curl -X GET https://stories-webhook.vercel.app/api/cron/process \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

---

## 🔐 Security Considerations

### Authentication Methods

**Option 1: Vercel Cron Secret (Recommended)**

Vercel automatically adds `Authorization: Bearer <CRON_SECRET>` header:

```typescript
// Check for Vercel cron auth
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Process cron job...
}
```

**Option 2: Custom API Key**

```typescript
export async function GET(request: Request) {
  const apiKey = request.headers.get('x-api-key');

  if (apiKey !== process.env.API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Process cron job...
}
```

**Option 3: Vercel Signature Verification**

```typescript
import { verifySignature } from '@vercel/cron';

export async function GET(request: Request) {
  const isValid = await verifySignature(request);

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Process cron job...
}
```

---

## 🧪 Complete Testing Workflow

### Step 1: Test Core Logic (Unit Tests)

```bash
# Test the business logic without HTTP
npm run test __tests__/lib/scheduler/process-service.test.ts
```

### Step 2: Test Local Endpoint

```bash
# Start dev server
npm run dev

# In another terminal, trigger cron
curl -X GET http://localhost:3000/api/cron/process \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

### Step 3: Test Production Endpoint

```bash
# Get production secrets
vercel env pull .env.production

# Load secrets
source .env.production

# Call production cron
curl -X GET https://stories-webhook.vercel.app/api/cron/process \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

### Step 4: Monitor Vercel Logs

```bash
# Watch production logs in real-time
vercel logs stories-webhook --follow

# Or via Vercel Dashboard:
# https://vercel.com/[your-account]/stories-webhook/logs
```

---

## 📊 Monitoring Cron Execution

### Vercel Dashboard

1. Go to: https://vercel.com/piotrromanczuks-projects/stories-webhook
2. Click **"Logs"**
3. Filter by: `/api/cron/*`
4. See execution history, errors, duration

### Add Logging to Cron Jobs

```typescript
export async function GET(request: Request) {
  const startTime = Date.now();

  console.log('[CRON] Starting process job');

  try {
    const result = await processScheduledPosts();

    const duration = Date.now() - startTime;
    console.log(`[CRON] Completed in ${duration}ms`, result);

    return NextResponse.json({
      success: true,
      duration,
      ...result
    });
  } catch (error) {
    console.error('[CRON] Error:', error);

    return NextResponse.json(
      { error: 'Cron job failed' },
      { status: 500 }
    );
  }
}
```

---

## 🐛 Debugging Common Issues

### Issue 1: Cron doesn't run

**Check**:
- Cron is deployed to production (not preview)
- `vercel.json` syntax is correct
- Environment variables are set
- No runtime errors in logs

### Issue 2: Authentication fails

**Check**:
- `CRON_SECRET` is set in Vercel dashboard
- Header format is correct: `Bearer <token>`
- No extra spaces or newlines in secret

### Issue 3: Timeout (10-second limit)

**Solutions**:
- Use background jobs for long tasks
- Split work into smaller chunks
- Return early and process async

### Issue 4: Cold starts

**Solutions**:
- Keep functions warm with monitoring pings
- Optimize dependencies
- Use serverless database connections

---

## 📝 Quick Reference

### Test Locally
```bash
npm run dev
curl http://localhost:3000/api/cron/process \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

### Test Production
```bash
curl https://stories-webhook.vercel.app/api/cron/process \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

### View Logs
```bash
vercel logs --follow
```

### Check Schedule
```bash
cat vercel.json | grep -A 3 "crons"
```

---

## 🎯 Recommended Approach

For this project, use a **hybrid approach**:

1. ✅ **Unit tests** for core logic (`lib/scheduler/`, `lib/jobs/`)
2. ✅ **Local HTTP tests** via curl during development
3. ✅ **Production monitoring** via Vercel logs
4. ✅ **Manual triggers** when needed for debugging

**Don't** try to automate E2E testing of cron schedules - it's too complex and flaky.

---

## 📚 Resources

- [Vercel Cron Jobs Docs](https://vercel.com/docs/cron-jobs)
- [Testing Vercel Functions](https://vercel.com/docs/functions/testing)
- [Cron Expression Format](https://crontab.guru/)

---

**Ready to test!** Use the scripts and approaches above to verify your cron jobs work correctly. 🚀
