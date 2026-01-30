# Unified Content Hub Migration Guide

## Overview

This document outlines the migration from separate meme submissions, scheduling, and admin interfaces to a unified **Content Hub** at `/content`.

## What Changed

### Before (Three Separate Interfaces)
- `/memes` - User meme submissions
- `/schedule` - Direct post scheduling
- `/admin/memes` - Admin review and queue management

### After (Unified Interface)
- `/content` - Single hub for all content management with tabs:
  - **All Content** - Everything (submissions + direct)
  - **Pending Review** (Admin only) - Submissions awaiting approval
  - **Queue** - Scheduled and processing items
  - **Published** - Historical published content

## Database Changes

### New Table: `content_items`

The new unified table consolidates data from:
- `meme_submissions` (community submissions)
- `scheduled_posts` (direct scheduling)

**Key Fields:**
- `source: 'submission' | 'direct'` - Tracks where content originated
- `submission_status: 'pending' | 'approved' | 'rejected'` - Only for submissions
- `publishing_status: 'draft' | 'scheduled' | 'processing' | 'published' | 'failed'` - All content
- Dual-status workflow supports both submission review and publishing

**Migration Process:**
1. Run migrations:
   ```bash
   supabase migration up
   ```
   - Creates `content_items` table
   - Backfills data from existing tables
   - Adds reference columns to old tables for compatibility

2. New data is written to `content_items`
3. Old tables remain for backwards compatibility (3-month deprecation window)

## API Changes

### New Endpoints

All new endpoints are under `/api/content`:

```
GET  /api/content                    - List items with filters/pagination
POST /api/content                    - Create new item
GET  /api/content/[id]              - Get single item
PATCH /api/content/[id]             - Update item
DELETE /api/content/[id]            - Delete item
POST /api/content/[id]/review       - Approve/reject submission (admin)
POST /api/content/[id]/schedule     - Set scheduled time
POST /api/content/bulk              - Bulk approve/reject
PATCH /api/content/bulk             - Bulk update (reordering, etc.)
```

**Query Parameters for GET /api/content:**
- `tab: 'all' | 'review' | 'queue' | 'published'`
- `source: 'submission' | 'direct' | 'all'`
- `submissionStatus: 'pending' | 'approved' | 'rejected' | 'all'`
- `publishingStatus: 'draft' | 'scheduled' | 'processing' | 'published' | 'failed' | 'all'`
- `search: string` - Search in caption/title
- `sortBy: 'newest' | 'oldest' | 'schedule-asc'`
- `page: number, limit: number` - Pagination

### Old Endpoints (Deprecated)

Old endpoints still work but are marked for deprecation:
- `/api/memes` - Migrate to `/api/content?source=submission`
- `/api/schedule` - Migrate to `/api/content?tab=queue`
- `/api/memes/bulk` - Migrate to `/api/content/bulk`

**Timeline:**
- Now (2026-01-29): New endpoints available, old endpoints work
- March 1, 2026: Deprecation warnings added to old endpoints
- April 1, 2026: Old endpoints disabled

## Frontend Changes

### Pages

**New Pages:**
- `/content` - Main unified hub (recommended)

**Existing Pages (Still Work):**
- `/memes` - Redirects to `/content?tab=all&source=submission` (future)
- `/schedule` - Redirects to `/content?tab=queue` (future)
- `/admin/memes` - Redirects to `/content?tab=review` (future)

### Components

**New Components:**
- `ContentHub` - Main orchestrator
- `ContentFilters` - Unified filtering/searching
- `ContentList` - Multi-view list renderer (grid/list/queue)
- `ContentCard` - Individual item card
- `ContentPreviewModal` - Preview + details + timeline
- `ContentEditModal` - Edit modal with optimistic locking
- `ContentSubmitForm` - Create new content

**Old Components (Still Exist):**
- `MemesDashboard` - Now wraps ContentHub with backwards-compat tab
- `ScheduleManager` - Now wraps ContentHub with queue tab
- Other old components remain for backwards compatibility

## Type Changes

### New Types

```typescript
type ContentSource = 'submission' | 'direct'
type SubmissionStatus = 'pending' | 'approved' | 'rejected'
type PublishingStatus = 'draft' | 'scheduled' | 'processing' | 'published' | 'failed'

interface ContentItem {
  id: string
  userId: string
  userEmail: string
  mediaUrl: string
  mediaType: 'IMAGE' | 'VIDEO'
  title?: string
  caption?: string
  userTags?: UserTag[]
  source: ContentSource
  submissionStatus?: SubmissionStatus
  publishingStatus: PublishingStatus
  // ... more fields
}
```

### Mapping

Old types still work:
- `MemeSubmission` maps to `ContentItem` with `source='submission'`
- `ScheduledPost` maps to `ContentItem` with `source='direct'`

## Migration Path for Users

### Phase 1: Try It (Now)
- New `/content` page is available
- Old pages `/memes`, `/schedule` still work
- Test the new interface with a small group

### Phase 2: Encourage Migration (Feb)
- Add banner on old pages: "Content Hub is now available at /content"
- Keep both running in parallel

### Phase 3: Redirect Old Routes (March)
- `/memes` redirects to `/content?tab=all&source=submission`
- `/schedule` redirects to `/content?tab=queue`
- `/admin/memes` redirects to `/content?tab=review`

### Phase 4: Deprecate (April)
- Old endpoints return deprecation warnings
- Old tables archived (copies in `_archive` schema)

## Feature Parity

All features from old interfaces are available in Content Hub:

✅ **From `/memes`:**
- Submit meme
- View own submissions
- Edit title/caption
- Delete pending submissions
- Admin: approve/reject
- Admin: schedule meme
- Admin: bulk operations
- Search & filter
- Card/List view toggle

✅ **From `/schedule`:**
- Create direct post
- View scheduled queue
- Edit caption/time
- Drag-drop reordering
- Quick reschedule buttons
- Delete scheduled post
- Search & filter
- Grid/List view

✅ **From `/admin/memes`:**
- View all submissions
- Review queue (pending)
- Approve/reject with reason
- Bulk approve/reject
- Schedule approved memes
- Queue builder
- User filtering (admin)
- Advanced filters

✅ **New in Content Hub:**
- Unified interface for all content
- Single queue for all scheduled items
- Role-aware actions
- Combined statistics dashboard
- Better UX for multi-source workflows

## Rollback Plan

If issues arise:

1. **Kill Feature Flag** (fast):
   ```
   NEXT_PUBLIC_ENABLE_UNIFIED_CONTENT_HUB=false
   ```
   - Reverts UI to old components
   - Users still see old pages
   - New API still works (for testing)

2. **Disable New API** (slower):
   - Remove new endpoint handlers
   - Revert to old endpoints only
   - Database changes are backwards compatible

3. **Full Rollback** (slowest):
   - Archive `content_items` table
   - Users go back to old tables
   - Restore from pre-migration backup if needed

## Troubleshooting

### Issues with New API

**Problem:** Getting 404 on `/api/content`
- **Solution:** Ensure migrations ran: `supabase migration up`

**Problem:** Old endpoints not found
- **Solution:** They're proxied through new endpoints - check feature flag

**Problem:** Data duplication after migration
- **Solution:** Normal - backfill creates content_items, old tables still populated

### Issues with UI

**Problem:** Can't see items in Content Hub
- **Solution:** Check filters - may be filtering by role/source

**Problem:** Bulk operations not working
- **Solution:** Ensure no more than 100 items selected

**Problem:** Modal won't close
- **Solution:** Check browser console for errors

## Support

For issues:
1. Check `/debug` page for diagnostic info
2. Review browser console for errors
3. Check Supabase logs for API errors
4. Contact team with:
   - What you were doing
   - Error message (if any)
   - Browser/device info

## Questions?

See `/lib/content-db.ts` for database operations
See `/app/api/content/` for API implementation
See `/app/components/content/` for UI components
See `/lib/types/posts.ts` for type definitions
