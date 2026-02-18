# Content Hub Verification & Testing Plan

## Pre-Launch Checklist

### 1. Database Migration ✅
- [ ] Migration files created and numbered correctly
  - `20260129150000_unified_content_hub.sql` - Schema creation
  - `20260129150100_backfill_content_items.sql` - Data migration
- [ ] Supabase migration ran successfully: `supabase migration up`
- [ ] All indexes created successfully
- [ ] RLS policies enabled and working
- [ ] Backfill validation function returns 100% match
- [ ] No orphaned records after migration
- [ ] Content count matches: meme_submissions + scheduled_posts = content_items

### 2. Type Definitions ✅
- [ ] New types added to `lib/types/common.ts`
  - `ContentSource`, `SubmissionStatus`, `PublishingStatus`
- [ ] New types added to `lib/types/posts.ts`
  - `ContentItem`, `ContentItemRow`, `CreateContentInput`, `UpdateContentInput`
- [ ] Mapping function `mapContentItemRow` implemented
- [ ] All old types still work (backwards compatibility)
- [ ] No TypeScript errors: `npx tsc --noEmit`

### 3. Database Utilities ✅
- [ ] `lib/content-db.ts` created with all functions
  - `getContentItems` - fetching with filters
  - `getContentItemById` - single item fetch
  - `createContentItem` - create new item
  - `updateContentItem` - update with optimistic locking
  - `updateSubmissionStatus` - approve/reject
  - `updatePublishingStatus` - publishing workflow
  - `updateScheduledTime` - scheduling
  - `deleteContentItem` - deletion
  - `bulkUpdateSubmissionStatus` - bulk ops
  - `reorderScheduledItems` - queue reordering
  - `getContentStats` - admin stats
  - `getReviewQueue` - pending submissions
  - `getScheduledItems` - scheduled content
- [ ] All functions have proper error handling
- [ ] All functions return correct types
- [ ] Optimistic locking works (version checking)
- [ ] All queries use proper indexes

### 4. API Routes ✅
- [ ] `app/api/content/route.ts` - main endpoint
  - `GET /api/content` - list with tab filtering
  - `POST /api/content` - create new item
- [ ] `app/api/content/[id]/route.ts` - single item
  - `GET /api/content/[id]` - fetch single
  - `PATCH /api/content/[id]` - update with version checking
  - `DELETE /api/content/[id]` - delete
- [ ] `app/api/content/[id]/review/route.ts` - approval workflow
  - `POST /api/content/[id]/review` - approve/reject with admin check
- [ ] `app/api/content/[id]/schedule/route.ts` - scheduling
  - `POST /api/content/[id]/schedule` - set schedule time with future validation
- [ ] `app/api/content/bulk/route.ts` - bulk operations
  - `POST /api/content/bulk` - bulk approve/reject
  - `PATCH /api/content/bulk` - bulk update/reorder
- [ ] All endpoints validate auth (401 Unauthorized)
- [ ] All endpoints check permissions (403 Forbidden)
- [ ] All endpoints validate input (400 Bad Request)
- [ ] All endpoints handle errors gracefully (500 Server Error)
- [ ] All endpoints return correct status codes
- [ ] Rate limiting applied consistently

### 5. React Components ✅
- [ ] `app/components/content/content-hub.tsx` - main orchestrator
  - [ ] Renders all tabs correctly
  - [ ] Handles tab switching
  - [ ] Shows statistics (admin only)
  - [ ] Manages all state correctly
  - [ ] Loads data via API
- [ ] `app/components/content/content-filters.tsx` - unified filtering
  - [ ] Search box works
  - [ ] Filter dropdowns work
  - [ ] View mode toggles work
  - [ ] Reset filters works
  - [ ] Conditional filters based on tab
- [ ] `app/components/content/content-list.tsx` - multi-view list
  - [ ] Grid view renders correctly
  - [ ] List view renders correctly
  - [ ] Queue view renders correctly
  - [ ] Responsive layout works
- [ ] `app/components/content/content-card.tsx` - individual item
  - [ ] Shows thumbnail
  - [ ] Shows badges (source, status)
  - [ ] Shows actions
  - [ ] Responsive design
- [ ] `app/components/content/content-preview-modal.tsx` - preview
  - [ ] Shows image/video
  - [ ] Shows story frame option
  - [ ] Shows user tags (if present)
  - [ ] Shows timeline with statuses
  - [ ] Shows metadata
  - [ ] Shows actions
- [ ] `app/components/content/content-edit-modal.tsx` - edit form
  - [ ] Editable fields: title, caption, scheduled time
  - [ ] Optimistic locking version checking
  - [ ] Character counters
  - [ ] Error handling
  - [ ] Loading state
- [ ] `app/components/content/content-submit-form.tsx` - creation
  - [ ] Form validation
  - [ ] Media type selection
  - [ ] Source selection
  - [ ] File upload handling
  - [ ] Success/error feedback
- [ ] No console errors
- [ ] No TypeScript errors in components

### 6. Pages & Routing ✅
- [ ] `app/[locale]/content/page.tsx` created
  - [ ] Loads ContentHub component
  - [ ] Accepts tab query parameter
  - [ ] Page renders without errors
- [ ] Old pages still work
  - [ ] `/memes` still loads (no breakage)
  - [ ] `/schedule` still loads (no breakage)
  - [ ] `/admin/memes` still loads (no breakage)

### 7. Tests ✅
- [ ] Unit tests written for `content-db.ts`
- [ ] Integration tests written for API routes
- [ ] All tests pass: `npm run test`
- [ ] No TypeScript errors: `npx tsc`
- [ ] Linting passes: `npm run lint`

### 8. Documentation ✅
- [ ] Migration guide created (`CONTENT_HUB_MIGRATION.md`)
- [ ] Verification checklist created (`CONTENT_HUB_VERIFICATION.md`)
- [ ] API documentation updated
- [ ] Code comments added where necessary

---

## Manual Testing Checklist

### User Submission Workflow
- [ ] **Create Submission**
  1. Go to `/content`
  2. Click "New Post"
  3. Select "Community Submission"
  4. Upload image URL
  5. Add title and caption
  6. Submit
  7. Verify: Item appears in "All Content" tab with status "draft"
  8. Verify: Submission badge shows "Submission"
  9. Verify: submission_status = "pending"

- [ ] **User Views Own Submissions**
  1. Go to `/content`
  2. Filter source = "Submission"
  3. See all own submissions
  4. Verify: Only own submissions visible (not others')
  5. Verify: Can see all statuses (pending, approved, rejected, published)

- [ ] **User Edits Draft Submission**
  1. Find a draft submission
  2. Click "Edit"
  3. Change caption
  4. Verify: Version number increases (optimistic locking)
  5. Verify: Updated_at timestamp changes
  6. Try to edit after someone else edited: Should get conflict error

- [ ] **User Deletes Pending Submission**
  1. Find pending submission
  2. Click delete in actions
  3. Confirm deletion
  4. Verify: Item removed from list
  5. Try to delete published: Should fail with error

### Admin Review Workflow
- [ ] **View Pending Submissions**
  1. Log in as admin
  2. Go to `/content`
  3. Click "Pending Review" tab
  4. See only pending submissions
  5. Verify: submission_status = "pending"
  6. Verify: Count badge shows pending count

- [ ] **Approve Submission**
  1. Click submission
  2. Preview opens
  3. Click "Edit" or action to approve
  4. Submit approval
  5. Verify: submission_status changes to "approved"
  6. Verify: reviewed_at and reviewed_by populated
  7. Verify: Item moves to "All Content" tab

- [ ] **Reject Submission**
  1. Click submission
  2. Click action to reject
  3. Enter rejection reason
  4. Submit
  5. Verify: submission_status changes to "rejected"
  6. Verify: rejection_reason saved
  7. Verify: User notified (if notifications enabled)

- [ ] **Bulk Approve**
  1. Select multiple pending submissions
  2. Click "Bulk Approve"
  3. Verify: All selected submissions updated
  4. Verify: All now in "approved" status

- [ ] **Bulk Reject**
  1. Select multiple submissions
  2. Click "Bulk Reject"
  3. Enter reason
  4. Verify: All rejected with reason

### Direct Scheduling Workflow
- [ ] **Create Direct Post (Admin)**
  1. Log in as admin
  2. Go to `/content`
  3. Click "New Post"
  4. Select "Direct Schedule"
  5. Add media URL, caption
  6. Set scheduled time (future)
  7. Submit
  8. Verify: source = "direct"
  9. Verify: No submission_status (null)
  10. Verify: publishing_status = "scheduled"

- [ ] **User Cannot Create Direct Posts**
  1. Log in as non-admin user
  2. Click "New Post"
  3. Try to select "Direct Schedule"
  4. Verify: Option disabled or error message

### Queue Management
- [ ] **View Scheduled Queue**
  1. Go to `/content`
  2. Click "Queue" tab
  3. See all items with publishing_status = "scheduled"
  4. Can be from submissions or direct posts
  5. Listed by scheduled_time ascending

- [ ] **Reorder Queue**
  1. Click "Queue" tab
  2. Switch to "Queue" view mode (drag handles)
  3. Drag items to reorder
  4. Verify: Times recalculated (±2 hours from each other)
  5. Verify: API call successful
  6. Refresh page: Order persists

- [ ] **Reschedule Item**
  1. Click item in queue
  2. Edit modal opens
  3. Change scheduled time
  4. Save
  5. Verify: scheduled_time updated
  6. Verify: Item may move in queue

- [ ] **Quick Reschedule**
  1. If implemented: Click ±15m, ±1h buttons
  2. Verify: Time adjusted
  3. Verify: Item reordered in queue

### Publishing & History
- [ ] **Published Tab**
  1. Go to `/content`
  2. Click "Published" tab
  3. See items with publishing_status = "published"
  4. Verify: Date filtering works
  5. Verify: Can view insights (if implemented)

- [ ] **Failed Items**
  1. Check for items with publishing_status = "failed"
  2. Verify: error_message visible
  3. Verify: Can reschedule or delete

### Admin Dashboard Stats
- [ ] **Stats Display (Admin)**
  1. Log in as admin
  2. Go to `/content`
  3. See dashboard stats:
     - Total submissions
     - Pending review
     - Published
     - Failed
  4. Verify: Numbers match database
  5. Click on stat: Filters by that status

### Filters & Search
- [ ] **Text Search**
  1. Enter text in search box
  2. Verify: Results filtered by caption/title
  3. Works across tabs
  4. Case-insensitive

- [ ] **Source Filter**
  1. Filter by "Submission"
  2. Verify: Only submissions show
  3. Filter by "Direct"
  4. Verify: Only direct posts show

- [ ] **Status Filter**
  1. Filter by "Published"
  2. Verify: Only published items
  3. Filter by "Pending Review" (admin)
  4. Verify: Only pending submissions

- [ ] **Date Range Filter** (if implemented)
  1. Select date range
  2. Verify: Results filtered correctly

- [ ] **User Filter** (admin only)
  1. Filter by specific user email
  2. Verify: Only that user's content
  3. Non-admin can't see this filter

- [ ] **Sort Options**
  1. Sort "Newest first"
  2. Sort "Oldest first"
  3. Sort "Schedule time" (queue tab)
  4. Verify: Order correct

### View Modes
- [ ] **Grid View**
  1. Click grid icon
  2. See items in card grid
  3. 1-3 columns responsive
  4. Shows thumbnail, badges, actions

- [ ] **List View**
  1. Click list icon
  2. See items in table
  3. Columns: title, status, created, actions
  4. Sortable by clicking headers

- [ ] **Queue View**
  1. On Queue tab, click queue icon
  2. See drag-handle list
  3. Can drag to reorder
  4. Shows scheduled time

### Error Handling
- [ ] **Network Errors**
  1. Disconnect network
  2. Try to load content
  3. Verify: Graceful error message
  4. Can retry

- [ ] **Validation Errors**
  1. Try to create without required fields
  2. Verify: Error message
  3. Try to schedule in past
  4. Verify: Error message
  5. Try to exceed caption limit
  6. Verify: Character counter and error

- [ ] **Permission Errors**
  1. Try to edit someone else's content (as user)
  2. Verify: Error 403 Forbidden
  3. Try to access review tab (as user)
  4. Verify: Error 403 Forbidden

- [ ] **Concurrent Edit Conflict**
  1. Open edit modal
  2. In another tab, edit same item
  3. Try to save in first tab
  4. Verify: Version conflict error
  5. Can refresh and retry

### Performance
- [ ] **Load Time**
  1. Go to `/content`
  2. Verify: Page loads in < 2 seconds
  3. With filters, still fast

- [ ] **Pagination**
  1. Set limit to 10 items per page
  2. Navigate through pages
  3. Verify: Works smoothly
  4. Verify: "Has more" flag correct

- [ ] **Large Dataset**
  1. If possible, test with 1000+ items
  2. Verify: Grid view still responsive
  3. Verify: Pagination required (doesn't load all)

---

## Rollback Testing

### If Issues Arise
- [ ] Can disable with feature flag: `NEXT_PUBLIC_ENABLE_UNIFIED_CONTENT_HUB=false`
- [ ] Old pages still work without it
- [ ] Can restore from pre-migration backup if needed

---

## Post-Launch Monitoring

### Week 1: Daily Checks
- [ ] No errors in Sentry
- [ ] API response times normal
- [ ] Database query performance good
- [ ] No user complaints
- [ ] Stats accuracy verified

### Week 2-4: Regular Checks
- [ ] Monitor error rates
- [ ] Check slow query logs
- [ ] User adoption metrics
- [ ] Any UX issues reported

### Ongoing
- [ ] Weekly stats review
- [ ] Monthly performance audit
- [ ] User feedback collection

---

## Sign-Off

- [ ] QA Lead: _________________ Date: _______
- [ ] Tech Lead: ________________ Date: _______
- [ ] Product Manager: __________ Date: _______

**Launch Approved:** ☐ YES ☐ NO

If NO, blockers:
- _____________________________
- _____________________________
- _____________________________
