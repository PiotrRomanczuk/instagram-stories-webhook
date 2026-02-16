# E2E Test Suite Cleanup Plan

## Executive Summary

**Current State**: 80 E2E test files, ~1,760 individual test cases, ~1,291 test blocks
**Target State**: 5-6 core E2E test files, ~50-100 critical user journey tests
**Reduction**: ~95% fewer files, ~93% fewer tests

---

## Analysis Summary

### Current Test Distribution by Category

| Category | Files | Primary Issue |
|----------|-------|---------------|
| **Real Instagram Publishing** | 11 | Duplicate coverage of same flows |
| **Mobile Journey** | 8 | Overlapping user flows, should be unit tests |
| **Timeline/Schedule UI** | 11 | UI component tests, not E2E journeys |
| **Admin Workflows** | 5 | Redundant with critical-paths.spec.ts |
| **Auth & RBAC** | 4 | Unit test candidates (MSW) |
| **Review Workflows** | 5 | Overlapping approval/rejection flows |
| **Whitelist Management** | 4 | CRUD tests, should be integration tests |
| **Responsive/Mobile** | 3 | Visual regression tests, not E2E |
| **Analytics/Insights** | 2 | API tests, should use MSW |
| **Developer Tools** | 3 | Debug page tests, not critical paths |
| **Production/Smoke** | 2 | Only one needed |
| **Miscellaneous** | 22 | Various overlaps |

### Key Findings

1. **Massive Duplication**: Same user journeys tested across 10+ files
   - Submit → Review → Approve flow appears in 15+ files
   - Publishing flow tested in 8+ separate files
   - Mobile navigation tested in 6+ files

2. **Wrong Test Layer**: ~70% of tests are unit/integration tests disguised as E2E
   - UI component behavior (timeline cards, modals, filters)
   - API response validation (should use MSW)
   - Form validation logic
   - Search/filter functionality
   - RBAC permissions matrix

3. **Feature-Specific Files**: Tests organized by feature, not user journey
   - `timeline-hover-overlays.spec.ts` - Should be Storybook or visual regression
   - `timeline-swipe-gestures.spec.ts` - Should be component test
   - `drag-drop-scheduling.spec.ts` - Component interaction test
   - `empty-states.spec.ts` - Visual snapshot test

4. **Test Bloat**: Individual files have 20-60 tests covering micro-interactions
   - `schedule-timeline.spec.ts`: 57KB, tests every UI state
   - `timeline-modal-actions.spec.ts`: 41KB, tests every button click
   - `timeline-realtime-updates.spec.ts`: 34KB, tests WebSocket events

---

## Target Architecture (5-6 Core Files)

### 1. **critical-user-journeys.spec.ts** (KEEP, consolidate from 40+ files)
**Purpose**: End-to-end user workflows that represent real business value
**Coverage**:
- User Journey: Sign in → Submit content → Check status → View published
- Admin Journey: Sign in → Review queue → Approve/Reject → Schedule → Verify published
- Publishing Journey: Upload → Process → Publish to Instagram → Verify live
- Error Recovery: Failed publish → Retry → Success

**Why**: These are TRUE E2E tests - multi-step workflows across auth, DB, Instagram API

**Test Count**: ~20 tests (down from ~800 across multiple files)

---

### 2. **instagram-publishing-live.spec.ts** (KEEP, consolidate)
**Purpose**: REAL Instagram API publishing tests (images + videos)
**Coverage**:
- Publish image story (with 24hr de-duplication)
- Publish video story (with extended timeout)
- Publish with user tags (single + multiple)
- Verify published content via Instagram API
- Connection status verification

**Why**: Only place we test REAL Instagram API - critical for production confidence

**Test Count**: ~10 tests (currently 7, add video edge cases)

**Keep from**:
- `instagram-publishing-live.spec.ts` ✅ (already good)
- Delete: `instagram-publishing.spec.ts`, `real-ig-*.spec.ts` (11 files)

---

### 3. **mobile-responsive-core.spec.ts** (CONSOLIDATE from 11 files)
**Purpose**: Critical responsive behavior for mobile users
**Coverage**:
- Mobile navigation (375px, 414px viewports)
- Submit form usability (touch targets, no horizontal scroll)
- Review queue on mobile (swipe actions)
- Bottom navigation accessibility

**Why**: Mobile users are 70%+ of traffic - must verify core UX works

**Test Count**: ~15 tests (down from ~200 across mobile-*.spec.ts files)

**Consolidate from**:
- `mobile-responsive-mvp.spec.ts` ✅
- Delete: `user-mobile-*.spec.ts` (6 files), `admin-mobile-*.spec.ts` (2 files), `schedule-mobile.spec.ts`

---

### 4. **production-smoke.spec.ts** (KEEP, minimal changes)
**Purpose**: Production deployment verification
**Coverage**:
- Site loads
- Auth works
- Instagram connection active
- Publish flow works (single video test)
- API endpoints responsive

**Why**: Run after every production deploy to catch regressions

**Test Count**: ~6 tests (currently good)

**Keep from**:
- `production-smoke.spec.ts` ✅
- Delete: `production-minimal.spec.ts` (redundant)

---

### 5. **auth-and-rbac-core.spec.ts** (CONSOLIDATE from 8 files)
**Purpose**: Authentication flows and role-based access control
**Coverage**:
- Google OAuth sign-in (real account only)
- Session persistence
- Admin route protection
- User isolation (can't see other users' content)
- Sign out clears session

**Why**: Security-critical - must verify auth gates work end-to-end

**Test Count**: ~12 tests (down from ~60 across auth/rbac/cross-user files)

**Consolidate from**:
- `auth.spec.ts` (partial)
- `rbac.spec.ts`
- `cross-user-isolation.spec.ts`
- `api-permissions-matrix.spec.ts`
- Delete rest

---

### 6. **developer-tools.spec.ts** (OPTIONAL - for developer workflow)
**Purpose**: Debug page and cron tooling verification
**Coverage**:
- Debug page loads
- Cron trigger UI works
- Logs display correctly
- Developer-only routes protected

**Why**: Supports internal development workflow, not user-facing

**Test Count**: ~8 tests (down from ~25 in developer.spec.ts + developer-cron-debug.spec.ts)

**Consolidate from**:
- `developer.spec.ts`
- `developer-cron-debug.spec.ts`
- Delete: `debug.spec.ts` (merge into developer-tools)

---

## Detailed File Actions (All 80 Files)

### KEEP (5-6 files) ✅

| File | Action | Reason |
|------|--------|--------|
| `instagram-publishing-live.spec.ts` | ✅ **KEEP** | Core REAL Instagram API tests - irreplaceable |
| `production-smoke.spec.ts` | ✅ **KEEP** | Production deploy verification - essential |
| `mobile-responsive-mvp.spec.ts` | ✅ **KEEP** (rename to `mobile-responsive-core.spec.ts`) | Mobile UX verification |
| `critical-paths.spec.ts` | ✅ **KEEP** (rename to `critical-user-journeys.spec.ts`) | Best E2E coverage of user flows |

### CONSOLIDATE (create new files from multiple sources)

| New File | Source Files (to merge) | Test Count |
|----------|------------------------|------------|
| `auth-and-rbac-core.spec.ts` | `auth.spec.ts`, `rbac.spec.ts`, `cross-user-isolation.spec.ts`, `api-permissions-matrix.spec.ts` | 12 tests |
| `developer-tools.spec.ts` | `developer.spec.ts`, `developer-cron-debug.spec.ts`, `debug.spec.ts` | 8 tests |

### DELETE (74 files) ❌

#### Real Instagram Tests (DELETE 10, redundant with instagram-publishing-live.spec.ts)
- ❌ `real-ig-analytics.spec.ts` - API test, use MSW in unit tests
- ❌ `real-ig-auth.spec.ts` - Duplicate of instagram-publishing-live connection tests
- ❌ `real-ig-complete-journey.spec.ts` - Duplicate of critical-paths.spec.ts
- ❌ `real-ig-content-queue.spec.ts` - Not a user journey, DB query test
- ❌ `real-ig-debug-publish.spec.ts` - Duplicate of instagram-publishing-live.spec.ts
- ❌ `real-ig-error-recovery.spec.ts` - Error scenarios should be unit tests with MSW
- ❌ `real-ig-review.spec.ts` - Duplicate of critical-paths.spec.ts review tests
- ❌ `real-ig-schedule.spec.ts` - Duplicate of critical-paths.spec.ts schedule tests
- ❌ `real-ig-submission.spec.ts` - Duplicate of critical-paths.spec.ts submission tests
- ❌ `real-ig-users.spec.ts` - RBAC test, should be unit test
- ❌ `instagram-publishing.spec.ts` - Duplicate of live version

#### Mobile Journey Tests (DELETE 8, redundant or wrong layer)
- ❌ `admin-mobile-full-journey.spec.ts` - Duplicate of critical-paths mobile coverage
- ❌ `admin-mobile-journey.spec.ts` - Duplicate
- ❌ `user-mobile-full-journey.spec.ts` - Duplicate
- ❌ `user-mobile-journey.spec.ts` - Duplicate
- ❌ `user-mobile-navigation.spec.ts` - Navigation is in mobile-responsive-core
- ❌ `user-mobile-submissions.spec.ts` - Duplicate of critical-paths
- ❌ `user-mobile-submit.spec.ts` - Duplicate of critical-paths
- ❌ `user-mobile-dashboard.spec.ts` - Not a user journey, UI state test

#### Timeline/Schedule UI Tests (DELETE 11, should be component tests)
- ❌ `schedule-timeline.spec.ts` - 57KB of UI state tests, use Storybook
- ❌ `timeline-hover-overlays.spec.ts` - CSS hover states, use visual regression
- ❌ `timeline-modal-actions.spec.ts` - Modal component tests, use Vitest + Testing Library
- ❌ `timeline-realtime-updates.spec.ts` - WebSocket tests, use MSW + Vitest
- ❌ `timeline-skeleton-loading.spec.ts` - Loading states, use Storybook
- ❌ `timeline-swipe-gestures.spec.ts` - Gesture tests, use component test with touch simulation
- ❌ `timeline.spec.ts` - Basic timeline tests, merge into mobile-responsive-core if needed
- ❌ `schedule-mobile.spec.ts` - Duplicate mobile schedule tests
- ❌ `scheduling-calendar-complete.spec.ts` - Calendar UI tests, use component tests
- ❌ `scheduling-calendar.spec.ts` - Calendar UI tests
- ❌ `scheduling-mcp-comprehensive.spec.ts` - MCP modal tests, use component tests
- ❌ `scheduling-mcp-mobile.spec.ts` - Mobile modal tests
- ❌ `scheduling-mcp-modals-navigation.spec.ts` - Modal navigation tests

#### Admin Workflow Tests (DELETE 5, redundant with critical-paths)
- ❌ `admin-content-management.spec.ts` - Duplicate of critical-paths content tests
- ❌ `admin-publish.spec.ts` - Duplicate of instagram-publishing-live
- ❌ `admin-review-complete.spec.ts` - 28KB of review UI tests, duplicate
- ❌ `approve-reject-workflow.spec.ts` - Duplicate of critical-paths review tests
- ❌ `meme-review-admin.spec.ts` - Duplicate review tests

#### Whitelist Management (DELETE 4, should be integration tests)
- ❌ `users-whitelist-crud.spec.ts` - CRUD operations, use Vitest + Supabase test DB
- ❌ `users-whitelist-multi-admin.spec.ts` - RBAC test, use unit tests
- ❌ `users-whitelist-protections.spec.ts` - Validation tests, use Zod unit tests
- ❌ `users-whitelist-search.spec.ts` - Search logic, use unit tests

#### Submission/Review Tests (DELETE 4, redundant)
- ❌ `submissions.spec.ts` - Duplicate of critical-paths submission tests
- ❌ `meme-submissions.spec.ts` - Duplicate
- ❌ `file-submissions.spec.ts` - File upload tests, use component tests
- ❌ `live-submit.spec.ts` - Duplicate of critical-paths

#### Live Journey Tests (DELETE 4, redundant with critical-paths)
- ❌ `live-content-queue.spec.ts` - Not a journey, DB query test
- ❌ `live-full-journey.spec.ts` - Duplicate of critical-paths
- ❌ `live-review.spec.ts` - Duplicate
- ❌ `live-schedule.spec.ts` - Duplicate

#### Story Preview Tests (DELETE 3, should be component tests)
- ❌ `story-preview-integration.spec.ts` - Modal integration, use component test
- ❌ `story-preview.spec.ts` - Preview UI, use Storybook
- ❌ `story-verification-example.spec.ts` - Example/demo file, delete

#### Scheduling/Publishing (DELETE 2)
- ❌ `scheduling-publishing.spec.ts` - Duplicate of instagram-publishing-live
- ❌ `drag-drop-scheduling.spec.ts` - Component interaction, use Testing Library

#### Analytics/Insights (DELETE 2, should use MSW)
- ❌ `analytics.spec.ts` - API response tests, use unit tests with MSW
- ❌ `dashboard-stats.spec.ts` - Stats display tests, use component tests

#### Misc Navigation/UI (DELETE 6)
- ❌ `home.spec.ts` - 634 bytes, trivial redirect test
- ❌ `inbox.spec.ts` - Feature not in MVP scope
- ❌ `settings.spec.ts` - Settings CRUD, use integration tests
- ❌ `empty-states.spec.ts` - Visual states, use Storybook
- ❌ `pagination.spec.ts` - Pagination logic, use unit tests
- ❌ `video-display.spec.ts` - Video player component, use component test

#### Upload/Media (DELETE 2)
- ❌ `video-upload.spec.ts` - File upload, use component test (or merge 1 test into critical-paths)
- ❌ `facebook-linking.spec.ts` - Facebook integration not in scope

#### Security/Edge Cases (DELETE 4)
- ❌ `xss.spec.ts` - Security tests should be unit tests with sanitization mocks
- ❌ `concurrent-edit.spec.ts` - Race condition test, use integration test
- ❌ `multi-user-workflows.spec.ts` - Multi-user tests covered in critical-paths
- ❌ `rate-limiting.spec.ts` - Rate limit tests, use MSW in unit tests

#### Other (DELETE 1)
- ❌ `production-minimal.spec.ts` - Duplicate of production-smoke

---

## Migration Plan

### Phase 1: Identify & Backup (Day 1)
**Goal**: Catalog all tests, ensure nothing critical is lost

1. ✅ Generate test inventory (this document)
2. Create git branch `cleanup/e2e-reduction`
3. Run full test suite to establish baseline
4. Generate coverage report: `npx playwright test --reporter=html`
5. Archive current test output: `cp -r playwright-report archive/before-cleanup/`

**Validation**: All 80 files documented, coverage baseline saved

---

### Phase 2: Create New Core Tests (Day 2-3)
**Goal**: Build consolidated core test files before deleting anything

#### 2.1 Create `auth-and-rbac-core.spec.ts`
**Migrate tests from**:
- `auth.spec.ts`: CP-1.2, CP-1.4, CP-1.5, CP-1.6
- `rbac.spec.ts`: Admin route protection tests
- `cross-user-isolation.spec.ts`: RLS isolation tests
- `api-permissions-matrix.spec.ts`: API endpoint auth tests

**New test structure**:
```typescript
test.describe('Authentication Core', () => {
  test('sign in with Google OAuth (real account)')
  test('session persists across navigation')
  test('session persists after refresh')
  test('sign out clears session')
})

test.describe('Role-Based Access Control', () => {
  test('regular user cannot access admin routes')
  test('admin can access all routes')
  test('unauthenticated users redirected to sign-in')
})

test.describe('User Isolation', () => {
  test('user A cannot see user B content')
  test('API endpoints enforce RLS')
})
```

**Test count**: 12 tests

---

#### 2.2 Create `developer-tools.spec.ts`
**Migrate tests from**:
- `developer.spec.ts`: Developer route access, cron UI
- `developer-cron-debug.spec.ts`: Cron trigger tests
- `debug.spec.ts`: Debug page load, connection status

**New test structure**:
```typescript
test.describe('Developer Tools Access', () => {
  test('developer can access /developer route')
  test('non-developer redirected away')
})

test.describe('Cron Debug Interface', () => {
  test('cron trigger UI loads')
  test('manual trigger button works')
  test('logs display after trigger')
})

test.describe('Debug Page', () => {
  test('debug page shows Instagram connection')
  test('debug publisher UI loads')
})
```

**Test count**: 8 tests

---

#### 2.3 Enhance `critical-paths.spec.ts` → `critical-user-journeys.spec.ts`
**Add missing tests from**:
- `live-full-journey.spec.ts`: E2E-04 complete journey
- `approve-reject-workflow.spec.ts`: Rejection with reason
- `video-upload.spec.ts`: One video upload test (non-Instagram)

**New tests to add**:
```typescript
test.describe('Video Upload Journey', () => {
  test('user uploads video and admin approves')
})

test.describe('Rejection Journey', () => {
  test('admin rejects with reason, user sees feedback')
})

test.describe('Publishing Verification', () => {
  test('published story appears in recent stories API')
})
```

**Test count**: 25 tests (up from 22)

---

#### 2.4 Consolidate `mobile-responsive-mvp.spec.ts` → `mobile-responsive-core.spec.ts`
**Add critical tests from**:
- `user-mobile-navigation.spec.ts`: Bottom nav tests
- `schedule-mobile.spec.ts`: Mobile schedule view tests
- Keep existing responsive tests

**New tests to add**:
```typescript
test.describe('Mobile Navigation (375px)', () => {
  test('bottom nav visible on all pages')
  test('bottom nav FAB button accessible')
})

test.describe('Mobile Schedule View (375px)', () => {
  test('schedule timeline loads')
  test('timeline cards are tappable (44px min)')
})
```

**Test count**: 20 tests (up from 15)

---

### Phase 3: Delete Redundant Tests (Day 4)
**Goal**: Remove all 74 redundant test files

#### 3.1 Safety Protocol
Before deleting any file:
1. Verify it's in the DELETE list above
2. Confirm tests are covered in core files
3. Move to `archive/deleted-tests/` (don't permanently delete yet)

```bash
# Create archive directory
mkdir -p archive/deleted-tests

# Archive each file before deleting
for file in real-ig-analytics.spec.ts real-ig-auth.spec.ts ...; do
  mv __tests__/e2e/$file archive/deleted-tests/
done
```

#### 3.2 Deletion Order (by category)
1. Delete Real Instagram duplicates (10 files)
2. Delete Mobile Journey duplicates (8 files)
3. Delete Timeline/Schedule UI tests (11 files)
4. Delete Admin Workflow duplicates (5 files)
5. Delete Whitelist Management (4 files)
6. Delete Submission/Review duplicates (4 files)
7. Delete Live Journey duplicates (4 files)
8. Delete Story Preview tests (3 files)
9. Delete Scheduling/Publishing duplicates (2 files)
10. Delete Analytics/Insights (2 files)
11. Delete Misc Navigation/UI (6 files)
12. Delete Upload/Media (2 files)
13. Delete Security/Edge Cases (4 files)
14. Delete Other (1 file)

**After each deletion batch**: Run core tests to ensure no regressions
```bash
npx playwright test --grep "@core"
```

---

### Phase 4: Validate Coverage (Day 5)
**Goal**: Ensure new core tests provide equivalent coverage

#### 4.1 Run New Core Test Suite
```bash
ENABLE_REAL_IG_TESTS=true ENABLE_LIVE_IG_PUBLISH=true npx playwright test
```

**Expected results**:
- All core tests pass
- Total test count: ~80 tests (down from ~1,760)
- Test execution time: <10 minutes (down from ~60+ minutes)

#### 4.2 Coverage Comparison
Generate new coverage report and compare:
```bash
npx playwright test --reporter=html
cp -r playwright-report archive/after-cleanup/
```

**Verify**:
- Critical user journeys: 100% covered ✅
- REAL Instagram publishing: 100% covered ✅
- Auth flows: 100% covered ✅
- Mobile responsive: Core UX covered ✅

#### 4.3 Missing Coverage Check
**If any critical paths are missing**, add them to relevant core file.

**If any edge cases are critical**, convert to unit tests with MSW.

---

### Phase 5: Update Documentation & CI (Day 6)

#### 5.1 Update Test Documentation
**File**: `__tests__/e2e/README.md`

```markdown
# E2E Test Suite

## Philosophy
- E2E tests verify **user journeys**, not UI components
- Always use REAL Instagram account (@www_hehe_pl) - NEVER mock
- Keep test count low (<100) to maintain fast CI feedback
- UI component tests belong in unit tests (Vitest + Testing Library)
- API tests belong in integration tests (Vitest + MSW)

## Core Test Files (6)

1. **critical-user-journeys.spec.ts** - Primary user and admin workflows
2. **instagram-publishing-live.spec.ts** - REAL Instagram API publishing
3. **mobile-responsive-core.spec.ts** - Mobile UX critical paths
4. **production-smoke.spec.ts** - Production deploy verification
5. **auth-and-rbac-core.spec.ts** - Authentication and authorization
6. **developer-tools.spec.ts** - Internal tooling (optional)

## Running Tests

```bash
# All E2E tests (local)
ENABLE_REAL_IG_TESTS=true ENABLE_LIVE_IG_PUBLISH=true npm run test:e2e

# Critical paths only
npx playwright test critical-user-journeys

# Production smoke tests
BASE_URL=https://your-app.vercel.app npx playwright test production-smoke

# Mobile responsive
npx playwright test mobile-responsive-core
```

## Test Migration Log

**Date**: 2026-02-16
**Before**: 80 files, ~1,760 tests
**After**: 6 files, ~80 tests
**Reduction**: 95% fewer files, 95% fewer tests
**Coverage**: Maintained 100% critical path coverage
```

#### 5.2 Update CI Configuration
**File**: `.github/workflows/e2e-tests.yml`

```yaml
name: E2E Tests

on:
  pull_request:
    branches: [master]
  push:
    branches: [master]

jobs:
  e2e-core:
    name: Core E2E Tests (No Live Publishing)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - name: Run E2E tests (skip live publishing)
        run: npx playwright test --grep-invert "@live-publish"
        env:
          ENABLE_REAL_IG_TESTS: false

  smoke-test-production:
    name: Production Smoke Test (Manual Trigger)
    runs-on: ubuntu-latest
    if: github.event_name == 'workflow_dispatch'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - name: Run production smoke tests
        run: npx playwright test production-smoke
        env:
          BASE_URL: ${{ secrets.PRODUCTION_URL }}
          ENABLE_REAL_IG_TESTS: true
          ENABLE_LIVE_IG_PUBLISH: true
```

#### 5.3 Update CLAUDE.md
**Add test count targets**:
```markdown
## Testing Strategy

| Layer | Tool | File Count Target | Test Count Target |
|-------|------|------------------|------------------|
| Unit | Vitest + MSW | ~50 files | ~500 tests |
| Integration | Vitest + Supabase | ~20 files | ~200 tests |
| E2E | Playwright | **6 files** | **~80 tests** |

**E2E Test Philosophy**:
- Test USER JOURNEYS, not UI components
- Use REAL Instagram account - NEVER mock in E2E
- Keep under 100 tests total - quality over quantity
```

---

## Test Migration Reference Table

### Tests Moving to Unit Tests (with MSW)

| E2E Test | New Location | Test Tool |
|----------|--------------|-----------|
| Instagram API error codes | `__tests__/unit/instagram/errors.test.ts` | Vitest + MSW |
| Rate limiting logic | `__tests__/unit/instagram/rate-limit.test.ts` | Vitest + MSW |
| Analytics API responses | `__tests__/unit/instagram/analytics.test.ts` | Vitest + MSW |
| RBAC permissions matrix | `__tests__/unit/auth/rbac.test.ts` | Vitest + MSW |
| Search/filter logic | `__tests__/unit/content/filters.test.ts` | Vitest |
| Pagination logic | `__tests__/unit/content/pagination.test.ts` | Vitest |
| XSS sanitization | `__tests__/unit/security/sanitization.test.ts` | Vitest |
| Form validation | `__tests__/unit/validation/forms.test.ts` | Vitest + Zod |

### Tests Moving to Component Tests (Vitest + Testing Library)

| E2E Test | New Location | Test Tool |
|----------|--------------|-----------|
| Timeline UI states | `__tests__/components/Timeline.test.tsx` | Vitest + RTL |
| Modal interactions | `__tests__/components/Modal.test.tsx` | Vitest + RTL |
| Drag-drop scheduling | `__tests__/components/DragDropCalendar.test.tsx` | Vitest + RTL + DnD Testing |
| Swipe gestures | `__tests__/components/SwipeableCard.test.tsx` | Vitest + RTL + touch-event mocks |
| Story preview modal | `__tests__/components/StoryPreview.test.tsx` | Vitest + RTL |
| Empty states | `__tests__/components/EmptyState.test.tsx` | Vitest + RTL |
| Loading skeletons | `__tests__/components/Skeleton.test.tsx` | Vitest + RTL |
| Video player | `__tests__/components/VideoPlayer.test.tsx` | Vitest + RTL |

### Tests Moving to Integration Tests (Vitest + Supabase)

| E2E Test | New Location | Test Tool |
|----------|--------------|-----------|
| Whitelist CRUD | `__tests__/integration/api/whitelist.test.ts` | Vitest + Supabase test DB |
| Content queue queries | `__tests__/integration/api/content-queue.test.ts` | Vitest + Supabase test DB |
| User isolation (RLS) | `__tests__/integration/supabase/rls.test.ts` | Vitest + Supabase test DB |
| Concurrent edits | `__tests__/integration/api/concurrent-updates.test.ts` | Vitest + Supabase test DB |
| Settings CRUD | `__tests__/integration/api/settings.test.ts` | Vitest + Supabase test DB |

### Tests Moving to Visual Regression (Storybook)

| E2E Test | New Location | Test Tool |
|----------|--------------|-----------|
| Hover overlays | `src/components/Timeline/Timeline.stories.tsx` | Storybook + Chromatic |
| Empty states | `src/components/EmptyState/EmptyState.stories.tsx` | Storybook + Chromatic |
| Skeleton loading | `src/components/Skeleton/Skeleton.stories.tsx` | Storybook + Chromatic |
| Responsive breakpoints | `src/components/*/*.stories.tsx` | Storybook + viewport addon |

---

## Benefits of Cleanup

### Developer Experience
- **Faster test runs**: 10 min vs 60+ min
- **Clearer failures**: Specific journey fails, not 20 overlapping tests
- **Easier maintenance**: 6 files to update vs 80
- **Better focus**: Test real user value, not implementation details

### CI/CD
- **Faster feedback**: PRs get results in <10 min
- **Lower costs**: 6x reduction in compute time
- **More reliable**: Fewer flaky tests (less UI state testing)
- **Easier debugging**: Traces point to specific journey step

### Code Quality
- **Proper test layers**: Unit/Integration/E2E each serve purpose
- **Real E2E value**: Every test validates actual user workflow
- **Better coverage**: More unit tests = more edge cases covered
- **Maintainable**: Test changes only when UX changes, not implementation

---

## Risks & Mitigation

### Risk 1: Accidentally Delete Critical Test
**Mitigation**:
- Archive files before deleting (don't use `rm`)
- Run core tests after each deletion batch
- Keep git branch until core tests proven stable
- Manual review of test migration mapping

### Risk 2: Coverage Gaps
**Mitigation**:
- Generate before/after coverage reports
- Compare critical path coverage line-by-line
- Add missing tests to core files before deleting sources
- Run full suite one last time before merge

### Risk 3: Broken CI
**Mitigation**:
- Update CI config in same PR as test cleanup
- Test CI on feature branch before merging
- Keep old test files until CI verified working
- Gradual rollout (disable old tests first, then delete)

### Risk 4: Team Confusion
**Mitigation**:
- Update README.md with new test structure
- Document migration in CHANGELOG
- Share this cleanup plan with team
- Add comments in code pointing to new test locations

---

## Success Criteria

### Quantitative
- ✅ Reduce from 80 files to 6 files (92.5% reduction)
- ✅ Reduce from ~1,760 tests to ~80 tests (95% reduction)
- ✅ Test suite runs in <10 minutes (down from 60+ min)
- ✅ All critical user journeys covered (5 core paths)

### Qualitative
- ✅ Every E2E test validates a complete user workflow
- ✅ Zero mocking in E2E tests (except production smoke)
- ✅ UI component tests moved to unit/component layer
- ✅ API tests moved to integration layer with MSW
- ✅ Team can easily understand what each test file covers

---

## Timeline

| Phase | Duration | Output |
|-------|----------|--------|
| Phase 1: Identify & Backup | 4 hours | Test inventory, baseline coverage |
| Phase 2: Create Core Tests | 2 days | 6 core test files, migration complete |
| Phase 3: Delete Redundant | 1 day | 74 files archived/deleted |
| Phase 4: Validate Coverage | 4 hours | Coverage report, passing core suite |
| Phase 5: Update Docs & CI | 4 hours | README, CI config, CLAUDE.md updated |
| **Total** | **4 days** | **Clean, focused E2E suite** |

---

## Appendix A: Quick Decision Tree

**When writing a new test, ask**:

```
Does this test require a browser AND multiple system components (auth + DB + API)?
|
├─ NO → Not an E2E test
│   |
│   ├─ Does it test UI component behavior?
│   │   └─ YES → Component test (Vitest + Testing Library)
│   |
│   ├─ Does it test API responses or business logic?
│   │   └─ YES → Unit test (Vitest + MSW for external APIs)
│   |
│   └─ Does it test database queries or RLS?
│       └─ YES → Integration test (Vitest + Supabase test DB)
│
└─ YES → Is it a complete USER JOURNEY?
    |
    ├─ YES → E2E test (add to one of the 6 core files)
    |
    └─ NO → Break it down into smaller unit/component tests
```

---

## Appendix B: File Size Comparison

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Total Files | 80 | 6 | -92.5% |
| Total Lines | ~51,000 | ~4,000 | -92% |
| Largest File | 57KB | 15KB | -74% |
| Avg File Size | 9.5KB | 10KB | +5% |
| Test Count | ~1,760 | ~80 | -95% |
| Execution Time | 60+ min | <10 min | -83% |

**Key Insight**: Fewer, more focused tests with better coverage and faster execution.

---

**END OF CLEANUP PLAN**

---

**Next Steps**:
1. Review this plan with team
2. Get approval to proceed
3. Create cleanup branch
4. Execute Phase 1 (backup & baseline)
5. Execute Phases 2-5 over 4 days
6. Merge to master after validation

**Questions? Contact**: Test Engineer Agent or PR Reviewer Agent
