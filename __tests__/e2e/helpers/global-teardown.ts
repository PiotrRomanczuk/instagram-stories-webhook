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

	let browser;
	try {
		// Launch browser and sign in as admin
		browser = await chromium.launch();
		const context = await browser.newContext({
			baseURL: config.projects[0].use.baseURL,
		});
		const page = await context.newPage();

		// Sign in as admin via the test credentials button
		await page.goto('/auth/signin');
		const testAdminBtn = page.getByRole('button', { name: 'Test Admin' });
		await testAdminBtn.waitFor({ state: 'visible', timeout: 10000 });
		await testAdminBtn.click();
		await page.waitForURL('/', { timeout: 15000 });

		// Call cleanup endpoint
		const response = await page.request.delete('/api/test/cleanup');

		if (response.ok()) {
			const data = await response.json();
			console.log(`✅ Cleaned up ${data.deleted} test items after suite`);
		} else {
			console.warn('⚠️  Cleanup endpoint returned error:', response.statusText());
		}
	} catch (error) {
		console.warn('⚠️  Global teardown cleanup failed:', error);
		// Don't throw - suite already completed
	} finally {
		if (browser) await browser.close();
	}

	console.log('✅ Global test teardown complete');
}

export default globalTeardown;
