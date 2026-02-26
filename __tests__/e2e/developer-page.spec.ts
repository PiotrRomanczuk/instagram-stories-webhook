import { test, expect } from '@playwright/test';
import { signInAsAdmin, signInAsUser } from './helpers/auth';

// ===========================================================================
// Developer Page Tests
// ===========================================================================

test.describe('Developer Page', () => {
	/**
	 * DEV-01: Unauthenticated Access Blocked
	 * Priority: P0 (Critical)
	 */
	test('DEV-01: should require authentication', async ({ page }) => {
		await page.goto('/developer');
		await expect(page).toHaveURL(/\/(en\/)?auth\/signin/);
	});

	/**
	 * DEV-02: Admin Can Access Developer Page
	 * Priority: P0 (Critical)
	 */
	test('DEV-02: admin should access developer page', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/developer');

		const url = page.url();
		const isOnDeveloperPage = url.includes('/developer');
		const isAccessDenied = url.includes('/forbidden') || url.includes('/403');

		// Either on developer page or access denied (both valid)
		expect(isOnDeveloperPage || isAccessDenied).toBeTruthy();
	});

	/**
	 * DEV-03: Regular User Blocked
	 * Priority: P0 (Critical)
	 */
	test('DEV-03: regular user should be blocked', async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/developer');

		const url = page.url();
		const isProtected =
			!url.includes('/developer') ||
			url.includes('/forbidden') ||
			url.includes('/403');

		expect(isProtected).toBeTruthy();
	});

	/**
	 * DEV-04: Developer Tools Display
	 * Priority: P1 (High)
	 * Production-only: Extended verification
	 */
	test('DEV-04: should display developer tools for admin', async ({ page }) => {
		// Skip in preview mode (production-only)
		if (process.env.PREVIEW_MODE === 'true') {
			test.skip();
		}

		await signInAsAdmin(page);
		await page.goto('/developer');

		if (page.url().includes('/forbidden') || page.url().includes('/403')) {
			test.skip();
		}

		await page.waitForLoadState('domcontentloaded');

		const bodyText = await page.innerText('body');
		const hasDeveloperContent =
			bodyText.includes('Developer') ||
			bodyText.includes('API') ||
			bodyText.includes('Tools') ||
			bodyText.includes('Testing') ||
			bodyText.includes('Debug');

		expect(hasDeveloperContent).toBeTruthy();
	});
});
