# Testing Strategy: Cron Jobs & Instagram Story Verification

## Overview

This document outlines the testing strategy for:
1. **Vercel Cron Jobs** - How to test scheduled tasks locally and in production
2. **Instagram Story Publishing** - How to verify stories were actually published
3. **Debugging Missing Stories** - Troubleshooting when stories don't appear on Instagram

---

## 1. Testing Vercel Cron Jobs

### Problem
Vercel cron jobs (`/api/cron/process`) run automatically in production on a schedule defined in `vercel.json`. Testing them requires special approaches since they:
- Only run at scheduled times in production
- Require authentication (CRON_SECRET header)
- Process real scheduled posts from the database

### Solutions

#### A. Local Development Testing

**Method 1: Direct API Call with curl**

```bash
# Test locally without auth (CRON_SECRET optional in dev)
curl http://localhost:3000/api/cron/process

# Test with auth header (simulates production)
curl -H "Authorization: Bearer your-cron-secret" \
  http://localhost:3000/api/cron/process
```

**Method 2: Using Playwright Test**

Create a test file: `__tests__/e2e/cron-debug.spec.ts` (already exists)

```typescript
test('manually trigger cron job', async ({ request }) => {
  const response = await request.get('/api/cron/process');
  expect(response.ok()).toBe(true);
  const data = await response.json();
  console.log('Cron result:', data);
});
```

Run with: `npx playwright test cron-debug.spec.ts`

#### B. Production Testing

**Method 1: Vercel Dashboard**

1. Go to Vercel Dashboard → Your Project → Settings → Cron Jobs
2. Click "Trigger" next to your cron job
3. View logs in Vercel Dashboard → Deployments → Functions

**Method 2: Production API Call**

```bash
# Trigger cron on production
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://your-app.vercel.app/api/cron/process
```

⚠️ **Security Note**: Never commit CRON_SECRET to git. Store in Vercel environment variables.

#### C. Integration Testing

**Test File**: `__tests__/integration/cron-service.test.ts`

```typescript
import { processScheduledPosts } from '@/lib/scheduler/process-service';
import { supabaseAdmin } from '@/lib/config/supabase-admin';

describe('Cron Job Service', () => {
  it('should process pending posts', async () => {
    // Create test post
    const { data: post } = await supabaseAdmin
      .from('scheduled_posts')
      .insert({
        user_id: 'test-user',
        media_url: 'https://example.com/test.jpg',
        scheduled_at: new Date(Date.now() - 1000).toISOString(),
        status: 'pending'
      })
      .select()
      .single();

    // Run cron job logic
    const result = await processScheduledPosts();

    expect(result.processed).toBeGreaterThan(0);

    // Verify post was processed
    const { data: updated } = await supabaseAdmin
      .from('scheduled_posts')
      .select('status')
      .eq('id', post.id)
      .single();

    expect(['published', 'failed']).toContain(updated.status);
  });
});
```

### Best Practices

1. **Use environment-specific secrets**
   - Dev: No CRON_SECRET (or test value)
   - Production: Strong secret in Vercel env vars

2. **Test with realistic data**
   - Create test posts in dev database
   - Use past timestamps for immediate processing
   - Clean up test data after tests

3. **Monitor cron execution**
   - Check Vercel logs for each execution
   - Set up alerts for failed cron jobs (Sentry)
   - Track processing metrics in database

4. **Test failure scenarios**
   - Expired Instagram tokens
   - Invalid media URLs
   - Rate limiting
   - Network errors

---

## 2. Instagram Story Verification API

### Existing Implementation

The project already has a story verification endpoint:

**Endpoint**: `GET /api/instagram/recent-stories?limit=10`

**Implementation**: `lib/instagram/media.ts` - `getRecentStories()`

**How it works**:
1. Fetches media from Instagram Graph API: `/{igUserId}/media`
2. Filters for stories posted within last 24 hours
3. Returns story metadata (id, media_type, media_url, timestamp)

### Usage in E2E Tests

**Already implemented** in `__tests__/e2e/instagram-publishing-live.spec.ts`:

```typescript
// After publishing a story
const publishedMediaId = publishData.result?.id;

// Wait for Instagram processing
await page.waitForTimeout(2000);

// Verify via API
const storiesResponse = await request.get('/api/instagram/recent-stories?limit=5');
const stories = await storiesResponse.json();

// Find our published story
const publishedStory = stories.find((s: any) => s.id === publishedMediaId);
expect(publishedStory).toBeDefined();
expect(publishedStory.media_type).toBe('IMAGE');
```

### Enhanced Verification

For more robust verification, we can add:

#### A. Verify Story by Media ID

**New Function**: `lib/instagram/media.ts` - `verifyStoryExists()`

```typescript
export async function verifyStoryExists(
  userId: string,
  mediaId: string
): Promise<boolean> {
  try {
    const details = await getMediaDetails(mediaId, userId);
    return details !== null;
  } catch (error) {
    return false;
  }
}
```

#### B. Verify Story by URL

**New Function**: Check if a specific media URL was published

```typescript
export async function verifyStoryByUrl(
  userId: string,
  mediaUrl: string
): Promise<InstagramStory | null> {
  const { stories } = await getRecentStories(userId, 25);
  return stories.find(s => s.media_url === mediaUrl) || null;
}
```

### API Limitations

⚠️ **Important Notes**:

1. **24-Hour Window**: Instagram Stories expire after 24 hours. The API can only retrieve stories posted within the last 24 hours.

2. **No Direct Story Endpoint**: Instagram Graph API doesn't have a dedicated `/stories` endpoint. We use `/media` and filter by timestamp.

3. **Rate Limits**:
   - 200 calls per hour per user (Graph API limit)
   - Use caching to reduce API calls

4. **Access Requirements**:
   - Requires Instagram Business Account
   - Requires valid access token with `instagram_basic` and `instagram_content_publish` permissions

### Sources

- [Instagram Graph API Guide 2026](https://elfsight.com/blog/instagram-graph-api-complete-developer-guide-for-2026/)
- [Instagram API Complete Guide 2026](https://tagembed.com/blog/instagram-api/)

---

## 3. Debugging Missing Stories on Instagram

### Common Causes

When stories don't appear on `@hehe_pl` profile after publishing:

#### A. Stories Expired (24-Hour Limit)

**Issue**: Instagram Stories automatically expire after 24 hours

**How to Check**:
```sql
-- Check publishing_logs for stories published >24h ago
SELECT
  created_at,
  ig_media_id,
  status,
  EXTRACT(HOUR FROM NOW() - created_at) as hours_ago
FROM publishing_logs
WHERE status = 'SUCCESS'
  AND post_type = 'STORY'
ORDER BY created_at DESC
LIMIT 10;
```

**Solution**: Only expect to see stories published within last 24 hours.

#### B. Publishing Failed Silently

**Issue**: Publish appeared to succeed but actually failed

**How to Check**:
```typescript
// In debug page after publishing
const logsSection = page.locator('text=Debug Logs').locator('..');
const logs = await logsSection.innerText();

// Look for error messages in logs
if (logs.includes('FAILED') || logs.includes('error')) {
  console.error('Publishing failed:', logs);
}
```

**Check Database**:
```sql
-- Recent publishing attempts
SELECT
  created_at,
  status,
  error_message,
  ig_media_id
FROM publishing_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

**Solution**: Check `publishing_logs` table for `status = 'FAILED'` and review `error_message`.

#### C. Instagram Processing Delay

**Issue**: Story published successfully but not visible yet

**Typical Delays**:
- Images: 5-15 seconds
- Videos: 30-90 seconds

**How to Check**:
```typescript
// Wait longer after publishing
await page.waitForTimeout(60000); // 60 seconds for videos

// Then verify
const storiesResponse = await request.get('/api/instagram/recent-stories');
```

**Solution**: Add longer timeouts for video verification in tests.

#### D. Token Expired or Invalid

**Issue**: Access token expired, publishing fails with error code 190

**How to Check**:
1. Go to `/debug` page
2. Look for "Token Expired" or red status
3. Check logs for error code 190

**Check Database**:
```sql
SELECT
  user_id,
  expires_at,
  expires_at < NOW() as is_expired
FROM linked_accounts
WHERE user_id = 'user-id-here';
```

**Solution**: Re-authenticate via `/api/auth/link-facebook`

#### E. Wrong Instagram Account

**Issue**: Publishing to wrong account or account not linked

**How to Check**:
```typescript
// In debug page, verify account name
await expect(page.locator('text=www_hehe_pl')).toBeVisible();
```

**Check Database**:
```sql
SELECT
  ig_username,
  ig_user_id
FROM linked_accounts
WHERE user_id = 'user-id-here';
```

**Solution**: Verify `ig_username` in database matches expected account.

### Debugging Workflow

**Step 1: Check Recent Publishing Logs**

```bash
# Open PostgreSQL console or run query via Supabase dashboard
SELECT
  created_at,
  user_id,
  media_url,
  status,
  error_message,
  ig_media_id,
  EXTRACT(HOUR FROM NOW() - created_at) as hours_ago
FROM publishing_logs
WHERE status = 'SUCCESS'
  AND post_type = 'STORY'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;
```

**Step 2: Verify Stories via API**

```bash
# Use Playwright test or curl
curl -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  http://localhost:3000/api/instagram/recent-stories?limit=10
```

**Step 3: Check Instagram Directly**

1. Open Instagram app or web
2. Go to `@hehe_pl` profile (or `@www_hehe_pl` for business)
3. Click profile picture to view stories
4. Stories expire after 24 hours automatically

**Step 4: Compare Timestamps**

```typescript
// Expected: Story published at 17:00
// Database: created_at = 2026-02-05 17:00:00

// Current time: 22:00 (5 hours later)
// Story should still be visible (within 24h window)

// Instagram API response:
const { stories } = await getRecentStories(userId);
const found = stories.find(s => s.id === expectedMediaId);

if (!found) {
  // Check if story expired
  const publishTime = new Date('2026-02-05 17:00:00');
  const now = new Date();
  const hoursAgo = (now - publishTime) / (1000 * 60 * 60);

  if (hoursAgo > 24) {
    console.log('Story expired (>24 hours old)');
  } else {
    console.log('Story missing - investigate publishing logs');
  }
}
```

### Troubleshooting Checklist

- [ ] Story was published within last 24 hours
- [ ] `publishing_logs` shows `status = 'SUCCESS'`
- [ ] Access token is valid (not expired)
- [ ] Correct Instagram account linked (`@www_hehe_pl`)
- [ ] Instagram API returns the media ID
- [ ] No error codes in logs (190, 100, 368)
- [ ] Waited sufficient time for processing (images: 15s, videos: 90s)

### E2E Test Best Practices

**1. Add Verification Step**

```typescript
test('publish and verify story appears', async ({ page, request }) => {
  // Publish story
  await publishStory(page, testImagePath);

  // Extract media ID
  const mediaId = await extractMediaId(page);

  // Wait for Instagram processing
  await page.waitForTimeout(15000); // 15 seconds

  // Verify via API
  const verified = await verifyStoryExists(request, mediaId);
  expect(verified).toBe(true);

  // Optional: Verify via recent stories
  const { stories } = await request.get('/api/instagram/recent-stories?limit=5');
  const found = stories.some(s => s.id === mediaId);
  expect(found).toBe(true);
});
```

**2. Handle 24-Hour De-duplication**

```typescript
// Check if meme was published recently
const wasPublishedRecently = await checkRecentPublish(request, testImagePath);

if (wasPublishedRecently) {
  console.warn('⚠️ Meme published in last 24h, skipping test');
  test.skip();
  return;
}
```

**3. Graceful Failure Handling**

```typescript
const successAlert = page.locator('text=Published Successfully!');
const failAlert = page.locator('text=Publish Failed');

await expect(successAlert.or(failAlert)).toBeVisible({ timeout: 60000 });

if (await failAlert.isVisible()) {
  const errorText = await page.locator('text=Publish Failed').locator('..').innerText();
  const logs = await page.locator('text=Debug Logs').locator('..').innerText();

  throw new Error(`Publishing failed: ${errorText}\nLogs: ${logs}`);
}
```

---

## Quick Reference

### Cron Testing Commands

```bash
# Local testing
curl http://localhost:3000/api/cron/process

# Production testing
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://your-app.vercel.app/api/cron/process

# E2E test
npx playwright test cron-debug.spec.ts
```

### Story Verification Endpoints

```bash
# Get recent stories (last 24h)
GET /api/instagram/recent-stories?limit=10

# Response:
{
  "stories": [
    {
      "id": "123456789",
      "media_type": "IMAGE",
      "media_url": "https://...",
      "timestamp": "2026-02-05T17:00:00Z",
      "username": "www_hehe_pl"
    }
  ],
  "count": 1
}
```

### Database Queries

```sql
-- Check recent publishing logs
SELECT * FROM publishing_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Check token expiry
SELECT user_id, expires_at, expires_at < NOW() as is_expired
FROM linked_accounts;

-- Count successful publishes in last 24h
SELECT COUNT(*) FROM publishing_logs
WHERE status = 'SUCCESS'
  AND post_type = 'STORY'
  AND created_at > NOW() - INTERVAL '24 hours';
```

---

## Next Steps

1. **Enhance Cron Testing**
   - Add integration tests for `processScheduledPosts()`
   - Create mock scenarios for edge cases
   - Set up production monitoring

2. **Improve Story Verification**
   - Add `verifyStoryExists()` helper function
   - Cache recent stories to reduce API calls
   - Add Sentry alerts for missing stories

3. **Better Debugging Tools**
   - Create `/debug/stories` page showing last 10 published
   - Add "Verify on Instagram" button in debug UI
   - Display publishing timeline in admin dashboard

4. **Documentation**
   - Update E2E test documentation
   - Create troubleshooting guide for production issues
   - Document Instagram API limitations
