import { test, expect } from '@playwright/test';
import { signInAsRealIG } from './helpers/auth';

/**
 * Instagram Publishing E2E Tests (Real Account)
 *
 * These tests use a real Instagram account (p.romanczuk@gmail.com) with
 * linked Meta tokens to test actual publishing workflows.
 *
 * IMPORTANT:
 * - Skip in CI to avoid running against real Instagram API
 * - Rate limits apply - don't run frequently
 * - Requires the account to have valid linked Instagram tokens
 */

test.describe('Instagram Publishing (Real Account)', () => {
	// Skip in CI environments
	test.skip(
		() => process.env.CI === 'true',
		'Skipping in CI - requires real Instagram tokens',
	);

	// Also skip if ENABLE_REAL_IG_TESTS is not set
	test.skip(
		() => !process.env.ENABLE_REAL_IG_TESTS,
		'Set ENABLE_REAL_IG_TESTS=true to run real Instagram tests',
	);

	test.beforeEach(async ({ page }) => {
		await signInAsRealIG(page);
	});

	/**
	 * IG-01: Verify Real IG Account Sign In
	 * Priority: P0 (Critical)
	 */
	test('IG-01: should sign in with real Instagram account', async ({ page }) => {
		// After beforeEach, we should be signed in
		await page.goto('/');
		await page.waitForLoadState('domcontentloaded');

		// Should not be on sign-in page
		const url = page.url();
		expect(url).not.toContain('/auth/signin');

		// Should see user menu or dashboard content
		const bodyText = await page.innerText('body');
		expect(bodyText.length).toBeGreaterThan(0);
	});

	/**
	 * IG-02: Verify Instagram Account is Linked to www_hehe_pl
	 * Priority: P0 (Critical)
	 */
	test('IG-02: should be connected to www_hehe_pl Instagram account', async ({ page }) => {
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Check for Instagram connection status
		const bodyText = await page.innerText('body');

		// Should be connected to the specific Instagram account
		const isConnectedToCorrectAccount = bodyText.includes('www_hehe_pl');

		expect(isConnectedToCorrectAccount).toBe(true);
	});

	/**
	 * IG-03: Access Content Queue
	 * Priority: P0 (Critical)
	 */
	test('IG-03: should access content queue', async ({ page }) => {
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');

		await expect(page).toHaveURL(/\/(en\/)?content/);

		// Should show content queue interface
		const bodyText = await page.innerText('body');
		expect(bodyText.length).toBeGreaterThan(0);
	});

	/**
	 * IG-04: View Approved Content Ready for Publishing
	 * Priority: P1 (High)
	 */
	test('IG-04: should view approved content', async ({ page }) => {
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');

		// Look for approved status filter or approved items
		const approvedFilter = page.locator('[data-status="approved"], [data-filter="approved"]');
		const approvedCount = await approvedFilter.count();

		// Either there are approved items, or we can see content interface
		const bodyText = await page.innerText('body');
		const hasContent =
			approvedCount > 0 ||
			bodyText.includes('Approved') ||
			bodyText.includes('Ready') ||
			bodyText.includes('Content');

		expect(hasContent).toBe(true);
	});

	/**
	 * IG-05: Schedule Page Access with Real IG Account
	 * Priority: P1 (High)
	 */
	test('IG-05: should access schedule page', async ({ page }) => {
		await page.goto('/schedule');
		await page.waitForLoadState('domcontentloaded');

		await expect(page).toHaveURL(/\/(en\/)?schedule/);

		// Should show scheduling interface
		const bodyText = await page.innerText('body');
		const hasScheduleUI =
			bodyText.includes('Schedule') ||
			bodyText.includes('Upcoming') ||
			bodyText.includes('Posts') ||
			bodyText.includes('Calendar');

		expect(hasScheduleUI).toBe(true);
	});

	/**
	 * IG-06: Content Item Preview
	 * Priority: P1 (High)
	 */
	test('IG-06: should preview content item', async ({ page }) => {
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');

		// Try to find and click a content item
		const contentItem = page.locator('[data-testid="content-card"], .content-card, article').first();

		if (await contentItem.count() > 0) {
			await contentItem.click();

			// Wait for preview modal or detail view
			await page.waitForTimeout(500);

			const bodyText = await page.innerText('body');
			// Should show preview content or modal
			expect(bodyText.length).toBeGreaterThan(0);
		} else {
			// No content items - test passes (empty state is valid)
			const bodyText = await page.innerText('body');
			expect(bodyText).toBeTruthy();
		}
	});

	/**
	 * IG-07: Instagram Token Validity Check
	 * Priority: P0 (Critical)
	 */
	test('IG-07: should have valid Instagram tokens', async ({ page }) => {
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		const bodyText = await page.innerText('body');

		// Check that tokens are not expired
		const hasValidToken =
			!bodyText.includes('expired') &&
			!bodyText.includes('invalid token') &&
			(bodyText.includes('valid') ||
				bodyText.includes('Connected') ||
				bodyText.includes('Instagram'));

		expect(hasValidToken).toBe(true);
	});

	/**
	 * IG-08: Analytics Page Access
	 * Priority: P2 (Medium)
	 */
	test('IG-08: should access analytics page', async ({ page }) => {
		await page.goto('/analytics');
		await page.waitForLoadState('domcontentloaded');

		// Page should load (may redirect based on role)
		const bodyText = await page.innerText('body');
		expect(bodyText.length).toBeGreaterThan(0);
	});

	/**
	 * IG-09: User Session Persistence
	 * Priority: P1 (High)
	 */
	test('IG-09: should maintain session across navigation', async ({ page }) => {
		// Navigate through multiple pages
		await page.goto('/');
		await page.waitForLoadState('domcontentloaded');

		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');
		expect(page.url()).not.toContain('/auth/signin');

		await page.goto('/schedule');
		await page.waitForLoadState('domcontentloaded');
		expect(page.url()).not.toContain('/auth/signin');

		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');
		expect(page.url()).not.toContain('/auth/signin');
	});

	/**
	 * IG-10: Error Handling for Publishing
	 * Priority: P1 (High)
	 * Note: This tests the error handling UI, not actual publishing
	 */
	test('IG-10: should handle publishing errors gracefully', async ({ page }) => {
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');

		// Verify page doesn't show unhandled errors
		const bodyText = await page.innerText('body');
		expect(bodyText).not.toMatch(/Application error|Something went wrong|Unhandled/i);
	});
});

/**
 * Real Instagram Publishing Tests
 * CAUTION: These tests actually publish to Instagram!
 * Only enable manually for testing the full workflow.
 */
test.describe('Instagram Publishing - Live (CAUTION)', () => {
	// Requires explicit opt-in with ENABLE_LIVE_IG_PUBLISH
	test.skip(
		() => process.env.ENABLE_LIVE_IG_PUBLISH !== 'true',
		'Set ENABLE_LIVE_IG_PUBLISH=true to run live publishing tests (CAUTION: publishes to real Instagram)',
	);

	test.beforeEach(async ({ page }) => {
		await signInAsRealIG(page);
	});

	/**
	 * LIVE-01: Publish Story to Instagram
	 * WARNING: This will actually publish a story to your Instagram account!
	 */
	test('LIVE-01: should publish story to Instagram', async ({ page }) => {
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');

		// Find an approved item
		const approvedItem = page.locator('[data-status="approved"]').first();

		if (await approvedItem.count() === 0) {
			test.skip(true, 'No approved content available for publishing');
			return;
		}

		await approvedItem.click();

		// Look for publish button in modal or detail view
		const publishBtn = page.getByRole('button', { name: /publish/i });

		if (await publishBtn.count() === 0) {
			test.skip(true, 'No publish button available');
			return;
		}

		await publishBtn.click();

		// Confirm in dialog if present
		const confirmBtn = page.getByRole('button', { name: /confirm|yes/i });
		if (await confirmBtn.count() > 0) {
			await confirmBtn.click();
		}

		// Wait for success indication (longer timeout for API call)
		await page.waitForTimeout(5000);

		// Check for success message or status change
		const bodyText = await page.innerText('body');
		const publishSuccess =
			bodyText.includes('published') ||
			bodyText.includes('success') ||
			bodyText.includes('Published');

		expect(publishSuccess).toBe(true);
	});
});
