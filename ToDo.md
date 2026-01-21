# 📋 Project Roadmap: Instagram Story Automation

This roadmap outlines the planned enhancements and maintenance tasks for the Instagram Story Automation tool.

---

## 🛠️ Core Features & Stability
- [x] **Webhook Security**: Implement secret token validation for `/api/webhook/story` to prevent unauthorized triggers.
- [x] **Cron Security**: Secure the `/api/schedule/process` endpoint with an `API_KEY` header requirement.
- [x] **Retry Logic**: Implement an exponential backoff retry mechanism for failed Instagram API calls.
- [x] **Supabase Storage Integration**: Allow direct file uploads to Supabase buckets instead of just pasting URLs.
- [ ] **Cloud Drive Picker**: Integrate Google Drive/Dropbox pickers to select media files.
- [x] **Media Auto-Cleanup**: Automatically delete files from storage after successful publishing to save space.
- [x] **Aspect Ratio Validation**: Check image dimensions before upload and auto-process to 9:16 for Stories.
    - [x] Phase 1: Create `lib/media/validator.ts` with aspect ratio analysis utilities.
    - [x] Phase 2: Create `lib/media/processor.ts` with Sharp-based image resizing/padding.
    - [x] Phase 3: Add `/api/media/process` endpoint for server-side processing.
    - [x] Phase 4: Update `schedule-form.tsx` with validation UI and processing prompts.
- [ ] **Edit Schedules**: Add the ability to edit existing scheduled posts (url, time, type) rather than just deleting.
- [ ] **Multi-Post Support**: Support scheduling multiple stories in sequence (carousels or story sequences).
- [ ] **User Tagging**: Implement programmatic @mentions in Stories and Feed posts (Ref: `docs/FEATURE_USER_TAGGING_PLAN.md`).
    - [ ] Phase 1: Update `lib/types.ts` and Supabase schema with `user_tags` column.
    - [ ] Phase 2: Update `publishMedia` to handle stringified `user_tags`.
    - [ ] Phase 3: Update Frontend form to allow entering usernames for tagging.
- [ ] **Resumable Uploads**: Implement the Meta Resumable Upload Protocol (v20+) for direct file uploads to Meta servers, reducing dependency on public URLs.
- [ ] **Rate Limit Monitoring**: Integrate with `/{ig-user-id}/content_publishing_limit` (v24+) to check quota before scheduling/publishing.


## 🎨 User Experience & UI (Aesthetics & Feel)
- [x] **Supabase Realtime**: Implement real-time status updates on the dashboard using Supabase subscriptions.
- [ ] **Dark Mode**: Add a sleek, glassmorphic dark mode theme.
- [x] **Media Preview**: Show a live preview of the image/video when pasteing a URL in the scheduling form.
- [ ] **Calendar View**: Implement a visual calendar to manage scheduled content.
- [ ] **Micro-animations**: Add Framer Motion transitions for state changes and form submissions.
- [ ] **Interactive Onboarding**: Create a guided "Setup Wizard" for fresh Meta App connections.

## 🔐 Authentication & Security
- [ ] **Token Health Monitor**: Implement a background job or middleware to check token expiration and alert/auto-refresh.
- [x] **Auto-Extension**: Automatically call the Meta long-lived token refresh endpoint before expiry.
- [ ] **Permission Audit**: Add a UI component to verify if all required Meta permissions (scopes) are active.
- [ ] **Multi-User Architecture**: Refactor `lib/db.ts` to support multiple accounts/users instead of a single fixed ID.

## 📈 Analytics & Insights
- [ ] **Post Analytics**: Fetch and display metrics (views, reach) for successfully published stories using the unified `views` metric (v22+).
- [ ] **Performance Dashboard**: Add a "Statistics" tab to visualize engagement trends for published stories and reels.
- [ ] **Error Logs UI**: Create a dedicated view for detailed error logs from failed API calls to help troubleshooting.
- [ ] **Audit Trail**: Keep a history of configuration changes (e.g., when the Meta token was updated).

## 📄 Documentation & DevOps
- [ ] **Production Deployment Guide**: Add detailed steps for deploying to Vercel + Supabase.
- [ ] **Consolidate Docs**: Merge overlapping information in `README.md`, `GUIDES.md`, and `TROUBLESHOOTING.md`.
- [ ] **Environment Validation**: Add a script or middleware to validate required `.env` variables on startup.
- [ ] **Automated Testing**: Add unit tests for the Instagram publishing logic and API route handlers.

---

## ✅ Completed
- [x] Initial Meta OAuth implementation.
- [x] Story publishing via Webhook.
- [x] Basic scheduling UI and storage.
- [x] **Migration to Supabase**: Moved from local JSON storage to PostgreSQL.
- [x] Refactored components for SRP (Single Responsibility Principle).
- [x] Unified documentation structure.
## 📋 Prioritized Next Steps

### 🔧 High Priority
- [x] **Retry Logic**: Implement exponential backoff for failed Instagram API calls to improve reliability.
- [/] **Automated Testing**: Add unit tests for publishing logic and API routes. (Publishing logic ✅)
- [ ] **Token Health Monitor**: Background job to check token expiration and auto-refresh.

### 🎨 UI Enhancements
- [ ] **Dark Mode**: Implement a sleek, glassmorphic dark theme.
- [ ] **Micro-animations**: Add Framer Motion transitions for state changes.

### 📈 Analytics
- [ ] **Post Analytics**: Fetch and display view/reach metrics for published stories.
