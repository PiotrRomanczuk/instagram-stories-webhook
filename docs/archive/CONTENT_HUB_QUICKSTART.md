# Content Hub Quick Start Guide

## 🚀 Getting Started with the Unified Content Hub

### For Users

#### Access the Content Hub
1. Navigate to `/content` in your app
2. You'll see 4 tabs:
   - **All Content** - View all your submissions and posts
   - **Pending Review** (admin only) - Review user submissions
   - **Queue** - Manage scheduled posts
   - **Published** - View published content

#### Create a New Submission
1. Click **"New Post"** button
2. Select "Community Submission"
3. Paste media URL
4. Add title (optional) and caption
5. Click **"Submit"**
6. Your submission appears in "All Content" with "pending" status
7. Admin will review and approve/reject

#### Edit Your Submission
1. Find your submission in "All Content"
2. Click **"Edit"**
3. Change caption or title
4. Click **"Save Changes"**
5. Changes saved with new version

#### Delete Your Submission
1. Find your pending submission
2. Click **"More"** (⋮) menu
3. Click **"Delete"**
4. Confirm deletion
5. Can only delete draft or pending submissions

#### Preview & Details
1. Click any item card or **"Preview"** button
2. See full image/video
3. View timeline of status changes
4. See all metadata
5. Close with **"Close"** button

---

### For Admins

#### Review Submissions
1. Go to `/content`
2. Click **"Pending Review"** tab
3. See pending submissions with count badge
4. Click submission to preview
5. Click **"Edit"** to approve/reject dialog

#### Approve Submission
1. Preview submission
2. Click **"Approve"**
3. Submission moves to "approved" status
4. Now ready to schedule

#### Reject Submission
1. Preview submission
2. Click **"Reject"**
3. Enter rejection reason
4. Submit
5. User notified (if enabled)

#### Schedule Content
1. Find approved submission or create direct post
2. Click **"Schedule"**
3. Set date and time (must be future)
4. Submit
5. Item moves to "Queue" tab

#### Manage Queue
1. Go to **"Queue"** tab
2. See all scheduled/processing items
3. Click **"Queue"** view icon to see drag handles
4. Drag items to reorder
5. Times automatically recalculated

#### View Stats
1. Go to `/content`
2. See dashboard cards showing:
   - Total submissions
   - Pending review count (red badge if > 0)
   - Published count
   - Failed count

#### Bulk Operations
1. Select multiple items (checkboxes if implemented)
2. Click **"Bulk Approve"** or **"Bulk Reject"**
3. Enter reason (if rejecting)
4. All items updated at once

---

## 📱 UI Guide

### Tabs
| Tab | Who Sees | Shows | Purpose |
|-----|----------|-------|---------|
| All Content | Everyone | Everything | Browse all content |
| Pending Review | Admin only | Unapproved submissions | Review workflow |
| Queue | Everyone | Scheduled & processing | Schedule management |
| Published | Everyone | Published items | History & metrics |

### View Modes
| Mode | Best For | Features |
|------|----------|----------|
| Grid | Browsing | Thumbnails, cards |
| List | Details | Table, sortable |
| Queue | Reordering | Drag handles |

### Filters
- **Search:** Type in search box to find by caption/title
- **Source:** Filter submissions vs direct posts
- **Status:** Filter by submission or publishing status
- **Sort:** Newest, oldest, or schedule time
- **Advanced:** Click "Advanced Filters" for more options

### Status Badges
| Badge | Meaning | Can Edit | Can Delete |
|-------|---------|----------|-----------|
| pending (yellow) | Awaiting review | ✓ | ✓ |
| approved (green) | Ready to schedule | ✓ | ✗ |
| scheduled (blue) | In queue | ✓ | ✗ |
| processing (orange) | Being published | ✗ | ✗ |
| published (green) | Live on Instagram | ✗ | ✗ |
| rejected (red) | Not approved | ✗ | ✓ |
| failed (red) | Error publishing | ✗ | ✓ |

---

## 🛠 For Developers

### Installation

1. **Run migrations:**
   ```bash
   supabase migration up
   ```
   Creates `content_items` table and backfills data

2. **Install dependencies:** (if needed)
   ```bash
   npm install
   ```

3. **Run tests:**
   ```bash
   npm run test
   ```

4. **Start dev server:**
   ```bash
   npm run dev
   ```

5. **Access at:** `http://localhost:3000/content`

### Key Files

**Database:**
- `lib/content-db.ts` - All database operations
- `supabase/migrations/` - Schema & backfill

**API:**
- `app/api/content/` - All endpoints
- `app/api/content/route.ts` - Main GET/POST
- `app/api/content/[id]/` - Individual item ops

**Components:**
- `app/components/content/` - All UI components
- `content-hub.tsx` - Main orchestrator

**Types:**
- `lib/types/posts.ts` - Data models
- `lib/types/common.ts` - Enums & types

### Common Tasks

#### List Content Items
```typescript
import { getContentItems } from '@/lib/content-db';

const { items, total } = await getContentItems({
  userId: 'user-123',
  source: 'submission',
  publishingStatus: 'scheduled',
  limit: 20,
  offset: 0,
});
```

#### Create Item
```typescript
import { createContentItem } from '@/lib/content-db';

const item = await createContentItem('user-123', 'user@example.com', {
  source: 'submission',
  mediaUrl: 'https://example.com/image.jpg',
  mediaType: 'IMAGE',
  caption: 'My meme!',
});
```

#### Update Item
```typescript
import { updateContentItem } from '@/lib/content-db';

const updated = await updateContentItem(
  'item-id',
  { caption: 'Updated caption' },
  currentVersion // For optimistic locking
);
```

#### Approve Submission
```typescript
import { updateSubmissionStatus } from '@/lib/content-db';

const approved = await updateSubmissionStatus(
  'item-id',
  'approved',
  undefined,
  'admin-user-id'
);
```

#### Schedule Item
```typescript
import { updateScheduledTime } from '@/lib/content-db';

const scheduled = await updateScheduledTime(
  'item-id',
  Date.now() + 3600000 // 1 hour from now
);
```

### API Endpoints

**List Content:**
```bash
GET /api/content?tab=all&page=1&limit=20&source=submission
```

**Create Content:**
```bash
POST /api/content
{
  "source": "submission",
  "mediaUrl": "https://example.com/image.jpg",
  "mediaType": "IMAGE",
  "caption": "My meme!"
}
```

**Get Single Item:**
```bash
GET /api/content/item-id
```

**Update Item:**
```bash
PATCH /api/content/item-id
{
  "caption": "Updated",
  "version": 1
}
```

**Delete Item:**
```bash
DELETE /api/content/item-id
```

**Approve/Reject:**
```bash
POST /api/content/item-id/review
{
  "action": "approve"
}
```

**Schedule:**
```bash
POST /api/content/item-id/schedule
{
  "scheduledTime": 1234567890
}
```

**Bulk Operations:**
```bash
POST /api/content/bulk
{
  "action": "approve",
  "ids": ["id1", "id2"]
}
```

### Testing

**Run tests:**
```bash
npm run test
```

**Run specific test:**
```bash
npm run test -- content-db.test.ts
```

**Check types:**
```bash
npx tsc --noEmit
```

**Lint:**
```bash
npm run lint
```

### Debugging

**Check database:**
- Use Supabase dashboard SQL editor
- Query: `SELECT COUNT(*) FROM content_items;`

**Check API:**
- Use browser DevTools Network tab
- Check `/api/content` requests

**Check errors:**
- Browser console for client errors
- Vercel logs for server errors
- Sentry for error tracking

---

## 📚 Further Reading

- **User Guide:** See `CONTENT_HUB_MIGRATION.md`
- **QA Checklist:** See `CONTENT_HUB_VERIFICATION.md`
- **Full Implementation:** See `IMPLEMENTATION_SUMMARY.md`

---

## ❓ FAQ

**Q: Where did my old submissions go?**
A: They're in the same `content_items` table now. Refresh the page and look in "All Content" tab.

**Q: Can I schedule multiple posts at once?**
A: Not in bulk, but you can reorder them in the Queue tab.

**Q: What happens if my submission is rejected?**
A: You'll see it in "All Content" with "rejected" status and see the rejection reason.

**Q: Can I reschedule a post?**
A: Yes! Click edit in the modal and change the scheduled time.

**Q: Why can't I edit published content?**
A: Published content is live on Instagram. Make a new post instead.

**Q: How do I see stats?**
A: On the main `/content` page as an admin, you'll see stats cards at the top.

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Items not showing | Try refresh, check filters |
| Can't edit item | Item must be draft or scheduled, not published |
| Version conflict | Refresh and try editing again |
| Can't delete | Item must be draft or pending |
| Slow loading | Reduce page size in filters |
| Search not working | Try different keywords |

---

**Ready to use? Go to `/content` now!** 🎉
