# 🚀 Driver.js Onboarding Journey Planning

## Overview

This document outlines the complete onboarding tours for **Admin** and **User** roles. Each journey is designed to guide users through the most important features they need to know on their first visit.

---

## 🎯 Tour Trigger Strategy

### When Tours Should Show

1. **First-time users** - Users who have never seen the tour before
2. **Existing users** - After feature updates (track tour version)
3. **Manual trigger** - Help button in navigation to re-run tour

### State Management

- Store tour completion in **Supabase** `user_preferences` table
- Fields: `user_id`, `tour_completed`, `tour_version`, `last_tour_date`
- Check on dashboard load: if `tour_completed = false` or `tour_version < current`, show tour

---

## 👑 ADMIN JOURNEY

### Journey Goal
Teach admins how to **manage content, review submissions, schedule posts, and monitor system health**.

### Tour Steps (10 steps)

#### Step 1: Welcome
- **Element**: Dashboard header (h1)
- **Title**: "👋 Welcome to Your Admin Dashboard"
- **Description**: "You're an admin! This means you can review submissions, schedule posts, manage users, and monitor the entire publishing pipeline. Let's take a quick tour of the key features."
- **Position**: `bottom`
- **Button**: "Let's Go!" (next)

#### Step 2: Dashboard Stats
- **Element**: Stats grid (first row with 6 cards)
- **Title**: "📊 Your Dashboard at a Glance"
- **Description**: "Monitor everything in real-time: pending reviews, today's schedule, published posts, failures, total users, and API quota. These numbers update automatically."
- **Position**: `bottom`
- **Highlight**: Stats grid area

#### Step 3: Pending Review Stat
- **Element**: "Pending Review" stat card
- **Title**: "⏱️ Pending Review"
- **Description**: "This shows how many user submissions are waiting for your approval. Click on the 'Review Queue' quick action to start reviewing."
- **Position**: `right`

#### Step 4: Quick Actions - Review Queue
- **Element**: "Review Queue" quick action button
- **Title**: "✅ Review Queue"
- **Description**: "Your most important task! Click here to review user-submitted content. You can approve, reject, or request changes."
- **Position**: `bottom`
- **Highlight**: Review Queue button with yellow badge

#### Step 5: Quick Actions - Scheduled Posts
- **Element**: "Scheduled Posts" quick action button
- **Title**: "📅 Schedule Manager"
- **Description**: "Access the powerful calendar view to schedule approved content. Drag, drop, and manage all your posts with precise timing controls."
- **Position**: `bottom`

#### Step 6: Quick Actions - Manage Users
- **Element**: "Manage Users" quick action button
- **Title**: "👥 User Management"
- **Description**: "Add or remove users from the whitelist. Control who can submit content to your Instagram account."
- **Position**: `bottom`

#### Step 7: Token Status
- **Element**: Token Status Card (right side)
- **Title**: "🔑 Instagram Connection"
- **Description**: "This shows if your Instagram account is properly connected. Green = good. If you see any warnings, click to reconnect your account."
- **Position**: `left`

#### Step 8: Failed Posts Alert (Conditional)
- **Element**: Failed posts alert card (if visible)
- **Title**: "⚠️ Failed Posts"
- **Description**: "When posts fail to publish, you'll see an alert here. Click 'View Failed' to see what went wrong and retry."
- **Position**: `top`
- **ShowIf**: stats.failed > 0

#### Step 9: Navigation
- **Element**: Top navigation bar
- **Title**: "🧭 Navigate Your Tools"
- **Description**: "Use the navigation to access Analytics, Debug tools, Settings, and more. Each section has specific admin capabilities."
- **Position**: `bottom`

#### Step 10: Help & Tour
- **Element**: Help button in navigation
- **Title**: "❓ Need Help?"
- **Description**: "You can re-run this tour anytime by clicking the help button. You'll also find links to documentation and support."
- **Position**: `left`
- **Button**: "Got it!" (finish)

### Admin Journey Flow
```
Dashboard → Stats → Review Queue → Schedule → Users → Token → Navigation → Done
```

### Estimated Time: 2-3 minutes

---

## 👤 USER JOURNEY

### Journey Goal
Teach users how to **submit content, track submission status, and understand the approval workflow**.

### Tour Steps (7 steps)

#### Step 1: Welcome
- **Element**: Dashboard header (h1)
- **Title**: "👋 Hello! Welcome to Instagram Story Scheduler"
- **Description**: "You can submit images and videos here, and admins will review and schedule them for Instagram. Let's show you how it works!"
- **Position**: `bottom`
- **Button**: "Show me!" (next)

#### Step 2: Submit Button
- **Element**: "Submit New" button (top right)
- **Title**: "📤 Submit Your Content"
- **Description**: "This is your most important button! Click here to upload images or videos for Instagram Stories. Your submissions will be reviewed by admins."
- **Position**: `left`
- **Highlight**: Submit button with glow

#### Step 3: Submission Stats
- **Element**: Stats grid (4 cards)
- **Title**: "📊 Track Your Submissions"
- **Description**: "See the status of all your submissions at a glance: Pending (waiting for review), Approved (ready to schedule), Scheduled (queued for posting), and Published (live on Instagram!)."
- **Position**: `bottom`

#### Step 4: Pending Review
- **Element**: "Pending Review" stat card
- **Title**: "⏱️ Pending Review"
- **Description**: "After you submit content, it appears here. Admins will review it within 24-48 hours. You'll be notified when it's approved or if changes are needed."
- **Position**: `right`

#### Step 5: Recent Submissions
- **Element**: Recent Submissions card
- **Title**: "🖼️ Your Recent Work"
- **Description**: "See your latest submissions here with their current status. Click 'View All' to see your complete submission history."
- **Position**: `top`

#### Step 6: Submission Card (if exists)
- **Element**: First submission card (if exists)
- **Title**: "📋 Submission Details"
- **Description**: "Each card shows your content thumbnail, submission date, and current status. Click to see more details or make edits if it's still pending."
- **Position**: `bottom`
- **ShowIf**: recentSubmissions.length > 0

#### Step 7: View All Submissions
- **Element**: "View All" button in Recent Submissions
- **Title**: "📜 Full History"
- **Description**: "Click here to see all your submissions, filter by status, and track what's been published. You can also re-run this tour anytime from the help menu."
- **Position**: `left`
- **Button**: "Let's go!" (finish)

### User Journey Flow
```
Dashboard → Submit Button → Stats → Pending → Recent → View All → Done
```

### Estimated Time: 1-1.5 minutes

---

## 🎨 Driver.js Configuration

### Global Settings

```typescript
{
  animate: true,                    // Smooth animations
  opacity: 0.75,                    // Overlay darkness
  padding: 10,                      // Space around highlighted element
  allowClose: true,                 // Can dismiss with Esc or click outside
  overlayClickNext: false,          // Must click "Next" to proceed
  doneBtnText: 'Got it!',          // Final button text
  closeBtnText: 'Skip',            // Skip button text
  nextBtnText: 'Next →',           // Next button text
  prevBtnText: '← Back',           // Back button text
  showProgress: true,               // Show "Step 3 of 10"
  progressText: 'Step {{current}} of {{total}}',
  onDestroyStarted: () => {         // When tour ends
    // Save completion to database
  }
}
```

### Step Configuration Pattern

```typescript
{
  element: '#element-id',           // CSS selector or ref
  popover: {
    title: 'Step Title',
    description: 'Step description with **markdown** support',
    side: 'bottom',                 // top, right, bottom, left
    align: 'start',                 // start, center, end
    showButtons: ['next', 'previous', 'close'],
    onNextClick: () => {
      // Custom logic before moving to next step
    }
  }
}
```

---

## 🔧 Technical Implementation Plan

### Phase 1: Database Schema (1 hour)
- Create `user_preferences` table in Supabase
- Add migration: `20260205_add_tour_tracking.sql`
- Fields:
  ```sql
  CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tour_completed BOOLEAN DEFAULT FALSE,
    tour_version INTEGER DEFAULT 1,
    last_tour_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id)
  );
  ```

### Phase 2: Install & Configure Driver.js (30 min)
- Install: `npm install driver.js`
- Create: `lib/tour/driver-config.ts` - Global config
- Create: `lib/tour/admin-tour.ts` - Admin journey steps
- Create: `lib/tour/user-tour.ts` - User journey steps
- Create: `lib/tour/tour-state.ts` - State management (check/save completion)

### Phase 3: Tour Components (1.5 hours)
- Create: `app/components/tour/tour-provider.tsx` - Context provider
- Create: `app/components/tour/tour-trigger.tsx` - Manual trigger button
- Create: `app/hooks/use-tour.ts` - Hook for tour state
- Add IDs/data attributes to tour elements in dashboards

### Phase 4: Dashboard Integration (1 hour)
- Modify `admin-dashboard.tsx` - Add tour trigger on first load
- Modify `user-dashboard.tsx` - Add tour trigger on first load
- Add data attributes to all tour step elements
- Add help button in navigation with tour re-trigger

### Phase 5: API Routes (30 min)
- Create: `app/api/tour/complete/route.ts` - Mark tour as completed
- Create: `app/api/tour/status/route.ts` - Check tour status

### Phase 6: Styling & Polish (1 hour)
- Custom CSS for driver.js theme (match app design)
- Add smooth animations
- Test responsive behavior
- Add emoji/icons in step descriptions

### Phase 7: Testing (1 hour)
- Test admin journey (all 10 steps)
- Test user journey (all 8 steps)
- Test manual re-trigger
- Test skip functionality
- Test state persistence
- E2E tests with Playwright

### Total Estimated Time: ~6-7 hours

---

## 📝 Element ID Requirements

### Admin Dashboard Elements to Tag

```tsx
// Dashboard header
<h1 data-tour="admin-welcome">Welcome back, {userName}</h1>

// Stats grid
<div data-tour="admin-stats-grid">
  <div data-tour="admin-stat-pending">...</div>
  <div data-tour="admin-stat-scheduled">...</div>
  <div data-tour="admin-stat-published">...</div>
  <div data-tour="admin-stat-failed">...</div>
  <div data-tour="admin-stat-users">...</div>
  <div data-tour="admin-stat-quota">...</div>
</div>

// Quick actions
<div data-tour="admin-quick-actions">
  <Link data-tour="admin-action-review" href="/review">...</Link>
  <Link data-tour="admin-action-schedule" href="/schedule">...</Link>
  <Link data-tour="admin-action-users" href="/users">...</Link>
</div>

// Token status
<div data-tour="admin-token-status">...</div>

// Failed alert (conditional)
<Card data-tour="admin-failed-alert">...</Card>

// Navigation
<nav data-tour="admin-navigation">...</nav>
<button data-tour="admin-help-button">Help</button>
```

### User Dashboard Elements to Tag

```tsx
// Dashboard header
<h1 data-tour="user-welcome">Hello, {userName}</h1>

// Submit button
<Button data-tour="user-submit-button">Submit New</Button>

// Stats grid
<div data-tour="user-stats-grid">
  <div data-tour="user-stat-pending">...</div>
  <div data-tour="user-stat-approved">...</div>
  <div data-tour="user-stat-scheduled">...</div>
  <div data-tour="user-stat-published">...</div>
</div>

// Recent submissions
<Card data-tour="user-recent-submissions">
  <div data-tour="user-submission-card">...</div>
  <Button data-tour="user-view-all">View All</Button>
</Card>
```

---

## 🚀 Success Metrics

### KPIs to Track
- **Tour Completion Rate**: % of users who finish the tour
- **Tour Skip Rate**: % of users who skip the tour
- **Time to Complete**: Average time users spend in tour
- **Feature Adoption**: Do users who complete the tour use features more?
- **Re-run Rate**: How many users manually re-trigger the tour?

### Analytics Events to Log
```typescript
// Tour events
'tour_started' - { role: 'admin' | 'user' }
'tour_step_viewed' - { role, step_number, step_id }
'tour_completed' - { role, duration_seconds }
'tour_skipped' - { role, skipped_at_step }
'tour_retriggered' - { role }
```

---

## 🎯 Next Steps

1. **Review this plan** - Get approval on journey structure
2. **Prioritize features** - Any steps to add/remove?
3. **Start Phase 1** - Database schema
4. **Iterate** - Build, test, refine

---

## 📚 References

- [Driver.js Official Docs](https://driverjs.com/)
- [Driver.js Configuration](https://driverjs.com/docs/configuration)
- [Best Practices for Product Tours](https://blog.openreplay.com/creating-onboarding-tours-with-driver-js/)
- [Next.js Integration Guide](https://dev.to/fadilnatakusumah/streamline-user-onboarding-with-driverjs-222e)
