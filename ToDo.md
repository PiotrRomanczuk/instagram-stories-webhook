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
## 📄 Documentation & Process Improvements (Future)
- [ ] **Contributing Guide**: Create `.github/CONTRIBUTING.md` that ties all documentation together
- [ ] **README Update**: Add developer resources section linking to CLAUDE.md, WORKFLOWS.md, GitHub guide
- [ ] **Runbooks**: Convert WORKFLOWS.md playbooks into executable checklists/automation scripts
- [ ] **Metrics Collection**: Track documentation usage (which sections are referenced most)
- [ ] **Regular Reviews**: Schedule quarterly documentation reviews to keep patterns current
- [ ] **Video Tutorials**: Create screen recordings for complex workflows (migration, debugging)
- [ ] **Onboarding Assessment**: Track new developer time-to-first-commit using these docs

## 📋 Prioritized Next Steps

### 🔧 High Priority
- [x] **Retry Logic**: Implement exponential backoff for failed Instagram API calls to improve reliability.
- [x] **Automated Testing**: Add unit tests for publishing logic and API routes. (Publishing logic ✅; Framework documented ✅)
- [ ] **Token Health Monitor**: Background job to check token expiration and auto-refresh.
- [ ] **Implement Tests**: Use patterns from CLAUDE.md & WORKFLOWS.md to add comprehensive test suite

### 🎨 UI Enhancements
- [ ] **Dark Mode**: Implement a sleek, glassmorphic dark theme.
- [ ] **Micro-animations**: Add Framer Motion transitions for state changes.

### 📈 Analytics
- [x] **Post Analytics**: Fetch and display view/reach metrics for published stories. (Previously implemented)
- [x] **3-Tier User Role System**: Implemented `developer`, `admin`, and `user` roles with full RBAC on pages and API routes.

### 🚀 Developer Experience (Next)
- [ ] **Apply CLAUDE.md Patterns**: Audit codebase against newly documented patterns
- [ ] **Add Security Tests**: Use Pre-Deployment Security Audit checklist to create test suite
- [ ] **Implement Monitoring**: Follow Monitoring & Alerting Strategy from CLAUDE.md
- [ ] **Setup CI/CD**: Add pre-deployment checks based on checklists
