import { test, expect } from '@playwright/test';
import { signInAsRealIG, signOut } from './helpers/auth';

/**
 * Real Instagram Account - Authentication & Connection Tests
 *
 * Tests authentication flow and Instagram connection status using
 * the real Instagram account (p.romanczuk@gmail.com -> @www_hehe_pl)
 *
 * Total: 6 tests | P0: 4 | P1: 1 | P2: 1
 */
test.describe('Real IG Auth & Connection', () => {
	// Skip in CI environments
	test.skip(
		() => process.env.CI === 'true',
		'Skipping in CI - requires real Instagram tokens',
	);

	// Skip if ENABLE_REAL_IG_TESTS is not set
	test.skip(
		() => !process.env.ENABLE_REAL_IG_TESTS,
		'Set ENABLE_REAL_IG_TESTS=true to run real Instagram tests',
	);

	test.beforeEach(async ({ page }) => {
		await signInAsRealIG(page);
	});

	/**
	 * RIG-01: Real IG Account Sign In
	 * Priority: P0 (Critical)
	 *
	 * Verifies that the real Instagram account can sign in successfully
	 * and is not redirected back to the signin page.
	 */
	test('RIG-01: should sign in with real Instagram account', async ({ page }) => {
		// After beforeEach, we should be signed in
		await page.goto('/');
		await page.waitForLoadState('domcontentloaded');

		// Should not be on sign-in page
		const url = page.url();
		expect(url).not.toContain('/auth/signin');

		// Should have navigable content
		const bodyText = await page.innerText('body');
		expect(bodyText.length).toBeGreaterThan(0);
	});

	/**
	 * RIG-02: Verify Connected Account is www_hehe_pl
	 * Priority: P0 (Critical)
	 *
	 * Confirms the account is linked to the correct Instagram Business Account.
	 */
	test('RIG-02: should be connected to www_hehe_pl Instagram account', async ({
		page,
	}) => {
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Wait for the Instagram connection status to load
		await page.waitForSelector('text=Instagram Connection', { timeout: 10000 });

		// The page should display the connected Instagram username
		const bodyText = await page.innerText('body');
		expect(bodyText).toContain('www_hehe_pl');
	});

	/**
	 * RIG-03: Token Validity Check (not expired)
	 * Priority: P0 (Critical)
	 *
	 * Ensures the Instagram access token is valid and not expired.
	 */
	test('RIG-03: should have valid (non-expired) Instagram token', async ({
		page,
	}) => {
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Wait for connection status component
		await page.waitForSelector('text=Instagram Connection', { timeout: 10000 });

		const bodyText = await page.innerText('body');

		// Should NOT show "expired" or "invalid" messages
		expect(bodyText.toLowerCase()).not.toContain('expired');
		expect(bodyText.toLowerCase()).not.toContain('invalid token');

		// Should show connected status
		const hasConnectedIndicator =
			bodyText.includes('Connected') ||
			bodyText.includes('www_hehe_pl') ||
			bodyText.includes('@');

		expect(hasConnectedIndicator).toBe(true);
	});

	/**
	 * RIG-04: Session Persistence Across Pages
	 * Priority: P1 (High)
	 *
	 * Verifies the session remains active when navigating between pages.
	 */
	test('RIG-04: should maintain session across page navigation', async ({
		page,
	}) => {
		// Navigate to home
		await page.goto('/');
		await page.waitForLoadState('domcontentloaded');
		expect(page.url()).not.toContain('/auth/signin');

		// Navigate to content page
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');
		expect(page.url()).not.toContain('/auth/signin');

		// Navigate to schedule page
		await page.goto('/schedule');
		await page.waitForLoadState('domcontentloaded');
		expect(page.url()).not.toContain('/auth/signin');

		// Navigate to analytics page
		await page.goto('/analytics');
		await page.waitForLoadState('domcontentloaded');
		expect(page.url()).not.toContain('/auth/signin');

		// Navigate to debug page
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');
		expect(page.url()).not.toContain('/auth/signin');

		// Navigate to users page
		await page.goto('/users');
		await page.waitForLoadState('domcontentloaded');
		expect(page.url()).not.toContain('/auth/signin');
	});

	/**
	 * RIG-05: Admin Role Verification (access admin pages)
	 * Priority: P0 (Critical)
	 *
	 * Confirms the account has admin role and can access admin-only pages.
	 */
	test('RIG-05: should have admin role and access admin pages', async ({
		page,
	}) => {
		// Review page is admin-only
		await page.goto('/review');
		await page.waitForLoadState('domcontentloaded');

		// Should have access (not redirected to home or signin)
		const url = page.url();
		expect(url).toMatch(/\/(en\/)?review/);

		// Should show the Story Review interface
		const bodyText = await page.innerText('body');
		const hasReviewUI =
			bodyText.includes('Story Review') ||
			bodyText.includes('Review') ||
			bodyText.includes('Pending') ||
			bodyText.includes('All caught up');

		expect(hasReviewUI).toBe(true);
	});

	/**
	 * RIG-06: Token Refresh Availability (Update Connection button)
	 * Priority: P2 (Medium)
	 *
	 * Verifies the option to update/reconnect Instagram is available.
	 */
	test('RIG-06: should show option to update Instagram connection', async ({
		page,
	}) => {
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Wait for connection status component
		await page.waitForSelector('text=Instagram Connection', { timeout: 10000 });

		// Look for update/reconnect button
		const updateButton = page.getByRole('button', {
			name: /update|reconnect|connect/i,
		});
		const updateLink = page.getByRole('link', {
			name: /update|reconnect|connect/i,
		});

		const hasUpdateOption =
			(await updateButton.count()) > 0 || (await updateLink.count()) > 0;

		expect(hasUpdateOption).toBe(true);
	});
});
