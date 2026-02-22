import { test, expect } from '@playwright/test';
import { signInAsAdmin, signInAsUser } from './helpers/auth';

/**
 * Settings Page E2E Tests
 *
 * Covers:
 * - Admin access to /settings page
 * - Settings form rendering
 * - User blocked from settings (redirect)
 * - No horizontal scroll on mobile viewport (390px)
 * - Unauthenticated user redirect to sign-in
 */

test.describe('Settings Page', () => {
	test('admin can access settings page', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/settings');
		await page.waitForLoadState('domcontentloaded');

		await expect(page).toHaveURL(/\/(en\/)?settings/);

		const bodyText = await page.innerText('body');
		expect(bodyText.length).toBeGreaterThan(50);
	});

	test('settings form renders', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/settings');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(2000);

		// Should render without error boundary
		await expect(page.locator('text=Something went wrong')).not.toBeVisible();

		const bodyText = await page.innerText('body');
		const hasSettingsContent =
			bodyText.match(/settings|configuration|preferences|save|update/i) !== null;
		expect(hasSettingsContent).toBe(true);
	});

	test('user blocked from settings', async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/settings');
		await page.waitForLoadState('domcontentloaded');

		const url = page.url();
		expect(url).not.toMatch(/\/settings$/);
	});

	test('settings page no horizontal scroll on mobile', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await signInAsAdmin(page);
		await page.goto('/settings');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(2000);

		const hasHorizontalScroll = await page.evaluate(() => {
			return document.documentElement.scrollWidth > document.documentElement.clientWidth;
		});
		expect(hasHorizontalScroll).toBe(false);
	});

	test('unauthenticated user redirected to sign-in', async ({ page }) => {
		await page.goto('/settings');
		await expect(page).toHaveURL(/\/(en\/)?auth\/signin/);
	});
});
