import { test, expect } from '@playwright/test';
import { signInAsAdmin, signInAsUser } from './helpers/auth';

/**
 * Insights Dashboard E2E Tests
 *
 * Covers:
 * - Admin access to /insights page
 * - Insights page content loading
 * - User blocked from insights page (redirect)
 * - Unauthenticated user redirect to sign-in
 * - No error boundary on page
 */

test.describe('Insights Dashboard', () => {
	test('admin can access insights page', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/insights');
		await page.waitForLoadState('domcontentloaded');

		await expect(page).toHaveURL(/\/(en\/)?insights/);

		const bodyText = await page.innerText('body');
		expect(bodyText.length).toBeGreaterThan(50);
	});

	test('insights page loads content', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/insights');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(2000);

		const bodyText = await page.innerText('body');
		const hasInsightsContent =
			bodyText.match(/insight|metric|engagement|reach|impression|follower|data/i) !== null;
		expect(hasInsightsContent).toBe(true);
	});

	test('user blocked from insights page', async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/insights');
		await page.waitForLoadState('domcontentloaded');

		const url = page.url();
		expect(url).not.toMatch(/\/insights$/);
	});

	test('unauthenticated user redirected to sign-in', async ({ page }) => {
		await page.goto('/insights');
		await expect(page).toHaveURL(/\/(en\/)?auth\/signin/);
	});

	test('no error boundary on insights page', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/insights');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(2000);

		await expect(page.locator('text=Something went wrong')).not.toBeVisible();
	});
});
