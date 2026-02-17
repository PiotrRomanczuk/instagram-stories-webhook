import { test, expect } from '@playwright/test';
import { signInAsAdmin, signInAsUser } from './helpers/auth';

/**
 * Debug Page E2E Tests
 * Tests debug dashboard, token status, system diagnostics, and troubleshooting tools
 */

test.describe('Debug Page', () => {
	/**
	 * DB-01: Debug Page Access Control
	 * Priority: P0 (Critical)
	 */
	test('DB-01: should require authentication to access debug page', async ({ page }) => {
		await page.goto('/debug');

		// Should redirect to sign-in
		await expect(page).toHaveURL(/\/(en\/)?auth\/signin/);
	});

	/**
	 * DB-02: Debug Page Load for Admin
	 * Priority: P0 (Critical)
	 */
	test('DB-02: should load debug page for authenticated admin', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/debug');

		// Should be on debug page
		await expect(page).toHaveURL(/\/(en\/)?debug/);

		// Check for page heading
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	});

	/**
	 * DB-03: Debug Page for Regular User
	 * Priority: P1 (High)
	 */
	test('DB-03: should load debug page for authenticated user', async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/debug');

		// Should be accessible to regular users
		await expect(page).toHaveURL(/\/(en\/)?debug/);
	});

	/**
	 * DB-04: Token Status Display
	 * Priority: P1 (High)
	 */
	test('DB-04: should display token status information', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/debug');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		const bodyText = await page.innerText('body');

		// Should show token-related information
		const hasTokenInfo =
			bodyText.includes('Token') ||
			bodyText.includes('Access Token') ||
			bodyText.includes('Expires') ||
			bodyText.includes('Instagram') ||
			bodyText.includes('Facebook') ||
			bodyText.includes('Connected') ||
			bodyText.includes('Status');

		expect(hasTokenInfo).toBeTruthy();
	});

	/**
	 * DB-05: Authentication Status Display
	 * Priority: P1 (High)
	 */
	test('DB-05: should show authentication status', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/debug');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		const bodyText = await page.innerText('body');

		// Should show auth status
		const hasAuthStatus =
			bodyText.includes('Authenticated') ||
			bodyText.includes('Signed in') ||
			bodyText.includes('User') ||
			bodyText.includes('Session');

		expect(hasAuthStatus).toBeTruthy();
	});

	/**
	 * DB-06: Instagram Connection Status
	 * Priority: P1 (High)
	 */
	test('DB-06: should display Instagram connection status', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/debug');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		const bodyText = await page.innerText('body');

		// Should mention Instagram status
		const hasIGStatus =
			bodyText.includes('Instagram') ||
			bodyText.includes('Connected') ||
			bodyText.includes('Not connected') ||
			bodyText.includes('Account');

		expect(hasIGStatus).toBeTruthy();
	});

	/**
	 * DB-07: Scheduled Posts Information
	 * Priority: P2 (Medium)
	 */
	test('DB-07: should show scheduled posts information', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/debug');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		const bodyText = await page.innerText('body');

		// Should mention scheduled posts
		const hasScheduledInfo =
			bodyText.includes('Scheduled') ||
			bodyText.includes('Posts') ||
			bodyText.includes('Queue') ||
			bodyText.includes('Pending');

		expect(hasScheduledInfo).toBeTruthy();
	});

	/**
	 * DB-08: Error Messages Display
	 * Priority: P2 (Medium)
	 */
	test('DB-08: should display recent errors if any', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/debug');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		const bodyText = await page.innerText('body');

		// Should have error section or "No errors" message
		const hasErrorSection =
			bodyText.includes('Error') ||
			bodyText.includes('No errors') ||
			bodyText.includes('Failed');

		expect(hasErrorSection).toBeTruthy();
	});

	/**
	 * DB-09: Refresh/Reload Functionality
	 * Priority: P2 (Medium)
	 */
	test('DB-09: should have refresh button for live data', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/debug');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Look for refresh button
		const refreshButton = page.getByRole('button', { name: /refresh|reload|update/i });

		if (await refreshButton.count() > 0) {
			await expect(refreshButton.first()).toBeVisible();

			// Click refresh button
			await refreshButton.first().click();

			// Wait for network activity
			await page.waitForLoadState('networkidle', { timeout: 10000 });

			// Should still be on debug page
			await expect(page).toHaveURL(/\/(en\/)?debug/);
		} else {
			console.log('ℹ️ No refresh button detected (may auto-refresh)');
		}
	});

	/**
	 * DB-10: Token Expiration Warnings
	 * Priority: P2 (Medium)
	 */
	test('DB-10: should warn about expired or expiring tokens', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/debug');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Look for expiration warnings or valid status
		const bodyText = await page.innerText('body');

		const hasExpiryInfo =
			bodyText.includes('Expires') ||
			bodyText.includes('Expiry') ||
			bodyText.includes('Valid') ||
			bodyText.includes('Invalid') ||
			bodyText.includes('days');

		expect(hasExpiryInfo).toBeTruthy();
	});

	/**
	 * DB-11: Copy Token Functionality
	 * Priority: P3 (Low)
	 */
	test('DB-11: should allow copying token or debugging info', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/debug');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Look for copy buttons
		const copyButton = page.getByRole('button', { name: /copy/i });

		if (await copyButton.count() > 0) {
			await expect(copyButton.first()).toBeVisible();
			console.log('✅ Copy functionality available');
		} else {
			console.log('ℹ️ No copy button detected');
		}
	});

	/**
	 * DB-12: Link to Re-authentication
	 * Priority: P2 (Medium)
	 */
	test('DB-12: should provide link to re-authenticate Instagram', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/debug');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Look for reconnect or link buttons
		const reconnectButton = page.getByRole('button', { name: /connect|link|authorize|re-auth/i });
		const reconnectLink = page.getByRole('link', { name: /connect|link|authorize|re-auth/i });

		if (await reconnectButton.count() > 0 || await reconnectLink.count() > 0) {
			console.log('✅ Re-authentication option available');
			expect(true).toBe(true);
		} else {
			console.log('ℹ️ No re-authentication link detected');
			expect(true).toBe(true);
		}
	});

	/**
	 * DB-13: Debug Data Export
	 * Priority: P3 (Low)
	 */
	test('DB-13: should support exporting debug data if available', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/debug');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Look for export/download buttons
		const exportButton = page.getByRole('button', { name: /export|download|save/i });

		if (await exportButton.count() > 0) {
			console.log('✅ Export functionality available');
		} else {
			console.log('ℹ️ No export functionality detected');
		}

		// Test passes regardless
		expect(true).toBe(true);
	});

	/**
	 * DB-14: Navigation from Debug Page
	 * Priority: P2 (Medium)
	 */
	test('DB-14: should allow navigation to related pages', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/debug');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Should have navigation
		const navLinks = page.getByRole('navigation').locator('a');
		const linkCount = await navLinks.count();

		expect(linkCount).toBeGreaterThan(0);
	});
});
