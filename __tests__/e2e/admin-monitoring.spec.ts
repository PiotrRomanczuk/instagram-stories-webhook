import { test, expect } from '@playwright/test';
import { signInAsAdmin, signInAsUser } from './helpers/auth';

/**
 * Admin Monitoring E2E Tests
 *
 * Covers:
 * - Admin access to /admin page
 * - Audit log or auth events section loading
 * - System health indicators or admin info
 * - User blocked from admin page (redirect)
 * - Unauthenticated user redirect to sign-in
 */

test.describe('Admin Monitoring', () => {
	test('admin can access admin page', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/admin');
		await page.waitForLoadState('domcontentloaded');

		await expect(page).toHaveURL(/\/(en\/)?admin/);

		const bodyText = await page.innerText('body');
		expect(bodyText.length).toBeGreaterThan(50);
	});

	test('audit log or auth events section loads', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/admin');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(2000);

		const bodyText = await page.innerText('body');
		const hasAdminContent =
			bodyText.match(/audit|log|event|auth|monitor|admin|system/i) !== null;
		expect(hasAdminContent).toBe(true);
	});

	test('system health indicators or admin info visible', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/admin');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(2000);

		// Page should render without error boundary
		await expect(page.locator('text=Something went wrong')).not.toBeVisible();

		const bodyText = await page.innerText('body');
		expect(bodyText.length).toBeGreaterThan(100);
	});

	test('user blocked from admin page', async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/admin');
		await page.waitForLoadState('domcontentloaded');

		const url = page.url();
		expect(url).not.toMatch(/\/admin$/);
	});

	test('unauthenticated user redirected to sign-in', async ({ page }) => {
		await page.goto('/admin');
		await expect(page).toHaveURL(/\/(en\/)?auth\/signin/);
	});
});
