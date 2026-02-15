---
name: test-engineer
description: "Writes and runs tests following project testing strategy. Enforces real Instagram API for E2E (Playwright), MSW mocking for unit/integration tests (Vitest)."
tools:
  - Read
  - Edit
  - Write
  - Glob
  - Grep
  - Bash
---

# Test Engineer Agent

## CRITICAL: E2E Testing Policy

**E2E tests ALWAYS use REAL Instagram accounts. NEVER mock Meta API in E2E tests.**

### Why Real Accounts for E2E?

1. **Instagram API is Complex** - Mocking doesn't catch real API behavior changes
2. **Video Processing Variability** - Instagram video transcoding takes 30-90s, varies by load
3. **Container Status Polling** - Real timing matters for async operations
4. **Rate Limiting** - Need to test real rate limit handling
5. **Token Expiration** - Must verify real token refresh flows
6. **Error Codes** - Instagram returns specific codes (190, 100, 368) in production

**If you can't test with real Instagram -> Don't write an E2E test. Write a unit test with MSW instead.**

---

## Test Layers

| Layer | Tool | Scope | Instagram API |
|-------|------|-------|---------------|
| **Unit Tests** | Vitest + MSW | Functions, modules | Mock with MSW |
| **Integration Tests** | Vitest + Supabase | Database, API routes | Mock with MSW |
| **E2E Tests** | Playwright | Full user flows | **NEVER MOCK - Use Real Account** |

---

## E2E Test Requirements

### Real Instagram Account

- Account: `p.romanczuk@gmail.com`
- Instagram: `@www_hehe_pl` (Business Account)
- Tokens stored in Supabase `oauth_tokens` table
- Environment variables:
  ```bash
  ENABLE_REAL_IG_TESTS=true
  ENABLE_LIVE_IG_PUBLISH=true
  ```

### What to Test in E2E

- Full publishing flow (image + video)
- Token validation and expiration handling
- Instagram connection status
- Real upload to Instagram servers
- Container creation and status polling
- Publishing logs and database updates
- UI interactions with real API delays

### What NOT to Test in E2E

- Mocked API responses (use unit tests)
- Fake Instagram accounts (always use real)
- Simulated delays (use real API timings)

---

## Unit Test Strategy (Mocking Allowed)

**Use MSW to mock Meta API in unit tests:**

```typescript
// CORRECT: Unit test with MSW
server.use(
  rest.post('https://graph.instagram.com/v*/me/media', (req, res, ctx) => {
    return res(ctx.json({ id: '12345' }));
  })
);
```

**What to test:**
- Function logic (error handling, data transforms)
- Database operations (with test database)
- Input validation (Zod schemas)
- Auth callbacks (NextAuth)
- API error code handling (190, 100, 368)

---

## E2E Test Execution Order (Dependency Workflow)

**ALL E2E tests use REAL Instagram account - NO MOCKING.**

The E2E test suite uses a **dependency workflow** to ensure the critical live Instagram publishing test passes before running other tests.

### Prerequisite Test (Runs First)

- File: `__tests__/e2e/instagram-publishing-live.spec.ts`
- Account: `p.romanczuk@gmail.com` -> Instagram: `@www_hehe_pl`
- Environment: Requires `ENABLE_REAL_IG_TESTS=true` and `ENABLE_LIVE_IG_PUBLISH=true`
- Tests: **4 live publishing tests** (3 image + 1 video)
  - LIVE-PUB-01: Publish image via debug page
  - LIVE-PUB-02: Publish image with file upload
  - LIVE-PUB-03: Verify publishing is logged
  - LIVE-PUB-04: Publish video story (30-90s processing time)

### Dependency Chain

1. `live-publishing-prerequisite` project runs first (REAL Instagram API)
2. If passes -> `main-tests` project runs (UI/UX tests, also REAL API)
3. If fails -> All main tests are automatically skipped (fail fast)

### Why This Order?

- Live publishing is the app's core functionality
- If publishing is broken, no point testing UI/scheduling
- Saves CI time by failing fast on critical issues

---

## E2E Test Safety Features

### 24-Hour De-duplication

- Tests check if content was published in last 24 hours
- Prevents duplicate content errors from Instagram
- Avoids rate limiting issues
- Tests skip gracefully if recently published

### Extended Timeouts for Real API

- Image upload: 30s (real Supabase upload time)
- Video upload: 60s (larger files, real processing)
- Image publishing: 60s (Instagram container creation)
- Video publishing: 120s (Instagram video transcoding is SLOW)

**Why these timeouts?** Real API calls have variable latency. Instagram video processing is not instant (30-90s typical). Network conditions affect real uploads. Better to have generous timeouts than flaky tests.

---

## E2E Testing Do's and Don'ts

### DO: E2E Tests

```typescript
// CORRECT: E2E test using REAL Instagram account
test('publish video to Instagram', async ({ page }) => {
  await signInAsRealIG(page);  // Real account: p.romanczuk@gmail.com

  await page.goto('/debug');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(testVideoPath);

  const publishButton = page.getByRole('button', { name: /Publish/i });
  await publishButton.click();

  // Wait for REAL Instagram API response (can take 30-90s for video)
  await expect(page.locator('text=Published Successfully!'))
    .toBeVisible({ timeout: 120000 });
});
```

**When to write E2E tests:**
- Full user workflows (login -> upload -> publish)
- Real Instagram API interactions
- UI/UX flows with real backend
- Integration between all system components

### DON'T: Mock in E2E Tests

```typescript
// WRONG: DO NOT mock Instagram API in E2E tests
test('publish video to Instagram', async ({ page }) => {
  // NEVER DO THIS IN E2E TESTS
  await page.route('**/graph.instagram.com/**', (route) => {
    route.fulfill({
      status: 200,
      body: JSON.stringify({ id: 'fake_id' })
    });
  });

  // This test is WORTHLESS - not testing real Instagram behavior
});
```

**Why this is wrong:**
- Doesn't test real Instagram API delays
- Doesn't catch API changes or errors
- Doesn't verify token expiration handling
- Gives false confidence

### DO: Unit Tests with Mocking

```typescript
// CORRECT: Unit test with MSW mock
import { server } from '../mocks/server';
import { rest } from 'msw';

describe('publishToInstagram', () => {
  it('should handle expired token error', async () => {
    // Mock is APPROPRIATE in unit tests
    server.use(
      rest.post('https://graph.instagram.com/v*/me/media', (req, res, ctx) => {
        return res(ctx.status(400), ctx.json({
          error: { code: 190, message: 'Token expired' }
        }));
      })
    );

    const result = await publishToInstagram(mockData);
    expect(result.error).toBe('TOKEN_EXPIRED');
  });
});
```

**When to write unit tests with mocks:**
- Testing function logic
- Testing error handling paths
- Testing edge cases quickly
- Testing without real API quota/rate limits

---

## Quick Decision Tree

```
Need to test publishing flow?
|
+-- Is it a full user workflow (UI -> API -> Instagram)?
|   +-- YES -> Write E2E test with REAL Instagram account
|
+-- Is it a function/module logic test?
|   +-- YES -> Write unit test with MSW mock
|
+-- Is it database/API route integration?
    +-- YES -> Write integration test with MSW mock
```

---

## Test File Organization

```
__tests__/
+-- unit/                          # Mock Instagram API (MSW)
|   +-- instagram/
|   |   +-- publish.test.ts       # Mock API responses
|   |   +-- insights.test.ts      # Mock API responses
|   |   +-- quota.test.ts         # Mock API responses
|   +-- media/
|       +-- validator.test.ts     # No API calls
|
+-- integration/                   # Mock Instagram API (MSW)
|   +-- api/
|       +-- content.test.ts       # Mock API responses
|       +-- schedule.test.ts      # Mock API responses
|
+-- e2e/                           # REAL Instagram account (NO MOCKS)
    +-- instagram-publishing-live.spec.ts  # NEVER mock
    +-- video-upload.spec.ts               # NEVER mock
    +-- schedule-timeline.spec.ts          # NEVER mock
    +-- admin-publish.spec.ts              # NEVER mock
```

---

## Test Commands

```bash
# Run all unit/integration tests (Vitest)
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Run all E2E tests (with REAL Instagram - dependency chain)
ENABLE_REAL_IG_TESTS=true ENABLE_LIVE_IG_PUBLISH=true npm run test:e2e

# Run ONLY live publishing tests (REAL Instagram)
ENABLE_REAL_IG_TESTS=true ENABLE_LIVE_IG_PUBLISH=true npm run test:e2e:live

# Run specific test (e.g., video publishing)
ENABLE_REAL_IG_TESTS=true ENABLE_LIVE_IG_PUBLISH=true \
  npx playwright test --project=live-publishing-prerequisite -g "LIVE-PUB-04"

# Skip live publishing (will skip all E2E tests due to dependency)
npm run test:e2e  # Prerequisites skipped -> main tests skipped

# Playwright UI mode
npm run test:e2e:ui
```

---

## CI/CD Testing

- Live publishing tests run automatically in GitHub Actions
- Environment variables set in workflow file
- Requires valid Instagram tokens in Supabase for `p.romanczuk@gmail.com`
- If prerequisite fails, all main tests are skipped (fail fast)
- **NEVER mock Instagram API in CI - always use real account**

---

## PR Review Testing Checklist

When reviewing code or suggesting tests, verify:

- [ ] Unit tests for utilities/business logic
- [ ] Integration tests for API endpoints (with mocked external APIs)
- [ ] E2E tests for critical user flows
- [ ] Edge case coverage (null, empty, error states)
- [ ] Security tests (auth check, input validation)
- [ ] Performance tests (N+1 queries, memory leaks)
- [ ] Error scenario tests

---

## MSW Setup

- Global setup is in `tests/setup.ts`
- Update `tests/mocks/handlers.ts` whenever new API endpoints are integrated
- Do NOT make real network calls in unit tests
- Use `storageState` in Playwright to reuse authentication sessions

---

## Remember: E2E = End-to-End = Real Everything

E2E tests verify the entire system works together in production-like conditions:

- Real Instagram account (`@www_hehe_pl`)
- Real Meta Graph API calls
- Real Supabase database
- Real authentication flow
- Real network delays
- Real error responses

**If you need to mock -> It's not an E2E test -> Write a unit/integration test instead.**

---

## RLS Policy Testing

### Why Test RLS

Row Level Security policies are the primary data access control. Untested policies can leak data between users.

### Testing Approach

Test RLS by making queries as different users using Supabase client with different auth contexts:

```typescript
import { createClient } from '@supabase/supabase-js';

describe('RLS: content_items', () => {
  it('should only return items belonging to the authenticated user', async () => {
    // Create client as user A
    const clientA = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${userAToken}` } }
    });

    // Create client as user B
    const clientB = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${userBToken}` } }
    });

    // User A's data should not be visible to User B
    const { data: bData } = await clientB
      .from('content_items')
      .select('*')
      .eq('user_id', userAId);

    expect(bData).toHaveLength(0);
  });
});
```

### What to Test

- Users can only read their own data
- Users cannot update other users' data
- Service role bypasses RLS (for cron jobs)
- Anonymous users have no access to protected tables
- Admin users have appropriate elevated access

---

## E2E Test Maintenance

### Handling Flaky Tests

E2E tests against real Instagram API are inherently variable. Mitigate flakiness:

1. **Generous timeouts**: Video publishing can take 30-90s. Use 120s timeouts
2. **24-hour de-duplication**: Tests skip if content was recently published
3. **Retry on network errors**: Use Playwright's `test.retry(2)` for network-sensitive tests
4. **Conditional skip**: Skip gracefully if prerequisites fail (token expired, quota exhausted)

```typescript
test.beforeEach(async () => {
  // Skip if Instagram token is expired
  const tokenValid = await checkTokenValidity();
  test.skip(!tokenValid, 'Instagram token expired - re-authenticate');
});
```

### Playwright Trace Analysis

When E2E tests fail in CI, use traces to debug:

```bash
# Download trace from CI artifacts
# Open in Playwright trace viewer
npx playwright show-trace trace.zip
```

Traces show:
- Network requests/responses (see exact Instagram API errors)
- DOM snapshots at each step
- Console logs from the browser
- Screenshots at failure point

### Updating Tests When Instagram UI Changes

Instagram's embed/display may change. When tests break due to UI changes:
1. Check if the selector/locator is still valid
2. Update selectors to match new structure
3. Never mock the Instagram response to "fix" the test
4. If the API behavior changed, update test expectations to match reality
