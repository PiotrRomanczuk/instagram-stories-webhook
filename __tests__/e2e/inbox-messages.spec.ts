import { test, expect } from '@playwright/test';
import { signInAsAdmin, signInAsUser } from './helpers/auth';

/**
 * Inbox Messages E2E Tests
 *
 * Covers:
 * - Admin access to /inbox page
 * - Message list or empty state rendering
 * - User blocked from inbox (redirect)
 * - No horizontal scroll on mobile viewport (390px)
 * - Unauthenticated user redirect to sign-in
 */

test.describe('Inbox Messages', () => {
	test('admin can access inbox page', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/inbox');
		await page.waitForLoadState('domcontentloaded');

		await expect(page).toHaveURL(/\/(en\/)?inbox/);

		const bodyText = await page.innerText('body');
		expect(bodyText.length).toBeGreaterThan(50);
	});

	test('message list or empty state renders', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/inbox');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(2000);

		// Should render without error boundary
		await expect(page.locator('text=Something went wrong')).not.toBeVisible();

		const bodyText = await page.innerText('body');
		const hasInboxContent =
			bodyText.match(/inbox|message|conversation|empty|no.*message/i) !== null;
		expect(hasInboxContent).toBe(true);
	});

	test('user blocked from inbox', async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/inbox');
		await page.waitForLoadState('domcontentloaded');

		const url = page.url();
		expect(url).not.toMatch(/\/inbox$/);
	});

	test('inbox page no horizontal scroll on mobile', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await signInAsAdmin(page);
		await page.goto('/inbox');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(2000);

		const hasHorizontalScroll = await page.evaluate(() => {
			return document.documentElement.scrollWidth > document.documentElement.clientWidth;
		});
		expect(hasHorizontalScroll).toBe(false);
	});

	test('unauthenticated user redirected to sign-in', async ({ page }) => {
		await page.goto('/inbox');
		await expect(page).toHaveURL(/\/(en\/)?auth\/signin/);
	});
});
