# Test Dependency Workflow Implementation

## Overview

Implemented a test dependency workflow where the live Instagram publishing test runs first as a prerequisite. If it fails, all other Playwright tests are automatically skipped.

## Changes Made

### 1. Playwright Configuration (`playwright.config.ts`)

**Key Changes:**
- Removed top-level `fullyParallel: true` and `workers` settings
- Created two test projects with dependency relationship:
  - **live-publishing-prerequisite**: Runs only `instagram-publishing-live.spec.ts`
  - **main-tests**: Runs all other tests, depends on prerequisite passing
- Configured conditional execution based on `ENABLE_LIVE_IG_PUBLISH` environment variable
- Set separate worker counts and retry logic per project

**Project Configuration:**

```typescript
projects: [
  {
    name: 'live-publishing-prerequisite',
    testMatch: /instagram-publishing-live\.spec\.ts/,
    grep: process.env.ENABLE_LIVE_IG_PUBLISH === 'true' ? undefined : /NEVER_MATCH_THIS_PATTERN_TO_SKIP_ALL/,
    workers: 1,
    retries: process.env.CI ? 3 : 2,
  },
  {
    name: 'main-tests',
    testIgnore: /instagram-publishing-live\.spec\.ts/,
    dependencies: ['live-publishing-prerequisite'],
    fullyParallel: true,
    workers: process.env.CI ? 1 : 3,
    retries: process.env.CI ? 2 : 1,
  },
]
```

### 2. GitHub Actions Workflow (`.github/workflows/e2e-tests.yml`)

**Added Environment Variables:**
- `ENABLE_REAL_IG_TESTS=true`
- `ENABLE_LIVE_IG_PUBLISH=true`

**Added to both:**
- `.env.local` file creation
- Test execution environment

This enables the live publishing test to run in CI by default.

### 3. Package.json Scripts

**Added New Script:**
```json
"test:e2e:live": "ENABLE_REAL_IG_TESTS=true ENABLE_LIVE_IG_PUBLISH=true playwright test --project=live-publishing-prerequisite"
```

This allows developers to run only the live publishing test for debugging purposes.

### 4. Documentation (`CLAUDE.md`)

**Added Section: Test Execution Order (Dependency Workflow)**

Documented:
- How the dependency workflow works
- Local development commands
- CI/CD behavior
- Prerequisites and requirements

## How It Works

### Execution Flow

1. **Prerequisite Phase:**
   - Playwright runs `live-publishing-prerequisite` project
   - Only executes `instagram-publishing-live.spec.ts`
   - Runs sequentially (1 worker) to avoid race conditions
   - 3 retries in CI, 2 retries locally

2. **Main Tests Phase:**
   - Only runs if prerequisite passes
   - Executes all other E2E tests
   - Runs in parallel for efficiency
   - Standard retry configuration

3. **Failure Handling:**
   - If prerequisite fails, main tests are skipped
   - Clear error message indicates critical publishing failure
   - Saves ~10+ minutes of test execution time

### Environment Variable Control

| Variable | Purpose | Effect if Not Set |
|----------|---------|-------------------|
| `ENABLE_REAL_IG_TESTS` | Enable real Instagram API tests | Tests are skipped via `test.skip()` |
| `ENABLE_LIVE_IG_PUBLISH` | Enable live publishing prerequisite | Prerequisite project skips all tests |

## Usage

### Local Development

**Run all tests with dependency chain:**
```bash
npm run test:e2e
```

**Run only live publishing test:**
```bash
npm run test:e2e:live
```

**Run tests without live publishing:**
```bash
unset ENABLE_LIVE_IG_PUBLISH
npm run test:e2e
```

**Debug with UI mode:**
```bash
ENABLE_REAL_IG_TESTS=true ENABLE_LIVE_IG_PUBLISH=true npm run test:e2e:ui
```

### CI/CD

The workflow is automatically enabled in GitHub Actions:
- Environment variables are set in the workflow file
- Prerequisite runs first on every PR/push
- If prerequisite fails, PR checks fail immediately
- Saves time by skipping main tests when publishing is broken

## Verification

### Check Test Execution Order

```bash
ENABLE_REAL_IG_TESTS=true ENABLE_LIVE_IG_PUBLISH=true npm run test:e2e
```

Look for output:
```
Running 1 test using 1 worker
  ✓  [live-publishing-prerequisite] instagram-publishing-live.spec.ts:52:2 › LIVE-PUB-01: publish story via debug page

Running 10 tests using 3 workers
  [main-tests] › story-preview.spec.ts:...
  [main-tests] › admin-dashboard.spec.ts:...
  ...
```

### Verify Dependency Chain

If prerequisite fails, you'll see:
```
  ✗  [live-publishing-prerequisite] instagram-publishing-live.spec.ts:52:2 › LIVE-PUB-01: publish story via debug page

  [main-tests] Skipped due to dependency failure
```

## Benefits

✅ **Fail Fast**: Catch critical publishing failures immediately
✅ **Resource Efficiency**: Skip 10+ minutes of tests if prerequisite fails
✅ **Clear Signal**: Prerequisite failure clearly indicates publishing broken
✅ **Native Solution**: Uses Playwright's built-in dependency feature (no custom scripts)
✅ **CI/CD Integration**: Works seamlessly with existing GitHub Actions
✅ **Local Development**: Same workflow locally and in CI
✅ **Toggleable**: Can disable with environment variables

## Rollback Plan

If issues arise, revert changes to `playwright.config.ts`:

1. Remove `projects` array
2. Restore top-level `fullyParallel: true`
3. Restore top-level `workers` setting
4. Use single project: `{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }`

## Requirements

- **Playwright**: 1.31+ (project dependencies feature)
- **Node.js**: 18+
- **Instagram Account**: Valid tokens for p.romanczuk@gmail.com in Supabase
- **Environment Variables**: `ENABLE_REAL_IG_TESTS=true` and `ENABLE_LIVE_IG_PUBLISH=true`

## Testing the Implementation

### Test Case 1: Normal Flow (Prerequisite Passes)
```bash
ENABLE_REAL_IG_TESTS=true ENABLE_LIVE_IG_PUBLISH=true npm run test:e2e
```
Expected: Prerequisite runs → passes → main tests run

### Test Case 2: Prerequisite Disabled
```bash
npm run test:e2e
```
Expected: Prerequisite skips all tests → main tests run

### Test Case 3: Prerequisite Fails
Temporarily modify test to force failure, then:
```bash
ENABLE_REAL_IG_TESTS=true ENABLE_LIVE_IG_PUBLISH=true npm run test:e2e
```
Expected: Prerequisite fails → main tests skipped

## Files Modified

1. ✅ `playwright.config.ts` - Added project dependencies
2. ✅ `.github/workflows/e2e-tests.yml` - Added environment variables
3. ✅ `package.json` - Added `test:e2e:live` script
4. ✅ `CLAUDE.md` - Documented the workflow

## Related Files (Not Modified)

- `__tests__/e2e/instagram-publishing-live.spec.ts` - Target prerequisite test
- `__tests__/e2e/helpers/auth.ts` - Authentication helpers
- `.env.local` - Environment variables (set by user/CI)

## Notes

- The live publishing test uses real credentials for p.romanczuk@gmail.com
- Tests actually publish to Instagram account @www_hehe_pl
- Requires valid Meta Graph API tokens in Supabase
- Network/API flakiness handled via 3 retries in CI
- Tests use real memes from `/memes/` folder instead of external URLs
