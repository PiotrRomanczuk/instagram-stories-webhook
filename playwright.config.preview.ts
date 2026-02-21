import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration - Preview Deployments
 *
 * This configuration runs a minimal E2E test suite (~40 tests) for preview
 * deployments (PRs, merges to main). It excludes production-only tests that
 * require real Instagram API calls, mobile viewport testing, and comprehensive
 * smoke tests.
 *
 * Preview Suite Includes:
 * - auth-and-rbac-core.spec.ts (22 tests) - All auth/RBAC tests
 * - critical-user-journeys.spec.ts (12 tests) - Core flows only (CP-2, CP-3)
 *   • Skips CP-4, CP-5, CP-6, CP-7 in preview mode (production-only)
 * - developer-tools.spec.ts (6 tests) - Core access control
 *   • Skips CRON-03-06, DEV-04, DEBUG-01/03/04 in preview mode (production-only)
 *
 * Total: ~40 tests (with PREVIEW_MODE=true environment guard)
 *
 * Excluded (Production Only):
 * - instagram-publishing-live.spec.ts (4 tests) - Real Instagram API
 * - mobile-responsive-core.spec.ts (33 tests) - Mobile viewport testing
 * - production-smoke.spec.ts (6 tests) - Production verification
 * - video-preview-functionality.spec.ts (7 tests) - Video features
 * - Extended tests within included files (guarded by PREVIEW_MODE check)
 *
 * Expected Duration: 4-5 minutes (vs 10+ minutes for full suite)
 *
 * See: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: '__tests__/e2e',

  // Global setup/teardown for test data cleanup
  globalSetup: require.resolve('./__tests__/e2e/helpers/global-setup'),
  globalTeardown: require.resolve('./__tests__/e2e/helpers/global-teardown'),

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Reporter to use
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results/preview/results.json' }],
  ],

  // Shared settings for all projects
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure — saved to screenshots/ directory
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true,
    },

    // Video on failure
    video: 'retain-on-failure',

    // Timeout for each action (e.g., click, fill)
    actionTimeout: 15000,

    // Timeout for navigation actions
    navigationTimeout: 30000,

    // Emulate viewport - Desktop only for preview
    viewport: { width: 1280, height: 720 },

    // Context options
    contextOptions: {
      // Ignore HTTPS errors
      ignoreHTTPSErrors: true,
    },
  },

  // Test timeout (increased for auth flakiness)
  timeout: 90000,

  // Expect timeout
  expect: {
    timeout: 15000,
  },

  // Configure projects - single project for preview (no dependency workflow needed)
  projects: [
    {
      name: 'preview-tests',

      // Exclude production-only test files
      testIgnore: [
        /instagram-publishing-live\.spec\.ts/,
        /production-smoke\.spec\.ts/,
        /mobile-responsive-core\.spec\.ts/,
        /video-preview-functionality\.spec\.ts/,
      ],

      use: {
        ...devices['Desktop Chrome'],
      },

      // Run in parallel for faster execution (2-3 workers)
      fullyParallel: true,
      workers: process.env.CI ? 2 : 3,

      // Standard retry configuration
      retries: process.env.CI ? 2 : 1,
    },
  ],

  // Run local dev server before starting the tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes to start
    stdout: 'pipe',
    stderr: 'pipe',
  },

  // Output folder for test artifacts
  outputDir: 'test-results/preview',

  // Screenshot output directory
  snapshotDir: 'screenshots',
  snapshotPathTemplate: 'screenshots/{testFilePath}/{arg}{ext}',
});
