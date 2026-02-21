# Feature Implementation History

A complete record of every version released for the Instagram Stories Webhook application, from initial concept to the current state. Each entry describes what was delivered and the verified development time.

---

## Project Summary

| Metric | Value |
| :--- | :--- |
| **Project Start** | January 12, 2026 |
| **Latest Release** | February 21, 2026 |
| **Total Versions Released** | 26 |
| **Total Commits** | 427 |
| **Total Work Sessions** | 52 |
| **Active Development Days** | 29 |
| **Longest Session** | 8h 53m (January 29) |
| **Average Session** | 2h 7m |
| **Total Verified Hours** | **112.6 hours** |

> Hours are calculated from git commit timestamps using `scripts/work-hours.ts`. Each work session adds 30 minutes to account for setup and planning time before the first commit. A gap of more than 2 hours between commits starts a new session. Per-version hours are computed by mapping session time to version release periods — when a single session spans multiple releases, its time is split proportionally.

---

## Version Effort Breakdown

| Version | Title | Hours | Sessions | Date |
| :--- | :--- | ---: | ---: | :--- |
| v0.1.0 | MVP Launch | 1.0h | 2 | Jan 12-15 |
| v0.2.0 | Media Engine & Core Features | 8.3h | 3 | Jan 16-18 |
| v0.3.0 | Admin Platform & Deployment | 11.3h | 4 | Jan 21-23 |
| v0.4.0 | Access Control & Roles | 7.5h | 6 | Jan 26-28 |
| v0.5.0 | Production Hardening | 8.6h | 2 | Jan 28-29 |
| v0.6.0 | Content Hub | 6.3h | 2 | Jan 29-30 |
| v0.7.0 | UI Redesign | 3.0h | 3 | Jan 30-31 |
| v0.8.0 | StoryFlow & Calendar | 8.8h | 4 | Jan 31 - Feb 2 |
| v0.9.0 | Testing & Quality | 6.1h | 3 | Feb 2-5 |
| v0.10.0 | Mobile-First Redesign | 6.0h | 6 | Feb 6-8 |
| v0.11.0 | Architecture & Workflow | 2.0h | 2 | Feb 8-11 |
| v0.12.0 | Security & Reliability | 1.0h | 2 | Feb 11 |
| v0.13.0 | Release Management | 2.1h | 1 | Feb 11 |
| v0.14.0 | Advanced Media Processing | 0.6h | 2 | Feb 13-15 |
| v0.15.0 | Local Development Tools | 0.5h | 1 | Feb 15 |
| v0.16.0 | Posted Stories History | 0.9h | 1 | Feb 15 |
| v0.17.0 | Mobile Responsiveness & Security | 7.1h | 3 | Feb 15-16 |
| v0.18.0 | Scheduler Reliability | 2.4h | 1 | Feb 16 |
| v0.19.0 | Video Infrastructure & Time Selection | 18.2h | 8 | Feb 16-18 |
| v0.21.0 | Swipe Gestures & Permissions | *† | *† | Feb 18 |
| v0.21.1 | Documentation & Polish | 0.2h | 1 | Feb 18 |
| v0.21.2 | Time Picker & User Management | 3.7h | 2 | Feb 19-20 |
| v0.23.0 | Real-Time Dashboard | 0.5h | 1 | Feb 20 |
| v0.24.0 | Dual E2E Testing & i18n | 2.7h | 3 | Feb 20-21 |
| v0.25.0 | Swipe Review & Video Processing | 1.5h | 1 | Feb 21 |
| v0.26.0 | Version History & Automation | 2.0h | 1 | Feb 21 |

> **†** v0.21.0 was released at the same tag point as v0.19.0 — its effort is included in v0.19.0's 18.2 hours.

> **Note**: v0.14.0 through v0.16.0 were rapid-fire releases during an 8-hour marathon session on Feb 15. The session's time is split across the 4 versions it produced (v0.14.0–v0.17.0), so individual hours appear low.

---

## Released Versions

### v0.26.0 — Version History & Automation (February 21, 2026)
*3 commits | 1 session | 2.0 verified hours*

- **Version Gap Fix**: Added 4 missing version entries (v0.21.2, v0.23.0, v0.24.0, v0.25.0) that had package.json bumps and PR merges but were never documented or git-tagged.
- **History Doc Enhancement**: Enhanced the feature implementation history with per-version verified hours, a daily hours report with cumulative totals, and a full 52-session work log.
- **Gap Detection Script**: New `npm run check-history` command that compares git tags against history doc entries and reports mismatches. Supports `--fix` to generate skeleton entries.
- **Workflow Automation**: Added history update reminders to `/ship` (Phase 9) and `/deploy-production` (Step 6) workflows to prevent future gaps.
- **Preview Test Credentials**: Enabled test credentials on Vercel preview deployments for E2E testing.

---

### v0.25.0 — Swipe Review & Video Processing (February 21, 2026)
*8 commits | 2 sessions | 1.5 verified hours*

- **Tinder-Style Review**: Admins can swipe left (reject) or right (approve) on the review page, making mobile content review much faster (INS-57).
- **Video Processing Optimization**: Videos that were already processed no longer get re-processed at publish time, saving server resources and reducing publish latency (INS-58).
- **Processing Status Indicator**: Users can now see a real-time progress bar when their video is being prepared for Instagram.
- **Debug Page Restricted**: Debug page access limited to admin and developer roles only.

---

### v0.24.0 — Dual E2E Testing & i18n (February 21, 2026)
*12 commits | 2 sessions | 2.7 verified hours*

- **Dual E2E Testing**: Automated tests now run separately for preview (~40 tests) and production (~113 tests) deployments, catching bugs earlier without slowing down the release pipeline.
- **Deploy Production Skill**: New `/deploy` command for triggering production deployments.
- **English-Only Simplification**: Removed multi-language routing for cleaner URLs and simpler codebase.
- **Blank Video Preview Fix**: Videos now display a proper first frame in previews using a seek trick (`#t=0.1`).

---

### v0.23.0 — Real-Time Dashboard (February 20, 2026)
*10 commits | 2 sessions | 0.5 verified hours*

- **SWR Cache & Realtime Sync**: Dashboard data now updates in real-time without page refreshes using SWR cache infrastructure.
- **Optimistic UI Updates**: Actions like approve/reject update the interface immediately with automatic rollback if the server request fails.

---

### v0.21.2 — Time Picker & User Management (February 20, 2026)
*6 commits | 1 session | 3.7 verified hours*

- **Inline Date/Time Controls**: Replaced the old bottom-sheet date picker with cleaner inline controls.
- **3-Minute Scheduling Buffer**: Posts must be scheduled at least 3 minutes in the future to prevent race conditions.
- **Admin Add-User Fix**: Resolved a database schema mismatch that prevented admins from adding new users.
- **Hidden Internal Fields**: Removed internal-only fields from the content edit interface.

---

### v0.21.1 — Documentation & Polish (February 18, 2026)
*5 commits | 1 session | 0.2 verified hours*

- **Documentation Overhaul**: Reorganized all technical and non-technical guides for easier onboarding.
- **Architecture Diagrams**: Added visual flows for publishing, scheduling, and authentication processes.

---

### v0.21.0 — Swipe Gestures & Permissions (February 18, 2026)
*5 commits | released alongside v0.19.0*

- **Swipe Gestures for Review**: Added swipe-based approve/reject for the content review workflow on mobile.
- **Role-Based Navigation**: The mobile bottom navigation now shows only the pages each user role has access to.
- **Re-Review from History**: Admins can go back to previously reviewed items and change their decision.

---

### v0.19.0 — Video Infrastructure & Time Selection (February 16-18, 2026)
*44 commits | 5 sessions | 18.2 verified hours*

- **Direct-to-Storage Uploads**: Rebuilt the upload system so videos go directly to cloud storage, bypassing the 4.5 MB server limit. Users can now upload much larger video files.
- **Unified Video Player**: All video previews across the app now use a consistent player that works reliably on iPhone, iPad, and desktop browsers.
- **Automatic Thumbnails**: Videos display a proper preview image in grid views instead of a generic file icon.
- **24-Hour Time Picker**: Replaced the AM/PM selector with a cleaner 24-hour format and fixed bugs where selecting a time could accidentally change the date.
- **Merged Scheduling Components**: Combined two separate scheduling interfaces into one streamlined drag-and-drop scheduler.

---

### v0.18.0 — Scheduler Reliability (February 16, 2026)
*6 commits | 1 session | 2.4 verified hours*

- **Time Slot Conflict Prevention**: The system now blocks scheduling two posts at the exact same time, preventing publishing failures.
- **Mobile Scheduler Fixes**: Resolved bugs that made it difficult to select dates and times on phone screens.
- **MVP Feature Lockdown**: Hid incomplete features from the interface to present a clean, focused product.
- **Auto-Retry for Failed Posts**: Posts that fail to publish are automatically retried with increasing wait times before being marked as failed.

---

### v0.17.0 — Mobile Responsiveness & Security (February 15-16, 2026)
*30 commits | 2 sessions | 7.1 verified hours*

- **Mobile Layout Fixes**: Fixed visual bugs on small screens across all core pages (Login, Dashboard, Schedule, Review).
- **Token Encryption**: Facebook and Instagram access tokens are now encrypted in the database, not stored as plain text.
- **Health Monitoring Endpoint**: Added a system health check URL for uptime monitoring services.
- **Cron Reliability**: Fixed issues where scheduled posts could silently fail to publish.

---

### v0.16.0 — Posted Stories History (February 15, 2026)
*2 commits | 1 session | 0.9 verified hours*

- **History Page**: A dedicated page showing all previously published stories with their status, timestamps, and preview images.

---

### v0.15.0 — Local Development Tools (February 15, 2026)
*1 commit | 1 session | 0.5 verified hours*

- **Local Cron Runner**: Developers can now test the auto-publishing scheduler on their own machines without deploying to the server.

---

### v0.14.0 — Advanced Media Processing (February 13-15, 2026)
*11 commits | 2 sessions | 0.6 verified hours*

- **Video Engine (FFmpeg)**: Integrated professional video processing. Uploaded videos are automatically resized, cropped, and optimized for Instagram's 9:16 Story format.
- **Pre-Publish Validation**: Deeper checks on media files before sending them to Instagram, reducing failed publish attempts.
- **Code Quality**: Replaced broad database queries with targeted column selection for faster page loads.

---

### v0.13.0 — Release Management (February 11, 2026)
*5 commits | 1 session | 2.1 verified hours*

- **Semantic Versioning**: Introduced formal version numbering (v0.1.0, v0.2.0, etc.) to track every release professionally.
- **Retroactive Tags**: Applied version tags to all historical milestones for a complete project audit trail.

---

### v0.12.0 — Security & Reliability (February 11, 2026)
*3 commits | 1 session | 1.0 verified hours*

- **Proactive Token Refresh**: The system now detects when Facebook/Instagram tokens are about to expire and refreshes them automatically, preventing unexpected login failures.
- **149 Automated Tests**: Added comprehensive test coverage for all critical backend modules.
- **Security Hardening**: Closed vulnerabilities in debug, configuration, cron, and webhook endpoints.
- **Bug Fixes**: Resolved 6 backend reliability issues affecting scheduled post processing.

---

### v0.11.0 — Architecture & Workflow (February 5-11, 2026)
*10 commits | 2 sessions | 2.0 verified hours*

- **PR-Based Deployments**: Every code change now goes through a pull request with automated checks before it can be deployed.
- **AI-Assisted Development**: Adopted structured AI coding workflows to accelerate feature delivery while maintaining quality.

---

### v0.10.0 — Mobile-First Redesign (February 8, 2026)
*27 commits | 4 sessions | 6.0 verified hours*

- **Complete Mobile Overhaul**: Rebuilt all pages to work perfectly on smartphones with touch-friendly controls.
- **Bottom Action Sheets**: Replaced dropdown menus (which got clipped on small screens) with slide-up action sheets.
- **Swipe-to-Schedule**: Quick scheduling directly from the content list using swipe gestures.
- **Real API Quota Display**: The admin dashboard now shows actual Instagram API usage instead of placeholder data.
- **Failed Posts Management**: A proper workflow to view, retry, or delete posts that failed to publish.

---

### v0.9.0 — Testing & Quality (January 30 - February 5, 2026)
*22 commits | 4 sessions | 6.1 verified hours*

- **End-to-End Testing**: Introduced automated tests that simulate real user behavior (login, submit content, approve, publish) to catch bugs before they reach production.
- **User Whitelist Management**: Admins can now add and remove authorized users directly from the interface.
- **Preview Deployments**: Every pull request gets its own temporary URL for testing before merging.

---

### v0.8.0 — StoryFlow & Calendar (January 31 - February 2, 2026)
*32 commits | 5 sessions | 8.8 verified hours*

- **Visual Calendar**: A calendar view showing all scheduled posts with time blocks, so you can see your publishing plan at a glance.
- **Quick Schedule Popover**: Click any time slot on the calendar to instantly schedule a post with minute-level precision.
- **Granularity Controls**: Zoom in/out on the calendar using +/- buttons or Ctrl+scroll.
- **StoryFlow Interface**: A unified design for managing content through its lifecycle: Submit, Review, Schedule, Publish.

---

### v0.7.0 — UI Redesign (January 31, 2026)
*12 commits | 2 sessions | 3.0 verified hours*

- **Complete Visual Refresh**: Rebuilt every page using the ShadCN component library for a modern, clean, and accessible interface.
- **Consistent Design Language**: All pages (Dashboard, Review, Schedule, Settings, Users) now share the same visual style and interaction patterns.

---

### v0.6.0 — Content Hub (January 29-30, 2026)
*28 commits | 3 sessions | 6.3 verified hours*

- **Content Management Hub**: A central place to browse, search, filter, and manage all uploaded content.
- **Bulk Actions**: Select multiple items and approve, reject, or delete them at once with a floating action bar.
- **Quick Inline Review**: Approve or reject content directly from the list view without opening a separate page.
- **Hover Previews**: See a story preview by hovering over any item in the content list.
- **Status Details**: Each content item now shows detailed status information including error messages for failed posts.

---

### v0.5.0 — Production Hardening (January 27-29, 2026)
*36 commits | 5 sessions | 8.6 verified hours*

- **Cron Debug Interface**: A comprehensive dashboard for monitoring scheduled task execution and troubleshooting publishing issues.
- **Bulk Force-Process**: Manually trigger processing for overdue posts that got stuck in the queue.
- **Story Preview**: See how your content will look as an Instagram Story before publishing.
- **Media URL Health Checks**: Automatic detection and reporting of broken media links.
- **Submit Now**: One-click content submission that bypasses the scheduling step for urgent posts.

---

### v0.4.0 — Access Control & Roles (January 26-28, 2026)
*50 commits | 5 sessions | 7.5 verified hours*

- **3-Tier Role System**: Users are now categorized as Admin (full control), Developer (debugging access), or User (submit content only).
- **Email Whitelist**: Only approved email addresses can access the application.
- **User Management Table**: Admins can search, filter, and manage all users. The current user is highlighted for easy identification.
- **Last-Developer Protection**: The system prevents accidentally removing the last developer account, ensuring someone always has debugging access.
- **Instagram Direct Messaging**: Initial integration for reading Instagram DMs.

---

### v0.3.0 — Admin Platform & Deployment (January 21-23, 2026)
*28 commits | 3 sessions | 11.3 verified hours*

- **Admin Dashboard**: A dedicated control panel for admins to manage users, review content, and monitor system health.
- **Community Submissions**: Users can submit memes and content through a dedicated submission page.
- **Memes Management**: Admin interface for reviewing, approving, and scheduling submitted content.
- **Vercel Deployment**: Configured the application for cloud hosting with security hardening and cron job migration.

---

### v0.2.0 — Media Engine & Core Features (January 16-18, 2026)
*16 commits | 3 sessions | 8.3 verified hours*

- **Media Processing**: Image optimization to ensure photos display correctly as Instagram Stories.
- **Drag-and-Drop Grid**: Visual grid for reordering posts with drag-and-drop.
- **Insights Dashboard**: View Instagram engagement metrics (views, replies) for published stories.
- **Quota Monitoring**: Track API usage to stay within Instagram's rate limits.
- **Scheduled Publishing**: Automated posting at specified times using a background scheduler.

---

### v0.1.0 — MVP Launch (January 12-15, 2026)
*2 commits | 2 sessions | 1.0 verified hours*

- **Google Login**: Secure authentication using Google accounts.
- **Instagram Account Linking**: Connect an Instagram Business account via Facebook.
- **Basic Publishing**: Submit an image or video and publish it as an Instagram Story.
- **Debug Dashboard**: A developer tool to inspect authentication status and API connectivity.

---

## Development Timeline

```
                                                              Hours
Jan 12-15  [##]                              v0.1.0   1.0h   MVP Launch
Jan 16-18  [########]                        v0.2.0   8.3h   Media Engine
Jan 21-23  [############]                    v0.3.0  11.3h   Admin Platform
Jan 26-28  [################]                v0.4.0   7.5h   Access Control
Jan 27-29  [####################]            v0.5.0   8.6h   Production Hardening
Jan 29-30  [########]                        v0.6.0   6.3h   Content Hub
Jan 31     [######]                          v0.7.0   3.0h   UI Redesign
Jan 31-Feb 2 [##########]                    v0.8.0   8.8h   StoryFlow & Calendar
Jan 30-Feb 5 [############]                  v0.9.0   6.1h   Testing & Quality
Feb 8      [############]                    v0.10.0  6.0h   Mobile-First Redesign
Feb 5-11   [####]                            v0.11.0  2.0h   Architecture & Workflow
Feb 11     [##]                              v0.12.0  1.0h   Security & Reliability
Feb 11     [####]                            v0.13.0  2.1h   Release Management
Feb 13-15  [##]                              v0.14.0  0.6h   Advanced Media Processing
Feb 15     [##]                              v0.15.0  0.5h   Local Dev Tools
Feb 15     [##]                              v0.16.0  0.9h   Stories History
Feb 15-16  [########]                        v0.17.0  7.1h   Mobile & Security
Feb 16     [####]                            v0.18.0  2.4h   Scheduler Reliability
Feb 16-18  [####################]            v0.19.0 18.2h   Video Infrastructure
Feb 18     [##]                              v0.21.0    —    Swipe & Permissions
Feb 18     [##]                              v0.21.1  0.2h   Documentation
Feb 20     [####]                            v0.21.2  3.7h   Time Picker & Users
Feb 20     [##]                              v0.23.0  0.5h   Real-Time Dashboard
Feb 21     [######]                          v0.24.0  2.7h   Dual E2E & i18n
Feb 21     [####]                            v0.25.0  1.5h   Swipe Review & Video
Feb 21     [####]                            v0.26.0  2.0h   Version History & Automation
```

---

## Daily Hours Report

Total development effort distributed across 29 active days. "Cumulative" shows the running total of verified hours from project start.

| Date | Day | Sessions | Hours | Cumulative | Versions Worked On |
| :--- | :--- | ---: | ---: | ---: | :--- |
| Jan 12 | Sun | 1 | 0.5h | 0.5h | v0.1.0 |
| Jan 15 | Wed | 1 | 0.5h | 1.0h | v0.1.0 |
| Jan 16 | Thu | 1 | 2.0h | 3.0h | v0.2.0 |
| Jan 17 | Fri | 1 | 4.2h | 7.2h | v0.2.0 |
| Jan 18 | Sat | 1 | 2.1h | 9.3h | v0.2.0 |
| Jan 21 | Tue | 1 | 3.2h | 12.5h | v0.3.0 |
| Jan 22 | Wed | 2 | 3.0h | 15.5h | v0.3.0 |
| Jan 23 | Thu | 1 | 5.1h | 20.6h | v0.3.0 |
| Jan 26 | Sun | 2 | 4.2h | 24.7h | v0.4.0 |
| Jan 27 | Mon | 3 | 2.6h | 27.3h | v0.4.0 |
| Jan 28 | Tue | 2 | 3.9h | 31.1h | v0.4.0, v0.5.0 |
| Jan 29 | Wed | 1 | 8.9h | 40.0h | v0.5.0, v0.6.0 |
| Jan 30 | Thu | 2 | 4.3h | 44.3h | v0.6.0, v0.7.0 |
| Jan 31 | Fri | 3 | 6.3h | 50.5h | v0.7.0, v0.8.0 |
| Feb 2 | Sun | 2 | 4.2h | 54.7h | v0.8.0 |
| Feb 4 | Tue | 1 | 1.9h | 56.6h | v0.9.0 |
| Feb 5 | Wed | 3 | 4.2h | 60.8h | v0.9.0, v0.10.0 |
| Feb 6 | Thu | 1 | 0.5h | 61.3h | v0.10.0 |
| Feb 7 | Fri | 1 | 0.6h | 61.9h | v0.10.0 |
| Feb 8 | Sat | 4 | 5.8h | 67.7h | v0.10.0, v0.11.0 |
| Feb 11 | Tue | 4 | 4.2h | 71.9h | v0.11.0, v0.12.0, v0.13.0 |
| Feb 13 | Thu | 1 | 0.5h | 72.4h | v0.14.0 |
| Feb 15 | Sat | 2 | 8.5h | 80.9h | v0.14.0–v0.17.0 (marathon) |
| Feb 16 | Sun | 3 | 6.7h | 87.6h | v0.17.0, v0.18.0, v0.19.0 |
| Feb 17 | Mon | 2 | 8.5h | 96.1h | v0.19.0 |
| Feb 18 | Tue | 3 | 5.6h | 101.7h | v0.19.0, v0.21.0, v0.21.1 |
| Feb 19 | Wed | 1 | 0.7h | 102.4h | v0.21.2 |
| Feb 20 | Thu | 1 | 4.6h | 106.9h | v0.21.2, v0.23.0, v0.24.0 |
| Feb 21 | Fri | 3 | 5.7h | 112.6h | v0.24.0, v0.25.0, v0.26.0 |

**Peak week**: January 26–31 (29.7 hours across 6 days)
**Heaviest days**: Jan 29 (8.9h), Feb 15 (8.5h), Feb 17 (8.5h)

```
              Hours per day
Jan 12  #                                          0.5h
Jan 15  #                                          0.5h
Jan 16  ####                                       2.0h
Jan 17  ########                                   4.2h
Jan 18  ####                                       2.1h
Jan 21  ######                                     3.2h
Jan 22  ######                                     3.0h
Jan 23  ##########                                 5.1h
Jan 26  ########                                   4.2h
Jan 27  #####                                      2.6h
Jan 28  ########                                   3.9h
Jan 29  ##################                         8.9h  ← longest day
Jan 30  #########                                  4.3h
Jan 31  #############                              6.3h
Feb 2   ########                                   4.2h
Feb 4   ####                                       1.9h
Feb 5   ########                                   4.2h
Feb 6   #                                          0.5h
Feb 7   #                                          0.6h
Feb 8   ############                               5.8h
Feb 11  ########                                   4.2h
Feb 13  #                                          0.5h
Feb 15  #################                          8.5h  ← v0.14.0–v0.17.0 marathon
Feb 16  ##############                             6.7h
Feb 17  #################                          8.5h
Feb 18  ###########                                5.6h
Feb 19  #                                          0.7h
Feb 20  #########                                  4.6h
Feb 21  ###########                                  5.7h
```

---

## Work Sessions

All 52 development sessions, ordered chronologically. Each row shows the session start/end times, commit count, raw work time, the 30-minute planning buffer, and the total.

| # | Date | Time | Commits | Raw | +30m | Total |
| ---: | :--- | :--- | ---: | ---: | ---: | ---: |
| 1 | Jan 12 | 20:27 – 20:27 | 1 | 0m | +30m | **30m** |
| 2 | Jan 15 | 19:46 – 19:46 | 1 | 0m | +30m | **30m** |
| 3 | Jan 16 | 19:50 – 21:19 | 3 | 1h 29m | +30m | **1h 59m** |
| 4 | Jan 17 | 13:22 – 17:02 | 10 | 3h 40m | +30m | **4h 10m** |
| 5 | Jan 18 | 13:07 – 14:45 | 3 | 1h 38m | +30m | **2h 8m** |
| 6 | Jan 21 | 16:10 – 18:49 | 6 | 2h 39m | +30m | **3h 9m** |
| 7 | Jan 22 | 12:07 – 13:15 | 6 | 1h 8m | +30m | **1h 38m** |
| 8 | Jan 22 | 21:20 – 22:14 | 5 | 54m | +30m | **1h 24m** |
| 9 | Jan 23 | 08:47 – 13:22 | 11 | 4h 35m | +30m | **5h 5m** |
| 10 | Jan 26 | 14:46 – 16:50 | 9 | 2h 4m | +30m | **2h 34m** |
| 11 | Jan 26 | 20:50 – 21:56 | 13 | 1h 5m | +30m | **1h 35m** |
| 12 | Jan 27 | 16:07 – 16:43 | 10 | 36m | +30m | **1h 6m** |
| 13 | Jan 27 | 21:08 – 21:08 | 1 | 0m | +30m | **30m** |
| 14 | Jan 27 | 23:28 – 23:55 | 7 | 27m | +30m | **57m** |
| 15 | Jan 28 | 08:17 – 08:34 | 14 | 17m | +30m | **47m** |
| 16 | Jan 28 | 19:55 – 22:30 | 10 | 2h 35m | +30m | **3h 5m** |
| 17 | Jan 29 | 13:30 – 21:54 | 30 | 8h 23m | +30m | **8h 53m** |
| 18 | Jan 30 | 08:59 – 11:22 | 20 | 2h 23m | +30m | **2h 53m** |
| 19 | Jan 30 | 22:20 – 23:12 | 5 | 52m | +30m | **1h 22m** |
| 20 | Jan 31 | 09:53 – 09:53 | 1 | 0m | +30m | **30m** |
| 21 | Jan 31 | 11:57 – 14:43 | 17 | 2h 46m | +30m | **3h 16m** |
| 22 | Jan 31 | 18:05 – 20:05 | 6 | 2h 1m | +30m | **2h 31m** |
| 23 | Feb 2 | 10:38 – 11:31 | 7 | 53m | +30m | **1h 23m** |
| 24 | Feb 2 | 16:19 – 18:35 | 10 | 2h 16m | +30m | **2h 46m** |
| 25 | Feb 5 | 00:36 – 02:01 | 9 | 1h 25m | +30m | **1h 55m** |
| 26 | Feb 5 | 11:29 – 11:33 | 2 | 4m | +30m | **34m** |
| 27 | Feb 5 | 15:29 – 18:35 | 10 | 3h 6m | +30m | **3h 36m** |
| 28 | Feb 6 | 21:24 – 21:24 | 1 | 0m | +30m | **30m** |
| 29 | Feb 7 | 16:15 – 16:18 | 3 | 4m | +30m | **34m** |
| 30 | Feb 8 | 10:38 – 10:43 | 2 | 5m | +30m | **35m** |
| 31 | Feb 8 | 12:54 – 15:09 | 13 | 2h 15m | +30m | **2h 45m** |
| 32 | Feb 8 | 18:57 – 19:14 | 5 | 16m | +30m | **46m** |
| 33 | Feb 8 | 21:29 – 22:41 | 7 | 1h 13m | +30m | **1h 43m** |
| 34 | Feb 11 | 12:08 – 12:45 | 5 | 37m | +30m | **1h 7m** |
| 35 | Feb 11 | 16:16 – 16:16 | 1 | 0m | +30m | **30m** |
| 36 | Feb 11 | 18:18 – 18:18 | 1 | 0m | +30m | **30m** |
| 37 | Feb 11 | 20:40 – 22:16 | 6 | 1h 37m | +30m | **2h 7m** |
| 38 | Feb 13 | 14:22 – 14:22 | 1 | 0m | +30m | **30m** |
| 39 | Feb 15 | 14:14 – 21:45 | 40 | 7h 31m | +30m | **8h 1m** |
| 40 | Feb 15 | 23:53 – 23:53 | 1 | 0m | +30m | **30m** |
| 41 | Feb 16 | 10:02 – 14:31 | 13 | 4h 29m | +30m | **4h 59m** |
| 42 | Feb 16 | 17:12 – 17:44 | 5 | 33m | +30m | **1h 3m** |
| 43 | Feb 16 | 23:40 – 23:49 | 6 | 9m | +30m | **39m** |
| 44 | Feb 17 | 14:35 – 17:51 | 3 | 3h 16m | +30m | **3h 46m** |
| 45 | Feb 17 | 20:55 – 01:08 | 13 | 4h 13m | +30m | **4h 43m** |
| 46 | Feb 18 | 13:36 – 17:20 | 7 | 3h 43m | +30m | **4h 13m** |
| 47 | Feb 18 | 20:04 – 20:04 | 1 | 0m | +30m | **30m** |
| 48 | Feb 18 | 23:05 – 23:29 | 9 | 24m | +30m | **54m** |
| 49 | Feb 19 | 10:55 – 11:06 | 3 | 11m | +30m | **41m** |
| 50 | Feb 20 | 12:41 – 16:45 | 22 | 4h 4m | +30m | **4h 34m** |
| 51 | Feb 21 | 09:22 – 10:29 | 22 | 1h 8m | +30m | **1h 38m** |
| 52 | Feb 21 | 14:50 – 16:23 | 7 | 1h 32m | +30m | **2h 2m** |

---

*This document is generated from verified git history. Run `npx tsx scripts/work-hours.ts --verbose` to regenerate the hours report, or `npm run check-history` to detect version gaps.*
