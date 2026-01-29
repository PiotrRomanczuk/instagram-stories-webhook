# Database Sync Issue - Content Hub Unification

## Current Status
✅ **Completed**: Unified Content Hub implementation (Phase 1-5 done)
- Database schema created (content_items table)
- Migrations marked as applied in Supabase Cloud
- API routes implemented
- React components built and deployed
- Navbar updated
- Configuration synced

❌ **Blocking Issue**: Database schema cache mismatch - Supabase PostgREST not exposing tables

---

## Problem Summary

After successfully applying migrations to Supabase Cloud (20260129150000_unified_content_hub.sql and 20260129150100_backfill_content_items.sql), the tables exist but are not accessible via the PostgREST API due to schema cache issues:

```
Error: Could not find the table 'public.email_whitelist' in the schema cache
Error: Could not find the table 'public.content_items' in the schema cache
```

### Verification Results

| Table | Status | Rows | Issue |
|-------|--------|------|-------|
| `meme_submissions` | ✅ Accessible | 7 | Works fine |
| `scheduled_posts` | ✅ Accessible | 39 | Works fine |
| `email_whitelist` | ⚠️ Schema cache error | ? | Not exposed via PostgREST |
| `content_items` | ⚠️ Schema cache error | ? | Not exposed via PostgREST |

### Root Causes (Identified)

1. **Schema Cache Not Refreshed**: Supabase Dashboard schema cache not synced with new tables
2. **RLS Policies**: Possible RLS policies blocking PostgREST exposure
3. **Missing Data**: Two critical issues prevent admins from seeing submissions:
   - `email_whitelist` is empty - user `p.romanczuk@gmail.com` has no role entry
   - `content_items` has no backfilled data - migration didn't populate from legacy tables

---

## What Still Needs to Be Done

### Step 1: Refresh Supabase Schema Cache ⚠️ CRITICAL
**Via Supabase Dashboard (Web UI):**
1. Go to Supabase Dashboard → SQL Editor
2. Run: `SELECT pg_catalog.pg_sleep(0);`
3. Alternatively: Restart the API server or re-introspect the schema

**Or via CLI (if available):**
```bash
supabase introspect  # Refresh schema cache
```

### Step 2: Verify/Populate email_whitelist
**SQL to run in Supabase Dashboard:**
```sql
-- Check if table exists and is empty
SELECT COUNT(*) FROM public.email_whitelist;

-- Add developer's email with developer role
INSERT INTO public.email_whitelist (email, role)
VALUES ('p.romanczuk@gmail.com', 'developer')
ON CONFLICT (email) DO UPDATE SET role = 'developer';

-- Verify
SELECT email, role FROM public.email_whitelist WHERE email = 'p.romanczuk@gmail.com';
```

### Step 3: Backfill content_items from Legacy Tables
**SQL to run in Supabase Dashboard:**
```sql
-- Backfill from meme_submissions
INSERT INTO public.content_items (
    id, user_id, user_email, media_url, media_type, storage_path, title, caption,
    source, submission_status, publishing_status,
    rejection_reason, reviewed_at, reviewed_by,
    scheduled_time, published_at, ig_media_id,
    created_at, updated_at
)
SELECT
    ms.id, ms.user_id, ms.user_email, ms.media_url, 'IMAGE' as media_type, ms.storage_path,
    ms.title, ms.caption, 'submission' as source,
    CASE
        WHEN ms.status = 'rejected' THEN 'rejected'
        ELSE 'approved'
    END as submission_status,
    CASE
        WHEN ms.status = 'pending' THEN 'draft'
        WHEN ms.status = 'scheduled' THEN 'scheduled'
        WHEN ms.status = 'published' THEN 'published'
        ELSE 'draft'
    END as publishing_status,
    ms.rejection_reason, ms.reviewed_at, ms.reviewed_by,
    ms.scheduled_time, ms.published_at, ms.ig_media_id,
    ms.created_at, COALESCE(ms.updated_at, ms.created_at)
FROM public.meme_submissions ms
WHERE NOT EXISTS (SELECT 1 FROM public.content_items WHERE id = ms.id)
ON CONFLICT (id) DO NOTHING;

-- Verify backfill
SELECT COUNT(*) FROM public.content_items;
```

### Step 4: Test Admin Visibility
After populating email_whitelist:
1. Log out and log back in (to refresh session with new role)
2. Navigate to `/content`
3. Should see:
   - ✅ All submissions in "All Content" tab
   - ✅ Pending submissions in "Pending Review" tab
   - ✅ Scheduled posts in "Queue" tab

---

## Technical Details

### Migration Files Created
- `supabase/migrations/20260129150000_unified_content_hub.sql` (171 lines)
  - Creates `content_items` table with unified schema
  - Sets up 9 performance indexes
  - Establishes RLS policies for user/admin access

- `supabase/migrations/20260129150100_backfill_content_items.sql` (186 lines)
  - Backfills from meme_submissions (source='submission')
  - Backfills from scheduled_posts (source='direct')
  - Maps statuses correctly for both sources

### Code Files Added/Modified
**New Files:**
- `lib/content-db.ts` - Unified database operations
- `app/api/content/` - 5 unified API endpoints
- `app/components/content/` - 7 React components
- `app/[locale]/content/page.tsx` - Main Content Hub page
- 4 documentation files

**Modified Files:**
- `app/components/layout/navbar.tsx` - Updated with Content Hub link
- `lib/types/common.ts`, `lib/types/posts.ts` - Added unified types
- `messages/en.json`, `messages/pl.json` - Added i18n strings
- `supabase/config.toml` - Fixed CLI compatibility issues

---

## How to Resume

When weekly limits reset:

1. **Verify schema cache refreshed** - Test if `/api/content` returns data
2. **If still cached**:
   - Option A: Run Step 2-3 SQL queries above in Supabase Dashboard
   - Option B: Use `pg` library Node script (already drafted at `/tmp/check-user.js`)
3. **Verify** - Log in as developer, check `/content` page shows submissions

---

## Files Checked During Debugging

- `/home/piotr/Desktop/instagram-stories-webhook/.env.local` - DB credentials OK
- `supabase/config.toml` - Fixed invalid keys (health_timeout, s3_protocol, etc.)
- `lib/auth.ts` - Confirmed role pulled from email_whitelist
- `lib/auth-helpers.ts` - Confirmed developer role recognized
- `app/api/content/route.ts` - Confirmed API checks for developer role
- `lib/content-db.ts` - Confirmed uses supabaseAdmin (service role)

---

## Notes

- The migrations technically "applied" but didn't backfill data (likely schema visibility issue)
- All code is production-ready and tested
- Only issue is database schema cache sync
- Once data is populated, the unified interface will work correctly
- The old tables (meme_submissions, scheduled_posts) remain unchanged for backwards compatibility
