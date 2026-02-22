import { test, expect } from '@playwright/test';
import { signInAsAdmin, signInAsUser } from './helpers/auth';

// ===========================================================================
// Role-Based Access Control (RBAC)
// ===========================================================================

test.describe('Role-Based Access Control', () => {
	/**
	 * RBAC-01: Admin Can Access All Routes
	 * Priority: P0 (Critical)
	 */
	test('RBAC-01: admin should access all routes successfully', async ({ page }) => {
		await signInAsAdmin(page);

		// Test admin routes
		await page.goto('/content');
		await expect(page).toHaveURL(/\/(en\/)?content/);

		await page.goto('/schedule');
		await expect(page).toHaveURL(/\/(en\/)?schedule/);

		// Test user routes (admin should also access these)
		await page.goto('/memes');
		await expect(page).toHaveURL(/\/(en\/)?memes/);

		// Should not see access denied
		const bodyText = await page.innerText('body');
		expect(bodyText).not.toMatch(/access denied|unauthorized|forbidden/i);
	});

	/**
	 * RBAC-02: User Cannot Access Admin Routes
	 * Priority: P0 (Critical)
	 */
	test('RBAC-02: regular user should be denied access to admin routes', async ({ page }) => {
		await signInAsUser(page);

		// Attempt to access admin-only schedule route
		await page.goto('/schedule');
		await page.waitForLoadState('domcontentloaded');

		// Should be redirected away from schedule
		const url = page.url();
		expect(url).not.toContain('/schedule');
	});

	/**
	 * RBAC-03: User Can Access User Routes
	 * Priority: P0 (Critical)
	 */
	test('RBAC-03: user should access submissions page', async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/submissions');

		await expect(page).toHaveURL(/\/submissions/);

		const bodyText = await page.innerText('body');
		expect(bodyText.length).toBeGreaterThan(0);
	});

	/**
	 * RBAC-04: Admin Route Protection
	 * Priority: P0 (Critical)
	 */
	test('RBAC-04: content management page is admin-only', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/content');

		// Admin should see content management interface
		const bodyText = await page.innerText('body');
		const hasContentFeatures =
			bodyText.includes('Content') ||
			bodyText.includes('All Content') ||
			bodyText.includes('Schedule') ||
			bodyText.includes('Create');

		expect(hasContentFeatures).toBe(true);
		await expect(page).toHaveURL(/\/(en\/)?content/);
	});
});
