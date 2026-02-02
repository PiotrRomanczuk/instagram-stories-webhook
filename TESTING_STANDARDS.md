# Testing Standards - StoryFlow Application

## Overview
This document defines the testing standards for the StoryFlow application. Every feature and component should have appropriate test coverage.

---

## Test File Inventory

### Unit Tests (`__tests__/unit/`)
| File | Coverage Area |
|------|---------------|
| `duplicate-detection.test.ts` | Content hash duplicate detection |
| `instagram/container.test.ts` | Instagram container creation |
| `instagram/publish.test.ts` | Instagram publishing logic |
| `instagram/insights.test.ts` | Instagram insights API |
| `instagram/quota.test.ts` | API quota management |
| `instagram/error-handling.test.ts` | Error handling utilities |
| `media/processor.test.ts` | Image/video processing |
| `media/validator.test.ts` | Media validation |
| `media/health-check.test.ts` | Media health checks |
| `validations/auth.schema.test.ts` | Auth schema validation |
| `validations/post.schema.test.ts` | Post schema validation |
| `validations/meme.schema.test.ts` | Meme schema validation |
| `scheduled-posts-db.test.ts` | Scheduled posts DB operations |
| `memes-db.test.ts` | Memes DB operations |
| `rbac/user-management.test.ts` | Role-based access control |

### Integration Tests (`__tests__/integration/`)
| File | Coverage Area |
|------|---------------|
| `api/memes.test.ts` | Memes API endpoints |
| `api/schedule.test.ts` | Schedule API endpoints |

### Component Tests (`__tests__/components/`)
| File | Component |
|------|-----------|
| `analytics/analytics-dashboard.test.tsx` | Analytics dashboard |
| `calendar/ready-to-schedule-sidebar.test.tsx` | Ready to schedule sidebar |
| `calendar/schedule-calendar-grid.test.tsx` | Schedule calendar grid |
| `calendar/schedule-header.test.tsx` | Schedule header |
| `content-queue/kanban-layout.test.tsx` | Content queue kanban |
| `dashboard/admin-dashboard.test.tsx` | Admin dashboard |
| `dashboard/user-dashboard.test.tsx` | User dashboard |
| `dashboard/stats-card.test.tsx` | Stats card |
| `inbox/conversation-list.test.tsx` | Inbox conversations |
| `inbox/message-thread.test.tsx` | Message thread |
| `inbox/inbox-manager.test.tsx` | Inbox manager |
| `inbox/message-composer.test.tsx` | Message composer |
| `insights/insights-dashboard.test.tsx` | Insights dashboard |
| `insights/quota-card.test.tsx` | Quota card |
| `layout/navbar.test.tsx` | Navigation bar |
| `layout/user-menu.test.tsx` | User menu |
| `layout/page-header.test.tsx` | Page header |
| `media/aspect-ratio-badge.test.tsx` | Aspect ratio badge |
| `media/story-preview.test.tsx` | Story preview |
| `review/reject-dialog.test.tsx` | Reject dialog |
| `review/review-actions.test.tsx` | Review actions |
| `review/review-list.test.tsx` | Review list |
| `review/schedule-dialog.test.tsx` | Schedule dialog |
| `schedule/scheduled-list.test.tsx` | Scheduled list |
| `settings/settings-form-new.test.tsx` | Settings form |
| `submissions/edit-submission-dialog.test.tsx` | Edit submission |
| `submissions/submission-stats.test.tsx` | Submission stats |
| `submissions/submission-list.test.tsx` | Submission list |
| `submissions/submission-card.test.tsx` | Submission card |
| `users/add-user-dialog.test.tsx` | Add user dialog |
| `users/users-table.test.tsx` | Users table |
| `memes/meme-edit-modal.test.tsx` | Meme edit modal |

### API Tests (`__tests__/api/`)
| File | Coverage Area |
|------|---------------|
| `content.test.ts` | Content API |

### Library Tests (`__tests__/lib/`)
| File | Coverage Area |
|------|---------------|
| `content-db.test.ts` | Content database operations |

### Page Tests (`__tests__/pages/`)
| File | Coverage Area |
|------|---------------|
| `analytics.test.tsx` | Analytics page |
| `cron-debug.test.tsx` | Cron debug page |
| `dashboard.test.tsx` | Dashboard/home page |
| `debug.test.tsx` | Debug page |
| `developer.test.tsx` | Developer page |
| `memes.test.tsx` | Memes page |
| `memes-submit.test.tsx` | Meme submit page |
| `signin.test.tsx` | Sign in page |
| `submit.test.tsx` | Submit page |
| `verify-request.test.tsx` | Verify request page |

### E2E Tests (`__tests__/e2e/`)
| File | Coverage Area |
|------|---------------|
| `admin-publish.spec.ts` | Admin publish flow |
| `approve-reject-workflow.spec.ts` | Admin review page approve/reject workflow |
| `scheduling-calendar.spec.ts` | Calendar-based scheduling with drag-and-drop |
| `live-*.spec.ts` | Live Instagram tests |
| `real-ig-*.spec.ts` | Real Instagram integration |

---

## Testing Requirements

### 1. Test File Naming
```
// Unit tests
__tests__/unit/<feature>/<name>.test.ts

// Component tests
__tests__/components/<category>/<component-name>.test.tsx

// Integration tests
__tests__/integration/api/<endpoint>.test.ts

// E2E tests
__tests__/e2e/<flow-name>.spec.ts
```

### 2. Test Structure
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

describe('ComponentName', () => {
  // Setup
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('feature or behavior', () => {
    it('should do expected behavior', () => {
      // Arrange
      // Act
      // Assert
    });

    it('should handle edge case', () => {
      // ...
    });
  });
});
```

### 3. What MUST Be Tested

#### Components
- [ ] Renders without crashing
- [ ] Displays correct initial state
- [ ] Handles user interactions (clicks, inputs)
- [ ] Shows loading states
- [ ] Shows error states
- [ ] Shows empty states
- [ ] Handles props correctly
- [ ] Accessibility (aria labels, roles)

#### API Routes
- [ ] Returns correct status codes
- [ ] Returns correct response format
- [ ] Handles authentication
- [ ] Handles authorization
- [ ] Validates input
- [ ] Handles errors gracefully
- [ ] Rate limiting (if applicable)

#### Business Logic
- [ ] Core functionality works
- [ ] Edge cases handled
- [ ] Error conditions handled
- [ ] Input validation
- [ ] Output format correct

### 4. Mocking Standards (Unit/Component Tests ONLY)

**IMPORTANT: Mocks are ONLY for unit and component tests. E2E tests must NEVER use mocks.**

#### Mock External APIs (Unit Tests Only)
```typescript
// Mock fetch
vi.mock('global', () => ({
  fetch: vi.fn(),
}));

// Mock Supabase
vi.mock('@/lib/config/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}));

// Mock NextAuth
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));
```

#### Mock Components (Component Tests Only)
```typescript
vi.mock('@/app/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  // ...
}));
```

### 5. Test Data

#### Unit/Component Tests: Use Factories
```typescript
// __tests__/factories/content.ts
export const createMockContentItem = (overrides = {}): ContentItem => ({
  id: 'test-id',
  userId: 'user-123',
  userEmail: 'test@example.com',
  mediaUrl: 'https://example.com/image.jpg',
  mediaType: 'IMAGE',
  source: 'submission',
  submissionStatus: 'pending',
  publishingStatus: 'draft',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  version: 1,
  ...overrides,
});
```

#### E2E Tests: Use Real Memes
```typescript
// __tests__/e2e/helpers/test-assets.ts
import * as path from 'path';
import * as fs from 'fs';

const MEMES_DIR = path.join(process.cwd(), 'memes');

// Get all available memes
export function getAllMemes(): string[] {
  return fs.readdirSync(MEMES_DIR)
    .filter(f => f.endsWith('.jpg'))
    .map(f => path.join(MEMES_DIR, f));
}

// Get a random meme for testing
export function getRandomMeme(): string {
  const memes = getAllMemes();
  return memes[Math.floor(Math.random() * memes.length)];
}

// Get specific meme by index (wraps around)
export function getMemeByIndex(index: number): string {
  const memes = getAllMemes();
  return memes[index % memes.length];
}
```

### 6. Coverage Requirements

| Type | Minimum Coverage |
|------|------------------|
| Unit Tests | 80% |
| Component Tests | 70% |
| Integration Tests | 60% |
| E2E Tests | Critical paths |

### 7. Running Tests

```bash
# Run all unit/component tests
npm run test

# Run with coverage
npm run test -- --coverage

# Run specific file
npm run test -- path/to/file.test.ts

# Run in watch mode
npm run test -- --watch

# Run E2E tests (uses real memes, NO mocks)
npx playwright test

# Run E2E with real Instagram publishing
ENABLE_REAL_IG_TESTS=true npx playwright test

# Run specific E2E test file
npx playwright test __tests__/e2e/real-ig-submission.spec.ts

# Run E2E in headed mode (see browser)
npx playwright test --headed

# Run E2E with debug
npx playwright test --debug
```

### 8. E2E Test Environment Setup

Before running E2E tests, ensure:

1. **Test memes are available**:
   ```bash
   ls memes/  # Should show 100 meme files
   ```

2. **Test account is configured** (`.env.test`):
   ```bash
   E2E_TEST_EMAIL=p.romanczuk@gmail.com
   ENABLE_REAL_IG_TESTS=true
   ```

3. **Instagram test account is connected**:
   - Account: ig_testing_account
   - Auth: p.romanczuk@gmail.com

4. **No mocks in E2E tests**:
   - Never use `vi.mock()` in E2E tests
   - Always use real files from `/memes/`
   - Always authenticate with real test account

---

## Pages Test Coverage

| Page | Status | Notes |
|------|--------|-------|
| `/` (Dashboard) | ✅ Has tests | `dashboard.test.tsx` |
| `/analytics` | ✅ Has tests | `analytics.test.tsx` |
| `/auth/signin` | ✅ Has tests | `signin.test.tsx` |
| `/auth/verify-request` | ✅ Has tests | `verify-request.test.tsx` |
| `/content` | ✅ Has tests | `kanban-layout.test.tsx` |
| `/debug` | ✅ Has tests | `debug.test.tsx` |
| `/developer` | ✅ Has tests | `developer.test.tsx` |
| `/developer/cron-debug` | ✅ Has tests | `cron-debug.test.tsx` |
| `/inbox` | ✅ Has tests | Component tests |
| `/insights` | ✅ Has tests | Component tests |
| `/memes` | ✅ Has tests | `memes.test.tsx` |
| `/memes/submit` | ✅ Has tests | `memes-submit.test.tsx` |
| `/review` | ✅ Has tests | Component tests |
| `/schedule` | ✅ Has tests | Calendar component tests |
| `/settings` | ✅ Has tests | Component tests |
| `/submissions` | ✅ Has tests | Component tests |
| `/submit` | ✅ Has tests | `submit.test.tsx` |
| `/users` | ✅ Has tests | Component tests |

---

## Component Test Checklist

For each component, verify:

```typescript
describe('Component', () => {
  // ✅ Basic rendering
  it('renders without crashing', () => {});

  // ✅ Props
  it('displays content from props', () => {});
  it('applies className prop', () => {});

  // ✅ States
  it('shows loading state', () => {});
  it('shows error state', () => {});
  it('shows empty state', () => {});

  // ✅ Interactions
  it('handles click events', () => {});
  it('handles form submission', () => {});

  // ✅ Async
  it('fetches data on mount', async () => {});
  it('updates when data changes', async () => {});

  // ✅ Accessibility
  it('has correct aria labels', () => {});
  it('is keyboard navigable', () => {});
});
```

---

## E2E Test Standards

### NO MOCKS Policy

**IMPORTANT: E2E tests must NOT use mocks.** All E2E tests should:
- Use real media files from `/memes/` folder
- Use the real Instagram testing account
- Test against actual API endpoints
- Verify real database changes

### Test Instagram Account

```
Account: ig_testing_account
Auth Email: p.romanczuk@gmail.com
```

Configure in `.env.test`:
```bash
E2E_TEST_EMAIL=p.romanczuk@gmail.com
ENABLE_REAL_IG_TESTS=true
```

### Real Meme Assets

Use actual memes from `/memes/` folder for all E2E tests:

```typescript
import { test, expect } from '@playwright/test';
import path from 'path';

// Path to real meme assets
const MEMES_DIR = path.join(process.cwd(), 'memes');

// Available meme files (100 total)
const TEST_MEMES = [
  '1_drake_hotline_bling.jpg',
  '2_two_buttons.jpg',
  '3_distracted_boyfriend.jpg',
  '4_bernie_i_am_once_again_asking_for_your_support.jpg',
  '5_left_exit_12_off_ramp.jpg',
  // ... 100 memes available
];

// Get random test meme
function getRandomMeme(): string {
  const randomIndex = Math.floor(Math.random() * TEST_MEMES.length);
  return path.join(MEMES_DIR, TEST_MEMES[randomIndex]);
}
```

### Test Structure
```typescript
import { test, expect } from '@playwright/test';
import path from 'path';

const MEMES_DIR = path.join(process.cwd(), 'memes');

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Login with test account (p.romanczuk@gmail.com)
    await page.goto('/auth/signin');
    // Auth flow...
  });

  test('user can submit real meme', async ({ page }) => {
    await page.goto('/submit');

    // Upload REAL meme file
    const memePath = path.join(MEMES_DIR, '1_drake_hotline_bling.jpg');
    await page.setInputFiles('input[type="file"]', memePath);

    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/submissions');
  });
});
```

### What to Test E2E
- [ ] Critical user flows (submit → review → publish)
- [ ] Authentication flows with real test account
- [ ] Form submissions with real meme files
- [ ] Navigation between pages
- [ ] Error handling displays
- [ ] Real Instagram publishing (when ENABLE_REAL_IG_TESTS=true)
- [ ] Approve/Reject workflow (admin review page)
- [ ] Scheduling calendar (drag-and-drop scheduling)

### E2E Test Files

| File | Coverage | Tests | Status |
|------|----------|-------|--------|
| `approve-reject-workflow.spec.ts` | Admin review page workflow | 13 tests | ✅ Passing |
| `scheduling-calendar.spec.ts` | Calendar-based scheduling | 13 tests | ✅ Passing |

#### Approve/Reject Workflow Tests (`approve-reject-workflow.spec.ts`)

| ID | Test | Priority | Status |
|----|------|----------|--------|
| REV-01 | Admin can view review page with pending submissions | P0 | ✅ |
| REV-02 | Admin can approve a single pending submission | P0 | ✅ |
| REV-03 | Admin can reject submission with reason | P0 | ✅ |
| REV-04 | Reject works with or without explicit reason | P1 | ✅ |
| REV-05 | Admin can approve submission (ready for scheduling) | P0 | ✅ |
| REV-06 | Non-admin user blocked from review page | P0 | ✅ |
| REV-07 | Keyboard shortcuts work (a=approve, r=reject) | P2 | ✅ |

#### Scheduling Calendar Tests (`scheduling-calendar.spec.ts`)

| ID | Test | Priority | Status |
|----|------|----------|--------|
| CAL-01 | Schedule page renders with calendar grid | P0 | ✅ |
| CAL-02 | View mode switching works | P1 | ✅ |
| CAL-03 | Navigation arrows change displayed week | P1 | ✅ |
| CAL-04 | Sidebar displays ready-to-schedule items | P0 | ✅ |
| CAL-05 | Drag from sidebar to calendar slot schedules item | P0 | ✅ |
| CAL-06 | Drag between time slots reschedules item | P0 | ⏭️ Skipped* |
| CAL-07 | Click item opens preview modal | P1 | ⏭️ Skipped* |
| CAL-08 | Edit scheduled time via dialog | P1 | ⏭️ Skipped* |
| CAL-09 | Cancel/delete scheduled item | P1 | ⏭️ Skipped* |
| CAL-10 | Published items cannot be rescheduled | P0 | ⏭️ Skipped* |
| CAL-11 | Non-admin user blocked from schedule page | P0 | ✅ |

*Skipped tests require specific data conditions (scheduled items, published items) that may not exist in the test environment.

### E2E Helper Files

| File | Purpose |
|------|---------|
| `helpers/auth.ts` | Authentication helpers (signInAsAdmin, signInAsUser, etc.) |
| `helpers/seed.ts` | Data seeding utilities for creating test content |
| `helpers/calendar.ts` | Drag-and-drop and calendar navigation utilities |
| `helpers/test-assets.ts` | Test asset management (memes from /memes/ folder) |

---

## Pre-Commit Test Checklist

Before committing:

```bash
# 1. Run linting
npm run lint

# 2. Run type checking
npx tsc --noEmit

# 3. Run all tests
npm run test

# 4. Check coverage (optional)
npm run test -- --coverage
```

All must pass before commit.
