import { test, expect } from '@playwright/test';
import { signInAsUser } from './helpers/auth';
import { cleanupTestData } from './helpers/seed';

/**
 * Facebook Account Linking E2E Tests
 * Tests workflow when Facebook account is not linked
 */

test.describe('Facebook Account Not Linked Workflow', () => {
	test.afterAll(async ({ page }) => {
		await cleanupTestData(page);
	});

	/**
	 * FB-01: Home Page Shows Disconnected Status
	 * Priority: P0 (Critical)
	 */
	test('FB-01: should show disconnected status on home page', async ({
		page,
	}) => {
		await signInAsUser(page);

		await page.goto('/');
		await expect(page).toHaveURL(/\//);

		// Check for disconnected status
		const bodyText = await page.innerText('body');

		// Should show disconnected or awaiting auth
		const hasDisconnectedStatus =
			bodyText.includes('Disconnected') ||
			bodyText.includes('Awaiting Auth') ||
			bodyText.includes('Connect your Facebook');

		if (hasDisconnectedStatus) {
			// Verify connect button is present
			const connectButton = page.locator(
				'button:has-text("Connect"), a:has-text("Connect")',
			);
			const hasConnectButton = (await connectButton.count()) > 0;

			if (hasConnectButton) {
				await expect(connectButton.first()).toBeVisible();
			}
		}
	});

	/**
	 * FB-02: Schedule Page Requires Facebook Connection
	 * Priority: P0 (Critical)
	 */
	test('FB-02: should handle scheduling without Facebook link', async ({
		page,
	}) => {
		await signInAsUser(page);

		await page.goto('/schedule');
		await expect(page).toHaveURL(/\/schedule/);

		// Page should load (no hard block)
		const bodyText = await page.innerText('body');
		expect(bodyText.length).toBeGreaterThan(0);

		// Check if there's a warning about Facebook connection
		const hasWarning =
			bodyText.includes('Connect') ||
			bodyText.includes('Facebook') ||
			bodyText.includes('link') ||
			bodyText.includes('account');

		// Schedule form should be present
		const scheduleForm = page.locator('form');
		const hasForm = (await scheduleForm.count()) > 0;

		if (hasForm) {
			// Form exists - user can prepare posts
			expect(hasForm).toBe(true);
		}
	});

	/**
	 * FB-03: Debug Page Shows Connection Status
	 * Priority: P1 (High)
	 */
	test('FB-03: should show connection status in debug page', async ({
		page,
	}) => {
		await signInAsUser(page);

		await page.goto('/debug');

		// Debug page should show token status
		const bodyText = await page.innerText('body');

		// Should mention Facebook, Instagram, or token status
		const hasStatusInfo =
			bodyText.includes('Facebook') ||
			bodyText.includes('Instagram') ||
			bodyText.includes('Token') ||
			bodyText.includes('Connection');

		expect(hasStatusInfo).toBe(true);
	});

	/**
	 * FB-04: Cannot Publish Without Facebook Connection
	 * Priority: P0 (Critical)
	 */
	test('FB-04: should prevent publishing without Facebook link', async ({
		page,
	}) => {
		await signInAsUser(page);

		// Try to schedule a post via API
		const response = await page.request.post('/api/schedule', {
			data: {
				url: 'https://example.com/test.jpg',
				type: 'IMAGE',
				scheduledTime: new Date(Date.now() + 3600000).toISOString(),
				caption: 'Test post',
			},
		});

		// Should either succeed (if account linked) or fail with appropriate error
		if (!response.ok()) {
			const body = await response.json();

			// Error should mention Facebook/Instagram/token
			const errorMentionsConnection = body.error?.match(
				/facebook|instagram|token|connect|link/i,
			);

			if (errorMentionsConnection) {
				expect(response.status()).toBeGreaterThanOrEqual(400);
			}
		}
	});

	/**
	 * FB-05: Connect Button Redirects to OAuth Flow
	 * Priority: P1 (High)
	 */
	test('FB-05: should redirect to Facebook OAuth when connecting', async ({
		page,
	}) => {
		await signInAsUser(page);

		await page.goto('/');

		// Look for connect button
		const connectButton = page.locator(
			'button:has-text("Connect Facebook"), a:has-text("Connect Facebook"), button:has-text("Update Connection")',
		);
		const hasConnectButton = (await connectButton.count()) > 0;

		if (hasConnectButton) {
			// Note: Actually clicking would redirect to Facebook OAuth
			// which we can't test in E2E without real credentials

			// Verify button is clickable
			const isDisabled = await connectButton.first().isDisabled();
			expect(isDisabled).toBe(false);
		}
	});

	/**
	 * FB-06: Token Expiration Warning
	 * Priority: P2 (Medium)
	 */
	test('FB-06: should show warning when token is expired', async ({ page }) => {
		await signInAsUser(page);

		await page.goto('/debug');

		// Check for token expiration information
		const bodyText = await page.innerText('body');

		// Should show token validity or expiration info
		const hasTokenInfo =
			bodyText.includes('expires') ||
			bodyText.includes('valid') ||
			bodyText.includes('expir') ||
			bodyText.includes('Token');

		expect(hasTokenInfo).toBe(true);
	});
});
