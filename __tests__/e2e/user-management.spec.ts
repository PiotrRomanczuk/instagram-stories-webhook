import { test, expect } from '@playwright/test';
import { signInAsAdmin, signInAsUser } from './helpers/auth';

/**
 * User Management E2E Tests
 *
 * Covers:
 * - Admin access to /users page
 * - Users list/table rendering
 * - User role info visibility
 * - Regular user blocked from users page (redirect)
 * - Unauthenticated user redirect to sign-in
 * - API: admin GET /api/users returns 200 with users array
 */

test.describe('User Management', () => {
	test('admin can access users page', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/users');
		await page.waitForLoadState('domcontentloaded');

		await expect(page).toHaveURL(/\/(en\/)?users/);

		const bodyText = await page.innerText('body');
		expect(bodyText.length).toBeGreaterThan(50);
	});

	test('users list or table renders', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/users');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(2000);

		const bodyText = await page.innerText('body');
		const hasUsersContent =
			bodyText.match(/user|email|role|admin|whitelist/i) !== null;
		expect(hasUsersContent).toBe(true);
	});

	test('user role info visible', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/users');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(2000);

		const bodyText = await page.innerText('body');
		const hasRoleInfo =
			bodyText.match(/admin|user|role/i) !== null;
		expect(hasRoleInfo).toBe(true);
	});

	test('regular user blocked from users page', async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/users');
		await page.waitForLoadState('domcontentloaded');

		const url = page.url();
		expect(url).not.toMatch(/\/users$/);
	});

	test('unauthenticated user redirected to sign-in', async ({ page }) => {
		await page.goto('/users');
		await expect(page).toHaveURL(/\/(en\/)?auth\/signin/);
	});

	test('admin GET /api/users returns 200 with users array', async ({ page }) => {
		await signInAsAdmin(page);

		const response = await page.request.get('/api/users');
		expect(response.status()).toBe(200);

		const body = await response.json();
		expect(body).toHaveProperty('users');
		expect(Array.isArray(body.users)).toBe(true);
	});
});
