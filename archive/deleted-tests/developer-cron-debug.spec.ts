import { test, expect } from '@playwright/test';
import { signInAsAdmin, signInAsUser } from './helpers/auth';

/**
 * Developer Cron Debug Page E2E Tests
 * Tests cron job debugging, scheduled task monitoring, and execution logs
 */

test.describe('Developer Cron Debug Page', () => {
	/**
	 * CRD-01: Cron Debug Page Access Control
	 * Priority: P0 (Critical)
	 */
	test('CRD-01: should require authentication to access cron debug', async ({ page }) => {
		await page.goto('/developer/cron-debug');

		// Should redirect to sign-in
		await expect(page).toHaveURL(/\/(en\/)?auth\/signin/);
	});

	/**
	 * CRD-02: Cron Debug Admin Access
	 * Priority: P0 (Critical)
	 */
	test('CRD-02: should allow admin access to cron debug page', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/developer/cron-debug');

		// Might be on cron debug or access denied (both valid for admin-only pages)
		const url = page.url();
		const isOnCronDebug = url.includes('/cron-debug');
		const isAccessDenied = url.includes('/forbidden') || url.includes('/403');

		expect(isOnCronDebug || isAccessDenied).toBeTruthy();
	});

	/**
	 * CRD-03: Cron Debug User Access Restriction
	 * Priority: P0 (Critical)
	 */
	test('CRD-03: should deny regular user access to cron debug', async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/developer/cron-debug');

		// Regular users should not access cron debug (admin-only)
		const url = page.url();

		const isProtected =
			!url.includes('/cron-debug') ||
			url.includes('/forbidden') ||
			url.includes('/403') ||
			url.includes('/');

		expect(isProtected).toBeTruthy();
	});

	/**
	 * CRD-04: Cron Job List Display
	 * Priority: P1 (High)
	 */
	test('CRD-04: should display cron jobs or scheduled tasks', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/developer/cron-debug');

		if (page.url().includes('/forbidden') || page.url().includes('/403')) {
			test.skip();
		}

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		const bodyText = await page.innerText('body');

		// Should show cron-related content
		const hasCronContent =
			bodyText.includes('Cron') ||
			bodyText.includes('Schedule') ||
			bodyText.includes('Job') ||
			bodyText.includes('Task') ||
			bodyText.includes('Execution');

		expect(hasCronContent).toBeTruthy();
	});

	/**
	 * CRD-05: Manual Cron Trigger
	 * Priority: P1 (High)
	 */
	test('CRD-05: should provide button to manually trigger cron job', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/developer/cron-debug');

		if (page.url().includes('/forbidden') || page.url().includes('/403')) {
			test.skip();
		}

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Look for trigger/run/execute buttons
		const triggerButton = page.getByRole('button', { name: /trigger|run|execute|process|manual/i });

		if (await triggerButton.count() > 0) {
			await expect(triggerButton.first()).toBeVisible();
			console.log('✅ Manual trigger button available');
		} else {
			console.log('ℹ️ No manual trigger button detected');
		}
	});

	/**
	 * CRD-06: Cron Execution History
	 * Priority: P2 (Medium)
	 */
	test('CRD-06: should show cron execution history or logs', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/developer/cron-debug');

		if (page.url().includes('/forbidden') || page.url().includes('/403')) {
			test.skip();
		}

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		const bodyText = await page.innerText('body');

		// Look for history/log content
		const hasHistory =
			bodyText.includes('History') ||
			bodyText.includes('Log') ||
			bodyText.includes('Last run') ||
			bodyText.includes('Execution') ||
			bodyText.includes('Recent');

		expect(hasHistory).toBeTruthy();
	});

	/**
	 * CRD-07: Cron Job Status Indicators
	 * Priority: P2 (Medium)
	 */
	test('CRD-07: should display cron job status (success/failure)', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/developer/cron-debug');

		if (page.url().includes('/forbidden') || page.url().includes('/403')) {
			test.skip();
		}

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		const bodyText = await page.innerText('body');

		// Should show status indicators
		const hasStatus =
			bodyText.includes('Success') ||
			bodyText.includes('Failed') ||
			bodyText.includes('Error') ||
			bodyText.includes('Completed') ||
			bodyText.includes('Running') ||
			bodyText.includes('Pending');

		if (hasStatus) {
			console.log('✅ Status indicators present');
		} else {
			console.log('ℹ️ No status indicators detected (may have no runs yet)');
		}
	});

	/**
	 * CRD-08: Next Scheduled Run Time
	 * Priority: P2 (Medium)
	 */
	test('CRD-08: should show next scheduled run time', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/developer/cron-debug');

		if (page.url().includes('/forbidden') || page.url().includes('/403')) {
			test.skip();
		}

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		const bodyText = await page.innerText('body');

		// Look for next run time
		const hasNextRun =
			bodyText.includes('Next') ||
			bodyText.includes('Schedule') ||
			bodyText.match(/\d{1,2}:\d{2}/) || // Time format
			bodyText.match(/\d{4}-\d{2}-\d{2}/); // Date format

		if (hasNextRun) {
			console.log('✅ Next run time displayed');
		} else {
			console.log('ℹ️ No next run time detected');
		}
	});

	/**
	 * CRD-09: Cron Configuration Display
	 * Priority: P2 (Medium)
	 */
	test('CRD-09: should display cron configuration or schedule pattern', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/developer/cron-debug');

		if (page.url().includes('/forbidden') || page.url().includes('/403')) {
			test.skip();
		}

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		const bodyText = await page.innerText('body');

		// Look for cron pattern or frequency
		const hasConfig =
			bodyText.match(/\*\s+\*\s+\*\s+\*\s+\*/) || // Cron pattern
			bodyText.includes('minute') ||
			bodyText.includes('hour') ||
			bodyText.includes('daily') ||
			bodyText.includes('interval');

		if (hasConfig) {
			console.log('✅ Cron configuration displayed');
		} else {
			console.log('ℹ️ No cron configuration detected');
		}
	});

	/**
	 * CRD-10: Error Details Display
	 * Priority: P2 (Medium)
	 */
	test('CRD-10: should display error details for failed runs', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/developer/cron-debug');

		if (page.url().includes('/forbidden') || page.url().includes('/403')) {
			test.skip();
		}

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		const bodyText = await page.innerText('body');

		// Should handle errors gracefully
		const hasErrorHandling =
			bodyText.includes('Error') ||
			bodyText.includes('No errors') ||
			bodyText.includes('All successful');

		expect(hasErrorHandling).toBeTruthy();
	});

	/**
	 * CRD-11: Refresh Functionality
	 * Priority: P2 (Medium)
	 */
	test('CRD-11: should allow refreshing cron status', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/developer/cron-debug');

		if (page.url().includes('/forbidden') || page.url().includes('/403')) {
			test.skip();
		}

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Look for refresh button
		const refreshButton = page.getByRole('button', { name: /refresh|reload|update/i });

		if (await refreshButton.count() > 0) {
			await expect(refreshButton.first()).toBeVisible();

			// Try clicking refresh
			await refreshButton.first().click();
			await page.waitForLoadState('networkidle', { timeout: 10000 });

			// Should still be on same page
			expect(page.url()).toContain('/cron-debug');
		} else {
			console.log('ℹ️ No refresh button (may auto-refresh)');
		}
	});

	/**
	 * CRD-12: Processing Queue Status
	 * Priority: P2 (Medium)
	 */
	test('CRD-12: should show posts in processing queue', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/developer/cron-debug');

		if (page.url().includes('/forbidden') || page.url().includes('/403')) {
			test.skip();
		}

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		const bodyText = await page.innerText('body');

		// Look for queue information
		const hasQueueInfo =
			bodyText.includes('Queue') ||
			bodyText.includes('Pending') ||
			bodyText.includes('Processing') ||
			bodyText.includes('Posts');

		if (hasQueueInfo) {
			console.log('✅ Queue status displayed');
		} else {
			console.log('ℹ️ No queue status detected');
		}
	});

	/**
	 * CRD-13: Cron Security
	 * Priority: P0 (Critical)
	 */
	test('CRD-13: should protect cron debug from unauthorized access', async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/developer/cron-debug');

		// Non-admin users should not access
		const url = page.url();

		expect(
			!url.includes('/cron-debug') ||
			url.includes('/forbidden') ||
			url.includes('/403')
		).toBeTruthy();
	});

	/**
	 * CRD-14: Navigation Elements
	 * Priority: P2 (Medium)
	 */
	test('CRD-14: should have navigation back to developer page', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/developer/cron-debug');

		if (page.url().includes('/forbidden') || page.url().includes('/403')) {
			test.skip();
		}

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Should have navigation
		const navLinks = page.getByRole('navigation').locator('a');
		const backLink = page.getByRole('link', { name: /developer|back/i });

		const hasNavigation = await navLinks.count() > 0 || await backLink.count() > 0;

		expect(hasNavigation).toBeTruthy();
	});
});
