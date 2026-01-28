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
- [x] **Production Deployment Guide**: ✅ Comprehensive deployment guide in CLAUDE.md (Deployment Notes, Multi-Environment Configuration)
- [x] **Consolidate Docs**: ✅ Created unified documentation structure:
    - [x] CLAUDE.md (1400+ lines) - Comprehensive development guide
    - [x] WORKFLOWS.md (800+ lines) - 11 task playbooks
    - [x] .github/github-guide.md - GitHub workflow guide
- [x] **Environment Validation**: ✅ Documented in CLAUDE.md (Environment Variables Precedence section)
- [x] **Automated Testing**: ✅ Comprehensive testing guide in CLAUDE.md (Testing Strategy, Edge Case Testing Patterns); workflows in WORKFLOWS.md
- [x] **Claude Code Integration**: ✅ Created MCP manifest and context guide for Claude Code assistance
- [x] **GitHub Integration**: ✅ Created 7 issue templates + PR template for guided workflows
- [x] **Developer Onboarding**: ✅ Complete setup checklist in CLAUDE.md (Developer Environment Setup)

---

## ✅ Completed

### Infrastructure & Core
- [x] Initial Meta OAuth implementation.
- [x] Story publishing via Webhook.
- [x] Basic scheduling UI and storage.
- [x] **Migration to Supabase**: Moved from local JSON storage to PostgreSQL.
- [x] Refactored components for SRP (Single Responsibility Principle).

### Documentation & Developer Experience (Completed Jan 26, 2026)
- [x] **CLAUDE.md Enhancement**: Comprehensive development guide with 15+ new sections:
    - Database Schema & Relationships
    - Database Migrations & Rollback
    - Performance Profiling
    - Pre-Deployment Security Audit Checklist
    - Breaking Changes & Deprecation
    - Cache Invalidation Strategy
    - Component Composition Decision Tree
    - Custom Hook Development
    - Error Recovery Patterns
    - Feature Flags & A/B Testing
    - Dependency Upgrade Strategy
    - Code Review Guidelines
    - File Naming Conventions
    - Instagram API Rate Limiting
    - Monitoring & Alerting
    - Developer Environment Setup
    - Edge Case Testing
    - Troubleshooting Decision Tree
    - Folder Structure Rationale
    - Logging Best Practices
    - Environment Variables
    - Backward Compatibility
    - Advanced Debugging
    - Multi-Environment Configuration

- [x] **WORKFLOWS.md Creation**: 11 detailed task playbooks:
    1. Create & Deploy Database Migration
    2. Debug Scheduled Post Failures
    3. Pre-Deployment Security Audit
    4. Investigate High Error Rate
    5. Implement Feature Flag Rollout
    6. Optimize Slow API Endpoint
    7. Handle Instagram API Rate Limit
    8. Handle Critical Production Issue
    9. Add Comprehensive Tests for Feature
    10. Troubleshoot Development Environment
    11. Update Dependencies Safely

- [x] **MCP Server Integration**:
    - .claude/mcp-manifest.json - Claude Code context definitions
    - .claude/context-guide.md - Claude Code assistance guide

- [x] **GitHub Integration**:
    - 7 Issue Templates (bug, feature, database, performance, incident, docs, question)
    - PR Template with security & quality checklists
    - .github/github-guide.md - Guide for using templates
    - All templates linked to CLAUDE.md and WORKFLOWS.md
## 📄 Documentation & Analysis
- [x] **CLAUDE.md**: Comprehensive development guide (1400+ lines)
- [x] **WORKFLOWS.md**: 11 task playbooks (800+ lines)
- [x] **Feature Matrix**: Complete feature/user type analysis (FEATURE-MATRIX.md)
- [x] **Feature Quick Ref**: Quick reference guide (FEATURE-MATRIX-QUICK-REF.md)
- [x] **GitHub Integration**: 7 issue templates + PR template
- [ ] **Contributing Guide**: Create `.github/CONTRIBUTING.md` that ties all docs
- [ ] **README Update**: Add developer resources & feature matrix link
- [ ] **Video Tutorials**: Create screen recordings for complex workflows
- [ ] **Runbooks**: Convert WORKFLOWS.md into executable checklist scripts

## 📋 Prioritized Next Steps (Based on Feature Matrix)

### 🔴 CRITICAL - Test Coverage Gaps
- [ ] **Authentication E2E Tests**: Google OAuth flow, session management, role verification
  - Current Coverage: 43% (3/7 tested)
  - Impact: All users blocked if auth fails
  - Effort: 2-3 days
  - File: `FEATURE-MATRIX.md` → Auth & Accounts section

- [ ] **Scheduling & Publishing E2E Tests**: Full flow, concurrent publishing, retry logic
  - Current Coverage: 56% (5/9 tested)
  - Impact: Core feature, affects user experience
  - Effort: 3-4 days
  - File: `FEATURE-MATRIX.md` → Scheduling section

- [ ] **Instagram API Error Handling Tests**: Error codes 190, 368, 100, rate limiting
  - Current Coverage: 50% (5/10 tested)
  - Impact: Publishing reliability
  - Effort: 2-3 days
  - File: `FEATURE-MATRIX.md` → Instagram API section

### 🟠 HIGH - Feature Implementation Gaps
- [ ] **Edit Scheduled Posts**: Implement missing feature (API + UI)
  - Current: ❌ Not implemented
  - Effort: 2-3 days
  - File: `FEATURE-MATRIX.md` → Scheduling section

- [ ] **User Management RBAC Tests**: Add/remove/change role operations
  - Current Coverage: 13% (1/8 tested)
  - Effort: 2-3 days
  - File: `FEATURE-MATRIX.md` → User Management section

- [ ] **Analytics Enhancements**: Add date filtering, trends, export
  - Current Coverage: 29% (2/7 tested)
  - Effort: 3-4 days
  - File: `FEATURE-MATRIX.md` → Analytics section

### 🎨 UI/UX Enhancements
- [ ] **Micro-animations**: Add Framer Motion transitions for state changes.
- [ ] **Analytics Dashboard**: Add date range, trends, export (see FEATURE-MATRIX.md)
- [ ] **Pagination UI**: Add pagination to meme/schedule lists

### 📈 Analytics & Insights
- [x] **Post Analytics**: Fetch and display view/reach metrics. (Implemented)
- [x] **3-Tier User Role System**: Full RBAC on pages and API routes.
- [ ] **Date Range Filtering**: Add to analytics dashboard
- [ ] **Historical Trends**: Track engagement over time
- [ ] **Export to CSV/PDF**: Let users export analytics

### 🚀 Developer Experience (Phase 2)
- [ ] **Apply CLAUDE.md Patterns**: Audit codebase against documented patterns
- [ ] **Add Security Tests**: Pre-Deployment Security Audit checklist tests
- [ ] **Implement Monitoring**: Follow Monitoring & Alerting Strategy
- [ ] **Setup CI/CD**: Add pre-deployment checks
- [ ] **Feature Matrix Review**: Verify implementation vs. matrix (see FEATURE-MATRIX.md)
