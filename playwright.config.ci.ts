import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright CI Configuration
 *
 * Used in the deploy-production pipeline to test against a Vercel preview
 * deployment before promoting to production.
 *
 * Key differences from other configs:
 * - No webServer (tests against deployed Vercel preview URL)
 * - BASE_URL from environment (preview URL from deploy job)
 * - Excludes live Instagram publishing tests (would actually publish)
 * - Longer timeouts for network latency
 * - 5 shards for parallel execution in CI
 *
 * Usage:
 *   BASE_URL=https://preview-abc123.vercel.app npx playwright test --config=playwright.config.ci.ts
 */
export default defineConfig({
  testDir: '__tests__/e2e',

  // Global setup/teardown for test data cleanup
  globalSetup: require.resolve('./__tests__/e2e/helpers/global-setup'),
  globalTeardown: require.resolve('./__tests__/e2e/helpers/global-teardown'),

  // Exclude tests that would actually publish to Instagram
  testIgnore: [
    /instagram-publish-live\.spec\.ts/,
    /instagram-tagging-live\.spec\.ts/,
  ],

  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,

  // Reporter configuration
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results/ci/results.json' }],
    ...(process.env.CI ? [['github', {}] as const] : []),
  ],

  // Shared settings for all projects
  use: {
    // Base URL from environment (Vercel preview URL)
    baseURL: process.env.BASE_URL,

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true,
    },

    // Video on failure
    video: 'retain-on-failure',

    // Timeout for each action (longer for deployed preview)
    actionTimeout: 20000,

    // Timeout for navigation actions (longer for network latency)
    navigationTimeout: 45000,

    // Emulate viewport
    viewport: { width: 1280, height: 720 },

    // Context options
    contextOptions: {
      ignoreHTTPSErrors: true,
    },
  },

  // Test timeout (longer for deployed preview with network latency)
  timeout: 120000,

  // Expect timeout
  expect: {
    timeout: 20000,
  },

  // Configure projects
  projects: [
    {
      name: 'ci-tests',

      use: {
        ...devices['Desktop Chrome'],
      },

      // Run in parallel
      fullyParallel: true,
      workers: 2,

      // Retry for network flakiness
      retries: 2,
    },
  ],

  // NO webServer — tests against real Vercel deployment

  // Output folder for test artifacts
  outputDir: 'test-results/ci',

  // Screenshot output directory
  snapshotDir: 'screenshots',
  snapshotPathTemplate: 'screenshots/{testFilePath}/{arg}{ext}',
});
