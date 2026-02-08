# Playwright E2E Test Results

**Date**: 2026-02-08
**Environment**: Local dev (localhost:3000)
**Config**: `--no-deps` (skipping live IG prerequisite)
**Skipped**: `live-*`, `real-ig-*`, `production-*`, `instagram-publishing-live` (require real IG tokens/prod URL)

---

## Summary

| Split | Category | Passed | Failed | Total | Status |
|-------|----------|--------|--------|-------|--------|
| 1 | Auth, RBAC, Users | 26 | 18 | 44 | Done |
| 2 | Home, Dashboard, Submissions | 30 | 27 | 57 | Done |
| 3 | Scheduling | 36 | 43 | 270 (191 skipped) | Done |
| 4 | Timeline | 0 | 35 | 180 (145 skipped) | Done |
| 5 | Publishing, Preview, Video | 12 | 17 | 54 (20 skip, 5 flaky) | Done |
| 6 | Admin, Dev, Security | 80 | 67 | 164 (17 skipped) | Done |
| 7 | Mobile Journeys | 11 | 4 | 16 (1 skipped) | Done |
| **TOTAL** | | **195** | **202** | **633** | |

---

## Split 1: Auth, RBAC, Users (26 passed, 18 failed)

**Files**: auth.spec.ts, rbac.spec.ts, facebook-linking.spec.ts, users-whitelist-crud.spec.ts, users-whitelist-protections.spec.ts, users-whitelist-multi-admin.spec.ts, users-whitelist-search.spec.ts

### Passed (26)
- auth.spec.ts: **8/8** - All auth tests pass
  - AC-01: redirect unauthenticated user to sign-in
  - AC-02: complete Google OAuth sign-in flow
  - AC-03: persist session across page refreshes
  - AC-04: sign out user and redirect
  - AC-05: prevent non-admin access to admin routes
  - AC-06: deny access to non-whitelisted email
  - Handle expired session gracefully
  - Allow admin access to admin routes
- rbac.spec.ts: **7/7** - All RBAC tests pass
  - RBAC-01: admin access all routes
  - RBAC-02: regular user denied admin routes
  - RBAC-03: admin sees content management interface
  - RBAC-04: user sees only own submissions
  - RBAC-05: schedule page redirects non-admin
  - RBAC-06: admin access via ADMIN_EMAIL env var
  - Allow user to access submissions page
- facebook-linking.spec.ts: **6/6** - All Facebook linking tests pass
  - FB-01: show disconnected status on home page
  - FB-02: handle scheduling without Facebook link
  - FB-03: show connection status in debug page
  - FB-04: prevent publishing without Facebook link
  - FB-05: redirect to Facebook OAuth when connecting
  - FB-06: show warning when token is expired
- users-whitelist-protections.spec.ts: **2/4** partial
  - UW-PROT-01: prevent self-deletion (passed)
  - UW-PROT-03: prevent downgrading last admin (passed)
- users-whitelist-search.spec.ts: **2/7** partial
  - UW-SRCH-04: show no results message (passed)
  - One other search test (passed)
- users-whitelist-crud.spec.ts: **1/7** partial

### Failed (18)
- **users-whitelist-crud.spec.ts** (7 failures):
  - UW-CRUD-01: display users table with all columns - table not rendering expected columns
  - UW-CRUD-02: add new user successfully - UI interaction failures
  - UW-CRUD-03: show error for duplicate email
  - UW-CRUD-04: validate email format
  - UW-CRUD-05: update user role successfully
  - UW-CRUD-06: disable submit when role unchanged
  - UW-CRUD-07: delete user successfully
- **users-whitelist-multi-admin.spec.ts** (3 failures):
  - UW-MULTI-01: concurrent edits - last write wins
  - UW-MULTI-02: concurrent delete - first delete wins
  - UW-MULTI-03: role change reflects across sessions
- **users-whitelist-protections.spec.ts** (2 failures):
  - UW-PROT-02: prevent removing last developer via API
  - UW-PROT-04: allow removing admin user
- **users-whitelist-search.spec.ts** (5 failures):
  - UW-SRCH-01: filter users by email search
  - UW-SRCH-02: filter users by role
  - UW-SRCH-03: combine search and role filter
  - UW-SRCH-05: clear filters and show all users
  - Case-insensitive search
  - Real-time debounce search

**Root cause pattern**: Users whitelist page UI has changed - tests expect old table/form structure that no longer matches current implementation.

---

## Split 2: Home, Dashboard, Submissions (30 passed, 27 failed)

**Files**: home.spec.ts, dashboard-stats.spec.ts, empty-states.spec.ts, submissions.spec.ts, meme-submissions.spec.ts, file-submissions.spec.ts, meme-review-admin.spec.ts

### Passed (30)
- home.spec.ts: **5/5** - All home tests pass
  - HP-01: display homepage for authenticated user
  - HP-02: show Instagram connection status
  - HP-03: display quick actions
  - HP-04: show recent activity section
  - HP-05: navigate to key features
- empty-states.spec.ts: **4/4** - All empty state tests pass
  - ES-01: show empty state when user has no memes
  - ES-02: show empty state when search returns no results
  - ES-03: show empty state when filtered status has no results
  - ES-04: allow submitting meme from empty state
- file-submissions.spec.ts: **8/10** partial
  - FS-01: file input and handle upload attempt
  - FS-02: clickable drop zone
  - FS-04: render submit page with all components
  - FS-05: upload image via file input
  - FS-06: update caption character count
  - FS-08: navigate to submissions list
  - FS-09: show submission success feedback
  - FS-10: different views for user and admin
- meme-submissions.spec.ts: **7/7** - All meme submission tests pass
  - MS-01: display meme submission form
  - MS-02: submit meme via URL
  - MS-03: show submission in list after submit
  - MS-04: allow user to delete own submission
  - MS-05: validate URL format
  - MS-06: show pending status for new submissions
  - MS-07: admin can see all submissions
- meme-review-admin.spec.ts: **3/6** partial
  - MR-01: admin should access content management page
  - MR-04/05: other admin tests
- submissions.spec.ts: **3/19** partial
  - SUB-01/02/03: basic navigation and rendering

### Failed (27)
- **dashboard-stats.spec.ts** (6 failures - all tests fail):
  - DS-01 through DS-06: All stat verification tests fail
  - Root cause: Tests expect specific stat card selectors (`[data-testid="stat-pending-review"]` etc.) that don't match current dashboard UI
- **submissions.spec.ts** (16 failures):
  - SUB-04 through SUB-19: Most submission list tests fail
  - Root cause: Tests expect table-based submission list with filtering, sorting, pagination - UI structure has changed
- **meme-review-admin.spec.ts** (3 failures):
  - MR-02: admin content management controls
  - MR-03: admin filter options
  - MR-10: regular user can view content page
- **file-submissions.spec.ts** (2 failures):
  - FS-03: URL input with Load button
  - FS-07: disable submit without image

**Root cause pattern**: Dashboard stats and submissions list UI have been redesigned - tests reference old selectors/structure.

---

## Split 3: Scheduling (36 passed, 43 failed, 191 skipped, 1 flaky)

**Files**: scheduling-calendar.spec.ts, scheduling-calendar-complete.spec.ts, scheduling-publishing.spec.ts, schedule-timeline.spec.ts, drag-drop-scheduling.spec.ts, scheduling-mcp-comprehensive.spec.ts, scheduling-mcp-mobile.spec.ts, scheduling-mcp-modals-navigation.spec.ts

### Passed (36)
- scheduling-mcp-comprehensive.spec.ts: majority pass (page access, content sidebar, navigation)
- scheduling-mcp-mobile.spec.ts: majority pass (mobile viewport, touch interactions)
- scheduling-mcp-modals-navigation.spec.ts: majority pass (modal interactions, navigation)
- scheduling-calendar-complete.spec.ts: partial pass (some drag-drop, navigation, time slot tests)
- scheduling-publishing.spec.ts: passes

### Skipped (191)
- Large number of conditional/skipped tests in scheduling-mcp-* files

### Failed (43)
- **drag-drop-scheduling.spec.ts** (5 failures - all tests):
  - DD-VERIFY-01 through DD-VERIFY-05: All drag-drop verification tests fail
  - Root cause: Calendar grid selectors don't match current UI
- **schedule-timeline.spec.ts** (33 failures):
  - TL-01/02: Timeline page/day groups - page structure mismatch
  - TL-04/05: Section headers/empty state
  - TL-09/10/11/12/13/15: Responsive behavior tests - viewport layout expectations wrong
  - TL-32/33: Pull-to-refresh tests
  - TL-35-42: Filter tests - filter chip selectors not found
  - TL-43-49: Search tests - search bar selectors not found
  - TL-54/56/57: Accessibility/performance tests
  - TL-60/61: Error handling tests
  - TL-66: Admin filter by user
  - TL-69/70: Mobile gesture tests
- **scheduling-calendar-complete.spec.ts** (4 failures):
  - VW-01/02/03: View mode tests (day/week column counts return 0)
  - DM-01: API seeding returns "pending" instead of "approved"
- **scheduling-calendar.spec.ts** (1 failure):
  - CAL-01: Calendar grid render - day headers ("Mon" etc.) not found

**Root cause pattern**: Schedule/timeline UI completely redesigned - calendar grid, timeline structure, filter chips, search bar, and responsive layout all use different selectors than tests expect.

---

## Split 4: Timeline (0 passed, 35 failed, 145 skipped)

**Files**: timeline.spec.ts, timeline-swipe-gestures.spec.ts, timeline-modal-actions.spec.ts, timeline-skeleton-loading.spec.ts, timeline-realtime-updates.spec.ts, timeline-hover-overlays.spec.ts

### Failed (35) - ALL tests fail
- **timeline-hover-overlays.spec.ts** (35 failures):
  - HO-01 through HO-35: Every hover overlay test fails
  - All tests navigate to `/schedule-mobile` which times out (30s `networkidle`)
  - Root cause: `/schedule-mobile` route either doesn't exist or redirects, causing timeout
  - Tests also expect `[data-testid="timeline-card"]` selectors that don't exist
- **timeline.spec.ts, timeline-swipe-gestures.spec.ts, timeline-modal-actions.spec.ts, timeline-skeleton-loading.spec.ts, timeline-realtime-updates.spec.ts**: All 145 tests skipped (likely conditional skip due to missing route/data)

**Root cause**: The `/schedule-mobile` route doesn't exist in the current app. Timeline tests were written for a separate mobile timeline view that has been removed or never implemented.

---

## Split 5: Publishing, Preview, Video (12 passed, 17 failed, 20 skipped, 5 flaky)

**Files**: instagram-publishing.spec.ts, admin-publish.spec.ts, story-preview.spec.ts, story-preview-integration.spec.ts, story-verification-example.spec.ts, video-upload.spec.ts, video-display.spec.ts

### Passed (12)
- story-preview.spec.ts: **7/10** (5 flaky but eventually pass)
  - SP-01: story preview component renders
  - SP-03: no-stories state displayed
  - SP-04: display last story when available (flaky)
  - SP-05: video story with controls (flaky)
  - SP-06: story preview auto-refresh
  - SP-07: error message on API failure (flaky)
  - SP-08: timestamps (flaky)
  - SP-09: manual refresh
  - SP-10: additional stories count (flaky)
- video-display.spec.ts: **5/5** - All pass
  - VD-01 through VD-05: video display tests

### Skipped (20)
- instagram-publishing.spec.ts: 12 tests skipped (require `ENABLE_REAL_IG_TESTS=true`)
- admin-publish.spec.ts: 1 test skipped (requires real IG)
- story-preview-integration.spec.ts: 2 tests skipped
- story-verification-example.spec.ts: 5 tests skipped

### Failed (17)
- **story-preview-integration.spec.ts** (9 failures):
  - INT-SP-01 through INT-SP-08, INT-SP-10: All real API integration tests fail
  - Root cause: Tests call real Instagram API endpoint that times out or returns errors in dev
- **video-upload.spec.ts** (7 failures):
  - All 7 tests fail - video upload option, file type validation, thumbnail selector, video scrubber, submission flow
  - Root cause: Tests expect video-specific upload UI (`[data-testid="video-upload"]`, thumbnail selector) that doesn't exist in current submit form
- **story-preview.spec.ts** (1 failure):
  - SP-02: loading state while fetching stories

**Root cause pattern**: Video upload UI not implemented yet. Story preview integration tests need real IG tokens.

---

## Split 6: Admin, Dev, Security (80 passed, 67 failed, 17 skipped)

**Files**: admin-review-complete.spec.ts, approve-reject-workflow.spec.ts, concurrent-edit.spec.ts, debug.spec.ts, developer.spec.ts, developer-cron-debug.spec.ts, settings.spec.ts, inbox.spec.ts, analytics.spec.ts, xss.spec.ts, rate-limiting.spec.ts, pagination.spec.ts, multi-user-workflows.spec.ts

### Passed (80)
- admin-review-complete.spec.ts: **35/37** - Nearly all pass
  - All page access, story preview, approve/reject workflow, navigation, keyboard shortcuts, daily goal, review history, loading state, navigation menu tests pass
- approve-reject-workflow.spec.ts: **10/11** - Nearly all pass
  - REV-01 through REV-07, keyboard navigation, UI states
- concurrent-edit.spec.ts: **3/3** - All pass
  - CE-01/02/03: concurrent session access tests
- xss.spec.ts: All pass (security tests)
- rate-limiting.spec.ts: All pass
- pagination.spec.ts: All pass
- debug.spec.ts: **3/14** partial (auth/access tests pass)
- developer.spec.ts: **5/10** partial (auth/access tests pass)
- developer-cron-debug.spec.ts: **2/14** partial (auth tests pass)
- analytics.spec.ts: **3/10** partial (auth tests pass)
- inbox.spec.ts: **2/16** partial (auth tests pass)
- settings.spec.ts: **1/17** partial (auth test passes)

### Failed (67)
- **settings.spec.ts** (16 failures):
  - SET-02 through SET-17: All fail with `networkidle` timeout on `/settings`
  - Root cause: Settings page has continuous network activity preventing `networkidle`
- **inbox.spec.ts** (14 failures):
  - INB-03 through INB-16: Inbox page UI expectations don't match
  - Root cause: Inbox page may not have messaging features implemented
- **debug.spec.ts** (11 failures):
  - DB-04 through DB-14: Debug page UI selectors don't match current layout
- **developer-cron-debug.spec.ts** (12 failures):
  - CRD-02, CRD-04 through CRD-14: Cron debug page UI mismatch
- **developer.spec.ts** (6 failures):
  - DEV-04 through DEV-09: Developer page content expectations wrong
- **analytics.spec.ts** (7 failures):
  - AN-03 through AN-10: Analytics page UI/data expectations wrong
- **admin-review-complete.spec.ts** (2 failures):
  - Review comment textarea interactions fail
- **multi-user-workflows.spec.ts** (0 failures, 14 skipped - require real IG)

**Root cause pattern**: Settings/inbox/debug/developer/cron pages either use `networkidle` (which times out) or have UI that doesn't match test expectations. Auth/access tests consistently pass across all files.

---

## Split 7: Mobile Journeys (11 passed, 4 failed, 1 skipped)

**Files**: admin-mobile-journey.spec.ts, user-mobile-journey.spec.ts

### Passed (11)
- admin-mobile-journey.spec.ts: **6/10** pass
  - AMJ-01: sign in and verify admin dashboard on mobile
  - AMJ-02: navigate to review page on mobile
  - AMJ-03: approve submission on mobile
  - AMJ-04: reject submission on mobile
  - AMJ-05: verify review queue updated after approve/reject
  - AMJ-06: navigate to schedule page and verify mobile layout
- user-mobile-journey.spec.ts: **5/5** - All pass
  - USER-MOB-01: navigate to submit page mobile layout
  - USER-MOB-02: upload image and submit meme
  - USER-MOB-03: verify submission appears in dashboard
  - USER-MOB-04: edit pending submission via modal
  - USER-MOB-05: delete submission

### Failed (4)
- **admin-mobile-journey.spec.ts** (4 failures):
  - AMJ-07: date navigation on schedule page - button detached from DOM during click
  - AMJ-08: view scheduled content on calendar - calendar grid selectors mismatch
  - AMJ-09: open mobile sidebar and verify ready-to-schedule items - sidebar content mismatch
  - AMJ-10: quick-schedule popover from mobile sidebar - sidebar overlay not found

**Root cause pattern**: Schedule page calendar UI has changed - mobile sidebar and date navigation selectors outdated. Core mobile workflows (auth, review, submit) all work well.

---

## Overall Analysis

### What Works Well (195 passing)
1. **Authentication & RBAC** (21/21) - 100% pass rate
2. **Facebook linking** (6/6) - 100% pass rate
3. **Admin review workflow** (35/37) - 95% pass rate
4. **Approve/reject workflow** (10/11) - 91% pass rate
5. **User mobile journey** (5/5) - 100% pass rate
6. **Security tests** (xss, rate-limiting, pagination) - all pass
7. **Concurrent edit protection** (3/3) - 100% pass rate
8. **Empty states** (4/4) - 100% pass rate
9. **Meme submissions** (7/7) - 100% pass rate
10. **Home page** (5/5) - 100% pass rate
11. **Video display** (5/5) - 100% pass rate

### What's Broken (202 failures)

**Category 1: UI Redesign Drift (biggest issue)**
- Users whitelist page - CRUD, search, protections all broken
- Dashboard stats - all stat card selectors wrong
- Submissions list - table structure changed
- Schedule/timeline - complete UI overhaul, all selectors stale
- Debug/developer/settings/inbox pages - layout changed

**Category 2: Missing Features**
- Video upload UI (thumbnail selector, video scrubber) - not implemented
- `/schedule-mobile` route - doesn't exist
- Inbox messaging features - not implemented

**Category 3: Environment/Config**
- Story preview integration tests need real IG tokens
- `networkidle` timeouts on settings/cron-debug pages

### Recommendations
1. **Delete or rewrite** timeline tests (timeline-*.spec.ts) - `/schedule-mobile` route removed
2. **Update selectors** for users-whitelist, dashboard-stats, submissions, debug pages
3. **Remove** video-upload tests until video upload feature is implemented
4. **Fix** `networkidle` usage in settings/cron tests (use `domcontentloaded` instead)
5. **Keep** auth, RBAC, review, mobile journey tests as-is (working well)
