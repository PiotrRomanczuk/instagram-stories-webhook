/**
 * Global E2E Test Teardown
 *
 * Runs ONCE after all tests complete to clean remaining test data.
 * This keeps the preview environment clean for manual testing and debugging
 * between test runs.
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
	console.log('\n🧹 Running global test teardown...');

	try {
		// Launch browser and sign in as admin
		const browser = await chromium.launch();
		const context = await browser.newContext({
			baseURL: config.projects[0].use.baseURL,
		});
		const page = await context.newPage();

		// Sign in as admin (using test credentials)
		await page.goto('/auth/signin');
		await page.fill('input[name="email"]', 'admin@test.com');
		await page.click('button[type="submit"]');
		await page.waitForURL('/');

		// Call cleanup endpoint
		const response = await page.request.delete('/api/test/cleanup');

		if (response.ok()) {
			const data = await response.json();
			console.log(`✅ Cleaned up ${data.deleted} test items after suite`);
		} else {
			console.warn('⚠️  Cleanup endpoint returned error:', response.statusText());
		}

		await browser.close();
	} catch (error) {
		console.warn('⚠️  Global teardown cleanup failed:', error);
		// Don't throw - suite already completed
	}

	console.log('✅ Global test teardown complete');
}

export default globalTeardown;
