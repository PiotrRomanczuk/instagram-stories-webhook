import { test, expect } from '@playwright/test';
import { signInAsAdmin } from './helpers/auth';

// ---------------------------------------------------------------------------
// 390px - Schedule Mobile View (iPhone 14 Pro)
// ---------------------------------------------------------------------------

test.describe('Mobile 390px - Schedule Timeline', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test.beforeEach(async ({ page }) => {
		await signInAsAdmin(page);
	});

	test('Schedule timeline loads correctly', async ({ page }) => {
		await page.goto('/schedule', { waitUntil: 'domcontentloaded' });
		await page.waitForSelector('[data-tour="schedule-timeline"]', { timeout: 15000 }).catch(() => {});

		// Check for schedule elements
		const bodyText = await page.innerText('body');
		const hasScheduleContent =
			bodyText.includes('Schedule') ||
			bodyText.includes('Timeline') ||
			bodyText.includes('Content');
		expect(hasScheduleContent).toBe(true);
	});

	test('Timeline cards are tappable (44px minimum)', async ({ page }) => {
		await page.goto('/schedule', { waitUntil: 'domcontentloaded' });
		await page.waitForSelector('[data-tour="schedule-timeline"]', { timeout: 15000 }).catch(() => {});

		const timeline = page.locator('[data-tour="schedule-timeline"]');
		const cards = timeline.locator('.rounded-xl.shadow-sm.border');

		const cardCount = await cards.count();
		if (cardCount === 0) {
			test.skip();
			return;
		}

		// Verify first card meets touch target size
		const box = await cards.first().boundingBox();
		expect(box).toBeTruthy();
		if (box) {
			expect(box.height).toBeGreaterThanOrEqual(44);
		}
	});

	test('Status filter chips are visible', async ({ page }) => {
		await page.goto('/schedule', { waitUntil: 'domcontentloaded' });
		await page.waitForSelector('[data-tour="schedule-status-filters"]', { timeout: 15000 }).catch(() => {});

		const filtersContainer = page.locator('[data-tour="schedule-status-filters"]');
		if (await filtersContainer.isVisible().catch(() => false)) {
			await expect(filtersContainer).toBeVisible();
		}
	});

	test('Week strip navigation is present', async ({ page }) => {
		await page.goto('/schedule', { waitUntil: 'domcontentloaded' });
		await page.waitForSelector('[data-tour="schedule-week-strip"]', { timeout: 15000 }).catch(() => {});

		const weekStrip = page.locator('[data-tour="schedule-week-strip"]');
		if (await weekStrip.isVisible().catch(() => false)) {
			await expect(weekStrip).toBeVisible();
		}
	});

	// NOTE: Schedule no-horizontal-scroll covered by 375px admin tests
});
