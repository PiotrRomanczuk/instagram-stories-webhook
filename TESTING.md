# Testing Guide

**instagram-stories-webhook** uses a multi-layered testing strategy with a focus on user journeys over implementation details.

---

## Testing Philosophy

### Core Principles

1. **Test User Journeys, Not Implementation**: E2E tests should validate complete user workflows across multiple system components (auth + database + API), not UI component behavior.

2. **Never Mock in E2E Tests**: All E2E tests use a REAL Instagram account (`@www_hehe_pl`) to ensure production-like behavior. Mocking is reserved for unit and integration tests.

3. **Mobile-First**: 70%+ of users access the app from mobile devices, so responsive behavior is tested extensively across multiple viewport sizes (375px, 390px, 414px, 768px).

4. **Quality Over Quantity**: Keep E2E test count low (<200 tests) to maintain fast CI feedback loops. Detailed edge cases belong in unit tests.

5. **Right Test at Right Layer**: Component behavior → unit tests, API responses → integration tests, complete workflows → E2E tests.

---

## Test Structure

### E2E Tests (Playwright)

**Location**: `__tests__/e2e/`
**Tool**: Playwright
**Target**: 6 core files, ~172 tests
**CI Runtime**: <10 minutes

#### The 6 Core Test Files

| File | Tests | Purpose |
|------|-------|---------|
| **critical-user-journeys.spec.ts** | 54 | Complete user and admin workflows |
| **instagram-publishing-live.spec.ts** | 27 | REAL Instagram API publishing (images + videos) |
| **mobile-responsive-core.spec.ts** | 37 | Mobile UX validation across viewports |
| **auth-and-rbac-core.spec.ts** | 22 | Authentication and role-based access control |
| **production-smoke.spec.ts** | 10 | Production deployment verification |
| **developer-tools.spec.ts** | 22 | Internal developer tooling |

#### Coverage

**Critical User Journeys** (54 tests):
- User workflow: Sign in → Submit content → View status → Verify published
- Admin workflow: Sign in → Review queue → Approve/Reject → Schedule → Publish
- Publishing workflow: Upload → Process → Publish to Instagram → Verify live
- Error recovery: Failed publish → Retry → Success
- Navigation and access control

**Real Instagram Publishing** (27 tests):
- Image story publishing (with 24hr de-duplication)
- Video story publishing (with extended timeout)
- User tagging (single + multiple)
- Connection status verification
- Published content verification via Instagram API

**Mobile Responsive** (37 tests):
- Responsive layouts at 375px, 390px, 414px, 768px viewports
- Touch targets meet 44px minimum size
- Bottom navigation accessibility
- Schedule timeline mobile view
- No horizontal scroll issues

**Authentication & RBAC** (22 tests):
- Google OAuth sign-in flow
- Session persistence (navigation + refresh)
- Admin route protection
- User data isolation (RLS enforcement)
- API endpoint permissions
- Sign out clears session

**Production Verification** (10 tests):
- Site loads correctly
- Real authentication works
- Instagram connection active
- Publishing flow functional
- Content API responsive
- Health check endpoints

**Developer Tools** (22 tests):
- Developer page access control
- Cron debug interface
- Debug page diagnostics
- Log display functionality

---

## Running Tests

### E2E Tests (Playwright)

```bash
# All E2E tests (local)
ENABLE_REAL_IG_TESTS=true ENABLE_LIVE_IG_PUBLISH=true npm run test:e2e

# All tests without live Instagram publishing
npm run test:e2e

# Specific test file
npx playwright test critical-user-journeys

# Production smoke tests (against live site)
BASE_URL=https://your-app.vercel.app npx playwright test production-smoke

# Mobile responsive tests
npx playwright test mobile-responsive-core

# Headed mode (see browser)
npx playwright test --headed

# Debug mode (interactive)
npx playwright test --debug

# Specific test by name
npx playwright test -g "sign in with Google"
```

### Unit Tests (Vitest)

```bash
# All unit tests
npm run test:unit

# Watch mode
npm run test:unit -- --watch

# Coverage report
npm run test:unit -- --coverage

# Specific test file
npm run test:unit __tests__/unit/instagram/publish.test.ts
```

### Integration Tests (Vitest + Supabase)

```bash
# All integration tests
npm run test:integration

# With real Supabase test database
SUPABASE_URL=<test-url> SUPABASE_KEY=<test-key> npm run test:integration
```

### All Tests

```bash
# Run everything (lint + typecheck + unit + E2E)
npm run test

# Pre-commit quality gates
npm run pre-commit
```

---

## Test Migration Guidelines

### When to Write Each Type of Test

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

### Examples by Test Layer

**Unit Tests** (Vitest + MSW):
- Instagram API error codes (190, 100, 368)
- Rate limiting logic
- Analytics API responses
- RBAC permissions matrix
- Search/filter logic
- Pagination logic
- XSS sanitization
- Form validation (Zod schemas)

**Component Tests** (Vitest + Testing Library):
- Timeline UI states
- Modal interactions
- Drag-drop calendar
- Swipe gestures
- Story preview modal
- Empty states
- Loading skeletons
- Video player controls

**Integration Tests** (Vitest + Supabase):
- Whitelist CRUD operations
- Content queue queries
- RLS policy enforcement
- Concurrent edit handling
- Settings CRUD
- Database migrations

**E2E Tests** (Playwright):
- Complete user sign-in → submit → review → publish flow
- Real Instagram API publishing
- Mobile responsive behavior
- Authentication flows
- Production smoke tests

---

## Contributing New Tests

### Before Adding an E2E Test

1. **Ask**: Does this test a complete user journey across multiple system components?
2. **Check**: Can this be tested faster/cheaper at unit or component layer?
3. **Verify**: Will this test use REAL Instagram account (no mocking)?
4. **Confirm**: Does this add unique coverage not already in the 6 core files?

### Adding a New E2E Test

```typescript
// Good E2E test - Complete user journey
test('user submits content and admin publishes to Instagram', async ({ page }) => {
  // 1. User signs in
  await signInAsUser(page);

  // 2. User submits content
  await page.goto('/submit');
  await page.getByRole('button', { name: 'Upload Image' }).click();
  // ... file upload
  await page.getByRole('button', { name: 'Submit' }).click();

  // 3. Admin reviews
  await signInAsAdmin(page);
  await page.goto('/review');
  await page.getByRole('button', { name: 'Approve' }).click();

  // 4. Verify published to Instagram
  await page.goto('/schedule');
  await expect(page.getByText('Published')).toBeVisible();

  // 5. Check Instagram API for story
  const stories = await fetchInstagramStories();
  expect(stories).toContainEqual(expect.objectContaining({ /* ... */ }));
});

// Bad E2E test - Should be component test
test('timeline card shows hover overlay on mouse enter', async ({ page }) => {
  // ❌ This tests UI component behavior, not user journey
  // ✅ Move to: __tests__/components/TimelineCard.test.tsx
});

// Bad E2E test - Should be unit test with MSW
test('Instagram API returns error 190 on invalid token', async ({ page }) => {
  // ❌ This tests API error handling, not user journey
  // ✅ Move to: __tests__/unit/instagram/errors.test.ts with MSW
});
```

### Adding a Unit Test

```typescript
// __tests__/unit/instagram/publish.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { publishStory } from '@/lib/instagram/publish';

const server = setupServer();

beforeEach(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('publishStory', () => {
  it('handles error 190 (invalid token)', async () => {
    server.use(
      http.post('https://graph.instagram.com/*', () => {
        return HttpResponse.json({
          error: { code: 190, message: 'Invalid OAuth 2.0 Access Token' }
        }, { status: 400 });
      })
    );

    const result = await publishStory({ /* ... */ });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid token');
    expect(result.requiresReauth).toBe(true);
  });
});
```

---

## E2E Test Best Practices

### 1. Use Descriptive Test IDs

```typescript
// Good - Clear identifier
test('AUTH-01: Sign in with Google OAuth', async ({ page }) => {
  // ...
});

// Bad - No identifier
test('user can sign in', async ({ page }) => {
  // ...
});
```

### 2. Use Helper Functions

```typescript
// __tests__/e2e/helpers/auth.ts
export async function signInAsAdmin(page: Page) {
  // Reusable sign-in logic
}

// In test file
import { signInAsAdmin } from './helpers/auth';

test('CP-1.1: Admin can access review queue', async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto('/review');
  // ...
});
```

### 3. Test User Intent, Not Implementation

```typescript
// Good - Tests user intent
await page.getByRole('button', { name: 'Submit' }).click();

// Bad - Brittle selector
await page.locator('.submit-button-class').click();
```

### 4. Handle Async Operations

```typescript
// Good - Wait for network completion
await page.getByRole('button', { name: 'Publish' }).click();
await page.waitForResponse(resp =>
  resp.url().includes('/api/publish') && resp.status() === 200
);

// Bad - Arbitrary timeout
await page.getByRole('button', { name: 'Publish' }).click();
await page.waitForTimeout(5000);
```

### 5. Clean Up After Tests

```typescript
test.afterEach(async ({ page }) => {
  // Delete test data created during test
  await cleanupTestSubmissions(page);
});
```

---

## CI/CD Integration

### GitHub Actions

E2E tests run automatically on:
- Every push to `master`, `main`, `develop`
- Every pull request
- Manual trigger via workflow dispatch

**Configuration**: `.github/workflows/e2e-tests.yml`

**Sharding**: Tests are split across 4 parallel shards for faster execution.

**Environment**: Tests run with:
- Real Supabase database (test schema)
- Mock Instagram API (unless `ENABLE_LIVE_IG_PUBLISH=true`)
- Headless Chromium browser

### Local Pre-Commit

Before committing, run:

```bash
npm run pre-commit
```

This runs:
1. ESLint (code quality)
2. TypeScript compiler (type checking)
3. Vitest (unit tests)

E2E tests are NOT run pre-commit (too slow). They run in CI.

---

## Test Cleanup History

**Date**: 2026-02-16
**Project**: E2E Test Suite Reduction

### Before Cleanup
- **Files**: 80 E2E test files
- **Tests**: 1,439 test cases
- **CI Runtime**: 60+ minutes
- **Issues**: Massive duplication, wrong test layers, feature-specific organization

### After Cleanup
- **Files**: 6 core E2E test files
- **Tests**: 172 test cases
- **CI Runtime**: <10 minutes
- **Benefits**:
  - 92.5% fewer files
  - 88% fewer tests
  - 83% faster CI
  - 100% critical path coverage maintained
  - Better test organization by user journey

### Migration Tracking
- 74 redundant files archived to `archive/deleted-tests/`
- UI component tests identified for future migration to unit tests
- API tests identified for future migration to integration tests
- Full migration plan: `E2E-TEST-CLEANUP-PLAN.md`

---

## Future Testing Improvements

### Short Term
- [ ] Add Vitest unit tests for UI components (move from E2E)
- [ ] Add MSW-based integration tests for Instagram API
- [ ] Set up Storybook for visual regression testing
- [ ] Add test coverage monitoring (>80% target)

### Long Term
- [ ] Add Percy or Chromatic for visual regression
- [ ] Add performance testing (Lighthouse CI)
- [ ] Add accessibility testing (axe-core)
- [ ] Add load testing for cron jobs

---

## Troubleshooting

### E2E Tests Failing Locally

**Problem**: Tests pass in CI but fail locally

**Solutions**:
1. Ensure `.env.local` has all required vars (check `.env.example`)
2. Run `npx playwright install chromium` to update browser
3. Clear test data: `npm run test:cleanup`
4. Check Supabase connection: Visit `/debug` page

### Instagram Publishing Tests Failing

**Problem**: `instagram-publishing-live.spec.ts` tests fail

**Solutions**:
1. Verify `ENABLE_LIVE_IG_PUBLISH=true` is set
2. Check Instagram account `@www_hehe_pl` is still connected
3. Verify Facebook app permissions are still active
4. Wait 24 hours if recent story was published (de-duplication)

### Flaky Tests

**Problem**: Tests fail intermittently

**Solutions**:
1. Add explicit waits: `await page.waitForLoadState('networkidle')`
2. Use `page.waitForResponse()` instead of `waitForTimeout()`
3. Increase timeout for slow operations: `test.setTimeout(30000)`
4. Check for race conditions in async operations

### CI/CD Issues

**Problem**: Tests pass locally but fail in CI

**Solutions**:
1. Check GitHub secrets are configured correctly
2. Verify Supabase test database is accessible
3. Check for environment-specific code paths
4. Review CI logs for missing dependencies

---

## Resources

- **Playwright Docs**: https://playwright.dev/
- **Vitest Docs**: https://vitest.dev/
- **MSW Docs**: https://mswjs.io/
- **Testing Library**: https://testing-library.com/
- **Instagram Graph API**: https://developers.facebook.com/docs/instagram-api/

---

**Questions?** Delegate to the `test-engineer` agent for detailed testing assistance.
