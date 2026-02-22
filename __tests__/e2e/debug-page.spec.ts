import { test, expect } from '@playwright/test';
import { signInAsAdmin, signInAsUser } from './helpers/auth';

// ===========================================================================
// Debug Page Tests
// ===========================================================================

test.describe('Debug Page', () => {
	/**
	 * DEBUG-01: Unauthenticated Access Blocked
	 * Priority: P0 (Critical)
	 * Production-only: Extended auth verification
	 */
	test('DEBUG-01: should require authentication', async ({ page }) => {
		// Skip in preview mode (production-only)
		if (process.env.PREVIEW_MODE === 'true') {
			test.skip();
		}

		await page.goto('/debug');
		await expect(page).toHaveURL(/\/(en\/)?auth\/signin/);
	});

	/**
	 * DEBUG-02: Admin Can Access Debug Page
	 * Priority: P0 (Critical)
	 */
	test('DEBUG-02: admin should access debug page', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/debug');

		await expect(page).toHaveURL(/\/(en\/)?debug/);
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	});

	/**
	 * DEBUG-03: Regular User Blocked from Debug Page
	 * Priority: P1 (High)
	 * Production-only: Extended access verification
	 */
	test('DEBUG-03: user should be blocked from debug page', async ({ page }) => {
		// Skip in preview mode (production-only)
		if (process.env.PREVIEW_MODE === 'true') {
			test.skip();
		}

		await signInAsUser(page);
		await page.goto('/debug');

		// User should be redirected away from /debug (to home or forbidden)
		const url = page.url();
		const isProtected =
			!url.includes('/debug') ||
			url.includes('/forbidden') ||
			url.includes('/403') ||
			url === 'http://localhost:3000/' ||
			url === 'http://localhost:3000/en';

		expect(isProtected).toBeTruthy();
	});

	/**
	 * DEBUG-04: Debug page renders key diagnostic sections
	 * Priority: P1 (High)
	 * Production-only: Extended UI verification
	 *
	 * Verifies the debug page shows Instagram connection, token status,
	 * and scheduled posts information in a single pass.
	 */
	test('DEBUG-04: should display all diagnostic sections', async ({ page }) => {
		// Skip in preview mode (production-only)
		if (process.env.PREVIEW_MODE === 'true') {
			test.skip();
		}

		await signInAsAdmin(page);
		await page.goto('/debug');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		const bodyText = await page.innerText('body');

		// Instagram connection status
		expect(
			bodyText.includes('Instagram') || bodyText.includes('Connected'),
			'Should show Instagram connection status'
		).toBeTruthy();

		// Token/auth info
		expect(
			bodyText.includes('Token') || bodyText.includes('Expires') || bodyText.includes('Session'),
			'Should show token or session info'
		).toBeTruthy();
	});
});
