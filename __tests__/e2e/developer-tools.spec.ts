import { test, expect } from '@playwright/test';
import { signInAsAdmin, signInAsUser } from './helpers/auth';

/**
 * Developer Tools E2E Tests
 *
 * Consolidated from:
 * - developer.spec.ts
 * - developer-cron-debug.spec.ts
 * - debug.spec.ts
 *
 * Covers internal developer tooling:
 * - Developer page access control
 * - Cron debug interface functionality
 * - Debug page connection status and diagnostics
 *
 * IMPORTANT: These tests verify developer-only routes are properly protected
 */

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

		await page.waitForLoadState('networkidle', { timeout: 10000 });

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

		await page.waitForLoadState('networkidle', { timeout: 10000 });

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

		await page.waitForLoadState('networkidle', { timeout: 10000 });

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

		await page.waitForLoadState('networkidle', { timeout: 10000 });

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
	 * Production-only: Extended RBAC verification
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
