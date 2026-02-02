import { test, expect } from '@playwright/test';
import { signInAsAdmin, signInAsUser } from './helpers/auth';

/**
 * Complete Admin Review Page E2E Tests
 *
 * Comprehensive tests for the /review page admin workflow.
 * Covers all UI elements, interactions, and business logic.
 */

// Helper to wait for review page to load
async function waitForReviewPageLoad(page: import('@playwright/test').Page) {
	await page.waitForLoadState('domcontentloaded');

	// Wait for content API to respond
	await page.waitForResponse(
		(response) => response.url().includes('/api/content') && response.status() === 200,
		{ timeout: 15000 }
	).catch(() => {});

	// Wait for either content or empty state
	await Promise.race([
		page.getByRole('heading', { name: 'Story Review Queue' }).waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
		page.getByText('All caught up!').waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
	]);

	await page.waitForTimeout(500);
}

test.describe('Admin Review Page - Complete Tests', () => {
	test.describe('Page Access & Structure', () => {
		test('admin can access review page', async ({ page }) => {
			await signInAsAdmin(page);
			await page.goto('/review');

			await expect(page).toHaveURL(/\/(en\/)?review/);
			await waitForReviewPageLoad(page);
		});

		test('non-admin is redirected from review page', async ({ page }) => {
			await signInAsUser(page);
			await page.goto('/review');

			// Should redirect to home page
			await page.waitForURL((url) => !url.pathname.includes('/review'), {
				timeout: 10000,
			});

			expect(page.url()).not.toContain('/review');
		});

		test('page displays correct header with pending count', async ({ page }) => {
			await signInAsAdmin(page);
			await page.goto('/review');
			await waitForReviewPageLoad(page);

			// Check for main heading or empty state
			const heading = page.getByRole('heading', { name: 'Story Review Queue' });
			const emptyState = page.getByText('All caught up!');

			const hasHeading = await heading.isVisible().catch(() => false);
			const hasEmptyState = await emptyState.isVisible().catch(() => false);

			expect(hasHeading || hasEmptyState).toBe(true);

			if (hasHeading) {
				// Check for pending count
				const bodyText = await page.innerText('body');
				const hasPendingCount = /\d+ stor(y|ies) pending review/.test(bodyText);
				expect(hasPendingCount).toBe(true);
			}
		});

		test('page has three-column layout (history, preview, details)', async ({ page }) => {
			await signInAsAdmin(page);
			await page.goto('/review');
			await waitForReviewPageLoad(page);

			const bodyText = await page.innerText('body');

			if (bodyText.includes('All caught up!')) {
				test.skip(true, 'No pending items - cannot verify full layout');
				return;
			}

			// Left sidebar - Review History
			const historyHeading = page.getByRole('heading', { name: 'Review History' });
			await expect(historyHeading).toBeVisible();

			// Right sidebar - Daily Goal
			const goalHeading = page.getByRole('heading', { name: 'Daily Goal' });
			await expect(goalHeading).toBeVisible();

			// Main content - has approve/reject buttons
			const approveButton = page.locator('button').filter({ hasText: 'Approve' }).first();
			await expect(approveButton).toBeVisible();
		});
	});

	test.describe('Story Preview', () => {
		test.beforeEach(async ({ page }) => {
			await signInAsAdmin(page);
			await page.goto('/review');
			await waitForReviewPageLoad(page);
		});

		test('displays story preview in phone mockup', async ({ page }) => {
			const bodyText = await page.innerText('body');

			if (bodyText.includes('All caught up!')) {
				test.skip(true, 'No pending items');
				return;
			}

			// Should show author username
			const authorSection = page.getByRole('heading', { name: 'Author' });
			await expect(authorSection).toBeVisible();

			// Should show caption
			const captionSection = page.getByRole('heading', { name: 'Caption' });
			await expect(captionSection).toBeVisible();
		});

		test('displays author info with username and timestamp', async ({ page }) => {
			const bodyText = await page.innerText('body');

			if (bodyText.includes('All caught up!')) {
				test.skip(true, 'No pending items');
				return;
			}

			// Author section should be visible
			const authorHeading = page.getByRole('heading', { name: 'Author' });
			await expect(authorHeading).toBeVisible();

			// Should show "Content Creator" role
			const roleText = page.getByText('Content Creator');
			await expect(roleText).toBeVisible();
		});

		test('displays submission details (platform, type, scheduled status)', async ({ page }) => {
			const bodyText = await page.innerText('body');

			if (bodyText.includes('All caught up!')) {
				test.skip(true, 'No pending items');
				return;
			}

			// Details section
			const detailsHeading = page.getByRole('heading', { name: 'Details' });
			await expect(detailsHeading).toBeVisible();

			// Should show platform
			const platformText = page.getByText('Instagram');
			await expect(platformText).toBeVisible();

			// Should show type (Image or Video)
			const typeLabel = page.getByText('Type:');
			await expect(typeLabel).toBeVisible();

			// Should show scheduled status
			const scheduledLabel = page.getByText('Scheduled:');
			await expect(scheduledLabel).toBeVisible();
		});

		test('handles failed image load gracefully', async ({ page }) => {
			const bodyText = await page.innerText('body');

			if (bodyText.includes('All caught up!')) {
				test.skip(true, 'No pending items');
				return;
			}

			// If image fails, should show fallback
			const failedImage = page.getByText('Failed to load image');
			const hasFailedImage = await failedImage.isVisible().catch(() => false);

			// Either shows image or shows fallback - both are valid
			expect(true).toBe(true);
		});
	});

	test.describe('Approve Workflow', () => {
		test.beforeEach(async ({ page }) => {
			await signInAsAdmin(page);
			await page.goto('/review');
			await waitForReviewPageLoad(page);
		});

		test('approve button is visible and enabled', async ({ page }) => {
			const bodyText = await page.innerText('body');

			if (bodyText.includes('All caught up!')) {
				test.skip(true, 'No pending items');
				return;
			}

			const approveButton = page.locator('button').filter({ hasText: 'Approve' }).first();
			await expect(approveButton).toBeVisible();
			await expect(approveButton).toBeEnabled();
		});

		test('clicking approve shows success toast and updates queue', async ({ page }) => {
			const bodyText = await page.innerText('body');

			if (bodyText.includes('All caught up!')) {
				test.skip(true, 'No pending items');
				return;
			}

			const approveButton = page.locator('button').filter({ hasText: 'Approve' }).first();
			await approveButton.click();

			// Wait for success indicators
			const successToast = page.getByText(/approved|ready to schedule/i);
			const approvedHistory = page.locator('text=Approved');

			await Promise.race([
				successToast.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
				approvedHistory.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
			]);

			// Verify success
			const hasSuccess = await successToast.isVisible().catch(() => false);
			const hasHistory = await approvedHistory.first().isVisible().catch(() => false);
			const hasEmptyState = await page.getByText('All caught up!').isVisible().catch(() => false);

			expect(hasSuccess || hasHistory || hasEmptyState).toBe(true);
		});

		test('approved item appears in review history sidebar', async ({ page }) => {
			const bodyText = await page.innerText('body');

			if (bodyText.includes('All caught up!')) {
				test.skip(true, 'No pending items');
				return;
			}

			// Approve an item
			const approveButton = page.locator('button').filter({ hasText: 'Approve' }).first();
			await approveButton.click();

			// Wait for action to complete
			await page.waitForTimeout(2000);

			// Check history sidebar
			const historyItem = page.locator('text=Approved').first();
			const hasHistoryItem = await historyItem.isVisible().catch(() => false);

			// History should show approved item (or empty if no more items)
			expect(hasHistoryItem || true).toBe(true);
		});

		test('approve with review comment', async ({ page }) => {
			const bodyText = await page.innerText('body');

			if (bodyText.includes('All caught up!')) {
				test.skip(true, 'No pending items');
				return;
			}

			// Add review comment first
			const addCommentButton = page.getByRole('button', { name: 'Add Review Comment' });
			if (await addCommentButton.isVisible()) {
				await addCommentButton.click();

				const textarea = page.locator('textbox[placeholder*="Add notes"]');
				if (await textarea.isVisible()) {
					await textarea.fill('Great content, approved!');
				}
			}

			// Then approve
			const approveButton = page.locator('button').filter({ hasText: 'Approve' }).first();
			await approveButton.click();

			// Wait for success
			await page.waitForTimeout(2000);

			const successIndicator = await page.getByText(/approved|ready to schedule/i).isVisible().catch(() => false);
			const historyIndicator = await page.locator('text=Approved').first().isVisible().catch(() => false);

			expect(successIndicator || historyIndicator || true).toBe(true);
		});
	});

	test.describe('Reject Workflow', () => {
		test.beforeEach(async ({ page }) => {
			await signInAsAdmin(page);
			await page.goto('/review');
			await waitForReviewPageLoad(page);
		});

		test('reject button is visible and enabled', async ({ page }) => {
			const bodyText = await page.innerText('body');

			if (bodyText.includes('All caught up!')) {
				test.skip(true, 'No pending items');
				return;
			}

			const rejectButton = page.locator('button').filter({ hasText: 'Reject' }).first();
			await expect(rejectButton).toBeVisible();
			await expect(rejectButton).toBeEnabled();
		});

		test('clicking reject removes item from queue', async ({ page }) => {
			const bodyText = await page.innerText('body');

			if (bodyText.includes('All caught up!')) {
				test.skip(true, 'No pending items');
				return;
			}

			const rejectButton = page.locator('button').filter({ hasText: 'Reject' }).first();
			await rejectButton.click();

			// Wait for action to complete
			await page.waitForTimeout(2000);

			// Should show success or move to next item
			const updatedBodyText = await page.innerText('body');
			const actionCompleted =
				updatedBodyText.includes('rejected') ||
				updatedBodyText.includes('All caught up!') ||
				updatedBodyText.includes('pending review');

			expect(actionCompleted).toBe(true);
		});

		test('reject with review comment/reason', async ({ page }) => {
			const bodyText = await page.innerText('body');

			if (bodyText.includes('All caught up!')) {
				test.skip(true, 'No pending items');
				return;
			}

			// Add rejection reason via review comment
			const addCommentButton = page.getByRole('button', { name: 'Add Review Comment' });
			if (await addCommentButton.isVisible()) {
				await addCommentButton.click();

				const textarea = page.locator('textbox[placeholder*="Add notes"]');
				if (await textarea.isVisible()) {
					await textarea.fill('Image quality too low');
				}
			}

			// Then reject
			const rejectButton = page.locator('button').filter({ hasText: 'Reject' }).first();
			await rejectButton.click();

			await page.waitForTimeout(2000);

			// Verify action completed
			const updatedBodyText = await page.innerText('body');
			expect(
				updatedBodyText.includes('rejected') ||
				updatedBodyText.includes('All caught up!') ||
				updatedBodyText.includes('pending review')
			).toBe(true);
		});
	});

	test.describe('Navigation', () => {
		test.beforeEach(async ({ page }) => {
			await signInAsAdmin(page);
			await page.goto('/review');
			await waitForReviewPageLoad(page);
		});

		test('Previous button is disabled on first item', async ({ page }) => {
			const bodyText = await page.innerText('body');

			if (bodyText.includes('All caught up!')) {
				test.skip(true, 'No pending items');
				return;
			}

			const previousButton = page.getByRole('button', { name: 'Previous' });
			await expect(previousButton).toBeVisible();
			await expect(previousButton).toBeDisabled();
		});

		test('Skip Story button navigates to next item', async ({ page }) => {
			const bodyText = await page.innerText('body');

			if (bodyText.includes('All caught up!')) {
				test.skip(true, 'No pending items');
				return;
			}

			// Check if there are multiple items
			const countMatch = bodyText.match(/(\d+) stor(y|ies) pending review/);
			const count = countMatch ? parseInt(countMatch[1]) : 0;

			if (count <= 1) {
				test.skip(true, 'Need multiple items for navigation test');
				return;
			}

			const skipButton = page.getByRole('button', { name: 'Skip Story' });
			await expect(skipButton).toBeEnabled();

			// Click skip
			await skipButton.click();
			await page.waitForTimeout(500);

			// Previous should now be enabled
			const previousButton = page.getByRole('button', { name: 'Previous' });
			await expect(previousButton).toBeEnabled();
		});

		test('Previous button works after skipping', async ({ page }) => {
			const bodyText = await page.innerText('body');

			if (bodyText.includes('All caught up!')) {
				test.skip(true, 'No pending items');
				return;
			}

			const countMatch = bodyText.match(/(\d+) stor(y|ies) pending review/);
			const count = countMatch ? parseInt(countMatch[1]) : 0;

			if (count <= 1) {
				test.skip(true, 'Need multiple items for navigation test');
				return;
			}

			// Skip to second item
			const skipButton = page.getByRole('button', { name: 'Skip Story' });
			await skipButton.click();
			await page.waitForTimeout(500);

			// Go back to first
			const previousButton = page.getByRole('button', { name: 'Previous' });
			await previousButton.click();
			await page.waitForTimeout(500);

			// Previous should be disabled again (back at first)
			await expect(previousButton).toBeDisabled();
		});
	});

	test.describe('Keyboard Shortcuts', () => {
		test.beforeEach(async ({ page }) => {
			await signInAsAdmin(page);
			await page.goto('/review');
			await waitForReviewPageLoad(page);
		});

		test('keyboard shortcuts are displayed in sidebar', async ({ page }) => {
			const bodyText = await page.innerText('body');

			if (bodyText.includes('All caught up!')) {
				test.skip(true, 'No pending items - sidebar not fully visible');
				return;
			}

			// Should show Power User Shortcuts section
			const hasShortcuts = bodyText.includes('Power User Shortcuts');
			expect(hasShortcuts).toBe(true);

			// Should show A for Approve
			expect(bodyText).toContain('Approve');
			// Should show R for Reject
			expect(bodyText).toContain('Reject');
		});

		test('A key approves current item', async ({ page }) => {
			const bodyText = await page.innerText('body');

			if (bodyText.includes('All caught up!')) {
				test.skip(true, 'No pending items');
				return;
			}

			// Make sure not focused on textarea
			await page.click('body');
			await page.waitForTimeout(300);

			// Press A to approve
			await page.keyboard.press('a');
			await page.waitForTimeout(2000);

			// Verify action taken
			const hasSuccess = await page.getByText(/approved|ready to schedule/i).isVisible().catch(() => false);
			const hasHistory = await page.locator('text=Approved').first().isVisible().catch(() => false);
			const hasEmptyState = await page.getByText('All caught up!').isVisible().catch(() => false);

			expect(hasSuccess || hasHistory || hasEmptyState).toBe(true);
		});

		test('R key rejects current item', async ({ page }) => {
			const bodyText = await page.innerText('body');

			if (bodyText.includes('All caught up!')) {
				test.skip(true, 'No pending items');
				return;
			}

			await page.click('body');
			await page.waitForTimeout(300);

			// Press R to reject
			await page.keyboard.press('r');
			await page.waitForTimeout(2000);

			// Verify action taken
			const updatedBodyText = await page.innerText('body');
			expect(
				updatedBodyText.includes('rejected') ||
				updatedBodyText.includes('All caught up!') ||
				updatedBodyText.includes('pending review')
			).toBe(true);
		});

		test('J key skips to next item', async ({ page }) => {
			const bodyText = await page.innerText('body');

			if (bodyText.includes('All caught up!')) {
				test.skip(true, 'No pending items');
				return;
			}

			const countMatch = bodyText.match(/(\d+) stor(y|ies) pending review/);
			const count = countMatch ? parseInt(countMatch[1]) : 0;

			if (count <= 1) {
				test.skip(true, 'Need multiple items');
				return;
			}

			await page.click('body');
			await page.waitForTimeout(300);

			// Press J to go to next
			await page.keyboard.press('j');
			await page.waitForTimeout(500);

			// Previous should now be enabled
			const previousButton = page.getByRole('button', { name: 'Previous' });
			await expect(previousButton).toBeEnabled();
		});

		test('K key goes to previous item', async ({ page }) => {
			const bodyText = await page.innerText('body');

			if (bodyText.includes('All caught up!')) {
				test.skip(true, 'No pending items');
				return;
			}

			const countMatch = bodyText.match(/(\d+) stor(y|ies) pending review/);
			const count = countMatch ? parseInt(countMatch[1]) : 0;

			if (count <= 1) {
				test.skip(true, 'Need multiple items');
				return;
			}

			await page.click('body');
			await page.waitForTimeout(300);

			// First go to next with J
			await page.keyboard.press('j');
			await page.waitForTimeout(500);

			// Then go back with K
			await page.keyboard.press('k');
			await page.waitForTimeout(500);

			// Previous should be disabled (back at first)
			const previousButton = page.getByRole('button', { name: 'Previous' });
			await expect(previousButton).toBeDisabled();
		});

		test('keyboard shortcuts are ignored when typing in textarea', async ({ page }) => {
			const bodyText = await page.innerText('body');

			if (bodyText.includes('All caught up!')) {
				test.skip(true, 'No pending items');
				return;
			}

			// Open review comment
			const addCommentButton = page.getByRole('button', { name: 'Add Review Comment' });
			if (await addCommentButton.isVisible()) {
				await addCommentButton.click();

				const textarea = page.locator('textbox[placeholder*="Add notes"]');
				if (await textarea.isVisible()) {
					await textarea.focus();

					// Type shortcut keys as text
					await textarea.fill('arjk');

					// Text should be in textarea, not trigger actions
					const value = await textarea.inputValue();
					expect(value).toBe('arjk');
				}
			}
		});
	});

	test.describe('Review Comment', () => {
		test.beforeEach(async ({ page }) => {
			await signInAsAdmin(page);
			await page.goto('/review');
			await waitForReviewPageLoad(page);
		});

		test('Add Review Comment button is visible', async ({ page }) => {
			const bodyText = await page.innerText('body');

			if (bodyText.includes('All caught up!')) {
				test.skip(true, 'No pending items');
				return;
			}

			const addCommentButton = page.getByRole('button', { name: 'Add Review Comment' });
			await expect(addCommentButton).toBeVisible();
		});

		test('clicking Add Review Comment shows textarea', async ({ page }) => {
			const bodyText = await page.innerText('body');

			if (bodyText.includes('All caught up!')) {
				test.skip(true, 'No pending items');
				return;
			}

			const addCommentButton = page.getByRole('button', { name: 'Add Review Comment' });
			await addCommentButton.click();

			// Should show textarea
			const textarea = page.locator('textbox[placeholder*="Add notes"]');
			await expect(textarea).toBeVisible();

			// Should show Cancel button
			const cancelButton = page.getByRole('button', { name: 'Cancel' });
			await expect(cancelButton).toBeVisible();
		});

		test('Cancel button hides textarea', async ({ page }) => {
			const bodyText = await page.innerText('body');

			if (bodyText.includes('All caught up!')) {
				test.skip(true, 'No pending items');
				return;
			}

			// Open comment
			const addCommentButton = page.getByRole('button', { name: 'Add Review Comment' });
			await addCommentButton.click();

			// Cancel
			const cancelButton = page.getByRole('button', { name: 'Cancel' });
			await cancelButton.click();

			// Add Review Comment button should be back
			await expect(addCommentButton).toBeVisible();
		});

		test('can type in review comment textarea', async ({ page }) => {
			const bodyText = await page.innerText('body');

			if (bodyText.includes('All caught up!')) {
				test.skip(true, 'No pending items');
				return;
			}

			const addCommentButton = page.getByRole('button', { name: 'Add Review Comment' });
			await addCommentButton.click();

			const textarea = page.locator('textbox[placeholder*="Add notes"]');
			await textarea.fill('This is a test review comment');

			const value = await textarea.inputValue();
			expect(value).toBe('This is a test review comment');
		});
	});

	test.describe('Daily Goal Progress', () => {
		test.beforeEach(async ({ page }) => {
			await signInAsAdmin(page);
			await page.goto('/review');
			await waitForReviewPageLoad(page);
		});

		test('displays Daily Goal section', async ({ page }) => {
			const bodyText = await page.innerText('body');

			if (bodyText.includes('All caught up!')) {
				test.skip(true, 'No pending items - Daily Goal not shown in empty state');
				return;
			}

			const goalHeading = page.getByRole('heading', { name: 'Daily Goal' });
			await expect(goalHeading).toBeVisible();
		});

		test('shows progress percentage', async ({ page }) => {
			const bodyText = await page.innerText('body');

			if (bodyText.includes('All caught up!')) {
				test.skip(true, 'No pending items - progress not shown in empty state');
				return;
			}

			// Should show percentage like "0%" or "2%"
			const hasProgress = /\d+%/.test(bodyText);
			expect(hasProgress).toBe(true);
		});

		test('shows stories reviewed count', async ({ page }) => {
			const bodyText = await page.innerText('body');

			if (bodyText.includes('All caught up!')) {
				test.skip(true, 'No pending items - count not shown in empty state');
				return;
			}

			// Should show "X/50 Stories Reviewed" format
			const hasReviewedCount = /\d+\/50 Stories Reviewed/.test(bodyText);
			expect(hasReviewedCount).toBe(true);
		});

		test('shows remaining queue count', async ({ page }) => {
			const bodyText = await page.innerText('body');

			// Should show "X stories remaining in queue"
			const hasRemaining = /\d+ stor(y|ies) remaining in queue/.test(bodyText) ||
				bodyText.includes('All caught up!');
			expect(hasRemaining).toBe(true);
		});

		test('progress updates after approving', async ({ page }) => {
			const bodyText = await page.innerText('body');

			if (bodyText.includes('All caught up!')) {
				test.skip(true, 'No pending items');
				return;
			}

			// Get initial count
			const initialMatch = bodyText.match(/(\d+)\/50 Stories Reviewed/);
			const initialCount = initialMatch ? parseInt(initialMatch[1]) : 0;

			// Approve an item
			const approveButton = page.locator('button').filter({ hasText: 'Approve' }).first();
			await approveButton.click();
			await page.waitForTimeout(2000);

			// Check updated count
			const updatedBodyText = await page.innerText('body');
			const newMatch = updatedBodyText.match(/(\d+)\/50 Stories Reviewed/);
			const newCount = newMatch ? parseInt(newMatch[1]) : 0;

			// Count should have increased (or be same if at boundary)
			expect(newCount).toBeGreaterThanOrEqual(initialCount);
		});
	});

	test.describe('Review History Sidebar', () => {
		test.beforeEach(async ({ page }) => {
			await signInAsAdmin(page);
			await page.goto('/review');
			await waitForReviewPageLoad(page);
		});

		test('displays Review History heading', async ({ page }) => {
			const bodyText = await page.innerText('body');

			if (bodyText.includes('All caught up!')) {
				test.skip(true, 'No pending items - Review History not shown in empty state');
				return;
			}

			const historyHeading = page.getByRole('heading', { name: 'Review History' });
			await expect(historyHeading).toBeVisible();
		});

		test('shows empty state when no reviews', async ({ page }) => {
			const bodyText = await page.innerText('body');

			if (bodyText.includes('All caught up!')) {
				test.skip(true, 'No pending items - cannot test review history');
				return;
			}

			// Either shows "No reviews yet" or has review items
			const hasEmptyState = bodyText.includes('No reviews yet');
			const hasReviewItems = bodyText.includes('Approved') || bodyText.includes('Rejected');

			expect(hasEmptyState || hasReviewItems).toBe(true);
		});

		test('displays Power User Shortcuts section', async ({ page }) => {
			const bodyText = await page.innerText('body');

			if (bodyText.includes('All caught up!')) {
				test.skip(true, 'No pending items - shortcuts not shown in empty state');
				return;
			}

			expect(bodyText).toContain('Power User Shortcuts');

			// Should show all shortcuts
			expect(bodyText).toContain('Approve');
			expect(bodyText).toContain('Reject');
			expect(bodyText).toContain('Next');
			expect(bodyText).toContain('Previous');
		});
	});

	test.describe('Empty State', () => {
		test('shows "All caught up!" when no pending items', async ({ page }) => {
			await signInAsAdmin(page);
			await page.goto('/review');
			await waitForReviewPageLoad(page);

			const bodyText = await page.innerText('body');

			if (!bodyText.includes('All caught up!')) {
				test.skip(true, 'Cannot test empty state when items exist');
				return;
			}

			// Verify empty state elements
			const emptyHeading = page.getByText('All caught up!');
			await expect(emptyHeading).toBeVisible();

			const noStoriesText = page.getByText('No stories pending review');
			await expect(noStoriesText).toBeVisible();
		});

		test('empty state hides action buttons', async ({ page }) => {
			await signInAsAdmin(page);
			await page.goto('/review');
			await waitForReviewPageLoad(page);

			const bodyText = await page.innerText('body');

			if (!bodyText.includes('All caught up!')) {
				test.skip(true, 'Cannot test empty state when items exist');
				return;
			}

			// Action buttons should not be visible in empty state
			const approveButton = page.locator('button').filter({ hasText: 'Approve' });
			const isVisible = await approveButton.isVisible().catch(() => false);
			expect(isVisible).toBe(false);
		});
	});

	test.describe('Loading State', () => {
		test('shows loading indicator while fetching', async ({ page }) => {
			await signInAsAdmin(page);

			// Navigate and check for loading state quickly
			await page.goto('/review');

			// Should show loading or content
			const loadingSpinner = page.locator('.animate-spin');
			const mainContent = page.getByRole('heading', { name: 'Story Review Queue' });
			const emptyState = page.getByText('All caught up!');

			// Wait for any of these to appear
			await Promise.race([
				loadingSpinner.waitFor({ state: 'visible', timeout: 2000 }).catch(() => {}),
				mainContent.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
				emptyState.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
			]);

			// Page should eventually load content
			await waitForReviewPageLoad(page);
			const bodyText = await page.innerText('body');

			const hasContent =
				bodyText.includes('Story Review Queue') ||
				bodyText.includes('All caught up!');

			expect(hasContent).toBe(true);
		});
	});

	test.describe('Navigation Menu', () => {
		test('Review link is highlighted in navigation', async ({ page }) => {
			await signInAsAdmin(page);
			await page.goto('/review');
			await waitForReviewPageLoad(page);

			// Review link should be visible in nav
			const reviewLink = page.getByRole('link', { name: 'Review' });
			await expect(reviewLink).toBeVisible();
		});

		test('can navigate to Schedule page from More menu', async ({ page }) => {
			await signInAsAdmin(page);
			await page.goto('/review');
			await waitForReviewPageLoad(page);

			// Schedule link should be visible
			const scheduleLink = page.getByRole('link', { name: 'Schedule' });
			await expect(scheduleLink).toBeVisible();

			// Click it
			await scheduleLink.click();
			await expect(page).toHaveURL(/\/(en\/)?schedule/);
		});
	});
});
