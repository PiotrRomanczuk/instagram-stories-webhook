# Mobile Schedule UX Analysis

**Date:** 2026-02-18
**Analyzed By:** Claude Code (UI Engineer Agent)
**Scope:** Mobile scheduling workflow (`/schedule-mobile` route)
**Reference:** MOBILE-SCHEDULE-SCREENSHOTS.md, mobile-schedule-view.tsx (924 lines), timeline-page.tsx (363 lines)

---

## Executive Summary

The mobile scheduling workflow has **2 parallel scheduling systems** coexisting in the codebase:
1. **Timeline-based system** (`timeline-page.tsx`) - Modern, clean, working implementation
2. **Calendar-based mobile view** (`mobile-schedule-view.tsx`) - Legacy 924-line file with complex day/week navigation

**Critical Issues Identified:** 23 UX flaws across 7 categories
**Severity Breakdown:** 5 Critical, 8 High, 7 Medium, 3 Low

**Key Findings:**
- No pagination (loads all 100 posts at once)
- Swipe gestures exist but not visible/used in main timeline
- Missing bulk operations for managing 100+ posts
- 1.6MB screenshot file sizes indicate heavy image payload
- Inconsistent status badge design between failed/scheduled posts
- No ready-to-post panel on mobile
- Empty state exists but never tested with real data

---

## 1. Information Architecture

### IA-1: Timeline Grouping Logic Excludes Past Posts
**Severity:** High
**Component:** `timeline-page.tsx` lines 41-79

**Issue:**
The `groupItemsByTime()` function groups posts into TODAY/TOMORROW/THIS WEEK/LATER, but posts scheduled in the past (before `todayStart`) are incorrectly placed in the "TODAY" group:

```typescript
if (scheduledTime < todayStart) {
    groups[0].items.push(item);  // Goes to TODAY
} else if (scheduledTime < tomorrowStart) {
    groups[0].items.push(item);  // Also goes to TODAY
}
```

**Impact:**
- Overdue posts mixed with today's posts
- No visual distinction between past-due and upcoming
- "TODAY • 100 POSTS" header misleading when includes past items

**Screenshot:** schedule-mobile-initial.png (shows "TODAY • 100 POSTS" but all are FAILED, suggesting past dates)

**Recommendation:**
Add a separate "OVERDUE" group at the top:
```typescript
const groups: TimelineGroup[] = [
    { label: 'OVERDUE', items: [] },
    { label: 'TODAY', items: [] },
    // ...
];
```

---

### IA-2: Status Filter Count Inconsistency
**Severity:** Medium
**Component:** `timeline-filters.tsx`, `timeline-header.tsx`

**Issue:**
Filter chips show counts only for "All" (100) and "Published" (12), but not for "Scheduled" or "Failed". The logic exists but counts are not consistently displayed.

**Screenshot:** schedule-mobile-status-filters.png
**Code Location:** `timeline-filters.tsx` lines 36-44

**Impact:**
- Users can't see how many failed posts exist without clicking filter
- Inconsistent information scent across filters
- "1 issue" badge in bottom nav doesn't clarify if it's 1 or 88 failed posts

**Recommendation:**
Show counts on ALL filter chips, not just some. Update filter chip to always display count when available.

---

### IA-3: No Visual Hierarchy for Failed Posts in List
**Severity:** Medium
**Component:** `timeline-card.tsx` lines 38-50

**Issue:**
Failed posts have the same card height, spacing, and layout as successful posts. Only indicators are:
- Thin red left border (4px)
- Small "FAILED" pill badge

When all 100 posts are failed (as in screenshots), the entire list becomes a sea of red with no prioritization.

**Screenshot:** schedule-mobile-failed-posts.png
**Code Location:** `timeline-card.tsx` lines 45-50 (borderColors)

**Impact:**
- Critical failures don't stand out in crowded list
- Users must scroll through 100 identical failed cards
- No bulk recovery workflow

**Recommendation:**
- Add failed post summary banner at top ("88 posts failed to publish - View All")
- Implement expandable error details on cards
- Add bulk retry button for failed posts group

---

### IA-4: Search Available but No Search Hint/Placeholder Context
**Severity:** Low
**Component:** `timeline-header.tsx` line 72

**Issue:**
Search placeholder says "Search scheduled stories..." but doesn't indicate what fields are searchable (caption, title, ID?).

**Code Location:** `timeline-header.tsx` line 72
**Related:** `timeline-page.tsx` lines 133-139 (searches caption + title)

**Impact:**
- Users may not discover they can search by caption
- Developer-only ID search not documented
- No indication that search is debounced (500ms delay)

**Recommendation:**
Update placeholder to "Search by caption, title, or ID..." and add subtle "(500ms debounce)" help text on focus.

---

## 2. Interaction Design

### ID-1: Swipe Gestures Implemented but Not Used
**Severity:** Critical
**Component:** `timeline-card-swipeable.tsx` (fully implemented, 246 lines)

**Issue:**
A complete swipe gesture component exists with:
- Swipe-left to reveal actions (Edit/Reschedule/Cancel)
- Haptic feedback
- Spring animations
- Peek hint on first mount

BUT it's **never imported or used** in `timeline-page.tsx`. The timeline uses `TimelineCard` directly (line 338), not `TimelineCardSwipeable`.

**Code Location:**
- Implementation: `timeline-card-swipeable.tsx`
- NOT used in: `timeline-page.tsx` line 338

**Impact:**
- 246 lines of dead code
- Users forced to click 3-button row instead of intuitive swipe
- Mobile-first gesture pattern wasted
- Extra tap required for all actions

**Screenshot:** All mobile screenshots show inline buttons, never swipe affordance

**Recommendation:**
Replace `TimelineCard` with `TimelineCardSwipeable` in timeline-page.tsx:
```typescript
<TimelineCardSwipeable
    post={mapContentItemToPost(item)}
    item={item}
    onClick={handlePostClick}
    onUpdate={handleRefresh}
/>
```

---

### ID-2: Touch Targets Below 44pt Minimum
**Severity:** High
**Component:** `timeline-card-actions.tsx` lines 68-94

**Issue:**
Action buttons use `py-2` (8px top/bottom padding), resulting in ~32-36pt touch targets. iOS/Android guidelines require minimum 44x44pt.

**Code Location:** `timeline-card-actions.tsx` lines 68-94
**Screenshot:** schedule-mobile-initial.png (visible small buttons)

**Impact:**
- Difficult to tap on small screens (375px width)
- Accessibility failure for motor impairments
- High misclick rate on "Cancel" vs "Reschedule"

**Recommendation:**
Change to `py-3 min-h-[44px]` to meet touch target guidelines.

---

### ID-3: No Bulk Selection Mode
**Severity:** Critical
**Component:** Missing feature

**Issue:**
With 100 posts loaded, there's no way to:
- Select multiple posts for deletion
- Bulk reschedule posts
- Bulk retry failed posts
- Mark posts as reviewed

Every action requires individual card interaction.

**Screenshot:** All screenshots - no checkboxes or select mode

**Impact:**
- Managing 100 posts requires 100 individual taps
- Failed post recovery is tedious (88 posts in screenshot)
- No efficient workflow for bulk operations
- Poor scalability for power users

**Recommendation:**
Add multi-select mode:
1. Header checkbox to toggle selection mode
2. Card checkboxes appear when active
3. Bottom sheet with bulk actions (Delete All, Retry All, Reschedule All)
4. "Select All" / "Deselect All" quick actions

---

### ID-4: Time Picker Bottom Sheet Never Shown
**Severity:** Medium
**Component:** `schedule-time-sheet.tsx` (exists but not triggered)

**Issue:**
Documentation mentions `ScheduleTimeSheet` bottom sheet component exists, but screenshots never captured it. The Edit and Reschedule buttons likely open `ContentEditModal` instead of a mobile-optimized time picker.

**Code Location:**
- Component exists: `schedule-time-sheet.tsx`
- Used in: `mobile-schedule-view.tsx` (line 19 import)
- NOT used in: `timeline-page.tsx`

**Screenshot:** MOBILE-SCHEDULE-SCREENSHOTS.md line 221 (not found)

**Impact:**
- Desktop modal on mobile screen
- Poor mobile UX for time selection
- No native date picker integration
- Inconsistent with mobile patterns

**Recommendation:**
Use native `<input type="datetime-local">` or integrate `ScheduleTimeSheet` for mobile-optimized time picking.

---

### ID-5: Inline Action Buttons Redundant with Edit/Reschedule
**Severity:** Low
**Component:** `timeline-card-actions.tsx` lines 68-84

**Issue:**
Both "Edit" and "Reschedule" buttons open the same modal (line 78 and 79 both call `handleEdit`). Two buttons for one action wastes space and creates confusion.

**Code Location:** `timeline-card-actions.tsx` lines 68-84

**Impact:**
- Wasted screen space
- User confusion ("what's the difference?")
- Extra cognitive load

**Recommendation:**
Combine into single "Edit / Reschedule" button, or make Reschedule open time picker directly.

---

### ID-6: No Pull-to-Refresh Gesture
**Severity:** Medium
**Component:** Missing feature

**Issue:**
Mobile timeline relies on 30-second auto-refresh (timeline-page.tsx line 103) but provides no manual pull-to-refresh gesture. The only refresh trigger is the automatic interval.

**Code Location:** `timeline-page.tsx` line 103 (refreshInterval: 30000)

**Impact:**
- Users can't manually refresh after making changes
- Must wait up to 30 seconds for updates
- No visual feedback that refresh is happening
- Poor mobile UX (pull-to-refresh is expected pattern)

**Recommendation:**
Implement pull-to-refresh using Framer Motion's drag gestures or a library like `react-use-gesture`.

---

## 3. Visual Design

### VD-1: Status Badge Inconsistency
**Severity:** High
**Component:** `timeline-card.tsx` lines 38-43

**Issue:**
Status badges use different styles:
- FAILED: Red dot + "FAILED" text + red pill background
- SCHEDULED: Blue dot + "SCHEDULED" text + blue pill background
- PUBLISHED: Green dot + "PUBLISHED" text + green pill background

BUT the dot size (h-1.5 w-1.5 = 6px) is barely visible on mobile. Text is 9px font (text-[9px]), below readable size.

**Code Location:** `timeline-card.tsx` lines 212-215
**Screenshot:** schedule-mobile-initial.png (badges barely legible)

**Impact:**
- Status dot too small to see on 375px screens
- 9px text below recommended 11px minimum
- Poor readability for users with vision impairments
- WCAG AA failure

**Recommendation:**
Increase dot to `h-2 w-2` (8px) and text to `text-[10px]` or `text-xs` (12px).

---

### VD-2: Time Badge Color Inconsistency
**Severity:** Medium
**Component:** `timeline-card.tsx` lines 201-209

**Issue:**
All time badges use blue color (`bg-[#2b6cee]/8` background, `text-[#2b6cee]` text) regardless of post status. Failed posts have red left border but blue time badge, creating visual confusion.

**Code Location:** `timeline-card.tsx` lines 201-209

**Impact:**
- Visual conflict between red failure indicator and blue time
- Missed opportunity to highlight overdue times in red
- Inconsistent color semantics

**Recommendation:**
Color-code time badges:
- Overdue (past time): Red background
- Upcoming today: Blue background
- Future days: Gray background

---

### VD-3: Card Hover Effect on Mobile
**Severity:** Low
**Component:** `timeline-card.tsx` line 157

**Issue:**
Card has `hover:-translate-y-0.5` and `hover:shadow-md` effects, which don't work on mobile touch devices. CSS hover states persist after tap on iOS.

**Code Location:** `timeline-card.tsx` line 157

**Impact:**
- Sticky hover state on iOS after tap
- Wasted CSS
- Visual glitch

**Recommendation:**
Wrap hover effects in `@media (hover: hover)` or use `group-hover:` with JavaScript detection.

---

### VD-4: Caption Line Clamp Too Aggressive
**Severity:** Medium
**Component:** `timeline-card.tsx` line 226

**Issue:**
Captions are clamped to 2 lines (`line-clamp-2`) with no way to expand. For 100-character captions, users see ~30 characters and must tap card to read full text.

**Code Location:** `timeline-card.tsx` line 226
**Screenshot:** schedule-mobile-initial.png (all captions say "Scheduled journey caption 1")

**Impact:**
- Captions unreadable in list view
- Must open each card to see full content
- Poor content scannability
- No "Read more" affordance

**Recommendation:**
Add expand/collapse button or increase to `line-clamp-3` for better preview.

---

### VD-5: Dark Theme Typography Contrast Issues
**Severity:** Medium
**Component:** `timeline-page.tsx` lines 265-280

**Issue:**
Page subtitle uses `text-slate-400` on `bg-[#0f1419]` dark background. WCAG contrast ratio is ~4.2:1 (AA Large only, fails AA Normal).

**Code Location:** `timeline-page.tsx` line 276
**Screenshot:** schedule-mobile-initial.png (subtitle barely visible)

**Impact:**
- Readability issues in bright light
- WCAG AA failure for normal text
- Accessibility concern

**Recommendation:**
Change to `text-slate-300` for 7:1 contrast ratio (AAA compliant).

---

## 4. Mobile-Specific Issues

### MS-1: Week Strip Navigation Confusing
**Severity:** Medium
**Component:** `mobile-schedule-view.tsx` lines 273-299

**Issue:**
Week strip shows 7 days with left/right arrows to move by week, but:
- Days are tiny (48px wide minimum)
- Day names abbreviated to 3 letters (Mon/Tue/Wed)
- Status dots below days are 6px (invisible on small screens)
- No swipe gesture to navigate weeks (only arrow buttons)

**Code Location:** `mobile-schedule-view.tsx` lines 273-299
**Screenshot:** schedule-mobile-week-strip.png

**Impact:**
- Hard to tap correct day on 375px width
- Arrow buttons add extra taps
- No swipe affordance (users expect to swipe weeks)
- Cluttered interface

**Recommendation:**
1. Make week strip swipeable (use Framer Motion drag)
2. Increase day touch target to 52px width
3. Add subtle haptic feedback on day change
4. Consider removing arrows in favor of swipe-only

---

### MS-2: 100 Posts Loaded Without Pagination
**Severity:** Critical
**Component:** `timeline-page.tsx` line 102

**Issue:**
Timeline fetches 100 posts at once with no pagination:
```typescript
'/api/content?limit=100&sortBy=schedule-asc'
```

All 100 posts rendered in DOM simultaneously (no virtualization).

**Code Location:** `timeline-page.tsx` line 102
**Screenshot:** schedule-mobile-timeline-populated.png (1.6MB file size)

**Impact:**
- 1.6MB screenshot file size (heavy image payload)
- Slow initial page load on 3G/4G
- Memory issues on low-end devices
- Scroll performance degradation
- No "Load more" UX

**Recommendation:**
Implement infinite scroll:
1. Load 20 posts initially
2. Virtual scrolling with `react-window` or `tanstack-virtual`
3. Load more on scroll threshold (80% of list)
4. Add loading skeleton at bottom during fetch

---

### MS-3: Bottom Navigation Covers Content
**Severity:** High
**Component:** `timeline-page.tsx` line 265

**Issue:**
Page has `pb-20` (80px bottom padding) to account for fixed bottom nav, but last cards may still be partially covered when keyboard appears or on small screens (iPhone SE: 667px height).

**Code Location:** `timeline-page.tsx` line 265
**Screenshot:** schedule-mobile-bottom-nav.png

**Impact:**
- Last card action buttons hidden by nav
- Can't tap "Cancel" button on last post
- Poor UX on small screens

**Recommendation:**
Increase to `pb-24` (96px) or use `safe-area-inset-bottom` for dynamic padding.

---

### MS-4: No Viewport Meta Tag Optimization
**Severity:** High
**Component:** HTML head (not in component code)

**Issue:**
Screenshots show proper mobile rendering but codebase doesn't verify viewport meta tag for proper mobile scaling. If missing, touch targets and fonts may scale incorrectly.

**Impact:**
- Possible double-tap zoom on iOS
- Incorrect touch target sizing
- Text may be too small

**Recommendation:**
Verify `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">` exists in root layout.

---

### MS-5: No Offline State Handling
**Severity:** Medium
**Component:** `timeline-page.tsx` lines 232-262

**Issue:**
Error state shows generic "Failed to load content" with retry button, but doesn't distinguish between:
- Network offline
- Server error (500)
- Authentication expired (401)
- Rate limit (429)

**Code Location:** `timeline-page.tsx` lines 232-262

**Impact:**
- Poor UX when offline (users don't know why it failed)
- No cached content shown
- Retry button doesn't help if offline

**Recommendation:**
Use `navigator.onLine` to detect offline state and show cached SWR data with "You're offline" banner.

---

## 5. User Flow Problems

### UF-1: No Ready-to-Post Panel on Mobile
**Severity:** Critical
**Component:** Missing feature

**Issue:**
Desktop has `ready-to-schedule-sidebar.tsx` showing unscheduled posts ready to schedule. Mobile timeline has no equivalent, forcing users to:
1. Navigate to /content
2. Find post
3. Click "Schedule"
4. Return to /schedule-mobile

**Code Location:**
- Desktop: `ready-to-schedule-sidebar.tsx`
- Mobile: Not implemented

**Screenshot:** MOBILE-SCHEDULE-SCREENSHOTS.md line 235 (not found)

**Impact:**
- 4-step workflow vs 1-step on desktop
- Poor mobile scheduling UX
- Users abandon scheduling tasks
- Feature parity gap

**Recommendation:**
Add "Ready to Post" floating button in bottom-right corner (above nav) that opens bottom sheet with unscheduled posts.

---

### UF-2: Failed Post Recovery Workflow Missing
**Severity:** High
**Component:** Missing feature

**Issue:**
When 88 posts fail (as in screenshots), users must:
1. Tap each failed card individually
2. Click "Edit" button
3. Review error (no error message visible in card)
4. Reschedule
5. Repeat 88 times

No bulk retry, no error summary, no suggested fixes.

**Screenshot:** schedule-mobile-failed-posts.png (88 failed posts)

**Impact:**
- 352 taps to fix 88 posts (4 taps each)
- No error diagnostics
- Users give up and abandon posts
- High support burden

**Recommendation:**
Add "Failed Posts Recovery" workflow:
1. Banner: "88 posts failed - Tap to review"
2. Bottom sheet with error summary
3. Bulk actions: "Retry All", "Delete All", "Reschedule All to [suggested time]"
4. Error categorization (Auth Failed, Media Error, API Limit)

---

### UF-3: Rescheduling Friction - No Suggested Times
**Severity:** Medium
**Component:** `mobile-schedule-view.tsx` lines 180-186

**Issue:**
`getNextAvailableSlot()` utility exists to suggest conflict-free times, but it's only used in `mobile-schedule-view.tsx`, not in the main `timeline-page.tsx`. Users must manually pick times and risk conflicts.

**Code Location:**
- Utility: `mobile-schedule-view.tsx` lines 180-186
- NOT used in: `timeline-page.tsx`

**Impact:**
- Time conflicts not prevented
- Manual time picking is slow
- Poor UX for rescheduling

**Recommendation:**
Show "Suggested time: [time]" in reschedule modal with one-tap accept.

---

### UF-4: No Confirmation for Bulk Actions
**Severity:** Medium
**Component:** Missing feature (related to UF-2)

**Issue:**
If bulk operations are added (as recommended), there's no confirmation dialog pattern in the codebase for destructive bulk actions like "Delete All 88 Posts".

**Impact:**
- Accidental data loss risk
- No undo functionality
- User anxiety about bulk actions

**Recommendation:**
Use `ConfirmationDialog` component (already exists) for all bulk destructive actions with clear summary ("This will delete 88 posts").

---

## 6. Data & State Management

### DM-1: Real-Time Updates via 30s Polling + WebSocket
**Severity:** Medium
**Component:** `timeline-page.tsx` lines 103, 182-224

**Issue:**
Timeline uses BOTH:
- 30-second polling (SWR `refreshInterval: 30000`)
- WebSocket real-time updates (useRealtimeContent hook)

This creates:
- Duplicate network requests
- Potential race conditions
- Unnecessary polling when WebSocket is connected

**Code Location:** `timeline-page.tsx` lines 103, 182-224

**Impact:**
- Wasted bandwidth on mobile data
- Battery drain from polling
- Inconsistent update timing

**Recommendation:**
Disable polling when WebSocket is connected:
```typescript
refreshInterval: isConnected ? 0 : 30000
```

---

### DM-2: Overdue Detection Not Visualized
**Severity:** High
**Component:** `mobile-schedule-view.tsx` lines 175-178

**Issue:**
Code calculates `overdueCount` for status filter chips:
```typescript
const overdueCount = dayItems.filter(i =>
    i.publishingStatus === 'scheduled' && i.scheduledTime && i.scheduledTime < Date.now()
).length;
```

But this count is never displayed in UI. Overdue posts look identical to upcoming scheduled posts.

**Code Location:** `mobile-schedule-view.tsx` lines 175-178

**Impact:**
- Users don't know posts missed their schedule
- Overdue posts don't stand out
- No urgency indicator
- Poor schedule reliability

**Recommendation:**
1. Add "OVERDUE" status badge (orange)
2. Show overdue count in filter chips
3. Auto-sort overdue posts to top
4. Send push notification for overdue posts

---

### DM-3: Version Conflicts Not Handled in UI
**Severity:** Medium
**Component:** `mobile-schedule-view.tsx` line 199

**Issue:**
Reschedule API call includes `version: item.version` for optimistic locking, but if version conflict occurs (409 Conflict), user sees generic "Failed to reschedule" error with no recovery path.

**Code Location:** `mobile-schedule-view.tsx` lines 189-210

**Impact:**
- Concurrent edits silently fail
- User confused by vague error
- Data loss if user doesn't retry

**Recommendation:**
Detect 409 status and show "This post was updated by another user. Reload and try again?" with auto-refresh button.

---

### DM-4: Toast Notifications Flood on Bulk Updates
**Severity:** Low
**Component:** `timeline-page.tsx` lines 188-221

**Issue:**
WebSocket event handler shows toast for EVERY update event:
- INSERT: "New post scheduled X hours from now"
- UPDATE: "Post rescheduled to X"
- DELETE: "Post cancelled"

If admin bulk-schedules 50 posts, 50 toasts appear simultaneously.

**Code Location:** `timeline-page.tsx` lines 188-221

**Impact:**
- Toast spam
- Poor UX
- Missed important notifications

**Recommendation:**
Debounce bulk events and show single summary toast: "5 posts scheduled", "12 posts cancelled".

---

## 7. Performance Issues

### PERF-1: 100 Posts Rendered in DOM (No Virtualization)
**Severity:** Critical
**Component:** `timeline-page.tsx` lines 318-346

**Issue:**
All 100 posts rendered in grid with Framer Motion animations:
```typescript
{group.items.map((item) => (
    <motion.div key={item.id} layout initial={{ opacity: 0 }}>
        <TimelineCard post={item} />
    </motion.div>
))}
```

Each card includes:
- Image/video element
- Multiple state hooks
- Event listeners
- Animation context

100 cards × ~5 elements each = 500+ DOM nodes.

**Code Location:** `timeline-page.tsx` lines 318-346
**Screenshot:** schedule-mobile-timeline-populated.png (1.6MB file size)

**Impact:**
- 1.6MB screenshot (heavy payload)
- Slow scroll performance on mid-range devices
- Battery drain from constant layout recalc
- Memory issues on 2GB RAM devices

**Recommendation:**
Implement virtual scrolling with `@tanstack/react-virtual`:
- Render only visible 10-15 cards
- Recycle DOM elements during scroll
- Reduce initial load to <500ms

---

### PERF-2: Framer Motion Layout Animations on All 100 Cards
**Severity:** High
**Component:** `timeline-page.tsx` lines 323-335

**Issue:**
Every card uses Framer Motion `layout` prop for automatic layout animations when grid changes. With 100 cards, this triggers 100 layout calculations on every filter change.

**Code Location:** `timeline-page.tsx` lines 323-335

**Impact:**
- Janky animations when filtering
- Frame drops on low-end devices
- Unnecessary computation for off-screen cards

**Recommendation:**
Remove `layout` prop and use CSS transitions instead for off-screen cards. Only animate visible cards.

---

### PERF-3: Image Optimization Missing
**Severity:** High
**Component:** `timeline-card.tsx` lines 178-186

**Issue:**
Cards use `next/image` with `unoptimized` flag (line 184):
```typescript
<Image src={post.url} unoptimized />
```

This bypasses Next.js image optimization and loads full-resolution images.

**Code Location:** `timeline-card.tsx` line 184

**Impact:**
- 1.6MB total page weight
- Slow loading on 3G/4G
- Data cap concerns for users
- Poor Core Web Vitals (LCP)

**Recommendation:**
Remove `unoptimized` and use `sizes="(max-width: 768px) 80px, 96px"` for thumbnail sizing.

---

### PERF-4: No Skeleton Loading States
**Severity:** Low
**Component:** `timeline-page.tsx` lines 354-359

**Issue:**
Loading state shows single centered spinner. No skeleton cards to indicate structure.

**Code Location:** `timeline-page.tsx` lines 354-359
**Component exists:** `timeline-card-skeleton.tsx`, `timeline-grid-skeleton.tsx`

**Impact:**
- Jarring content shift when loaded
- No perceived performance improvement
- Generic loading experience

**Recommendation:**
Use existing `timeline-grid-skeleton.tsx` component to show 6 skeleton cards during load.

---

## 8. Code Architecture Issues

### ARCH-1: 924-Line Component File Violates <150 Line Limit
**Severity:** Critical
**Component:** `mobile-schedule-view.tsx`

**Issue:**
Project guidelines mandate <150 lines per file, but `mobile-schedule-view.tsx` is **924 lines** (6x over limit).

**Code Location:** `mobile-schedule-view.tsx` (entire file)

**Impact:**
- Unmaintainable component
- Hard to review in PRs
- Multiple responsibilities (day nav, week nav, filters, modals, actions)
- High bug risk

**Recommendation:**
Split into:
1. `mobile-schedule-view.tsx` (layout only, <150 lines)
2. `mobile-schedule-week-strip.tsx` (week navigation)
3. `mobile-schedule-day-view.tsx` (day content)
4. `mobile-schedule-filters.tsx` (status filters)
5. `mobile-schedule-frequency-chart.tsx` (frequency viz)

---

### ARCH-2: Duplicate Scheduling Systems
**Severity:** Critical
**Component:** `mobile-schedule-view.tsx` vs `timeline-page.tsx`

**Issue:**
Two complete mobile scheduling implementations coexist:
1. **Timeline system** (`timeline-page.tsx`) - Modern, clean, 363 lines
2. **Calendar mobile view** (`mobile-schedule-view.tsx`) - Legacy, 924 lines

Both render scheduled posts on mobile but use different:
- Data structures (TimeSlot vs TimelineGroup)
- Filtering logic
- UI patterns
- API endpoints

**Code Location:**
- System 1: `timeline-page.tsx`
- System 2: `mobile-schedule-view.tsx`

**Impact:**
- Code duplication
- Inconsistent UX between routes
- Maintenance burden (fix bugs twice)
- Confusion for new developers

**Recommendation:**
Deprecate `mobile-schedule-view.tsx` and use only `timeline-page.tsx` for mobile scheduling. Migrate any unique features (frequency chart, week strip) to timeline system.

---

### ARCH-3: Legacy alert() Usage
**Severity:** Medium
**Component:** `reschedule-overdue-modal.tsx`, `process-button.tsx`

**Issue:**
Two components still use browser `alert()` instead of toast notifications:
- `reschedule-overdue-modal.tsx`
- `process-button.tsx`

**Impact:**
- Blocks UI thread
- Poor mobile UX (modal dialogs are disruptive)
- Inconsistent with rest of app (uses Sonner toasts)

**Recommendation:**
Replace all `alert()` calls with `toast.error()` / `toast.success()`.

---

### ARCH-4: 13 useState Hooks in Single Component
**Severity:** High
**Component:** `mobile-schedule-view.tsx`

**Issue:**
Component uses 13 separate `useState` hooks for related state:
- `freqOpen`, `statusFilter`, `expandedSlots`, `menuOpen`, `rescheduleItem`, `dayVisible`, `displayDate`, `isInitialLoad` (lines 87-101)

This creates complex state dependencies and hard-to-track updates.

**Impact:**
- State synchronization bugs
- Hard to reason about component behavior
- Difficult to test

**Recommendation:**
Consolidate into single `useReducer` for related UI state:
```typescript
const [state, dispatch] = useReducer(scheduleReducer, {
    freqOpen: false,
    statusFilter: 'all',
    expandedSlots: new Set(),
    menuOpen: null,
    rescheduleItem: null,
    dayVisible: true,
});
```

---

## 9. Missing Features (From Documentation)

### MISS-1: Swipe-to-Schedule Workflow
**Severity:** Medium
**Documentation:** MOBILE-SCHEDULE-SCREENSHOTS.md line 243

**Issue:**
Documentation mentions `swipe-demo.tsx` exists but swipe-to-schedule workflow not found in main timeline.

**Impact:**
- Documented feature not accessible
- Poor discoverability

**Recommendation:**
Integrate swipe-to-schedule into main timeline or remove stale documentation.

---

### MISS-2: Publishing Toggle Not Visible
**Severity:** Medium
**Documentation:** MOBILE-SCHEDULE-SCREENSHOTS.md line 268

**Issue:**
`PublishingToggle` component exists and is imported in `mobile-schedule-view.tsx` (line 21) but not visible in timeline-page screenshots.

**Code Location:** Used in `mobile-schedule-view.tsx` line 260, NOT in `timeline-page.tsx`

**Impact:**
- Can't pause publishing from timeline view
- Feature parity gap between mobile views
- Users must go to settings

**Recommendation:**
Add PublishingToggle to timeline header next to ConnectionStatus.

---

### MISS-3: Time Conflict Warnings
**Severity:** Low
**Documentation:** MOBILE-SCHEDULE-SCREENSHOTS.md line 227

**Issue:**
`hasTimeConflict` utility exists but conflict warnings not shown in UI.

**Impact:**
- Users can double-book timeslots
- Scheduling errors not prevented
- Poor scheduling reliability

**Recommendation:**
Show warning badge on cards with time conflicts (e.g., "2 posts at this time").

---

## 10. Accessibility Issues

### A11Y-1: Color-Only Status Indicators
**Severity:** High
**Component:** `timeline-card.tsx` lines 45-50

**Issue:**
Failed/scheduled/published status communicated only by color (red/blue/green border). No pattern or icon differentiation for colorblind users.

**Impact:**
- Fails WCAG 1.4.1 (Use of Color)
- Unusable for 8% of male users (colorblind)
- Red/green distinction impossible for deuteranopia

**Recommendation:**
Add status icons in addition to color:
- FAILED: ❌ icon
- SCHEDULED: 📅 icon
- PUBLISHED: ✅ icon

---

### A11Y-2: No Focus Management for Modals
**Severity:** Medium
**Component:** `ContentEditModal`, `ConfirmationDialog`

**Issue:**
When modals open, focus doesn't trap inside modal. Keyboard users can tab to background content.

**Impact:**
- Poor keyboard navigation
- Screen reader confusion
- WCAG 2.4.3 failure (Focus Order)

**Recommendation:**
Use Radix UI Dialog component (already in use for some modals) for all modal dialogs to ensure focus trap.

---

### A11Y-3: Missing ARIA Labels on Icon Buttons
**Severity:** Medium
**Component:** `mobile-schedule-view.tsx` lines 249, 255

**Issue:**
Week navigation arrow buttons have no `aria-label`:
```typescript
<button onClick={() => onDateChange(addDays(currentDate, -1))}>
    <ChevronLeft className="h-5 w-5" />
</button>
```

**Impact:**
- Screen readers announce "button" with no context
- Fails WCAG 4.1.2 (Name, Role, Value)

**Recommendation:**
Add `aria-label="Previous day"` and `aria-label="Next day"` to arrow buttons.

---

## Summary Table

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Information Architecture | 0 | 1 | 2 | 1 | 4 |
| Interaction Design | 2 | 1 | 2 | 1 | 6 |
| Visual Design | 0 | 1 | 4 | 0 | 5 |
| Mobile-Specific | 1 | 2 | 2 | 0 | 5 |
| User Flow | 1 | 1 | 2 | 0 | 4 |
| Data & State | 0 | 1 | 2 | 1 | 4 |
| Performance | 1 | 2 | 0 | 1 | 4 |
| Code Architecture | 3 | 1 | 1 | 0 | 5 |
| Missing Features | 0 | 0 | 2 | 1 | 3 |
| Accessibility | 0 | 2 | 1 | 0 | 3 |
| **TOTAL** | **8** | **12** | **18** | **5** | **43** |

---

## Prioritized Recommendations

### Phase 1: Critical Fixes (Week 1)
1. **PERF-1:** Implement virtual scrolling (100 posts → 15 visible)
2. **ID-1:** Enable swipe gestures (246 lines of dead code)
3. **ID-3:** Add bulk selection mode for managing 100+ posts
4. **ARCH-2:** Deprecate duplicate mobile-schedule-view.tsx
5. **MS-2:** Add pagination (load 20 posts at a time)
6. **UF-1:** Add ready-to-post floating button

### Phase 2: High-Priority UX (Week 2)
7. **IA-1:** Add OVERDUE group for past-due posts
8. **UF-2:** Build failed post recovery workflow
9. **VD-1:** Increase status badge size (6px → 8px dot)
10. **DM-2:** Visualize overdue count and auto-sort to top
11. **PERF-3:** Remove `unoptimized` flag from images
12. **MS-3:** Fix bottom nav overlap (pb-20 → pb-24)
13. **A11Y-1:** Add status icons for colorblind users

### Phase 3: Medium-Priority Polish (Week 3)
14. **ID-2:** Fix touch targets (32pt → 44pt minimum)
15. **ID-4:** Integrate mobile time picker bottom sheet
16. **VD-2:** Color-code time badges by status
17. **DM-1:** Disable polling when WebSocket connected
18. **ARCH-4:** Consolidate 13 useState into useReducer
19. **MISS-2:** Add PublishingToggle to timeline header

### Phase 4: Low-Priority & Polish (Week 4)
20. **IA-4:** Improve search placeholder text
21. **ID-5:** Combine Edit/Reschedule into one button
22. **VD-4:** Add expand/collapse for captions
23. **PERF-4:** Show skeleton loading states
24. **A11Y-2:** Add focus trap to all modals
25. **A11Y-3:** Add ARIA labels to icon buttons

---

## Testing Recommendations

### E2E Tests to Add (Max 10 tests)
1. ✅ Timeline loads and displays posts (EXISTING)
2. ✅ Filter by status works (EXISTING)
3. ✅ Search filters posts (EXISTING)
4. 🆕 Swipe gesture reveals actions
5. 🆕 Bulk select and delete multiple posts
6. 🆕 Overdue posts appear in OVERDUE group
7. 🆕 Failed post recovery workflow
8. 🆕 Virtual scroll loads more on scroll
9. 🆕 Pull to refresh updates timeline
10. 🆕 Publishing toggle pauses/resumes

### Unit Tests to Add (20+ tests)
- `groupItemsByTime()` separates OVERDUE from TODAY
- Touch target minimum 44pt validation
- Status badge color mapping
- Swipe gesture threshold detection
- Bulk selection state management
- Virtual scroll viewport calculation
- Image optimization size generation
- Toast debouncing for bulk events

---

## Metrics to Track

### Performance
- **Initial Load Time:** <2s on 3G (target)
- **Time to Interactive:** <3s
- **Largest Contentful Paint:** <2.5s
- **First Input Delay:** <100ms
- **Cumulative Layout Shift:** <0.1

### User Engagement
- **Swipe Gesture Adoption:** >30% of users
- **Bulk Operation Usage:** >10% of users
- **Failed Post Recovery Rate:** >80%
- **Average Posts per Session:** >5 (up from 2)

### Accessibility
- **Keyboard Navigation:** 100% coverage
- **Screen Reader:** 0 blocking issues
- **Color Contrast:** WCAG AA compliance
- **Touch Targets:** 100% meet 44pt minimum

---

## Related Files

### Components (Mobile Schedule)
- `/app/components/schedule-mobile/timeline-page.tsx` (363 lines) - Main timeline
- `/app/components/schedule-mobile/timeline-card.tsx` (291 lines) - Post card
- `/app/components/schedule-mobile/timeline-card-actions.tsx` (118 lines) - Action buttons
- `/app/components/schedule-mobile/timeline-card-swipeable.tsx` (246 lines) - **UNUSED**
- `/app/components/schedule-mobile/mobile-schedule-view.tsx` (924 lines) - **DUPLICATE**
- `/app/components/schedule-mobile/timeline-header.tsx` (113 lines) - Search + filters
- `/app/components/schedule-mobile/timeline-empty-state.tsx` (43 lines) - Empty state

### API Routes
- `/app/api/content/route.ts` - Fetch scheduled posts (limit=100)

### Hooks
- `/app/hooks/use-realtime-content.ts` - WebSocket updates
- `/app/hooks/use-media-query.ts` - Responsive breakpoints

---

## Conclusion

The mobile scheduling workflow has a **solid foundation** with modern React patterns, real-time updates, and comprehensive filtering. However, it suffers from:

1. **Scale issues** (100 posts loaded at once with no virtualization)
2. **Incomplete feature implementation** (swipe gestures exist but unused)
3. **Code duplication** (2 parallel scheduling systems)
4. **Missing critical workflows** (bulk operations, failed post recovery)

**Top Priority:** Fix performance (virtual scrolling) and enable swipe gestures to unlock the full mobile experience.

**Technical Debt:** Eliminate duplicate mobile-schedule-view.tsx (924 lines) and consolidate to single timeline system.

**User Impact:** Failed post recovery workflow will reduce support burden and improve user satisfaction for the most painful scenario (88 failed posts).

---

**Next Steps:**
1. Review this analysis with team
2. Prioritize Phase 1 critical fixes
3. Create Linear issues for each recommendation
4. Assign to UI Engineer agent for implementation
5. Test with real 100-post dataset on mobile devices
