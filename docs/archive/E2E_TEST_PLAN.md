# E2E Testing Plan for Instagram Stories Webhook

**Purpose**: This document outlines a comprehensive End-to-End testing strategy that covers all testable features documented in CLAUDE.md.

**Testing Framework**: Playwright
**Test Directory**: `__tests__/e2e/`
**Run Command**: `npm run test:e2e`
**UI Mode**: `npm run test:e2e:ui`

---

## Table of Contents

1. [Testing Principles](#testing-principles)
2. [Test Environment Setup](#test-environment-setup)
3. [Authentication & Authorization](#authentication--authorization)
4. [Section 2: Meme Submissions](#section-2-meme-submissions)
5. [Section 3: Meme Review & Admin](#section-3-meme-review--admin)
6. [Section 4: Scheduling & Publishing](#section-4-scheduling--publishing)
7. [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
8. [Search, Pagination & Filtering](#search-pagination--filtering)
9. [Bulk Operations](#bulk-operations)
10. [Edit Workflows](#edit-workflows)
11. [Input Validation & Error Handling](#input-validation--error-handling)
12. [Settings & Configuration](#settings--configuration)
13. [Media Processing](#media-processing)
14. [Debug & Developer Pages](#debug--developer-pages)
15. [Test Execution Strategy](#test-execution-strategy)

---

## Testing Principles

### What MUST Be Tested ✅
- Everything up to scheduled post creation (in `scheduled_posts` table)
- All meme submission workflows (user → admin → schedule)
- Search, pagination, filtering
- Bulk operations (approve/reject/reschedule)
- Edit workflows (submissions, scheduled posts)
- Database operations and RLS policies
- Auth flows and role-based access control
- Input validation and error handling

### What CANNOT Be Tested ❌
- Meta Graph API publishing (requires real FB user account)
- Instagram container creation and status checks
- Actual media upload to Instagram servers
- Real IG media ID retrieval

### Testing Strategy
- Mock Meta API responses using MSW for unit tests
- E2E tests verify data is prepared correctly for publishing
- Test up to the point where data enters `scheduled_posts` table
- Manual/staging testing required for actual Instagram integration

---

## Test Environment Setup

### Prerequisites
```bash
# Authentication state storage
__tests__/e2e/fixtures/auth/admin-auth.json
__tests__/e2e/fixtures/auth/user-auth.json

# Test data fixtures
__tests__/e2e/fixtures/test-images/valid-square-image.jpg
__tests__/e2e/fixtures/test-images/valid-story-image.jpg
__tests__/e2e/fixtures/test-images/invalid-aspect-ratio.jpg
__tests__/e2e/fixtures/test-videos/valid-video.mp4
```

### Global Setup Tasks
- [ ] Create test database seed data
- [ ] Set up authentication states for different roles
- [ ] Prepare test media files (images, videos)
- [ ] Configure MSW handlers for Meta API mocking
- [ ] Set up test environment variables

### Test Isolation
- Each test should be independent
- Use database transactions or cleanup between tests
- Reset authentication state per test suite
- Clear cookies and local storage between tests

---

## Authentication & Authorization

**File**: `__tests__/e2e/auth.spec.ts`

### Test Cases

#### AC-01: Unauthenticated User Redirection
- **Priority**: P0 (Critical)
- **Description**: Verify unauthenticated users are redirected to sign-in
- **Steps**:
  1. Navigate to `/` without authentication
  2. Verify redirect to `/auth/signin`
  3. Check page title contains "Instagram"
- **Expected Result**: User lands on sign-in page

#### AC-02: Google OAuth Sign-In Flow
- **Priority**: P0 (Critical)
- **Description**: Verify Google sign-in flow (mocked)
- **Steps**:
  1. Navigate to `/auth/signin`
  2. Click "Sign in with Google" button
  3. Mock Google OAuth callback
  4. Verify redirect to homepage
- **Expected Result**: User authenticated and sees homepage

#### AC-03: Session Persistence
- **Priority**: P1 (High)
- **Description**: Verify session persists across page refreshes
- **Steps**:
  1. Sign in as user
  2. Refresh page
  3. Verify still authenticated
- **Expected Result**: User remains logged in

#### AC-04: Sign Out Flow
- **Priority**: P1 (High)
- **Description**: Verify sign-out functionality
- **Steps**:
  1. Sign in as user
  2. Click sign-out button
  3. Verify redirect to sign-in page
  4. Attempt to access protected route
- **Expected Result**: User signed out and redirected

#### AC-05: Unauthorized Access Protection
- **Priority**: P0 (Critical)
- **Description**: Verify non-admin cannot access admin routes
- **Steps**:
  1. Sign in as regular user
  2. Navigate to `/admin/memes`
  3. Verify 403 error or redirect
- **Expected Result**: Access denied

#### AC-06: Email Whitelist Check
- **Priority**: P1 (High)
- **Description**: Verify only whitelisted emails can access
- **Steps**:
  1. Mock sign-in with non-whitelisted email
  2. Verify access denied message
- **Expected Result**: User cannot access application

---

## Section 2: Meme Submissions

**File**: `__tests__/e2e/meme-submissions.spec.ts`

**Status**: ✅ FULLY TESTABLE

### Test Cases

#### MS-01: Create Meme Submission (Valid Image)
- **Priority**: P0 (Critical)
- **Description**: Submit a valid meme with image upload
- **Steps**:
  1. Sign in as regular user
  2. Navigate to `/memes/submit`
  3. Upload valid image (JPG, 1080x1080)
  4. Enter title: "Test Meme"
  5. Enter caption: "This is a test caption"
  6. Click "Submit"
- **Expected Result**:
  - Success message displayed
  - Redirect to `/memes`
  - New submission appears in list

#### MS-02: Create Meme Submission (Invalid Aspect Ratio)
- **Priority**: P1 (High)
- **Description**: Verify validation for invalid aspect ratio
- **Steps**:
  1. Sign in as user
  2. Navigate to `/memes/submit`
  3. Upload image with invalid aspect ratio (16:9)
  4. Attempt to submit
- **Expected Result**:
  - Validation error displayed
  - Submission not created

#### MS-03: Create Meme Submission (File Too Large)
- **Priority**: P1 (High)
- **Description**: Verify file size validation
- **Steps**:
  1. Sign in as user
  2. Navigate to `/memes/submit`
  3. Upload image > 8MB
  4. Attempt to submit
- **Expected Result**:
  - Error message: "File too large"
  - Submission not created

#### MS-04: View Own Submissions
- **Priority**: P1 (High)
- **Description**: User can view their own submissions
- **Steps**:
  1. Sign in as user
  2. Create 3 test submissions
  3. Navigate to `/memes`
  4. Verify all 3 submissions visible
- **Expected Result**: User sees only their submissions

#### MS-05: Cannot View Other Users' Submissions
- **Priority**: P0 (Critical)
- **Description**: Verify RLS policy isolation
- **Steps**:
  1. Sign in as User A, create submission
  2. Sign out
  3. Sign in as User B
  4. Navigate to `/memes`
- **Expected Result**: User B cannot see User A's submission

#### MS-06: Edit Own Submission
- **Priority**: P1 (High)
- **Description**: User can edit their submission before approval
- **Steps**:
  1. Sign in as user
  2. Create submission with title "Original"
  3. Click "Edit" button
  4. Change title to "Updated"
  5. Save changes
- **Expected Result**:
  - Title updated successfully
  - Success message displayed

#### MS-07: Delete Own Submission
- **Priority**: P1 (High)
- **Description**: User can delete their pending submission
- **Steps**:
  1. Sign in as user
  2. Create submission
  3. Click "Delete" button
  4. Confirm deletion in modal
- **Expected Result**:
  - Submission removed from list
  - Success message displayed

#### MS-08: Cannot Delete Approved Submission
- **Priority**: P1 (High)
- **Description**: User cannot delete submission after admin approval
- **Steps**:
  1. Sign in as admin, approve a submission
  2. Sign in as original user
  3. View submission in `/memes`
- **Expected Result**:
  - Delete button disabled or hidden
  - Edit button disabled or hidden

#### MS-09: Submission Title Validation
- **Priority**: P2 (Medium)
- **Description**: Verify title field validation
- **Steps**:
  1. Sign in as user
  2. Navigate to `/memes/submit`
  3. Upload valid image
  4. Leave title empty
  5. Attempt to submit
- **Expected Result**:
  - Validation error: "Title is required"

#### MS-10: Submission Caption Validation
- **Priority**: P2 (Medium)
- **Description**: Verify caption length limits
- **Steps**:
  1. Sign in as user
  2. Navigate to `/memes/submit`
  3. Upload valid image
  4. Enter caption > 2200 characters
  5. Attempt to submit
- **Expected Result**:
  - Validation error: "Caption too long"

---

## Section 3: Meme Review & Admin

**File**: `__tests__/e2e/meme-review-admin.spec.ts`

**Status**: ✅ FULLY TESTABLE

### Test Cases

#### MR-01: Admin View Pending Memes
- **Priority**: P0 (Critical)
- **Description**: Admin can view all pending submissions
- **Steps**:
  1. Create 5 submissions as different users
  2. Sign in as admin
  3. Navigate to `/admin/memes`
  4. Verify all 5 submissions visible
- **Expected Result**: Admin sees all pending submissions

#### MR-02: Approve Single Meme
- **Priority**: P0 (Critical)
- **Description**: Admin approves a single submission
- **Steps**:
  1. Sign in as admin
  2. Navigate to `/admin/memes`
  3. Click "Approve" on first submission
  4. Verify status changes to "approved"
- **Expected Result**:
  - Status updated to "approved"
  - Success notification displayed
  - Submission moves to approved list

#### MR-03: Reject Single Meme with Reason
- **Priority**: P0 (Critical)
- **Description**: Admin rejects submission with reason
- **Steps**:
  1. Sign in as admin
  2. Navigate to `/admin/memes`
  3. Click "Reject" on submission
  4. Enter reason: "Poor quality image"
  5. Confirm rejection
- **Expected Result**:
  - Status updated to "rejected"
  - Rejection reason saved
  - User can view rejection reason

#### MR-04: Bulk Approve Multiple Memes
- **Priority**: P1 (High)
- **Description**: Admin approves multiple submissions at once
- **Steps**:
  1. Sign in as admin
  2. Navigate to `/admin/memes`
  3. Select 3 submissions via checkboxes
  4. Click "Bulk Approve"
  5. Confirm action
- **Expected Result**:
  - All 3 submissions approved
  - Success message: "3 memes approved"

#### MR-05: Bulk Reject Multiple Memes
- **Priority**: P1 (High)
- **Description**: Admin rejects multiple submissions
- **Steps**:
  1. Sign in as admin
  2. Navigate to `/admin/memes`
  3. Select 2 submissions
  4. Click "Bulk Reject"
  5. Enter reason: "Does not meet guidelines"
  6. Confirm rejection
- **Expected Result**:
  - All 2 submissions rejected
  - Same reason applied to both

#### MR-06: Filter by Status (Pending/Approved/Rejected)
- **Priority**: P1 (High)
- **Description**: Admin filters memes by review status
- **Steps**:
  1. Create submissions in different states
  2. Sign in as admin
  3. Navigate to `/admin/memes`
  4. Click "Pending" filter
  5. Verify only pending memes shown
- **Expected Result**: Filter works correctly

#### MR-07: Search Memes by Title
- **Priority**: P1 (High)
- **Description**: Admin searches for specific meme
- **Steps**:
  1. Create submission with title "Funny Cat"
  2. Create submission with title "Dog Meme"
  3. Sign in as admin
  4. Enter "Cat" in search box
- **Expected Result**: Only "Funny Cat" meme displayed

#### MR-08: Edit Submission After Review Blocked
- **Priority**: P1 (High)
- **Description**: User cannot edit after admin review
- **Steps**:
  1. Create submission as user
  2. Sign in as admin, approve submission
  3. Sign in as original user
  4. Navigate to `/memes`
  5. Attempt to click "Edit"
- **Expected Result**: Edit button disabled

#### MR-09: Admin Cannot Edit User Submissions
- **Priority**: P2 (Medium)
- **Description**: Admin reviews but doesn't edit user content
- **Steps**:
  1. Sign in as admin
  2. Navigate to `/admin/memes`
  3. View submission details
- **Expected Result**: No edit button for admin

#### MR-10: Regular User Cannot Access Admin Panel
- **Priority**: P0 (Critical)
- **Description**: Verify admin route protection
- **Steps**:
  1. Sign in as regular user
  2. Navigate to `/admin/memes`
- **Expected Result**: 403 Forbidden or redirect

---

## Section 4: Scheduling & Publishing

**File**: `__tests__/e2e/scheduling-publishing.spec.ts`

**Status**: ⚠️ PARTIALLY TESTABLE

### Test Cases

#### SP-01: Schedule Post with Future Datetime
- **Priority**: P0 (Critical)
- **Description**: Schedule an approved meme for publishing
- **Steps**:
  1. Sign in as admin
  2. Approve a meme submission
  3. Click "Schedule" button
  4. Select future date/time (tomorrow, 10:00 AM)
  5. Enter caption: "Scheduled post test"
  6. Click "Schedule Post"
- **Expected Result**:
  - Post created in `scheduled_posts` table
  - Status: "pending"
  - Success message displayed

#### SP-02: Validate Datetime Must Be Future
- **Priority**: P1 (High)
- **Description**: Cannot schedule post in the past
- **Steps**:
  1. Sign in as admin
  2. Click "Schedule" on approved meme
  3. Select past date/time
  4. Attempt to schedule
- **Expected Result**:
  - Validation error: "Datetime must be in the future"

#### SP-03: View Scheduled Posts List
- **Priority**: P1 (High)
- **Description**: User views their scheduled posts
- **Steps**:
  1. Sign in as user
  2. Schedule 3 posts
  3. Navigate to `/schedule`
- **Expected Result**:
  - All 3 scheduled posts visible
  - Show scheduled datetime
  - Show status (pending/processing/published/failed)

#### SP-04: Edit Scheduled Post (Before Processing)
- **Priority**: P1 (High)
- **Description**: Edit scheduled post details
- **Steps**:
  1. Sign in as user
  2. Schedule a post for tomorrow
  3. Click "Edit" on scheduled post
  4. Change caption to "Updated caption"
  5. Change scheduled time
  6. Save changes
- **Expected Result**:
  - Caption updated in database
  - Scheduled time updated
  - Success message displayed

#### SP-05: Delete Scheduled Post
- **Priority**: P1 (High)
- **Description**: User deletes a pending scheduled post
- **Steps**:
  1. Sign in as user
  2. Schedule a post
  3. Click "Delete" on scheduled post
  4. Confirm deletion
- **Expected Result**:
  - Post removed from `scheduled_posts` table
  - Success message displayed

#### SP-06: Bulk Reschedule Multiple Posts
- **Priority**: P1 (High)
- **Description**: Admin reschedules multiple posts to new time
- **Steps**:
  1. Sign in as admin
  2. Navigate to `/schedule`
  3. Select 3 scheduled posts
  4. Click "Bulk Reschedule"
  5. Select new date/time
  6. Confirm
- **Expected Result**:
  - All 3 posts rescheduled
  - New datetime saved

#### SP-07: Cannot Edit Post in Processing State
- **Priority**: P1 (High)
- **Description**: Post being processed cannot be edited
- **Steps**:
  1. Sign in as admin
  2. View scheduled posts
  3. Find post with status "processing"
  4. Attempt to edit
- **Expected Result**:
  - Edit button disabled
  - Message: "Post is being processed"

#### SP-08: Check Publish Quota (API Response)
- **Priority**: P2 (Medium)
- **Description**: Verify quota check returns valid response
- **Steps**:
  1. Sign in as user
  2. Navigate to schedule page
  3. Check quota indicator
  4. Verify API call to `/api/schedule/quota`
- **Expected Result**:
  - Quota displays correctly
  - Shows remaining posts allowed

#### SP-09: Database Record Created Correctly
- **Priority**: P0 (Critical)
- **Description**: Verify scheduled_posts table entry
- **Steps**:
  1. Sign in as user
  2. Schedule a post
  3. Query database for new entry
- **Expected Result**:
  - Entry exists in `scheduled_posts`
  - Correct user_id, media_id, caption, scheduled_at
  - Status = "pending"

#### SP-10: Cannot Schedule Without Meta Token (Mocked)
- **Priority**: P1 (High)
- **Description**: Verify token requirement
- **Steps**:
  1. Sign in as user (without linked FB account)
  2. Attempt to schedule post
- **Expected Result**:
  - Error: "Please link your Facebook account"
  - Redirect to settings

---

## Role-Based Access Control (RBAC)

**File**: `__tests__/e2e/rbac.spec.ts`

### Test Cases

#### RBAC-01: Admin Can Access All Routes
- **Priority**: P0 (Critical)
- **Description**: Verify admin has full access
- **Steps**:
  1. Sign in as admin
  2. Navigate to `/admin/memes` - Success
  3. Navigate to `/admin/users` - Success
  4. Navigate to `/schedule` - Success
  5. Navigate to `/memes` - Success
- **Expected Result**: All routes accessible

#### RBAC-02: User Cannot Access Admin Routes
- **Priority**: P0 (Critical)
- **Description**: Verify user role restrictions
- **Steps**:
  1. Sign in as regular user
  2. Navigate to `/admin/memes`
  3. Navigate to `/admin/users`
- **Expected Result**: 403 Forbidden or redirect

#### RBAC-03: Admin Can View All Users' Data
- **Priority**: P1 (High)
- **Description**: Verify admin visibility
- **Steps**:
  1. Create submissions as User A and User B
  2. Sign in as admin
  3. Navigate to `/admin/memes`
- **Expected Result**: Admin sees all submissions

#### RBAC-04: User Can Only View Own Data
- **Priority**: P0 (Critical)
- **Description**: Verify RLS policy enforcement
- **Steps**:
  1. Sign in as User A
  2. Create submission
  3. Sign out
  4. Sign in as User B
  5. Navigate to `/memes`
- **Expected Result**: User B cannot see User A's data

#### RBAC-05: Email Whitelist Role Assignment
- **Priority**: P1 (High)
- **Description**: Verify role from email_whitelist table
- **Steps**:
  1. Add user email to whitelist with role="user"
  2. Sign in with that email
  3. Attempt to access `/admin/memes`
- **Expected Result**: Access denied

#### RBAC-06: Admin Fallback to ADMIN_EMAIL Env Var
- **Priority**: P2 (Medium)
- **Description**: Verify env var fallback
- **Steps**:
  1. Set ADMIN_EMAIL=admin@test.com
  2. Sign in with admin@test.com
  3. Navigate to admin routes
- **Expected Result**: Admin access granted

---

## Search, Pagination & Filtering

**File**: `__tests__/e2e/search-pagination-filtering.spec.ts`

### Test Cases

#### SPF-01: Search Memes by Title
- **Priority**: P1 (High)
- **Description**: Search functionality works correctly
- **Steps**:
  1. Create 10 memes with various titles
  2. Sign in as admin
  3. Navigate to `/admin/memes`
  4. Enter "funny" in search box
- **Expected Result**: Only memes with "funny" in title displayed

#### SPF-02: Search Memes by Caption
- **Priority**: P1 (High)
- **Description**: Caption search works
- **Steps**:
  1. Create memes with different captions
  2. Sign in as admin
  3. Search for caption text
- **Expected Result**: Matching memes displayed

#### SPF-03: Pagination Navigation
- **Priority**: P1 (High)
- **Description**: Pagination controls work correctly
- **Steps**:
  1. Create 25 memes (assuming 10 per page)
  2. Sign in as admin
  3. Navigate to `/admin/memes`
  4. Click "Next page"
  5. Verify page 2 shows items 11-20
  6. Click "Previous page"
- **Expected Result**:
  - Correct items displayed per page
  - Page navigation works

#### SPF-04: Filter by Status (Pending/Approved/Rejected)
- **Priority**: P1 (High)
- **Description**: Status filter works
- **Steps**:
  1. Create memes in different states
  2. Sign in as admin
  3. Click "Pending" filter
  4. Verify only pending memes shown
  5. Click "Approved" filter
- **Expected Result**: Filters work correctly

#### SPF-05: Filter by Date Range
- **Priority**: P2 (Medium)
- **Description**: Date range filter
- **Steps**:
  1. Create memes on different dates
  2. Sign in as admin
  3. Set date range filter (last 7 days)
- **Expected Result**: Only recent memes shown

#### SPF-06: Combined Search and Filter
- **Priority**: P2 (Medium)
- **Description**: Search + filter together
- **Steps**:
  1. Create 20 memes
  2. Sign in as admin
  3. Search "funny" + filter "approved"
- **Expected Result**: Shows only approved memes with "funny"

#### SPF-07: Pagination Preserves Filters
- **Priority**: P2 (Medium)
- **Description**: Filters persist across pages
- **Steps**:
  1. Apply filter "pending"
  2. Navigate to page 2
  3. Verify filter still applied
- **Expected Result**: Filter persists

#### SPF-08: Reset Filters
- **Priority**: P2 (Medium)
- **Description**: Clear all filters button
- **Steps**:
  1. Apply multiple filters
  2. Click "Reset Filters"
- **Expected Result**: All filters cleared

---

## Bulk Operations

**File**: `__tests__/e2e/bulk-operations.spec.ts`

### Test Cases

#### BO-01: Select All Memes on Page
- **Priority**: P1 (High)
- **Description**: Select all checkbox works
- **Steps**:
  1. Sign in as admin
  2. Navigate to `/admin/memes`
  3. Click "Select All" checkbox
- **Expected Result**: All memes on page selected

#### BO-02: Deselect All Memes
- **Priority**: P2 (Medium)
- **Description**: Deselect all works
- **Steps**:
  1. Sign in as admin
  2. Select all memes
  3. Click "Select All" again
- **Expected Result**: All selections cleared

#### BO-03: Bulk Approve Selected Memes
- **Priority**: P1 (High)
- **Description**: Approve multiple memes
- **Steps**:
  1. Sign in as admin
  2. Select 5 pending memes
  3. Click "Bulk Approve"
  4. Confirm action
- **Expected Result**:
  - All 5 approved
  - Success message: "5 memes approved"

#### BO-04: Bulk Reject Selected Memes
- **Priority**: P1 (High)
- **Description**: Reject multiple memes
- **Steps**:
  1. Sign in as admin
  2. Select 3 memes
  3. Click "Bulk Reject"
  4. Enter reason
  5. Confirm
- **Expected Result**:
  - All 3 rejected
  - Reason applied to all

#### BO-05: Bulk Reschedule Scheduled Posts
- **Priority**: P1 (High)
- **Description**: Reschedule multiple posts
- **Steps**:
  1. Sign in as admin
  2. Navigate to `/schedule`
  3. Select 4 scheduled posts
  4. Click "Bulk Reschedule"
  5. Select new datetime
- **Expected Result**: All 4 rescheduled

#### BO-06: Bulk Delete Scheduled Posts
- **Priority**: P2 (Medium)
- **Description**: Delete multiple posts
- **Steps**:
  1. Sign in as admin
  2. Select 3 scheduled posts
  3. Click "Bulk Delete"
  4. Confirm deletion
- **Expected Result**: All 3 deleted

#### BO-07: Selection Persists Across Actions
- **Priority**: P2 (Medium)
- **Description**: Selection state maintained
- **Steps**:
  1. Select 3 memes
  2. Click bulk approve
  3. Verify selection cleared after action
- **Expected Result**: Selection reset after action

#### BO-08: Cannot Bulk Operate on Mixed Statuses
- **Priority**: P2 (Medium)
- **Description**: Prevent invalid bulk ops
- **Steps**:
  1. Select 1 pending + 1 approved meme
  2. Attempt bulk approve
- **Expected Result**:
  - Error: "Cannot approve already approved memes"

---

## Edit Workflows

**File**: `__tests__/e2e/edit-workflows.spec.ts`

### Test Cases

#### EW-01: Edit Meme Submission Before Review
- **Priority**: P1 (High)
- **Description**: User edits their pending submission
- **Steps**:
  1. Sign in as user
  2. Create submission
  3. Click "Edit"
  4. Update title, caption
  5. Save
- **Expected Result**: Changes saved successfully

#### EW-02: Cannot Edit After Admin Approval
- **Priority**: P1 (High)
- **Description**: Edit blocked post-review
- **Steps**:
  1. Create submission
  2. Admin approves
  3. Original user attempts edit
- **Expected Result**: Edit button disabled

#### EW-03: Edit Scheduled Post Details
- **Priority**: P1 (High)
- **Description**: Edit caption, time before publishing
- **Steps**:
  1. Schedule a post
  2. Click "Edit"
  3. Change caption and time
  4. Save
- **Expected Result**: Updates saved

#### EW-04: Cannot Edit Processing Post
- **Priority**: P1 (High)
- **Description**: Post being published cannot be edited
- **Steps**:
  1. View post with status="processing"
  2. Attempt to edit
- **Expected Result**: Edit disabled

#### EW-05: Edit Validation (Title Required)
- **Priority**: P2 (Medium)
- **Description**: Validation on edit
- **Steps**:
  1. Edit submission
  2. Clear title field
  3. Attempt to save
- **Expected Result**: Validation error

#### EW-06: Edit Preserves Media
- **Priority**: P1 (High)
- **Description**: Media unchanged when editing text
- **Steps**:
  1. Create submission with image
  2. Edit title only
  3. Save
- **Expected Result**: Image unchanged

#### EW-07: Replace Media in Edit
- **Priority**: P2 (Medium)
- **Description**: Upload new image during edit
- **Steps**:
  1. Edit submission
  2. Upload different image
  3. Save
- **Expected Result**: New image saved

---

## Input Validation & Error Handling

**File**: `__tests__/e2e/validation-errors.spec.ts`

### Test Cases

#### VE-01: Empty Title Validation
- **Priority**: P1 (High)
- **Description**: Title field required
- **Steps**:
  1. Submit meme with empty title
- **Expected Result**: "Title is required"

#### VE-02: Caption Length Validation
- **Priority**: P1 (High)
- **Description**: Caption max 2200 characters
- **Steps**:
  1. Enter 2500 character caption
  2. Attempt submit
- **Expected Result**: "Caption too long"

#### VE-03: Invalid File Type
- **Priority**: P1 (High)
- **Description**: Only images/videos allowed
- **Steps**:
  1. Upload PDF file
- **Expected Result**: "Invalid file type"

#### VE-04: File Size Limit
- **Priority**: P1 (High)
- **Description**: Max 8MB file size
- **Steps**:
  1. Upload 10MB image
- **Expected Result**: "File too large"

#### VE-05: Invalid Image Aspect Ratio
- **Priority**: P1 (High)
- **Description**: Reject incorrect aspect ratio
- **Steps**:
  1. Upload 16:9 image
- **Expected Result**: "Invalid aspect ratio"

#### VE-06: Network Error Handling
- **Priority**: P2 (Medium)
- **Description**: Handle API failures gracefully
- **Steps**:
  1. Mock network failure
  2. Attempt to create submission
- **Expected Result**:
  - Error message displayed
  - Form state preserved

#### VE-07: Session Timeout Handling
- **Priority**: P2 (Medium)
- **Description**: Handle expired session
- **Steps**:
  1. Sign in
  2. Wait for session timeout
  3. Attempt action
- **Expected Result**: Redirect to sign-in

#### VE-08: Duplicate Submission Prevention
- **Priority**: P2 (Medium)
- **Description**: Prevent duplicate posts
- **Steps**:
  1. Submit meme
  2. Immediately submit same meme again
- **Expected Result**: "Duplicate submission detected"

---

## Settings & Configuration

**File**: `__tests__/e2e/settings-config.spec.ts`

### Test Cases

#### SC-01: View Settings Page
- **Priority**: P1 (High)
- **Description**: User accesses settings
- **Steps**:
  1. Sign in as user
  2. Navigate to `/settings`
- **Expected Result**: Settings page loads

#### SC-02: Link Facebook Account (Mocked)
- **Priority**: P1 (High)
- **Description**: Initiate FB account linking
- **Steps**:
  1. Navigate to `/settings`
  2. Click "Link Facebook Account"
  3. Mock OAuth flow
- **Expected Result**:
  - Redirect to FB OAuth (mocked)
  - Success message on callback

#### SC-03: View Linked Account Status
- **Priority**: P2 (Medium)
- **Description**: Show connected account
- **Steps**:
  1. Sign in with linked account
  2. Navigate to `/settings`
- **Expected Result**:
  - Shows "Connected to: @username"
  - Token expiry date displayed

#### SC-04: Refresh Access Token
- **Priority**: P2 (Medium)
- **Description**: Manually refresh token
- **Steps**:
  1. Navigate to `/settings`
  2. Click "Refresh Token"
- **Expected Result**: Token refreshed

#### SC-05: Disconnect Account
- **Priority**: P2 (Medium)
- **Description**: Unlink Facebook account
- **Steps**:
  1. Click "Disconnect Account"
  2. Confirm action
- **Expected Result**: Account unlinked

---

## Media Processing

**File**: `__tests__/e2e/media-processing.spec.ts`

### Test Cases

#### MP-01: Upload Valid Square Image (1:1)
- **Priority**: P1 (High)
- **Description**: Accept valid square image
- **Steps**:
  1. Upload 1080x1080 JPG
- **Expected Result**: Upload succeeds

#### MP-02: Upload Valid Story Image (9:16)
- **Priority**: P1 (High)
- **Description**: Accept vertical story format
- **Steps**:
  1. Upload 1080x1920 JPG
- **Expected Result**: Upload succeeds

#### MP-03: Reject Invalid Aspect Ratio
- **Priority**: P1 (High)
- **Description**: Reject 16:9 landscape image
- **Steps**:
  1. Upload 1920x1080 JPG
- **Expected Result**: "Invalid aspect ratio"

#### MP-04: Upload Valid Video (MP4)
- **Priority**: P2 (Medium)
- **Description**: Accept MP4 video
- **Steps**:
  1. Upload valid MP4 file
- **Expected Result**: Upload succeeds

#### MP-05: Reject Invalid Video Format
- **Priority**: P2 (Medium)
- **Description**: Reject AVI video
- **Steps**:
  1. Upload AVI file
- **Expected Result**: "Unsupported video format"

#### MP-06: Image Optimization Preview
- **Priority**: P2 (Medium)
- **Description**: Show optimized preview
- **Steps**:
  1. Upload high-res image
  2. View preview
- **Expected Result**: Preview generated

---

## Debug & Developer Pages

**File**: `__tests__/e2e/debug-developer.spec.ts`

### Test Cases

#### DD-01: Access Debug Page
- **Priority**: P2 (Medium)
- **Description**: View debug dashboard
- **Steps**:
  1. Sign in as user
  2. Navigate to `/debug`
- **Expected Result**:
  - System status displayed
  - Token validity shown

#### DD-02: Access Developer Page
- **Priority**: P2 (Medium)
- **Description**: View developer tools
- **Steps**:
  1. Sign in as admin
  2. Navigate to `/developer`
- **Expected Result**: Developer tools accessible

#### DD-03: View System Health Status
- **Priority**: P2 (Medium)
- **Description**: Check health indicators
- **Steps**:
  1. Navigate to `/debug`
  2. View "All systems operational" status
- **Expected Result**: Status indicators display

---

## Test Execution Strategy

### Test Organization

```
__tests__/e2e/
├── auth.spec.ts                      # AC-01 to AC-06
├── meme-submissions.spec.ts          # MS-01 to MS-10
├── meme-review-admin.spec.ts         # MR-01 to MR-10
├── scheduling-publishing.spec.ts     # SP-01 to SP-10
├── rbac.spec.ts                      # RBAC-01 to RBAC-06
├── search-pagination-filtering.spec.ts # SPF-01 to SPF-08
├── bulk-operations.spec.ts           # BO-01 to BO-08
├── edit-workflows.spec.ts            # EW-01 to EW-07
├── validation-errors.spec.ts         # VE-01 to VE-08
├── settings-config.spec.ts           # SC-01 to SC-05
├── media-processing.spec.ts          # MP-01 to MP-06
├── debug-developer.spec.ts           # DD-01 to DD-03
└── fixtures/
    ├── auth/
    │   ├── admin-auth.json
    │   └── user-auth.json
    ├── test-images/
    │   ├── valid-square.jpg
    │   ├── valid-story.jpg
    │   └── invalid-aspect.jpg
    └── test-videos/
        └── valid-video.mp4
```

### Priority Levels
- **P0 (Critical)**: Core functionality, blocking issues
- **P1 (High)**: Important features, major user flows
- **P2 (Medium)**: Nice-to-have, edge cases

### Test Execution Order
1. **Authentication & Authorization** (AC-* tests)
2. **RBAC** (RBAC-* tests)
3. **Meme Submissions** (MS-* tests)
4. **Meme Review & Admin** (MR-* tests)
5. **Scheduling & Publishing** (SP-* tests)
6. **Search, Pagination & Filtering** (SPF-* tests)
7. **Bulk Operations** (BO-* tests)
8. **Edit Workflows** (EW-* tests)
9. **Input Validation** (VE-* tests)
10. **Settings & Config** (SC-* tests)
11. **Media Processing** (MP-* tests)
12. **Debug & Developer** (DD-* tests)

### CI/CD Integration

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### Test Data Management

#### Database Seeding
```typescript
// __tests__/e2e/helpers/seed.ts
export async function seedTestData() {
  // Create test users
  await createUser({ email: 'admin@test.com', role: 'admin' });
  await createUser({ email: 'user@test.com', role: 'user' });

  // Create test memes
  await createMemeSubmission({ userId: 'user-1', title: 'Test Meme 1' });
}

export async function cleanupTestData() {
  // Remove test data after suite
  await deleteTestUsers();
  await deleteMemeSubmissions();
}
```

#### Authentication State Management
```typescript
// __tests__/e2e/helpers/auth.ts
export async function authenticateAsAdmin(page: Page) {
  await page.context().addCookies(adminCookies);
}

export async function authenticateAsUser(page: Page) {
  await page.context().addCookies(userCookies);
}
```

### Performance Testing
- Monitor page load times
- Check API response times
- Verify no memory leaks
- Test with 100+ database entries

### Accessibility Testing
- Run axe-core checks on critical pages
- Verify keyboard navigation
- Test screen reader compatibility

---

## Test Coverage Goals

### Overall Coverage Target
- **E2E Coverage**: 80% of user-facing features
- **Critical Paths**: 100% coverage
- **Edge Cases**: 60% coverage

### Feature Coverage Breakdown
| Feature | Target Coverage | Priority |
|---------|----------------|----------|
| Authentication | 100% | P0 |
| Meme Submissions | 90% | P0 |
| Admin Review | 90% | P0 |
| Scheduling | 85% | P0 |
| RBAC | 100% | P0 |
| Search/Filter | 80% | P1 |
| Bulk Operations | 75% | P1 |
| Edit Workflows | 80% | P1 |
| Validation | 85% | P1 |
| Settings | 70% | P2 |
| Media Processing | 75% | P1 |

---

## Success Criteria

### Definition of Done for E2E Tests
- [ ] All P0 tests implemented and passing
- [ ] All P1 tests implemented and passing
- [ ] 70%+ of P2 tests implemented
- [ ] Tests run in CI/CD pipeline
- [ ] Test documentation complete
- [ ] Authentication state management working
- [ ] Test fixtures created and maintained
- [ ] Database seeding/cleanup automated
- [ ] Performance benchmarks met
- [ ] Accessibility tests passing

### Maintenance Plan
- Review and update tests with each feature release
- Add tests for bug fixes
- Refactor flaky tests
- Update fixtures quarterly
- Monitor test execution times

---

## Notes

- **Meta API Mocking**: Use MSW to mock Instagram Graph API calls in unit tests
- **Database**: Use test database or transactions for isolation
- **Authentication**: Store auth states as fixtures for quick test setup
- **Test Data**: Use factories or builders for consistent test data
- **Flakiness**: Implement proper waits and retries for network calls
- **Screenshots**: Capture on failure for debugging
- **Videos**: Record for critical flows

---

## Appendix

### Useful Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test __tests__/e2e/auth.spec.ts

# Run tests in UI mode
npm run test:e2e:ui

# Run tests in headed mode
npx playwright test --headed

# Debug specific test
npx playwright test --debug __tests__/e2e/meme-submissions.spec.ts

# Generate code for new test
npx playwright codegen http://localhost:3000
```

### References
- [CLAUDE.md Testing Strategy](/CLAUDE.md#testing-strategy)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)
- [Vitest Documentation](https://vitest.dev/)
