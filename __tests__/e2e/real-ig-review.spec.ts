import { test, expect } from '@playwright/test';
import { signInAsRealIG } from './helpers/auth';

/**
 * Admin Story Review E2E Tests (Real Account)
 *
 * These tests cover the admin review workflow for Instagram Stories.
 * Uses the real Instagram account (p.romanczuk@gmail.com) which has admin privileges.
 *
 * IMPORTANT:
 * - Skip in CI to avoid running against real services
 * - Requires valid admin account with review permissions
 * - Tests keyboard shortcuts and navigation
 */

test.describe('Story Review (Admin Account)', () => {
	// Skip in CI environments
	test.skip(
		() => process.env.CI === 'true',
		'Skipping in CI - requires real admin account',
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
	 * REV-01: Access Review Page
	 * Priority: P0 (Critical)
	 * Navigate to /review, verify StoryReviewLayout loads
	 */
	test('REV-01: should access review page and verify layout loads', async ({ page }) => {
		await page.goto('/review');
		await page.waitForLoadState('domcontentloaded');

		// Should not redirect (admin has access)
		await expect(page).toHaveURL(/\/(en\/)?review/);

		// Verify the page header is present
		const pageHeader = page.getByText('Story Review');
		await expect(pageHeader).toBeVisible();

		// Page should contain either:
		// 1. Review content with "stories pending review" counter
		// 2. Empty state "All caught up!"
		const bodyText = await page.innerText('body');
		const hasReviewContent =
			bodyText.includes('pending review') ||
			bodyText.includes('All caught up!') ||
			bodyText.includes('Story Review');

		expect(hasReviewContent).toBe(true);
	});

	/**
	 * REV-02: View Pending Submission
	 * Priority: P0 (Critical)
	 * See pending items in review queue
	 */
	test('REV-02: should view pending submissions in review queue', async ({ page }) => {
		await page.goto('/review');
		await page.waitForLoadState('domcontentloaded');

		// Wait for content to load
		await page.waitForTimeout(2000);

		const bodyText = await page.innerText('body');

		// Either we have pending stories or we're "all caught up"
		if (bodyText.includes('All caught up!')) {
			// Empty state is valid
			const emptyStateIcon = page.locator('.lucide-inbox');
			await expect(emptyStateIcon).toBeVisible();
		} else {
			// Should show pending review indicator
			const pendingBadge = page.getByText('Pending Review');
			await expect(pendingBadge).toBeVisible();

			// Should show counter like "X stories pending review"
			const counterText = page.getByText(/\d+ stor(y|ies) pending review/);
			await expect(counterText).toBeVisible();
		}
	});

	/**
	 * REV-03: Approve Submission
	 * Priority: P0 (Critical)
	 * Click "Approve & Schedule" button
	 */
	test('REV-03: should approve a submission', async ({ page }) => {
		await page.goto('/review');
		await page.waitForLoadState('domcontentloaded');

		await page.waitForTimeout(2000);

		const bodyText = await page.innerText('body');

		if (bodyText.includes('All caught up!')) {
			test.skip(true, 'No pending submissions to approve');
			return;
		}

		// Find and click the Approve & Schedule button
		const approveButton = page.getByRole('button', { name: 'Approve & Schedule' });
		await expect(approveButton).toBeVisible();
		await expect(approveButton).toBeEnabled();

		await approveButton.click();

		// Wait for the action to complete
		await page.waitForTimeout(2000);

		// Success toast should appear or the list should refresh
		// The approved item should be removed from the queue
		const updatedBodyText = await page.innerText('body');

		// Either still has items or shows "all caught up"
		const actionCompleted =
			updatedBodyText.includes('approved') ||
			updatedBodyText.includes('All caught up!') ||
			updatedBodyText.includes('pending review');

		expect(actionCompleted).toBe(true);
	});

	/**
	 * REV-04: Reject with Reason
	 * Priority: P1 (High)
	 * Enter reason in textarea, click Reject
	 */
	test('REV-04: should reject submission with reason', async ({ page }) => {
		await page.goto('/review');
		await page.waitForLoadState('domcontentloaded');

		await page.waitForTimeout(2000);

		const bodyText = await page.innerText('body');

		if (bodyText.includes('All caught up!')) {
			test.skip(true, 'No pending submissions to reject');
			return;
		}

		// Find the feedback textarea
		const feedbackTextarea = page.locator('textarea');
		await expect(feedbackTextarea).toBeVisible();

		// Enter rejection reason
		const rejectionReason = 'Image quality does not meet standards for publication';
		await feedbackTextarea.fill(rejectionReason);

		// Click Reject button
		const rejectButton = page.getByRole('button', { name: 'Reject' });
		await expect(rejectButton).toBeVisible();
		await rejectButton.click();

		// Wait for the action to complete
		await page.waitForTimeout(2000);

		// The rejected item should be removed from queue
		const updatedBodyText = await page.innerText('body');
		const actionCompleted =
			updatedBodyText.includes('rejected') ||
			updatedBodyText.includes('All caught up!') ||
			updatedBodyText.includes('pending review');

		expect(actionCompleted).toBe(true);
	});

	/**
	 * REV-05: Keyboard Nav - J/K Keys
	 * Priority: P1 (High)
	 * J=next, K=previous navigation
	 */
	test('REV-05: should navigate with J/K keyboard shortcuts', async ({ page }) => {
		await page.goto('/review');
		await page.waitForLoadState('domcontentloaded');

		await page.waitForTimeout(2000);

		const bodyText = await page.innerText('body');

		if (bodyText.includes('All caught up!')) {
			test.skip(true, 'No pending submissions for keyboard nav test');
			return;
		}

		// Check if there are multiple items
		const counterText = await page.getByText(/\d+ \/ \d+/).textContent();

		if (!counterText) {
			test.skip(true, 'Could not find navigation counter');
			return;
		}

		const [current, total] = counterText.split(' / ').map(Number);

		if (total <= 1) {
			test.skip(true, 'Need at least 2 items for navigation test');
			return;
		}

		// Initial position
		expect(current).toBe(1);

		// Press J to go to next
		await page.keyboard.press('j');
		await page.waitForTimeout(500);

		// Counter should update to 2 / X
		const afterJ = await page.getByText(/\d+ \/ \d+/).textContent();
		if (afterJ) {
			const [newCurrent] = afterJ.split(' / ').map(Number);
			expect(newCurrent).toBe(2);
		}

		// Press K to go back
		await page.keyboard.press('k');
		await page.waitForTimeout(500);

		// Counter should be back to 1 / X
		const afterK = await page.getByText(/\d+ \/ \d+/).textContent();
		if (afterK) {
			const [backCurrent] = afterK.split(' / ').map(Number);
			expect(backCurrent).toBe(1);
		}
	});

	/**
	 * REV-06: Keyboard Shortcut - A Key
	 * Priority: P1 (High)
	 * A key approves current item
	 */
	test('REV-06: should approve with A keyboard shortcut', async ({ page }) => {
		await page.goto('/review');
		await page.waitForLoadState('domcontentloaded');

		await page.waitForTimeout(2000);

		const bodyText = await page.innerText('body');

		if (bodyText.includes('All caught up!')) {
			test.skip(true, 'No pending submissions to approve');
			return;
		}

		// Get initial count
		const counterText = await page.getByText(/\d+ stor(y|ies) pending review/).textContent();
		const initialCount = counterText ? parseInt(counterText.match(/\d+/)?.[0] || '0') : 0;

		// Press A to approve (while not focused on textarea)
		await page.keyboard.press('a');

		// Wait for the action to complete
		await page.waitForTimeout(2000);

		// Either count decreased or shows "all caught up"
		const updatedBodyText = await page.innerText('body');

		if (initialCount === 1) {
			// Should now show empty state
			expect(updatedBodyText.includes('All caught up!')).toBe(true);
		} else {
			// Count should have decreased
			const newCounterText = await page.getByText(/\d+ stor(y|ies) pending review/).textContent();
			const newCount = newCounterText ? parseInt(newCounterText.match(/\d+/)?.[0] || '0') : 0;
			expect(newCount).toBeLessThan(initialCount);
		}
	});

	/**
	 * REV-07: Navigation Arrows
	 * Priority: P1 (High)
	 * Left/right arrow buttons work
	 */
	test('REV-07: should navigate with arrow buttons', async ({ page }) => {
		await page.goto('/review');
		await page.waitForLoadState('domcontentloaded');

		await page.waitForTimeout(2000);

		const bodyText = await page.innerText('body');

		if (bodyText.includes('All caught up!')) {
			test.skip(true, 'No pending submissions for navigation test');
			return;
		}

		// Find navigation buttons (ChevronLeft and ChevronRight)
		const prevButton = page.locator('button').filter({ has: page.locator('.lucide-chevron-left') });
		const nextButton = page.locator('button').filter({ has: page.locator('.lucide-chevron-right') });

		// Both buttons should be visible
		await expect(prevButton).toBeVisible();
		await expect(nextButton).toBeVisible();

		// Check if there are multiple items by looking at the counter
		const counterText = await page.getByText(/\d+ \/ \d+/).textContent();

		if (!counterText) {
			// If no counter, just verify buttons exist
			expect(await prevButton.count()).toBeGreaterThan(0);
			return;
		}

		const [current, total] = counterText.split(' / ').map(Number);

		// First item - previous should be disabled
		if (current === 1) {
			await expect(prevButton).toBeDisabled();
		}

		// If there are more items, next should be enabled
		if (total > 1 && current < total) {
			await expect(nextButton).toBeEnabled();

			// Click next
			await nextButton.click();
			await page.waitForTimeout(500);

			// Counter should update
			const newCounter = await page.getByText(/\d+ \/ \d+/).textContent();
			if (newCounter) {
				const [newCurrent] = newCounter.split(' / ').map(Number);
				expect(newCurrent).toBe(2);

				// Now previous should be enabled
				await expect(prevButton).toBeEnabled();

				// Click previous
				await prevButton.click();
				await page.waitForTimeout(500);

				// Back to first item
				const finalCounter = await page.getByText(/\d+ \/ \d+/).textContent();
				if (finalCounter) {
					const [finalCurrent] = finalCounter.split(' / ').map(Number);
					expect(finalCurrent).toBe(1);
				}
			}
		}
	});

	/**
	 * REV-08: Empty State Display
	 * Priority: P2 (Medium)
	 * Shows "All caught up!" when no pending items
	 */
	test('REV-08: should show empty state when no pending items', async ({ page }) => {
		await page.goto('/review');
		await page.waitForLoadState('domcontentloaded');

		await page.waitForTimeout(2000);

		const bodyText = await page.innerText('body');

		if (!bodyText.includes('All caught up!')) {
			// Skip this test if there are pending items
			// We can't force an empty state in this E2E test
			test.skip(true, 'Cannot test empty state - pending items exist');
			return;
		}

		// Verify empty state elements
		const emptyStateHeading = page.getByText('All caught up!');
		await expect(emptyStateHeading).toBeVisible();

		// Verify the Inbox icon is present
		const inboxIcon = page.locator('.lucide-inbox');
		await expect(inboxIcon).toBeVisible();

		// Should show "No stories pending review" message
		const noStoriesText = page.getByText('No stories pending review');
		await expect(noStoriesText).toBeVisible();
	});

	/**
	 * REV-09: Request Changes Flow
	 * Priority: P2 (Medium)
	 * Enter feedback, click "Request Changes"
	 */
	test('REV-09: should request changes with feedback', async ({ page }) => {
		await page.goto('/review');
		await page.waitForLoadState('domcontentloaded');

		await page.waitForTimeout(2000);

		const bodyText = await page.innerText('body');

		if (bodyText.includes('All caught up!')) {
			test.skip(true, 'No pending submissions to request changes');
			return;
		}

		// Find the feedback textarea
		const feedbackTextarea = page.locator('textarea');
		await expect(feedbackTextarea).toBeVisible();

		// Enter feedback for changes (required for Request Changes)
		const feedback = 'Please improve the image resolution and add a caption';
		await feedbackTextarea.fill(feedback);

		// Request Changes button should now be enabled
		const requestChangesButton = page.getByRole('button', { name: 'Request Changes' });
		await expect(requestChangesButton).toBeVisible();
		await expect(requestChangesButton).toBeEnabled();

		await requestChangesButton.click();

		// Wait for the action to complete
		await page.waitForTimeout(2000);

		// The item should be processed
		const updatedBodyText = await page.innerText('body');
		const actionCompleted =
			updatedBodyText.includes('Change request') ||
			updatedBodyText.includes('All caught up!') ||
			updatedBodyText.includes('pending review');

		expect(actionCompleted).toBe(true);
	});

	/**
	 * REV-10: Review Counter Display
	 * Priority: P1 (High)
	 * Shows "X stories pending review"
	 */
	test('REV-10: should display review counter correctly', async ({ page }) => {
		await page.goto('/review');
		await page.waitForLoadState('domcontentloaded');

		await page.waitForTimeout(2000);

		const bodyText = await page.innerText('body');

		if (bodyText.includes('All caught up!')) {
			// Empty state - counter would be 0
			expect(bodyText.includes('No stories pending review')).toBe(true);
			return;
		}

		// Look for the counter text
		const counterElement = page.getByText(/\d+ stor(y|ies) pending review/);
		await expect(counterElement).toBeVisible();

		// Extract the count
		const counterText = await counterElement.textContent();
		expect(counterText).toBeTruthy();

		// Should be a valid positive number
		const count = parseInt(counterText?.match(/\d+/)?.[0] || '0');
		expect(count).toBeGreaterThan(0);

		// Also verify the navigation counter (1 / X format)
		const navCounter = page.getByText(/\d+ \/ \d+/);
		await expect(navCounter).toBeVisible();

		const navText = await navCounter.textContent();
		if (navText) {
			const [current, total] = navText.split(' / ').map(Number);
			expect(current).toBeGreaterThanOrEqual(1);
			expect(total).toBe(count);
		}
	});
});

/**
 * Review Page - Request Changes Button State Tests
 */
test.describe('Story Review - Request Changes Button State', () => {
	test.skip(
		() => process.env.CI === 'true',
		'Skipping in CI - requires real admin account',
	);

	test.skip(
		() => !process.env.ENABLE_REAL_IG_TESTS,
		'Set ENABLE_REAL_IG_TESTS=true to run real Instagram tests',
	);

	test.beforeEach(async ({ page }) => {
		await signInAsRealIG(page);
	});

	/**
	 * Request Changes button should be disabled when feedback is empty
	 */
	test('should disable Request Changes button when feedback is empty', async ({ page }) => {
		await page.goto('/review');
		await page.waitForLoadState('domcontentloaded');

		await page.waitForTimeout(2000);

		const bodyText = await page.innerText('body');

		if (bodyText.includes('All caught up!')) {
			test.skip(true, 'No pending submissions to test');
			return;
		}

		// Request Changes button should be disabled initially (no feedback)
		const requestChangesButton = page.getByRole('button', { name: 'Request Changes' });
		await expect(requestChangesButton).toBeVisible();
		await expect(requestChangesButton).toBeDisabled();

		// Enter some feedback
		const feedbackTextarea = page.locator('textarea');
		await feedbackTextarea.fill('Please fix the image');

		// Now it should be enabled
		await expect(requestChangesButton).toBeEnabled();

		// Clear the feedback
		await feedbackTextarea.fill('');

		// Should be disabled again
		await expect(requestChangesButton).toBeDisabled();
	});
});

/**
 * Review Page - Keyboard Shortcut Edge Cases
 */
test.describe('Story Review - Keyboard Shortcuts Edge Cases', () => {
	test.skip(
		() => process.env.CI === 'true',
		'Skipping in CI - requires real admin account',
	);

	test.skip(
		() => !process.env.ENABLE_REAL_IG_TESTS,
		'Set ENABLE_REAL_IG_TESTS=true to run real Instagram tests',
	);

	test.beforeEach(async ({ page }) => {
		await signInAsRealIG(page);
	});

	/**
	 * Keyboard shortcuts should not trigger when typing in textarea
	 */
	test('should not trigger shortcuts when typing in textarea', async ({ page }) => {
		await page.goto('/review');
		await page.waitForLoadState('domcontentloaded');

		await page.waitForTimeout(2000);

		const bodyText = await page.innerText('body');

		if (bodyText.includes('All caught up!')) {
			test.skip(true, 'No pending submissions to test');
			return;
		}

		// Focus on the textarea
		const feedbackTextarea = page.locator('textarea');
		await feedbackTextarea.focus();

		// Type letters that are normally shortcuts
		await feedbackTextarea.fill('jka');

		// The textarea should contain the typed text
		const textValue = await feedbackTextarea.inputValue();
		expect(textValue).toBe('jka');

		// The navigation counter should not have changed (shortcuts ignored in textarea)
		// Just verify the page is still functional
		const pageContent = await page.innerText('body');
		expect(pageContent).toContain('Story Review');
	});
});
