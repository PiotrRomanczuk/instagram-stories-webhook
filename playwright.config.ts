import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 * See: https://playwright.dev/docs/test-configuration
 *
 * Project Dependency Workflow:
 * - "live-publishing-prerequisite" runs first (critical publishing test)
 * - "main-tests" depends on prerequisite passing
 * - If prerequisite fails, main tests are automatically skipped
 */
export default defineConfig({
  testDir: '__tests__/e2e',

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Reporter to use
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
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

    // Emulate viewport
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

  // Configure projects with dependency workflow
  projects: [
    // ===================================================================
    // Project 1: Live Publishing Prerequisite (runs first)
    // ===================================================================
    {
      name: 'live-publishing-prerequisite',

      // Only run the live publishing test file
      testMatch: /instagram-publishing-live\.spec\.ts/,

      // Only run if environment variables are set (skip otherwise)
      grep: process.env.ENABLE_LIVE_IG_PUBLISH === 'true'
        ? undefined
        : /NEVER_MATCH_THIS_PATTERN_TO_SKIP_ALL/,

      use: {
        ...devices['Desktop Chrome'],
      },

      // Run sequentially (1 worker) to avoid race conditions with Instagram API
      fullyParallel: false,
      workers: 1,

      // More retries for network/API flakiness
      retries: process.env.CI ? 3 : 2,
    },

    // ===================================================================
    // Project 2: Main Tests (depends on prerequisite)
    // ===================================================================
    {
      name: 'main-tests',

      // Exclude the live publishing test (already ran in prerequisite)
      testIgnore: /instagram-publishing-live\.spec\.ts/,

      // This project depends on live-publishing-prerequisite passing
      // If prerequisite fails, this project is automatically skipped
      dependencies: ['live-publishing-prerequisite'],

      use: {
        ...devices['Desktop Chrome'],
      },

      // Can run in parallel for faster execution
      fullyParallel: true,
      workers: process.env.CI ? 1 : 3,

      // Standard retry configuration
      retries: process.env.CI ? 2 : 1,
    },

    // Uncomment to test on Firefox
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    //   dependencies: ['live-publishing-prerequisite'],
    // },

    // Uncomment to test on WebKit (Safari)
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    //   dependencies: ['live-publishing-prerequisite'],
    // },

    // Mobile viewports
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    //   dependencies: ['live-publishing-prerequisite'],
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    //   dependencies: ['live-publishing-prerequisite'],
    // },
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
  outputDir: 'test-results',

  // Screenshot output directory
  snapshotDir: 'screenshots',
  snapshotPathTemplate: 'screenshots/{testFilePath}/{arg}{ext}',
});
