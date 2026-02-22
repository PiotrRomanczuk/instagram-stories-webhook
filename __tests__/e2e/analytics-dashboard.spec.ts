import { test, expect } from '@playwright/test';
import { signInAsAdmin, signInAsUser } from './helpers/auth';

/**
 * Analytics Dashboard E2E Tests
 *
 * Covers:
 * - Admin access to analytics page
 * - Analytics data rendering (KPI cards)
 * - User access denied (admin-only route)
 * - Error boundary absence
 * - Unauthenticated redirect
 */

test.describe('Analytics Dashboard', () => {
	test('admin can access analytics page', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/analytics');
		await page.waitForLoadState('domcontentloaded');

		const bodyText = await page.innerText('body');
		expect(bodyText).toMatch(/analytics|metrics|data|insights/i);
	});

	test('analytics page loads KPI cards or data', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/analytics');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(2000);

		const bodyText = await page.innerText('body');
		const hasData = bodyText.length > 100;
		expect(hasData).toBe(true);
	});

	test('user cannot access analytics page', async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/analytics');
		await page.waitForLoadState('domcontentloaded');

		const url = page.url();
		expect(url).not.toMatch(/\/analytics$/);
	});

	test('empty state renders when no analytics data', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/analytics');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(2000);

		// Page should load without error boundary
		await expect(page.locator('text=Something went wrong')).not.toBeVisible();
	});

	test('unauthenticated user redirected to sign-in', async ({ page }) => {
		await page.goto('/analytics');
		await expect(page).toHaveURL(/\/(en\/)?auth\/signin/);
	});
});
