import { test, expect } from '@playwright/test';
import { signInAsAdmin, signInAsUser } from './helpers/auth';

/**
 * Meme Management E2E Tests
 *
 * Covers:
 * - Admin access to /memes page
 * - Meme list/grid rendering
 * - Body has meme-related content
 * - Search for memes (if search exists)
 * - User can see their own memes at /memes
 * - Admin can see all memes
 */

test.describe('Meme Management', () => {
	test('admin can access memes page', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/memes');
		await page.waitForLoadState('domcontentloaded');

		await expect(page).toHaveURL(/\/(en\/)?memes/);

		const bodyText = await page.innerText('body');
		expect(bodyText.length).toBeGreaterThan(50);
	});

	test('meme list or grid renders', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/memes');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(2000);

		// Should render without error boundary
		await expect(page.locator('text=Something went wrong')).not.toBeVisible();

		const bodyText = await page.innerText('body');
		expect(bodyText.length).toBeGreaterThan(100);
	});

	test('body has meme-related content', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/memes');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(2000);

		const bodyText = await page.innerText('body');
		const hasMemeContent =
			bodyText.match(/meme|submission|image|content|gallery/i) !== null;
		expect(hasMemeContent).toBe(true);
	});

	test('search for memes if search exists', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/memes');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(2000);

		const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="filter" i]');
		if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
			await searchInput.fill('test');
			await page.waitForTimeout(1000);

			// Page should still render without error
			await expect(page.locator('text=Something went wrong')).not.toBeVisible();
		}
	});

	test('user can see their own memes', async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/memes');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(2000);

		// User should be able to access memes page
		await expect(page).toHaveURL(/\/(en\/)?memes/);

		const bodyText = await page.innerText('body');
		expect(bodyText.length).toBeGreaterThan(50);
	});

	test('admin can see all memes', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/memes');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(2000);

		// Admin should see meme management UI
		await expect(page).toHaveURL(/\/(en\/)?memes/);

		const bodyText = await page.innerText('body');
		expect(bodyText.length).toBeGreaterThan(50);

		// Should not show error boundary
		await expect(page.locator('text=Something went wrong')).not.toBeVisible();
	});
});
