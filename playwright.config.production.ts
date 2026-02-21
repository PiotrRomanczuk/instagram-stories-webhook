import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Production Testing Configuration
 *
 * Tests against DEPLOYED PRODUCTION site (not localhost)
 *
 * Usage:
 *   # Run production smoke tests
 *   BASE_URL=https://your-app.vercel.app npx playwright test --config=playwright.config.production.ts
 *
 *   # Or set in environment
 *   export BASE_URL=https://your-app.vercel.app
 *   npx playwright test --config=playwright.config.production.ts
 *
 * IMPORTANT:
 *   - Only runs critical smoke tests (not full suite)
 *   - Uses REAL Instagram account (@www_hehe_pl)
 *   - Rate limiting considerations apply
 *   - 24-hour de-duplication prevents duplicate publishes
 */
export default defineConfig({
  testDir: '__tests__/e2e',

  // Global setup/teardown for test data cleanup
  globalSetup: require.resolve('./__tests__/e2e/helpers/global-setup'),
  globalTeardown: require.resolve('./__tests__/e2e/helpers/global-teardown'),

  // Only run production smoke tests
  // grep: /@smoke/, // Option 1: Use test tags
  testMatch: /production-smoke\.spec\.ts$/, // Option 2: Use filename pattern

  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,

  // Reporter to use
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results/production-results.json' }],
  ],

  // Shared settings for all projects
  use: {
    // Base URL from environment variable (REQUIRED for production tests)
    baseURL: process.env.BASE_URL || 'https://your-app.vercel.app',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Timeout for each action (e.g., click, fill)
    actionTimeout: 20000, // Longer for production (network latency)

    // Timeout for navigation actions
    navigationTimeout: 45000, // Longer for production

    // Emulate viewport
    viewport: { width: 1280, height: 720 },

    // Context options
    contextOptions: {
      // Accept HTTPS certificates
      ignoreHTTPSErrors: false, // Strict in production
    },
  },

  // Test timeout (increased for production network latency)
  timeout: 120000, // 2 minutes

  // Expect timeout
  expect: {
    timeout: 20000, // Longer for production
  },

  // Configure projects
  projects: [
    // ===================================================================
    // Project 1: Production Smoke Tests (Critical Paths Only)
    // ===================================================================
    {
      name: 'production-smoke',

      // Only run production smoke test files
      testMatch: /production-smoke\.spec\.ts$/,

      // Only run if ENABLE_LIVE_IG_PUBLISH is set
      grep: process.env.ENABLE_LIVE_IG_PUBLISH === 'true'
        ? undefined
        : /NEVER_MATCH_THIS_PATTERN_TO_SKIP_ALL/,

      use: {
        ...devices['Desktop Chrome'],
      },

      // Run sequentially to avoid rate limiting
      fullyParallel: false,
      workers: 1,

      // More retries for production (network flakiness)
      retries: 3,
    },
  ],

  // ===================================================================
  // NO webServer for production tests (site already deployed)
  // ===================================================================
  // webServer: undefined, // Don't start local server

  // Output folder for test artifacts
  outputDir: 'test-results/production',
});
