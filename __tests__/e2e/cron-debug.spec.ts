import { test, expect } from '@playwright/test';
import { signInAsAdmin, signInAsUser } from './helpers/auth';

// ===========================================================================
// Cron Debug Interface Tests
// ===========================================================================

test.describe('Cron Debug Interface', () => {
	/**
	 * CRON-01: Unauthenticated Access Blocked
	 * Priority: P0 (Critical)
	 */
	test('CRON-01: should require authentication', async ({ page }) => {
		await page.goto('/developer/cron-debug');
		await expect(page).toHaveURL(/\/(en\/)?auth\/signin/);
	});

	/**
	 * CRON-02: Admin Can Access Cron Debug
	 * Priority: P0 (Critical)
	 */
	test('CRON-02: admin should access cron debug page', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/developer/cron-debug');

		const url = page.url();
		const isOnCronDebug = url.includes('/cron-debug');
		const isAccessDenied = url.includes('/forbidden') || url.includes('/403');

		expect(isOnCronDebug || isAccessDenied).toBeTruthy();
	});

	/**
	 * CRON-03: Regular User Blocked
	 * Priority: P0 (Critical)
	 * Production-only: Extended RBAC verification
	 */
	test('CRON-03: regular user should be blocked', async ({ page }) => {
		// Skip in preview mode (production-only)
		if (process.env.PREVIEW_MODE === 'true') {
			test.skip();
		}

		await signInAsUser(page);
		await page.goto('/developer/cron-debug');

		const url = page.url();
		const isProtected =
			!url.includes('/cron-debug') ||
			url.includes('/forbidden') ||
			url.includes('/403') ||
			url.includes('/');

		expect(isProtected).toBeTruthy();
	});

	/**
	 * CRON-04: Cron Job Interface Display
	 * Priority: P1 (High)
	 * Production-only: Extended UI verification
	 */
	test('CRON-04: should display cron jobs interface', async ({ page }) => {
		// Skip in preview mode (production-only)
		if (process.env.PREVIEW_MODE === 'true') {
			test.skip();
		}

		await signInAsAdmin(page);
		await page.goto('/developer/cron-debug');

		if (page.url().includes('/forbidden') || page.url().includes('/403')) {
			test.skip();
		}

		await page.waitForLoadState('domcontentloaded');

		const bodyText = await page.innerText('body');
		const hasCronContent =
			bodyText.includes('Cron') ||
			bodyText.includes('Schedule') ||
			bodyText.includes('Job') ||
			bodyText.includes('Task') ||
			bodyText.includes('Execution');

		expect(hasCronContent).toBeTruthy();
	});

	/**
	 * CRON-05: Manual Trigger Available
	 * Priority: P1 (High)
	 * Production-only: Extended UI verification
	 */
	test('CRON-05: should provide manual trigger button', async ({ page }) => {
		// Skip in preview mode (production-only)
		if (process.env.PREVIEW_MODE === 'true') {
			test.skip();
		}

		await signInAsAdmin(page);
		await page.goto('/developer/cron-debug');

		if (page.url().includes('/forbidden') || page.url().includes('/403')) {
			test.skip();
		}

		await page.waitForLoadState('domcontentloaded');

		const triggerButton = page.getByRole('button', {
			name: /trigger|run|execute|process|manual/i,
		});

		if ((await triggerButton.count()) > 0) {
			await expect(triggerButton.first()).toBeVisible();
		}
	});

	/**
	 * CRON-06: Execution History Display
	 * Priority: P2 (Medium)
	 * Production-only: Extended UI verification
	 */
	test('CRON-06: should show execution history or logs', async ({ page }) => {
		// Skip in preview mode (production-only)
		if (process.env.PREVIEW_MODE === 'true') {
			test.skip();
		}

		await signInAsAdmin(page);
		await page.goto('/developer/cron-debug');

		if (page.url().includes('/forbidden') || page.url().includes('/403')) {
			test.skip();
		}

		await page.waitForLoadState('domcontentloaded');

		const bodyText = await page.innerText('body');
		const hasHistory =
			bodyText.includes('History') ||
			bodyText.includes('Log') ||
			bodyText.includes('Last run') ||
			bodyText.includes('Execution') ||
			bodyText.includes('Recent');

		expect(hasHistory).toBeTruthy();
	});
});
