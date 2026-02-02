import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 * See: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: '__tests__/e2e',

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry failed tests to handle flakiness (auth timing issues)
  retries: process.env.CI ? 2 : 1,

  // Limit parallel workers to reduce auth race conditions
  workers: process.env.CI ? 1 : 3,

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

    // Screenshot on failure
    screenshot: 'only-on-failure',

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

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    // Uncomment to test on Firefox
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // Uncomment to test on WebKit (Safari)
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    // Mobile viewports
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
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
});
