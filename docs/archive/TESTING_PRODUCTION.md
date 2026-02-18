# Production Testing Guide

**Testing deployed production site with Playwright**

---

## ✅ Yes, Playwright Can Test Production Sites!

Playwright can test **any URL**, not just localhost. This enables:
- Post-deployment verification
- Production smoke tests
- Multi-environment testing (dev, staging, production)
- Real-world performance testing

---

## 🚀 Quick Start

### Test Your Production Site

```bash
# Set your production URL
export BASE_URL=https://your-app.vercel.app

# Run production smoke tests (REAL Instagram)
ENABLE_REAL_IG_TESTS=true ENABLE_LIVE_IG_PUBLISH=true \
  npm run test:e2e:production:smoke
```

**One-liner:**
```bash
BASE_URL=https://your-app.vercel.app \
ENABLE_REAL_IG_TESTS=true \
ENABLE_LIVE_IG_PUBLISH=true \
  npm run test:e2e:production:smoke
```

---

## 📋 What Was Created

### 1. Production Playwright Config
**File**: `playwright.config.production.ts`

**Key Features:**
- Uses `BASE_URL` environment variable for deployed site
- No `webServer` (site already deployed)
- Only runs smoke tests (tagged with `@smoke`)
- Extended timeouts for production network latency
- Single worker to avoid rate limiting

### 2. Production Smoke Tests
**File**: `__tests__/e2e/production-smoke.spec.ts`

**Tests Included:**
1. ✅ **SMOKE-01**: Production site loads successfully
2. ✅ **SMOKE-02**: Authentication works
3. ✅ **SMOKE-03**: Instagram connection status
4. ✅ **SMOKE-04**: Video publishing (CRITICAL) - Real Instagram API
5. ✅ **SMOKE-05**: Content API returns data
6. ✅ **SMOKE-06**: Health check endpoint

### 3. NPM Scripts
**Added to `package.json`:**
```json
"test:e2e:production": "playwright test --config=playwright.config.production.ts"
"test:e2e:production:smoke": "ENABLE_REAL_IG_TESTS=true ENABLE_LIVE_IG_PUBLISH=true playwright test --config=playwright.config.production.ts"
```

---

## 🎯 Production vs Localhost Testing

| Aspect | Localhost | Production |
|--------|-----------|------------|
| URL | `http://localhost:3000` | `https://your-app.vercel.app` |
| Web Server | ✅ Started by Playwright | ❌ Not needed (already deployed) |
| Tests Run | Full suite (~50+ tests) | Smoke tests only (~6 tests) |
| Frequency | Every commit | After deployment |
| Duration | 5-10 minutes | 2-3 minutes |
| Network | Local (fast) | Real (slower) |
| Timeouts | 60s | 120-180s |

---

## 🔧 Configuration Details

### Environment-Based Base URL

**Playwright config:**
```typescript
use: {
  baseURL: process.env.BASE_URL || 'https://your-app.vercel.app',
}
```

**No Web Server for Production:**
```typescript
// webServer: undefined, // Don't start local server
```

**Only Run Smoke Tests:**
```typescript
grep: /@smoke/, // Only tests tagged with @smoke
```

---

## 🧪 Running Production Tests

### Option 1: Environment Variable
```bash
export BASE_URL=https://your-app.vercel.app
npm run test:e2e:production:smoke
```

### Option 2: Inline
```bash
BASE_URL=https://your-app.vercel.app npm run test:e2e:production:smoke
```

### Option 3: Specific Test
```bash
BASE_URL=https://your-app.vercel.app \
ENABLE_REAL_IG_TESTS=true \
ENABLE_LIVE_IG_PUBLISH=true \
  npx playwright test --config=playwright.config.production.ts -g "SMOKE-04"
```

### Option 4: CI/CD (GitHub Actions)
```yaml
- name: Run Production Smoke Tests
  env:
    BASE_URL: ${{ secrets.PRODUCTION_URL }}
    ENABLE_REAL_IG_TESTS: true
    ENABLE_LIVE_IG_PUBLISH: true
  run: npm run test:e2e:production:smoke
```

---

## ⚠️ Production Testing Considerations

### 1. Rate Limiting
**Problem**: Production tests hit real Instagram API
**Solution**:
- Only run critical smoke tests (not full suite)
- Use 24-hour de-duplication
- Run sequentially (1 worker)
- Don't run on every commit

### 2. Real Data
**Problem**: Tests modify production database
**Solution**:
- Use test data that's clearly marked (e.g., "E2E Test Video")
- Clean up test data after tests run
- Consider separate staging environment

### 3. Network Latency
**Problem**: Production is slower than localhost
**Solution**:
- Extended timeouts (120-180s vs 60s)
- More retries (3 vs 1)
- Expect slower execution

### 4. Cost
**Problem**: Tests consume API quota, storage, bandwidth
**Solution**:
- Run smoke tests sparingly (post-deployment only)
- Don't run on every PR
- Monitor API usage

### 5. Test Isolation
**Problem**: Multiple test runs can conflict
**Solution**:
- Use unique test data (timestamps, UUIDs)
- 24-hour de-duplication for content
- Single worker execution

---

## 📊 When to Run Production Tests

### ✅ Good Times to Run

1. **After Deployment** - Verify production is working
2. **Before Major Release** - Smoke test critical paths
3. **After Infrastructure Changes** - Verify platform health
4. **Scheduled Nightly** - Continuous monitoring
5. **Post-Incident** - Verify fix in production

### ❌ Bad Times to Run

1. ~~Every commit~~ - Too expensive, use localhost tests
2. ~~Every PR~~ - Use staging environment instead
3. ~~During high traffic~~ - Can affect user experience
4. ~~Parallel execution~~ - Rate limiting issues

---

## 🎭 Multi-Environment Testing

### Test Different Environments

```bash
# Development (localhost)
npm run test:e2e

# Staging
BASE_URL=https://staging.your-app.vercel.app npm run test:e2e:production

# Production
BASE_URL=https://your-app.vercel.app npm run test:e2e:production:smoke
```

### Environment-Specific Behavior

```typescript
// In test file
test('feature works', async ({ page }) => {
  const isProduction = process.env.BASE_URL?.includes('your-app.vercel.app');

  if (isProduction) {
    // Use longer timeout in production
    await expect(element).toBeVisible({ timeout: 30000 });
  } else {
    // Faster in localhost
    await expect(element).toBeVisible({ timeout: 10000 });
  }
});
```

---

## 🔐 Security Considerations

### Environment Secrets

**Never commit production URLs/secrets:**
```bash
# ❌ DON'T
BASE_URL=https://my-app.vercel.app npm test

# ✅ DO - Use environment variable
export BASE_URL=https://my-app.vercel.app
npm test
```

**GitHub Secrets:**
```yaml
env:
  BASE_URL: ${{ secrets.PRODUCTION_URL }}
  ENABLE_LIVE_IG_PUBLISH: true
```

### Authentication

**Production tests use REAL Instagram account:**
- Account: `p.romanczuk@gmail.com`
- Instagram: `@www_hehe_pl`
- Tokens stored in production Supabase

---

## 📈 CI/CD Integration

### GitHub Actions Example

```yaml
name: Production Smoke Tests

on:
  workflow_dispatch: # Manual trigger
  schedule:
    - cron: '0 0 * * *' # Nightly at midnight

jobs:
  smoke-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run Production Smoke Tests
        env:
          BASE_URL: ${{ secrets.PRODUCTION_URL }}
          ENABLE_REAL_IG_TESTS: true
          ENABLE_LIVE_IG_PUBLISH: true
        run: npm run test:e2e:production:smoke

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: production-test-results
          path: test-results/
```

---

## 🐛 Debugging Production Tests

### View Test Trace
```bash
# Run with trace
BASE_URL=https://your-app.vercel.app \
  npx playwright test --config=playwright.config.production.ts --trace on

# View trace
npx playwright show-trace test-results/.../trace.zip
```

### Screenshots on Failure
```bash
# Automatically captured in test-results/production/
ls test-results/production/*/screenshot-*.png
```

### Debug Mode
```bash
BASE_URL=https://your-app.vercel.app \
  PWDEBUG=1 npx playwright test --config=playwright.config.production.ts -g "SMOKE-04"
```

---

## 🎯 Best Practices

### 1. Tag Production Tests
```typescript
test('critical feature @smoke', async ({ page }) => {
  // Only runs in production smoke suite
});
```

### 2. Skip Non-Production
```typescript
test.skip(
  () => process.env.BASE_URL?.includes('localhost'),
  'Production test only'
);
```

### 3. Graceful Degradation
```typescript
if (await element.isVisible({ timeout: 5000 }).catch(() => false)) {
  // Element exists, test it
} else {
  // Element doesn't exist, skip gracefully
  test.skip();
}
```

### 4. Clear Test Data
```typescript
test.afterEach(async ({ request }) => {
  // Clean up test data in production
  await request.delete('/api/test-data');
});
```

### 5. Monitor and Alert
```typescript
test('critical API works @smoke', async ({ request }) => {
  const start = Date.now();
  const response = await request.get('/api/critical');
  const duration = Date.now() - start;

  expect(response.ok()).toBe(true);
  expect(duration).toBeLessThan(2000); // Alert if slow
});
```

---

## 📚 Related Files

| File | Purpose |
|------|---------|
| `playwright.config.ts` | Localhost testing config |
| `playwright.config.production.ts` | **Production testing config** |
| `__tests__/e2e/production-smoke.spec.ts` | **Production smoke tests** |
| `package.json` | NPM scripts for production tests |

---

## 🎓 Summary

### Localhost Tests (Default)
- Full test suite (~50+ tests)
- Run on every commit
- Fast execution (local)
- Started by Playwright

### Production Tests (New)
- Smoke tests only (~6 tests)
- Run post-deployment
- Real network latency
- Site already deployed

### Both Use Real Instagram
- No mocking in E2E tests
- Real account: `@www_hehe_pl`
- Real API calls
- 24-hour de-duplication

---

**Ready to test production!** 🚀

Run your first production smoke test:
```bash
BASE_URL=https://your-app.vercel.app \
ENABLE_REAL_IG_TESTS=true \
ENABLE_LIVE_IG_PUBLISH=true \
  npm run test:e2e:production:smoke
```
