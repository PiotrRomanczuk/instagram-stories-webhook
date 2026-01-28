# E2E Tests

End-to-end tests for the Instagram Stories Webhook application using Playwright.

## Quick Start

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install --with-deps chromium

# Setup test media files (optional, requires ImageMagick/FFmpeg)
npm run setup:test-media

# Run E2E tests
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run specific test file
npx playwright test __tests__/e2e/auth.spec.ts

# Run tests in headed mode (see browser)
npx playwright test --headed

# Debug a specific test
npx playwright test --debug __tests__/e2e/auth.spec.ts
```

## Test Structure

```
__tests__/e2e/
├── fixtures/               # Test fixtures and data
│   ├── auth/              # Authentication state files
│   ├── test-images/       # Test image files
│   ├── test-videos/       # Test video files
│   ├── README.md          # Fixtures setup guide
│   └── setup-media.sh     # Script to generate test media
├── helpers/               # Test helper utilities
│   ├── auth.ts           # Authentication helpers
│   └── seed.ts           # Test data seeding utilities
├── auth.spec.ts          # Authentication & authorization tests
├── rbac.spec.ts          # Role-based access control tests
├── meme-submissions.spec.ts      # Meme submission tests
├── meme-review-admin.spec.ts     # Admin review workflow tests
├── scheduling-publishing.spec.ts # Scheduling tests
├── home.spec.ts          # Homepage tests (existing)
├── tsconfig.json         # TypeScript config for E2E tests
└── README.md             # This file
```

## Test Coverage

### Implemented Tests (P0 - Critical Priority)

#### ✅ Authentication & Authorization (`auth.spec.ts`)
- AC-01: Unauthenticated user redirection
- AC-02: Google OAuth sign-in flow
- AC-03: Session persistence
- AC-04: Sign out flow
- AC-05: Unauthorized access protection
- AC-06: Email whitelist check

#### ✅ Role-Based Access Control (`rbac.spec.ts`)
- RBAC-01: Admin access to all routes
- RBAC-02: User denied admin routes
- RBAC-03: Admin views all users' data
- RBAC-04: User views only own data (RLS)
- RBAC-05: Email whitelist role assignment
- RBAC-06: Admin fallback to ADMIN_EMAIL

#### ✅ Meme Submissions (`meme-submissions.spec.ts`)
- MS-01: Create valid meme submission
- MS-02: Invalid aspect ratio rejection
- MS-04: View own submissions
- MS-05: Cannot view other users' submissions
- MS-06: Edit own submission
- MS-07: Delete own submission
- MS-08: Cannot delete approved submission
- MS-09: Title validation

#### ✅ Meme Review & Admin (`meme-review-admin.spec.ts`)
- MR-01: Admin view all pending memes
- MR-02: Approve single meme
- MR-03: Reject meme with reason
- MR-04: Bulk approve multiple memes
- MR-05: Bulk reject multiple memes
- MR-07: Search memes by title
- MR-08: Edit blocked after review
- MR-10: User denied admin panel

#### ✅ Scheduling & Publishing (`scheduling-publishing.spec.ts`)
- SP-01: Schedule post with future datetime
- SP-02: Validate datetime must be future
- SP-03: View scheduled posts list
- SP-04: Edit scheduled post
- SP-05: Delete scheduled post
- SP-06: Bulk reschedule posts
- SP-07: Cannot edit processing post
- SP-08: Check publish quota
- SP-09: Database record created correctly
- SP-10: Require Meta token to schedule

## Test Configuration

Configuration is in `playwright.config.ts` at the project root:

- **Base URL**: `http://localhost:3000`
- **Browsers**: Chromium (default)
- **Workers**: 1 in CI, unlimited locally
- **Retries**: 2 on CI, 0 locally
- **Timeout**: 60 seconds per test
- **Screenshots**: On failure only
- **Video**: Retained on failure
- **Trace**: On first retry

## Authentication in Tests

Tests use helper functions for authentication:

```typescript
import { signInAsAdmin, signInAsUser, signOut } from './helpers/auth';

test('example test', async ({ page }) => {
  // Sign in as admin
  await signInAsAdmin(page);

  // Perform test actions
  await page.goto('/admin/memes');

  // Clean up
  await signOut(page);
});
```

### Test Users

- **Admin**: `admin@test.com` (role: admin)
- **User 1**: `user@test.com` (role: user)
- **User 2**: `user2@test.com` (role: user)

## Test Data Management

### Seeding Data

```typescript
import { createMemeSubmission, approveMeme } from './helpers/seed';

// Create test submission
const memeId = await createMemeSubmission(page, {
  title: 'Test Meme',
  caption: 'Test caption',
  mediaUrl: '/fixtures/test-images/valid-square.jpg',
  userId: 'user-id',
});

// Approve as admin
await approveMeme(page, memeId);
```

### Cleanup

```typescript
import { cleanupTestData } from './helpers/seed';

test.afterAll(async ({ page }) => {
  await cleanupTestData(page);
});
```

## CI/CD Integration

Tests run automatically on:
- Push to `main`, `develop`, or `claude/**` branches
- Pull requests to `main` or `develop`
- Manual workflow dispatch

GitHub Actions workflow: `.github/workflows/e2e-tests.yml`

### CI Environment Variables

Required secrets in GitHub:
- `NEXT_PUBLIC_SUPABASE_URL_TEST`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY_TEST`
- `SUPABASE_SERVICE_ROLE_KEY_TEST`
- `NEXTAUTH_SECRET`

## Debugging Tests

### View Test Report

After running tests:
```bash
npx playwright show-report
```

### Debug Failing Tests

```bash
# Run with debug flag
npx playwright test --debug

# Run specific test in debug mode
npx playwright test auth.spec.ts:14 --debug

# View trace for failed test
npx playwright show-trace trace.zip
```

### Common Issues

#### 1. Element Not Found
```typescript
// ❌ Bad: Assumes immediate availability
await page.click('button');

// ✅ Good: Wait for element
await page.waitForSelector('button');
await page.click('button');

// ✅ Better: Use built-in waits
await page.locator('button').click();
```

#### 2. Timing Issues
```typescript
// ❌ Bad: Hardcoded timeout
await page.waitForTimeout(5000);

// ✅ Good: Wait for specific condition
await page.waitForURL(/\/memes/);
await page.waitForSelector('[data-testid="meme-list"]');
```

#### 3. Authentication State
```typescript
// Clear state between tests
test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});
```

## Test Best Practices

### 1. Use Data Test IDs

```tsx
// Component
<button data-testid="submit-meme">Submit</button>

// Test
await page.locator('[data-testid="submit-meme"]').click();
```

### 2. Avoid Brittle Selectors

```typescript
// ❌ Bad: Relies on specific text
await page.click('text=Submit');

// ✅ Good: Uses semantic selector
await page.getByRole('button', { name: 'Submit' }).click();
```

### 3. Test User Flows, Not Implementation

```typescript
// ❌ Bad: Testing implementation details
expect(localStorage.getItem('token')).toBeTruthy();

// ✅ Good: Testing user-visible behavior
await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
```

### 4. Keep Tests Independent

```typescript
// Each test should be able to run alone
test('test 1', async ({ page }) => {
  // Setup own data
  await createTestData();

  // Run test
  // ...

  // Clean up
  await cleanupTestData();
});
```

## What's NOT Tested

According to CLAUDE.md, these cannot be automated:

- ❌ Actual Instagram API publishing (requires real accounts)
- ❌ Meta Graph API container creation
- ❌ Real media upload to Instagram servers
- ❌ IG media ID retrieval

**Strategy**: Tests verify data is prepared correctly up to the point of API call. Mock Meta API responses in unit tests (MSW).

## Test Priorities

- **P0 (Critical)**: Must pass before deployment
- **P1 (High)**: Should pass, may be deferred with justification
- **P2 (Medium)**: Nice to have, can be skipped for urgent releases

Run only critical tests:
```bash
npx playwright test --grep "@critical"
```

## Performance

- **Parallel execution**: Tests run in parallel for speed
- **Test isolation**: Each test is independent
- **Smart waits**: Automatic waiting for elements
- **Retry logic**: Flaky tests retry automatically in CI

## Further Reading

- [Playwright Documentation](https://playwright.dev/)
- [Test Plan](../../E2E_TEST_PLAN.md)
- [CLAUDE.md Testing Strategy](../../CLAUDE.md#testing-strategy)
- [Fixtures Setup Guide](./fixtures/README.md)

## Contributing

When adding new tests:

1. Follow naming convention: `FEATURE-XX: description`
2. Add to appropriate spec file or create new one
3. Update this README with test coverage
4. Ensure test is independent and can run in isolation
5. Add appropriate priority tag (@critical, @high, @medium)
6. Update E2E_TEST_PLAN.md if adding new test cases

## Support

For questions or issues:
- Check [E2E Test Plan](../../E2E_TEST_PLAN.md)
- Review [CLAUDE.md](../../CLAUDE.md)
- Open issue on GitHub
