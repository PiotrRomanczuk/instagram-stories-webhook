import { test, expect } from '@playwright/test';
import { signInAsAdmin, signInAsUser } from './helpers/auth';

/**
 * Settings Page E2E Tests
 *
 * Settings is developer-only (not admin). Covers:
 * - Admin redirected from /settings (developer-only route)
 * - User blocked from settings (redirect)
 * - Unauthenticated user redirect to sign-in
 */

test.describe('Settings Page', () => {
	test('admin is redirected from settings (developer-only)', async ({ page }) => {
		// Settings is restricted to developer role only; admin is NOT allowed
		await signInAsAdmin(page);
		await page.goto('/settings');
		await page.waitForLoadState('domcontentloaded');

		const url = page.url();
		expect(url).not.toMatch(/\/settings$/);
	});

	test('user blocked from settings', async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/settings');
		await page.waitForLoadState('domcontentloaded');

		const url = page.url();
		expect(url).not.toMatch(/\/settings$/);
	});

	test('unauthenticated user redirected to sign-in', async ({ page }) => {
		await page.goto('/settings');
		await expect(page).toHaveURL(/\/(en\/)?auth\/signin/);
	});
});
