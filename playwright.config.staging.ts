import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: '__tests__/e2e',
	forbidOnly: !!process.env.CI,

	use: {
		baseURL: process.env.BASE_URL || 'http://localhost:3000',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		actionTimeout: 15000,
		navigationTimeout: 30000,
	},

	timeout: 90000,

	projects: [
		{
			name: 'prerequisite',
			testMatch: /instagram-publishing-live\.spec\.ts/,
			use: { ...devices['Desktop Chrome'] },
			workers: 1,
			retries: 3,
		},
		{
			name: 'main',
			testIgnore: /instagram-publishing-live\.spec\.ts/,
			dependencies: ['prerequisite'],
			use: { ...devices['Desktop Chrome'] },
			workers: 2,
			retries: 2,
		},
	],

	reporter: [
		['html', { open: 'never' }],
		['list'],
		['json', { outputFile: 'test-results/staging-results.json' }],
	],
});
