import { test, expect } from '@playwright/test';
import { signInAsAdmin } from './helpers/auth';

/**
 * Schedule Mobile UX E2E Tests
 *
 * Tests the /schedule page on mobile viewport (390x844).
 * Covers: page load, status filters, preview modal,
 * 3-dot menu, reschedule flow, published post menu,
 * scroll preservation, and ready panel interactions.
 */

test.use({
	viewport: { width: 390, height: 844 },
});

test.describe('Schedule Mobile UX', () => {
	test.beforeEach(async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/schedule', { waitUntil: 'networkidle' });
		// Wait for the schedule view to load
		await page.waitForSelector('[data-tour="schedule-timeline"]', { timeout: 15000 });
	});

	test('schedule page loads with correct sections', async ({ page }) => {
		// Timeline should be rendered
		await expect(page.locator('[data-tour="schedule-timeline"]')).toBeVisible();

		// Status filter chips should be visible
		await expect(page.locator('[data-tour="schedule-status-filters"]')).toBeVisible();

		// Date navigation should be present
		await expect(page.locator('[data-tour="schedule-date-nav"]')).toBeVisible();

		// Week strip should be visible
		await expect(page.locator('[data-tour="schedule-week-strip"]')).toBeVisible();
	});

	test('status filter chips work', async ({ page }) => {
		const filtersContainer = page.locator('[data-tour="schedule-status-filters"]');

		// "All" filter should be active by default
		const allButton = filtersContainer.getByRole('button', { name: /^All/ });
		await expect(allButton).toBeVisible();

		// Click "Scheduled" filter
		const scheduledButton = filtersContainer.getByRole('button', { name: /^Scheduled/ });
		if (await scheduledButton.isVisible()) {
			await scheduledButton.click();
			await page.waitForTimeout(300);
		}

		// Click "Published" filter
		const publishedButton = filtersContainer.getByRole('button', { name: /^Published/ });
		if (await publishedButton.isVisible()) {
			await publishedButton.click();
			await page.waitForTimeout(300);
		}

		// Click back to "All"
		await allButton.click();
		await page.waitForTimeout(300);
	});

	test('preview modal opens and closes with scroll position preserved', async ({ page }) => {
		// Wait for timeline cards to appear
		const timeline = page.locator('[data-tour="schedule-timeline"]');
		const cards = timeline.locator('.rounded-xl.shadow-sm.border');

		// Skip if no cards
		const cardCount = await cards.count();
		if (cardCount === 0) {
			test.skip();
			return;
		}

		// Scroll down if we have enough cards
		if (cardCount > 2) {
			await timeline.evaluate((el) => { el.scrollTop = 100; });
			await page.waitForTimeout(200);
		}

		// Save scroll position
		const scrollBefore = await timeline.evaluate((el) => el.scrollTop);

		// Click a card to open preview
		await cards.first().click();
		await page.waitForTimeout(500);

		// Preview modal should be open - check for the modal backdrop
		const modalBackdrop = page.locator('.fixed.inset-0.bg-black\\/70');
		await expect(modalBackdrop).toBeVisible({ timeout: 5000 });

		// Close the modal
		const closeButton = page.locator('.fixed.inset-0.z-\\[90\\]').locator('button').filter({ has: page.locator('svg') }).first();
		if (await closeButton.isVisible()) {
			await closeButton.click();
		} else {
			// Click the backdrop to close
			await modalBackdrop.click();
		}

		await page.waitForTimeout(500);

		// Scroll position should be restored
		if (scrollBefore > 0) {
			const scrollAfter = await timeline.evaluate((el) => el.scrollTop);
			expect(scrollAfter).toBeGreaterThanOrEqual(scrollBefore - 10);
		}
	});

	test('preview modal bottom actions are visible and not cut off', async ({ page }) => {
		const timeline = page.locator('[data-tour="schedule-timeline"]');
		const cards = timeline.locator('.rounded-xl.shadow-sm.border');

		const cardCount = await cards.count();
		if (cardCount === 0) {
			test.skip();
			return;
		}

		// Click a card to open preview
		await cards.first().click();
		await page.waitForTimeout(500);

		// The modal should be visible
		const modal = page.locator('.fixed.inset-0.z-\\[90\\]');
		await expect(modal).toBeVisible({ timeout: 5000 });

		// Scroll to the bottom of the modal's scrollable content
		const scrollableContent = modal.locator('.overflow-y-auto');
		if (await scrollableContent.count() > 0) {
			await scrollableContent.evaluate((el) => {
				el.scrollTop = el.scrollHeight;
			});
			await page.waitForTimeout(300);
		}

		// The "Dismiss" button should be visible and not cut off
		const dismissButton = modal.getByRole('button', { name: /dismiss/i });
		if (await dismissButton.count() > 0) {
			await expect(dismissButton).toBeVisible();

			// Check the button is within the viewport
			const box = await dismissButton.boundingBox();
			if (box) {
				const viewport = page.viewportSize();
				expect(box.y + box.height).toBeLessThanOrEqual(viewport!.height);
			}
		}
	});

	test('3-dot menu actions for scheduled posts', async ({ page }) => {
		const timeline = page.locator('[data-tour="schedule-timeline"]');

		// Look for a 3-dot menu button
		const menuButtons = timeline.locator('button').filter({
			has: page.locator('svg.lucide-more-horizontal'),
		});

		const menuCount = await menuButtons.count();
		if (menuCount === 0) {
			test.skip();
			return;
		}

		// Click the first 3-dot menu
		await menuButtons.first().click();
		await page.waitForTimeout(300);

		// Action sheet should appear
		const actionSheet = page.locator('.fixed.inset-0.z-\\[60\\]');
		await expect(actionSheet).toBeVisible({ timeout: 3000 });

		// Should have action buttons
		const actionButtons = actionSheet.locator('button');
		expect(await actionButtons.count()).toBeGreaterThan(0);

		// Close the action sheet
		const closeBtn = actionSheet.getByRole('button', { name: /close/i });
		if (await closeBtn.isVisible()) {
			await closeBtn.click();
		}
	});

	test('reschedule opens time picker instead of preview', async ({ page }) => {
		const timeline = page.locator('[data-tour="schedule-timeline"]');

		// Find 3-dot menu on a non-published, non-failed card
		const menuButtons = timeline.locator('button').filter({
			has: page.locator('svg.lucide-more-horizontal'),
		});

		const menuCount = await menuButtons.count();
		if (menuCount === 0) {
			test.skip();
			return;
		}

		// Click the first 3-dot menu
		await menuButtons.first().click();
		await page.waitForTimeout(300);

		// Look for "Reschedule" button in action sheet
		const rescheduleBtn = page.getByRole('button', { name: /reschedule/i });
		if (await rescheduleBtn.isVisible()) {
			await rescheduleBtn.click();
			await page.waitForTimeout(500);

			// The ScheduleTimeSheet should appear (z-[100] bottom sheet)
			const timeSheet = page.locator('.fixed.inset-0.z-\\[100\\]');
			await expect(timeSheet).toBeVisible({ timeout: 3000 });

			// Should have "Schedule Post" header
			await expect(timeSheet.getByText('Schedule Post')).toBeVisible();

			// Should have date and time pickers
			await expect(timeSheet.locator('input[type="time"]')).toBeVisible();

			// Cancel to close
			const cancelBtn = timeSheet.getByRole('button', { name: /cancel/i });
			await cancelBtn.click();
		}
	});

	test('published posts show checkmark and 3-dot menu', async ({ page }) => {
		// Filter to published posts
		const filtersContainer = page.locator('[data-tour="schedule-status-filters"]');
		const publishedButton = filtersContainer.getByRole('button', { name: /^Published/ });

		if (!(await publishedButton.isVisible())) {
			test.skip();
			return;
		}

		await publishedButton.click();
		await page.waitForTimeout(300);

		const timeline = page.locator('[data-tour="schedule-timeline"]');
		const cards = timeline.locator('.rounded-xl.shadow-sm.border');
		const cardCount = await cards.count();

		if (cardCount === 0) {
			test.skip();
			return;
		}

		const firstCard = cards.first();

		// Should have green checkmark
		const checkmark = firstCard.locator('svg.lucide-check-circle-2');
		await expect(checkmark).toBeVisible();

		// Should also have a 3-dot menu button
		const menuBtn = firstCard.locator('button').filter({
			has: page.locator('svg.lucide-more-horizontal'),
		});
		await expect(menuBtn).toBeVisible();

		// Click the menu button
		await menuBtn.click();
		await page.waitForTimeout(300);

		// Action sheet should show "View Details & Insights"
		const viewDetailsBtn = page.getByRole('button', { name: /view details/i });
		await expect(viewDetailsBtn).toBeVisible();
	});

	test('ready panel button is visible with count', async ({ page }) => {
		// The floating ready button should be at the bottom
		const readyButton = page.locator('[data-tour="schedule-ready-button"]');
		await expect(readyButton).toBeVisible({ timeout: 5000 });
	});
});
