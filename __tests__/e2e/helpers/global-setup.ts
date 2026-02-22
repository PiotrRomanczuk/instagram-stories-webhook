/**
 * Global E2E Test Setup
 *
 * Runs ONCE before all tests to clean orphaned data from previous runs.
 * This ensures every test suite starts with a clean environment, regardless of
 * how the previous run ended (crash, interrupt, failure).
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
	console.log('🧹 Running global test setup...');

	try {
		// Launch browser and sign in as admin
		const browser = await chromium.launch();
		const context = await browser.newContext({
			baseURL: config.projects[0].use.baseURL,
		});
		const page = await context.newPage();

		// Sign in as admin using test button (no email input exists)
		await page.goto('/auth/signin', { waitUntil: 'load', timeout: 30000 });
		await page.locator('text=Test Mode').waitFor({ state: 'visible', timeout: 20000 });
		await page.getByRole('button', { name: 'Test Admin' }).click();
		await page.waitForURL((url) => !url.pathname.includes('/auth/signin'), { timeout: 30000 });

		// Call cleanup endpoint
		const response = await page.request.delete('/api/test/cleanup');

		if (response.ok()) {
			const data = await response.json();
			console.log(`✅ Cleaned up ${data.deleted} test items from previous runs`);
		} else {
			console.warn('⚠️  Cleanup endpoint returned error:', response.statusText());
			// Don't fail setup if cleanup fails - tests can still run
		}

		await browser.close();
	} catch (error) {
		console.warn('⚠️  Global setup cleanup failed:', error);
		// Don't throw - tests can still run even if cleanup fails
	}

	console.log('✅ Global test setup complete\n');
}

export default globalSetup;
