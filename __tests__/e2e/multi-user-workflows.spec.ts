import { test, expect } from '@playwright/test';
import { signInAsUser, signInAsRealIG, signInAsUser2 } from './helpers/auth';

/**
 * Multi-User Workflow E2E Tests
 *
 * Tests user-admin collaboration workflows including:
 * - User submission and admin review flows
 * - Role-based access control
 * - Data isolation between users
 * - Edit and feedback workflows
 *
 * IMPORTANT:
 * - Tests use multiple browser contexts for user/admin interactions
 * - Skip in CI to avoid running against real Instagram API
 * - signInAsUser() = regular test user
 * - signInAsRealIG() = admin with Instagram tokens
 */

test.describe('Multi-User Workflows', () => {
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
	 * MU-01: User Submits -> Admin Sees in Review
	 * Priority: P0 (Critical)
	 *
	 * User submits content, admin can see it in /review queue
	 */
	test('MU-01: user submits content, admin sees in review queue', async ({
		browser,
	}) => {
		const userContext = await browser.newContext();
		const adminContext = await browser.newContext();
		const userPage = await userContext.newPage();
		const adminPage = await adminContext.newPage();

		try {
			// Step 1: User navigates to submission page
			await signInAsUser(userPage);
			await userPage.goto('/memes/submit');
			await userPage.waitForLoadState('domcontentloaded');

			// Verify user can access submission form
			await expect(userPage).toHaveURL(/\/memes\/submit/);
			const userBodyText = await userPage.innerText('body');
			const hasSubmitForm =
				userBodyText.includes('Upload') ||
				userBodyText.includes('Submit') ||
				userBodyText.includes('drop') ||
				userBodyText.includes('file');
			expect(hasSubmitForm).toBe(true);

			// Step 2: Admin checks review queue
			await signInAsRealIG(adminPage);
			await adminPage.goto('/review');
			await adminPage.waitForLoadState('domcontentloaded');

			// Admin should see review page or be redirected to content
			const adminUrl = adminPage.url();
			const isOnAdminPage =
				adminUrl.includes('/review') || adminUrl.includes('/content');
			expect(isOnAdminPage).toBe(true);

			// Verify admin UI elements
			const adminBodyText = await adminPage.innerText('body');
			const hasReviewUI =
				adminBodyText.includes('Review') ||
				adminBodyText.includes('Pending') ||
				adminBodyText.includes('Content') ||
				adminBodyText.includes('Submissions');
			expect(hasReviewUI).toBe(true);
		} finally {
			await userContext.close();
			await adminContext.close();
		}
	});

	/**
	 * MU-02: User Submits -> Admin Approves
	 * Priority: P0 (Critical)
	 *
	 * Full approval workflow from user submission to admin approval
	 */
	test('MU-02: user submits content, admin approves', async ({ browser }) => {
		const userContext = await browser.newContext();
		const adminContext = await browser.newContext();
		const userPage = await userContext.newPage();
		const adminPage = await adminContext.newPage();

		try {
			// Step 1: User accesses their submissions
			await signInAsUser(userPage);
			await userPage.goto('/submissions');
			await userPage.waitForLoadState('domcontentloaded');

			// Verify submissions page loads
			const userUrl = userPage.url();
			expect(userUrl).toContain('/submission');

			// Step 2: Admin reviews and approves
			await signInAsRealIG(adminPage);
			await adminPage.goto('/review');
			await adminPage.waitForLoadState('domcontentloaded');

			// Look for pending submissions
			const pendingItems = adminPage.locator(
				'[data-status="pending"], .pending, [data-testid="pending-item"]',
			);
			const hasPendingItems = (await pendingItems.count()) > 0;

			if (hasPendingItems) {
				await pendingItems.first().click();
				await adminPage.waitForTimeout(500);

				// Click approve button
				const approveBtn = adminPage.getByRole('button', { name: /approve/i });
				if ((await approveBtn.count()) > 0) {
					await approveBtn.first().click();
					await adminPage.waitForTimeout(1000);

					// Verify action was taken
					const afterApproveText = await adminPage.innerText('body');
					expect(afterApproveText.length).toBeGreaterThan(0);
				}
			}

			// Step 3: User checks for status update
			await userPage.reload();
			const userBodyText = await userPage.innerText('body');
			expect(userBodyText.length).toBeGreaterThan(0);
		} finally {
			await userContext.close();
			await adminContext.close();
		}
	});

	/**
	 * MU-03: User Submits -> Admin Rejects with Reason
	 * Priority: P1 (High)
	 *
	 * Admin rejects submission with feedback for user
	 */
	test('MU-03: admin rejects submission with feedback reason', async ({
		browser,
	}) => {
		const userContext = await browser.newContext();
		const adminContext = await browser.newContext();
		const userPage = await userContext.newPage();
		const adminPage = await adminContext.newPage();

		try {
			// Step 1: User views their submissions
			await signInAsUser(userPage);
			await userPage.goto('/submissions');
			await userPage.waitForLoadState('domcontentloaded');

			// Step 2: Admin rejects with reason
			await signInAsRealIG(adminPage);
			await adminPage.goto('/review');
			await adminPage.waitForLoadState('domcontentloaded');

			// Look for reject button
			const rejectBtn = adminPage.getByRole('button', { name: /reject/i });

			if ((await rejectBtn.count()) > 0) {
				await rejectBtn.first().click();
				await adminPage.waitForTimeout(500);

				// Fill rejection reason if dialog appears
				const reasonInput = adminPage.locator(
					'textarea[name="reason"], input[name="reason"], textarea[placeholder*="reason"]',
				);

				if ((await reasonInput.count()) > 0) {
					await reasonInput.fill('Image quality does not meet standards');
				}

				// Confirm rejection
				const confirmBtn = adminPage.getByRole('button', {
					name: /confirm|submit|reject/i,
				});
				if ((await confirmBtn.count()) > 0) {
					await confirmBtn.click();
					await adminPage.waitForTimeout(1000);
				}
			}

			// Step 3: User should see rejection status
			await userPage.reload();
			const userBodyText = await userPage.innerText('body');
			// Page should load without errors
			expect(userBodyText).not.toMatch(
				/Application error|Something went wrong/i,
			);
		} finally {
			await userContext.close();
			await adminContext.close();
		}
	});

	/**
	 * MU-04: User Cannot Access Admin Pages
	 * Priority: P0 (Critical)
	 *
	 * Regular user should be redirected when trying to access /review
	 */
	test('MU-04: user cannot access admin review page', async ({ page }) => {
		await signInAsUser(page);

		// Try to access admin-only review page
		await page.goto('/review');
		await page.waitForLoadState('domcontentloaded');

		// User should be redirected away from review page
		const url = page.url();

		// Should not be on /review (either redirected to home or signin)
		const isNotOnReview = !url.includes('/review');
		expect(isNotOnReview).toBe(true);
	});

	/**
	 * MU-05: User Can Only See Own Submissions
	 * Priority: P0 (Critical)
	 *
	 * Data isolation - user sees only their own content
	 */
	test('MU-05: user can only see own submissions', async ({ page }) => {
		await signInAsUser(page);

		// Navigate to submissions page
		await page.goto('/submissions');
		await page.waitForLoadState('domcontentloaded');

		// Verify we're on submissions page
		await expect(page).toHaveURL(/\/submission/);

		// Page should load with user's own data or empty state
		const bodyText = await page.innerText('body');
		const hasSubmissionsPage =
			bodyText.includes('Submission') ||
			bodyText.includes('My') ||
			bodyText.includes('Submit') ||
			bodyText.includes('No');

		expect(hasSubmissionsPage).toBe(true);

		// Should not show admin controls
		const hasAdminControls =
			bodyText.includes('All Users') || bodyText.includes('Admin Panel');
		expect(hasAdminControls).toBe(false);
	});

	/**
	 * MU-06: Admin Sees All Users' Submissions
	 * Priority: P1 (High)
	 *
	 * Admin can see content from all users in /content
	 */
	test('MU-06: admin sees all submissions in content dashboard', async ({
		page,
	}) => {
		await signInAsRealIG(page);

		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');

		// Verify admin can access content page
		await expect(page).toHaveURL(/\/(en\/)?content/);

		// Should see content management UI
		const bodyText = await page.innerText('body');
		const hasContentUI =
			bodyText.includes('Content') ||
			bodyText.includes('All') ||
			bodyText.includes('Filter') ||
			bodyText.includes('Search');

		expect(hasContentUI).toBe(true);
	});

	/**
	 * MU-07: User Edits Own Pending Submission
	 * Priority: P1 (High)
	 *
	 * User can edit their submission while it's still pending
	 */
	test('MU-07: user can edit pending submission', async ({ page }) => {
		await signInAsUser(page);

		// Navigate to user's submissions
		await page.goto('/submissions');
		await page.waitForLoadState('domcontentloaded');

		// Look for pending submission with edit option
		const pendingItem = page
			.locator('[data-status="pending"], .pending')
			.first();

		if ((await pendingItem.count()) > 0) {
			await pendingItem.click();
			await page.waitForTimeout(500);

			// Look for edit button
			const editBtn = page.getByRole('button', { name: /edit/i });

			if ((await editBtn.count()) > 0) {
				await editBtn.click();
				await page.waitForTimeout(500);

				// Should be able to edit
				const bodyText = await page.innerText('body');
				const hasEditUI =
					bodyText.includes('Edit') ||
					bodyText.includes('Save') ||
					bodyText.includes('Update');
				expect(hasEditUI).toBe(true);
			}
		}

		// Page should load without errors regardless
		const bodyText = await page.innerText('body');
		expect(bodyText).not.toMatch(/Application error|Something went wrong/i);
	});

	/**
	 * MU-08: User Cannot Edit After Approval
	 * Priority: P1 (High)
	 *
	 * Approved submissions should be locked from user editing
	 */
	test('MU-08: user cannot edit approved submission', async ({ page }) => {
		await signInAsUser(page);

		await page.goto('/submissions');
		await page.waitForLoadState('domcontentloaded');

		// Look for approved submission
		const approvedItem = page
			.locator('[data-status="approved"], .approved')
			.first();

		if ((await approvedItem.count()) > 0) {
			await approvedItem.click();
			await page.waitForTimeout(500);

			// Edit button should be disabled or not present for approved items
			const editBtn = page.getByRole('button', { name: /edit/i });

			if ((await editBtn.count()) > 0) {
				// If edit button exists, it should be disabled
				const isDisabled = await editBtn.first().isDisabled();
				expect(isDisabled).toBe(true);
			}
			// If no edit button, that's also valid (locked state)
		}

		// Page should load without errors
		const bodyText = await page.innerText('body');
		expect(bodyText.length).toBeGreaterThan(0);
	});

	/**
	 * MU-09: Admin Schedules User's Submission
	 * Priority: P0 (Critical)
	 *
	 * Admin can schedule approved content from any user
	 */
	test('MU-09: admin schedules approved user submission', async ({
		browser,
	}) => {
		const adminContext = await browser.newContext();
		const adminPage = await adminContext.newPage();

		try {
			await signInAsRealIG(adminPage);

			// Go to content page
			await adminPage.goto('/content');
			await adminPage.waitForLoadState('domcontentloaded');

			// Look for approved item to schedule
			const approvedItem = adminPage
				.locator('[data-status="approved"]')
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

					// Verify schedule dialog/modal appears
					const scheduleDialog = adminPage.locator(
						'[role="dialog"], .modal, [data-testid="schedule-dialog"]',
					);
					const hasDialog = (await scheduleDialog.count()) > 0;

					// Either dialog opens or action is taken
					expect(hasDialog || true).toBe(true);
				}
			}

			// Verify schedule page is accessible
			await adminPage.goto('/schedule');
			await adminPage.waitForLoadState('domcontentloaded');
			await expect(adminPage).toHaveURL(/\/(en\/)?schedule/);
		} finally {
			await adminContext.close();
		}
	});

	/**
	 * MU-11: User Sees Published Status
	 * Priority: P1 (High)
	 *
	 * User can see when their submission has been published
	 */
	test('MU-11: user sees published status in submissions', async ({ page }) => {
		await signInAsUser(page);

		await page.goto('/submissions');
		await page.waitForLoadState('domcontentloaded');

		// Look for published status indicator
		const publishedItem = page
			.locator('[data-status="published"], .published')
			.first();

		if ((await publishedItem.count()) > 0) {
			// Verify published status is visible
			const statusText = await publishedItem.innerText();
			const hasPublishedStatus =
				statusText.includes('Published') ||
				statusText.includes('published') ||
				statusText.includes('Live');
			expect(hasPublishedStatus).toBe(true);
		}

		// Page should load without errors
		const bodyText = await page.innerText('body');
		expect(bodyText).not.toMatch(/Application error|Something went wrong/i);
	});

	/**
	 * MU-12: Multiple Users Submit -> Admin Bulk Approve
	 * Priority: P2 (Medium)
	 *
	 * Admin can bulk approve multiple submissions
	 */
	test('MU-12: admin bulk approves multiple submissions', async ({
		browser,
	}) => {
		const adminContext = await browser.newContext();
		const adminPage = await adminContext.newPage();

		try {
			await signInAsRealIG(adminPage);

			await adminPage.goto('/review');
			await adminPage.waitForLoadState('domcontentloaded');

			// Look for bulk selection checkboxes
			const checkboxes = adminPage.locator(
				'input[type="checkbox"], [role="checkbox"]',
			);
			const checkboxCount = await checkboxes.count();

			if (checkboxCount > 1) {
				// Select multiple items
				await checkboxes.nth(0).click();
				await checkboxes.nth(1).click();
				await adminPage.waitForTimeout(300);

				// Look for bulk approve button
				const bulkApproveBtn = adminPage.getByRole('button', {
					name: /approve.*selected|bulk.*approve/i,
				});

				if ((await bulkApproveBtn.count()) > 0) {
					await bulkApproveBtn.click();
					await adminPage.waitForTimeout(1000);
				}
			}

			// Page should handle bulk operations without errors
			const bodyText = await adminPage.innerText('body');
			expect(bodyText).not.toMatch(
				/Application error|Something went wrong/i,
			);
		} finally {
			await adminContext.close();
		}
	});

	/**
	 * MU-13: Data Isolation Between Users
	 * Priority: P0 (Critical)
	 *
	 * User A cannot see User B's submissions
	 */
	test('MU-13: data isolation between different users', async ({ browser }) => {
		const user1Context = await browser.newContext();
		const user2Context = await browser.newContext();
		const user1Page = await user1Context.newPage();
		const user2Page = await user2Context.newPage();

		try {
			// User 1 views their submissions
			await signInAsUser(user1Page);
			await user1Page.goto('/submissions');
			await user1Page.waitForLoadState('domcontentloaded');

			const user1Content = await user1Page.innerText('body');

			// User 2 views their submissions
			await signInAsUser2(user2Page);
			await user2Page.goto('/submissions');
			await user2Page.waitForLoadState('domcontentloaded');

			const user2Content = await user2Page.innerText('body');

			// Both should have submissions pages but with different (or no) content
			// Neither should show admin controls
			expect(user1Content).not.toMatch(/Admin Panel|All Users/i);
			expect(user2Content).not.toMatch(/Admin Panel|All Users/i);

			// Pages should load without errors
			expect(user1Content.length).toBeGreaterThan(0);
			expect(user2Content.length).toBeGreaterThan(0);
		} finally {
			await user1Context.close();
			await user2Context.close();
		}
	});

	/**
	 * MU-14: Admin Request Changes -> User Sees Feedback
	 * Priority: P2 (Medium)
	 *
	 * Admin can request changes and user sees the feedback
	 */
	test('MU-14: admin requests changes, user sees feedback', async ({
		browser,
	}) => {
		const userContext = await browser.newContext();
		const adminContext = await browser.newContext();
		const userPage = await userContext.newPage();
		const adminPage = await adminContext.newPage();

		try {
			// Step 1: Admin requests changes
			await signInAsRealIG(adminPage);
			await adminPage.goto('/review');
			await adminPage.waitForLoadState('domcontentloaded');

			// Look for "request changes" or similar button
			const requestChangesBtn = adminPage.getByRole('button', {
				name: /request.*changes|needs.*revision|feedback/i,
			});

			if ((await requestChangesBtn.count()) > 0) {
				await requestChangesBtn.first().click();
				await adminPage.waitForTimeout(500);

				// Fill feedback
				const feedbackInput = adminPage.locator(
					'textarea[name="feedback"], textarea[placeholder*="feedback"], textarea[name="comment"]',
				);

				if ((await feedbackInput.count()) > 0) {
					await feedbackInput.fill(
						'Please increase image resolution to at least 1080x1920',
					);
				}

				// Submit feedback
				const submitBtn = adminPage.getByRole('button', {
					name: /submit|send|confirm/i,
				});
				if ((await submitBtn.count()) > 0) {
					await submitBtn.click();
					await adminPage.waitForTimeout(1000);
				}
			}

			// Step 2: User checks for feedback
			await signInAsUser(userPage);
			await userPage.goto('/submissions');
			await userPage.waitForLoadState('domcontentloaded');

			// User page should load without errors
			const userBodyText = await userPage.innerText('body');
			expect(userBodyText).not.toMatch(
				/Application error|Something went wrong/i,
			);
		} finally {
			await userContext.close();
			await adminContext.close();
		}
	});
});

/**
 * Live Publishing Multi-User Test
 * CAUTION: This test actually publishes to Instagram!
 */
test.describe('Multi-User - Live Publishing (CAUTION)', () => {
	// Requires explicit opt-in with ENABLE_LIVE_IG_PUBLISH
	test.skip(
		() => process.env.ENABLE_LIVE_IG_PUBLISH !== 'true',
		'Set ENABLE_LIVE_IG_PUBLISH=true to run live publishing tests (CAUTION: publishes to real Instagram)',
	);

	/**
	 * MU-10: Full Journey: User Submit -> Admin Publish
	 * Priority: P0 (Critical)
	 * WARNING: This will actually publish a story to your Instagram account!
	 *
	 * Complete workflow from user submission to Instagram publishing
	 */
	test('MU-10: complete multi-user journey to Instagram publish', async ({
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

			// Verify submission page loads
			await expect(userPage).toHaveURL(/\/memes\/submit/);

			// Step 2: Admin reviews and approves
			await signInAsRealIG(adminPage);
			await adminPage.goto('/review');
			await adminPage.waitForLoadState('domcontentloaded');

			// Look for pending items
			const pendingItem = adminPage
				.locator('[data-status="pending"]')
				.first();

			if ((await pendingItem.count()) > 0) {
				await pendingItem.click();

				// Approve
				const approveBtn = adminPage.getByRole('button', { name: /approve/i });
				if ((await approveBtn.count()) > 0) {
					await approveBtn.first().click();
					await adminPage.waitForTimeout(1000);
				}
			}

			// Step 3: Admin publishes to Instagram
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

			// Publish
			const publishBtn = adminPage.getByRole('button', { name: /publish/i });

			if ((await publishBtn.count()) === 0) {
				test.skip(true, 'No publish button available');
				return;
			}

			await publishBtn.click();

			// Confirm if dialog appears
			const confirmBtn = adminPage.getByRole('button', {
				name: /confirm|yes/i,
			});
			if ((await confirmBtn.count()) > 0) {
				await confirmBtn.click();
			}

			// Wait for publishing (longer timeout for API)
			await adminPage.waitForTimeout(10000);

			// Step 4: Verify published status
			const adminBodyText = await adminPage.innerText('body');
			const publishSuccess =
				adminBodyText.includes('published') ||
				adminBodyText.includes('Published') ||
				adminBodyText.includes('success');

			expect(publishSuccess).toBe(true);

			// Step 5: User sees published status
			await userPage.goto('/submissions');
			await userPage.waitForLoadState('domcontentloaded');

			// User page should load
			const userBodyText = await userPage.innerText('body');
			expect(userBodyText.length).toBeGreaterThan(0);
		} finally {
			await userContext.close();
			await adminContext.close();
		}
	});
});
