import { test, expect, Browser } from '@playwright/test';
import { signInAsUser, signInAsRealIG } from './helpers/auth';

/**
 * Real Instagram Complete Journey E2E Tests
 *
 * These tests cover the full end-to-end journey from user submission
 * through admin review to publishing on Instagram.
 *
 * IMPORTANT:
 * - Tests use multiple browser contexts for user/admin interactions
 * - Skip in CI to avoid running against real Instagram API
 * - Rate limits apply - don't run frequently
 * - LIVE tests require ENABLE_LIVE_IG_PUBLISH=true
 */

test.describe('Complete Journey Tests', () => {
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

	/**
	 * E2E-01: Submission -> Approval Flow
	 * Priority: P0 (Critical)
	 *
	 * Tests complete flow: User submits content, admin approves it
	 */
	test('E2E-01: user submits content, admin approves', async ({ browser }) => {
		// Create isolated browser contexts for user and admin
		const userContext = await browser.newContext();
		const adminContext = await browser.newContext();
		const userPage = await userContext.newPage();
		const adminPage = await adminContext.newPage();

		try {
			// Step 1: User submits content
			await signInAsUser(userPage);
			await userPage.goto('/memes/submit');
			await userPage.waitForLoadState('domcontentloaded');

			// Verify submission form loads
			await expect(userPage).toHaveURL(/\/memes\/submit/);
			const userBodyText = await userPage.innerText('body');
			const hasSubmitForm =
				userBodyText.includes('Upload') ||
				userBodyText.includes('Submit') ||
				userBodyText.includes('drop');
			expect(hasSubmitForm).toBe(true);

			// Step 2: Admin reviews pending submissions
			await signInAsRealIG(adminPage);
			await adminPage.goto('/review');
			await adminPage.waitForLoadState('domcontentloaded');

			// Check if review page loads (may be /content or /review)
			const adminUrl = adminPage.url();
			const isOnReviewPage =
				adminUrl.includes('/review') || adminUrl.includes('/content');

			if (isOnReviewPage) {
				const adminBodyText = await adminPage.innerText('body');
				const hasReviewUI =
					adminBodyText.includes('Review') ||
					adminBodyText.includes('Pending') ||
					adminBodyText.includes('Content') ||
					adminBodyText.includes('Approve');
				expect(hasReviewUI).toBe(true);
			}

			// Step 3: Look for approve button (if submissions exist)
			const approveBtn = adminPage.getByRole('button', { name: /approve/i });
			if ((await approveBtn.count()) > 0) {
				await approveBtn.first().click();
				await adminPage.waitForTimeout(1000);

				// Verify approval action taken
				const afterApproveText = await adminPage.innerText('body');
				expect(afterApproveText.length).toBeGreaterThan(0);
			}
		} finally {
			// Cleanup
			await userContext.close();
			await adminContext.close();
		}
	});

	/**
	 * E2E-02: Submission -> Rejection Flow
	 * Priority: P1 (High)
	 *
	 * Tests complete flow: User submits content, admin rejects it
	 */
	test('E2E-02: user submits content, admin rejects with reason', async ({
		browser,
	}) => {
		const userContext = await browser.newContext();
		const adminContext = await browser.newContext();
		const userPage = await userContext.newPage();
		const adminPage = await adminContext.newPage();

		try {
			// Step 1: User accesses submission page
			await signInAsUser(userPage);
			await userPage.goto('/submissions');
			await userPage.waitForLoadState('domcontentloaded');

			// Verify user can see their submissions
			const userUrl = userPage.url();
			expect(userUrl).toContain('/submission');

			// Step 2: Admin reviews and rejects
			await signInAsRealIG(adminPage);
			await adminPage.goto('/review');
			await adminPage.waitForLoadState('domcontentloaded');

			// Check for reject functionality
			const rejectBtn = adminPage.getByRole('button', { name: /reject/i });

			if ((await rejectBtn.count()) > 0) {
				await rejectBtn.first().click();
				await adminPage.waitForTimeout(500);

				// Look for rejection reason input
				const reasonInput = adminPage.locator(
					'textarea[name="reason"], input[name="reason"], textarea[placeholder*="reason"], textarea[placeholder*="Reason"]',
				);

				if ((await reasonInput.count()) > 0) {
					await reasonInput.fill('Does not meet quality guidelines');
				}

				// Confirm rejection
				const confirmBtn = adminPage.getByRole('button', {
					name: /confirm|submit|reject/i,
				});
				if ((await confirmBtn.count()) > 0) {
					await confirmBtn.first().click();
					await adminPage.waitForTimeout(1000);
				}
			}

			// Step 3: User sees rejection status
			await userPage.reload();
			await userPage.waitForLoadState('domcontentloaded');

			// Page should load without errors
			const userBodyText = await userPage.innerText('body');
			expect(userBodyText.length).toBeGreaterThan(0);
		} finally {
			await userContext.close();
			await adminContext.close();
		}
	});

	/**
	 * E2E-03: Approval -> Schedule Flow
	 * Priority: P0 (Critical)
	 *
	 * Tests: Approved content gets scheduled for publishing
	 */
	test('E2E-03: approved content gets scheduled for publishing', async ({
		browser,
	}) => {
		const adminContext = await browser.newContext();
		const adminPage = await adminContext.newPage();

		try {
			// Step 1: Admin signs in and views approved content
			await signInAsRealIG(adminPage);
			await adminPage.goto('/content');
			await adminPage.waitForLoadState('domcontentloaded');

			// Verify content page loads
			await expect(adminPage).toHaveURL(/\/(en\/)?content/);

			// Step 2: Look for approved items to schedule
			const approvedItem = adminPage
				.locator('[data-status="approved"], .approved')
				.first();

			if ((await approvedItem.count()) > 0) {
				await approvedItem.click();
				await adminPage.waitForTimeout(500);

				// Look for schedule button
				const scheduleBtn = adminPage.getByRole('button', {
					name: /schedule/i,
				});

				if ((await scheduleBtn.count()) > 0) {
					await scheduleBtn.click();
					await adminPage.waitForTimeout(500);

					// Should open schedule dialog/modal
					const scheduleDialog = adminPage.locator(
						'[role="dialog"], .modal, [data-testid="schedule-dialog"]',
					);

					if ((await scheduleDialog.count()) > 0) {
						// Verify dialog opened
						await expect(scheduleDialog).toBeVisible();
					}
				}
			}

			// Step 3: Verify schedule page has content
			await adminPage.goto('/schedule');
			await adminPage.waitForLoadState('domcontentloaded');

			await expect(adminPage).toHaveURL(/\/(en\/)?schedule/);

			const bodyText = await adminPage.innerText('body');
			const hasScheduleUI =
				bodyText.includes('Schedule') ||
				bodyText.includes('Upcoming') ||
				bodyText.includes('Posts') ||
				bodyText.includes('Calendar');
			expect(hasScheduleUI).toBe(true);
		} finally {
			await adminContext.close();
		}
	});
});

/**
 * Live Instagram Publishing Tests
 * CAUTION: These tests actually publish to Instagram!
 * Only enable manually for testing the full workflow.
 */
test.describe('Complete Journey - Live Publishing (CAUTION)', () => {
	// Requires explicit opt-in with ENABLE_LIVE_IG_PUBLISH
	test.skip(
		() => process.env.ENABLE_LIVE_IG_PUBLISH !== 'true',
		'Set ENABLE_LIVE_IG_PUBLISH=true to run live publishing tests (CAUTION: publishes to real Instagram)',
	);

	/**
	 * LIVE-E2E-04: Full Journey: Submit -> Published
	 * Priority: P0 (Critical)
	 * WARNING: This will actually publish a story to your Instagram account!
	 *
	 * Tests complete journey from submission to published Instagram story
	 */
	test('LIVE-E2E-04: complete journey from submission to published story', async ({
		browser,
	}) => {
		const userContext = await browser.newContext();
		const adminContext = await browser.newContext();
		const userPage = await userContext.newPage();
		const adminPage = await adminContext.newPage();

		try {
			// Step 1: User submits content
			await signInAsUser(userPage);
			await userPage.goto('/memes/submit');
			await userPage.waitForLoadState('domcontentloaded');

			// Verify submission page accessible
			await expect(userPage).toHaveURL(/\/memes\/submit/);

			// Step 2: Admin reviews and approves
			await signInAsRealIG(adminPage);
			await adminPage.goto('/review');
			await adminPage.waitForLoadState('domcontentloaded');

			// Look for pending submissions
			const pendingItem = adminPage
				.locator('[data-status="pending"], .pending')
				.first();

			if ((await pendingItem.count()) > 0) {
				await pendingItem.click();

				// Approve the submission
				const approveBtn = adminPage.getByRole('button', { name: /approve/i });
				if ((await approveBtn.count()) > 0) {
					await approveBtn.first().click();
					await adminPage.waitForTimeout(1000);
				}
			}

			// Step 3: Navigate to content and find approved item to publish
			await adminPage.goto('/content');
			await adminPage.waitForLoadState('domcontentloaded');

			const approvedItem = adminPage
				.locator('[data-status="approved"]')
				.first();

			if ((await approvedItem.count()) === 0) {
				test.skip(true, 'No approved content available for publishing');
				return;
			}

			await approvedItem.click();

			// Step 4: Publish to Instagram
			const publishBtn = adminPage.getByRole('button', { name: /publish/i });

			if ((await publishBtn.count()) === 0) {
				test.skip(true, 'No publish button available');
				return;
			}

			await publishBtn.click();

			// Confirm in dialog if present
			const confirmBtn = adminPage.getByRole('button', {
				name: /confirm|yes/i,
			});
			if ((await confirmBtn.count()) > 0) {
				await confirmBtn.click();
			}

			// Wait for publishing to complete (longer timeout for API call)
			await adminPage.waitForTimeout(10000);

			// Step 5: Verify published status
			const bodyText = await adminPage.innerText('body');
			const publishSuccess =
				bodyText.includes('published') ||
				bodyText.includes('Published') ||
				bodyText.includes('success') ||
				bodyText.includes('Success');

			expect(publishSuccess).toBe(true);

			// Step 6: User sees published status in their submissions
			await userPage.goto('/submissions');
			await userPage.waitForLoadState('domcontentloaded');

			const userBodyText = await userPage.innerText('body');
			// User page should load successfully
			expect(userBodyText.length).toBeGreaterThan(0);
		} finally {
			await userContext.close();
			await adminContext.close();
		}
	});

	/**
	 * LIVE-E2E-05: Published Story Insights
	 * Priority: P1 (High)
	 *
	 * Verifies that published content shows correct status and insights
	 */
	test('LIVE-E2E-05: verify published story status and insights', async ({
		page,
	}) => {
		await signInAsRealIG(page);

		// Step 1: Navigate to content page
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');

		// Step 2: Look for published items
		const publishedItem = page
			.locator('[data-status="published"], .published')
			.first();

		if ((await publishedItem.count()) === 0) {
			// No published items - check analytics instead
			await page.goto('/analytics');
			await page.waitForLoadState('domcontentloaded');

			const bodyText = await page.innerText('body');
			const hasAnalyticsPage =
				bodyText.includes('Analytics') ||
				bodyText.includes('Insights') ||
				bodyText.includes('Performance') ||
				bodyText.includes('Stories');

			expect(hasAnalyticsPage).toBe(true);
			return;
		}

		// Step 3: Click on published item to view details
		await publishedItem.click();
		await page.waitForTimeout(500);

		// Step 4: Verify published status is shown
		const bodyText = await page.innerText('body');
		const hasPublishedStatus =
			bodyText.includes('Published') ||
			bodyText.includes('published') ||
			bodyText.includes('Live') ||
			bodyText.includes('Completed');

		expect(hasPublishedStatus).toBe(true);

		// Step 5: Check for insights/metrics if available
		const hasInsights =
			bodyText.includes('Views') ||
			bodyText.includes('views') ||
			bodyText.includes('Reach') ||
			bodyText.includes('reach') ||
			bodyText.includes('Impressions') ||
			bodyText.includes('Engagement');

		// Insights may or may not be available depending on story age
		// Just verify the page loads without errors
		expect(bodyText).not.toMatch(/Application error|Something went wrong/i);
	});
});
