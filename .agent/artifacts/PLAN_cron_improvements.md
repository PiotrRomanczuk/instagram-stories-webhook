# Scheduled Posts Cron Implementation Plan

## 🔴 Current Problem

The scheduled posts are stuck in "Processing" status because **nothing is triggering the `/api/schedule/process` endpoint**.

### Root Causes
1. **No Auto-Processing**: The Next.js app does not have a built-in background worker or polling mechanism.
2. **Missing `CRON_SECRET`**: The environment variable for securing cron calls is not defined, which could block calls (though currently the check allows undefined).
3. **External Dependency**: The system relies on an *external caller* (crontab, Vercel Cron, GitHub Actions) to trigger the endpoint.

---

## ✅ Solution Options

### Option A: Client-Side Auto-Polling (Quick Fix for Development)

**Description**: Use the dashboard's `useSchedulePosts` hook to also trigger `process` endpoint periodically.

**Pros**:
- Zero infrastructure changes
- Works immediately in dev

**Cons**:
- Only works when dashboard is open
- Not reliable for production

**Implementation**:
```typescript
// In useSchedulePosts.ts, add:
useEffect(() => {
    const interval = setInterval(async () => {
        await fetch('/api/schedule/process');
        fetchPosts();
    }, 60000); // Every 60 seconds

    return () => clearInterval(interval);
}, [fetchPosts]);
```

---

### Option B: Vercel Cron (Production - Recommended for Vercel Hosting)

**Description**: Use Vercel's built-in cron functionality.

**Implementation**:
1. Create `vercel.json` in project root:
```json
{
  "crons": [
    {
      "path": "/api/schedule/process",
      "schedule": "* * * * *"
    }
  ]
}
```
2. Add `CRON_SECRET` to Vercel environment variables.
3. The endpoint already checks for `Authorization: Bearer <CRON_SECRET>`.

**Pros**:
- Native Vercel integration
- Reliable, serverless

**Cons**:
- Requires Vercel Pro plan for sub-minute schedules
- Only works on Vercel

---

### Option C: System Crontab (Production - Raspberry Pi / Self-Hosted)

**Description**: Use the host machine's crontab to call the endpoint.

**Implementation** (already documented in `docs/PI_DEPLOYMENT.md`):
```bash
# In crontab -e:
* * * * * curl -X GET "http://localhost:3000/api/schedule/process" -H "Authorization: Bearer <CRON_SECRET>"
```

**Pros**:
- Works on any Linux server
- Very reliable

**Cons**:
- Requires server access
- Manual setup

---

### Option D: Supabase Edge Functions + pg_cron (Advanced)

**Description**: Use Supabase's database-level cron to call a Supabase Edge Function that triggers the endpoint.

**Implementation**:
1. Create a Supabase Edge Function that calls your app's API.
2. Use `pg_cron` extension in Supabase to schedule it.

**Pros**:
- Fully serverless
- Database-native

**Cons**:
- More complex setup
- Adds Supabase dependency for scheduling

---

## 📌 Recommended Path Forward

### For Immediate Development Testing:
1. Add `CRON_SECRET` to `.env.local`
2. Implement **Option A** (client-side polling) for easy testing

### For Production:
1. **If using Vercel**: Implement **Option B**
2. **If self-hosting (Pi)**: Implement **Option C**

---

## 🛠️ Implementation Steps

### Step 1: Add `CRON_SECRET` to Environment
```env
# Cron Security
CRON_SECRET="your-secure-random-string-here"
```

### Step 2: Implement Development Auto-Polling
Modify `app/components/schedule/use-schedule-posts.ts` to include auto-processing.

### Step 3: Update Production Deployment
- Add `vercel.json` for Vercel Cron, OR
- Ensure crontab is configured on Pi

### Step 4: Add Health Monitoring (Optional)
Create a simple logging mechanism to track when cron runs and if there were errors.

---

## 🔧 Additional Improvements

1. **Retry Logic**: If a post fails, retry once after 5 minutes before marking as failed.
2. **Stale Detection**: Mark posts older than 24 hours as "stale" instead of trying to publish.
3. **Notification System**: Send email/webhook on publish success/failure.
4. **Metrics Dashboard**: Show cron run history and success rates.

---

## Files to Modify

| File | Change |
|------|--------|
| `.env.local` | Add `CRON_SECRET` |
| `app/components/schedule/use-schedule-posts.ts` | Add dev auto-polling |
| `vercel.json` (new) | Add Vercel cron config |
| `/api/schedule/process/route.ts` | Add logging/metrics |

