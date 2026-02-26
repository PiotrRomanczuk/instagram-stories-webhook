# MARSZAL ARTS — Visual Guide

Comprehensive visual documentation of every page and key interaction in the application, organized by user role.

**Capture tool:** `npm run capture-docs` (requires dev server running)

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [User Pages](#2-user-pages)
3. [Admin Pages](#3-admin-pages)
4. [Developer Pages](#4-developer-pages)
5. [Mobile Views](#5-mobile-views)
6. [Key Interactions (GIFs)](#6-key-interactions)

---

## 1. Authentication

### Sign In Page

The sign in page with Google OAuth and test mode buttons (dev environment only).

![Sign In](screenshots/public/01-signin.png)

---

## 2. User Pages

Pages accessible to authenticated users with the `user` role.

### Dashboard

The main user dashboard showing submission statistics and recent activity.

![User Dashboard](screenshots/user/01-dashboard.png)

### Submit Content

Empty submission form for uploading images/videos to the story queue.

![Submit Empty](screenshots/user/02-submit-empty.png)

Submission form with an image uploaded, ready for caption and submission.

![Submit With Image](screenshots/user/03-submit-with-image.png)

### Submissions History

List of all content submitted by the current user with status indicators.

![Submissions](screenshots/user/04-submissions.png)

### Memes Gallery

Community meme gallery with voting and filtering.

![Memes Gallery](screenshots/user/05-memes.png)

### Meme Submit

Form for submitting memes to the community gallery.

![Meme Submit](screenshots/user/06-meme-submit.png)

---

## 3. Admin Pages

Pages accessible to users with the `admin` or `developer` role.

### Admin Dashboard

Overview dashboard with publishing stats, queue status, and system health.

![Admin Dashboard](screenshots/admin/01-dashboard.png)

### Review Queue

Swipe-based review interface for approving or rejecting submitted content.

![Review Queue](screenshots/admin/02-review.png)

### Schedule — Day View

Calendar day view showing scheduled posts on a timeline.

![Schedule Day](screenshots/admin/03-schedule-day.png)

### Schedule — Week View

Calendar week view with posts distributed across days.

![Schedule Week](screenshots/admin/04-schedule-week.png)

### Schedule — Month View

Monthly calendar overview of scheduled and published stories.

![Schedule Month](screenshots/admin/05-schedule-month.png)

### Schedule — List View

Flat list view of all scheduled posts with status filters.

![Schedule List](screenshots/admin/06-schedule-list.png)

### Content Hub — Kanban

Kanban board showing content progressing through workflow stages (draft → approved → scheduled → published).

![Content Kanban](screenshots/admin/07-content-kanban.png)

### Content Hub — List View

Table/list view of all content items with sorting and filtering.

![Content List](screenshots/admin/08-content-list.png)

### Posted Stories

Archive of all published Instagram stories with performance metrics.

![Posted Stories](screenshots/admin/09-posted-stories.png)

### Analytics

Aggregated analytics dashboard with charts for publishing activity and engagement.

![Analytics](screenshots/admin/10-analytics.png)

### Insights

Instagram Insights integration showing reach, impressions, and engagement data.

![Insights](screenshots/admin/11-insights.png)

### Inbox

Notification inbox for system alerts, publishing results, and team activity.

![Inbox](screenshots/admin/12-inbox.png)

### Admin Monitoring

System monitoring panel showing cron jobs, API health, and error rates.

![Admin Monitoring](screenshots/admin/13-admin-monitoring.png)

### User Management

Admin panel for managing users, roles, and the email whitelist.

![User Management](screenshots/admin/14-users.png)

### Developer Tools

Developer dashboard with API key management, webhook logs, and debug utilities.

![Developer Tools](screenshots/admin/15-developer-tools.png)

### Cron Debug

Detailed cron job status, execution history, and manual trigger controls.

![Cron Debug](screenshots/admin/16-cron-debug.png)

### Release Notes

Version history and changelog for the application.

![Release Notes](screenshots/admin/17-release-notes.png)

### Debug Info

Debug page showing auth state, token status, and system configuration.

![Debug Info](screenshots/admin/18-debug.png)

---

## 4. Developer Pages

Pages exclusive to the `developer` role.

### Settings

Application settings and configuration panel.

![Settings](screenshots/developer/01-settings.png)

---

## 5. Mobile Views

Key pages captured at 390x844 (iPhone 14 viewport) showing mobile-first responsive design.

### Sign In (Mobile)

![Mobile Sign In](screenshots/mobile/01-signin.png)

### User Dashboard (Mobile)

![Mobile User Dashboard](screenshots/mobile/02-user-dashboard.png)

### Submit (Mobile)

![Mobile Submit](screenshots/mobile/03-submit.png)

### Submissions (Mobile)

![Mobile Submissions](screenshots/mobile/04-submissions.png)

### Admin Dashboard (Mobile)

![Mobile Admin Dashboard](screenshots/mobile/05-admin-dashboard.png)

### Review (Mobile)

![Mobile Review](screenshots/mobile/06-review.png)

### Schedule Timeline (Mobile)

![Mobile Schedule](screenshots/mobile/07-schedule-timeline.png)

### Content (Mobile)

![Mobile Content](screenshots/mobile/08-content.png)

---

## 6. Key Interactions

Animated recordings of the app's key interactive features.

### Login Flow

Sign in page → click Test Admin → redirect to dashboard.

![Login Flow](../gifs/01-login-flow.gif)

### Content Submission

Upload an image and fill in the caption on the submit page.

![Content Submission](../gifs/02-content-submission.gif)

### Swipe Review

Swipe right to approve, swipe left to reject content in the review queue.

![Swipe Review](../gifs/03-swipe-review.gif)

### Drag-and-Drop Scheduling

Drag a ready item from the sidebar onto a calendar time slot.

![Drag-and-Drop Scheduling](../gifs/04-drag-drop-schedule.gif)

### Kanban Drag

Drag a content card between Kanban workflow columns.

![Kanban Drag](../gifs/05-kanban-drag.gif)

### Content Preview Modal

Click a content item to open the preview modal, then close it.

![Content Preview](../gifs/06-content-preview.gif)

### Mobile Navigation

Tap through the bottom navigation bar on mobile.

![Mobile Navigation](../gifs/07-mobile-navigation.gif)

### Theme Toggle

Toggle between light and dark themes.

![Theme Toggle](../gifs/08-theme-toggle.gif)

---

*Generated with `npm run capture-docs`. Re-run after UI changes to keep this guide up to date.*
