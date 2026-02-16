import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for running critical-paths E2E tests independently.
 * No dependency on live-publishing-prerequisite project.
 *
 * Usage:
 *   npx playwright test --config playwright.config.critical.ts
 */
export default defineConfig({
	testDir: '__tests__/e2e',
	testMatch: /critical-paths\.spec\.ts/,

	forbidOnly: !!process.env.CI,

	reporter: [['list']],

	use: {
		baseURL: 'http://localhost:3000',
		trace: 'on-first-retry',
		screenshot: { mode: 'only-on-failure', fullPage: true },
		video: 'retain-on-failure',
		actionTimeout: 15000,
		navigationTimeout: 30000,
		viewport: { width: 1280, height: 720 },
		contextOptions: { ignoreHTTPSErrors: true },
	},

	timeout: 90000,
	expect: { timeout: 15000 },

	projects: [
		{
			name: 'critical-paths',
			use: { ...devices['Desktop Chrome'] },
			fullyParallel: false,
			workers: 1,
			retries: process.env.CI ? 2 : 1,
		},
	],

	webServer: {
		command: 'npm run dev',
		url: 'http://localhost:3000',
		reuseExistingServer: true,
		timeout: 120000,
		stdout: 'pipe',
		stderr: 'pipe',
	},

	outputDir: 'test-results',
});
