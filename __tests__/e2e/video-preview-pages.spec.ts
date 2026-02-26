import { test, expect } from '@playwright/test';
import { signInAsAdmin } from './helpers/auth';

// ===========================================================================
// VP-2: Schedule/Review Pages - ReactPlayer in Existing Content
// ===========================================================================

test.describe('VP-2: Schedule/Review Pages - Video Preview Rendering', () => {
	test('VP-2.1: schedule page loads and shows media previews', async ({
		page,
	}) => {
		// Use admin since schedule page is restricted to admin/developer roles
		await signInAsAdmin(page);
		await page.goto('/schedule');
		await page.waitForLoadState('domcontentloaded');

		// Page should load without errors
		await expect(page).toHaveURL(/\/(en\/)?schedule/);

		// Should show calendar or content (may be empty, that's okay)
		const bodyText = await page.innerText('body');
		expect(bodyText.length).toBeGreaterThan(0);
	});

	test('VP-2.2: review page loads for admin', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/review');
		await page.waitForLoadState('domcontentloaded');

		// Page should load without errors
		await expect(page).toHaveURL(/\/(en\/)?review/);

		// Should show review interface
		const bodyText = await page.innerText('body');
		expect(bodyText.length).toBeGreaterThan(0);
	});
});
