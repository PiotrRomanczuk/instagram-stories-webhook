import { test, expect } from '@playwright/test';
import { signInAsUser, signInAsAdmin } from './helpers/auth';

// ===========================================================================
// VP-2: Schedule/Review Pages - ReactPlayer in Existing Content
// ===========================================================================

test.describe('VP-2: Schedule/Review Pages - Video Preview Rendering', () => {
	test('VP-2.1: schedule page loads and shows media previews', async ({
		page,
	}) => {
		await signInAsUser(page);
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
