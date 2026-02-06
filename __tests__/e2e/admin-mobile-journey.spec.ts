import { test, expect } from '@playwright/test';
import { signInAsAdmin, signInAsRealIG } from './helpers/auth';
import {
	createPendingContent,
	createApprovedContent,
	createScheduledContent,
	cleanupTestContentByPattern,
	approveContent,
	scheduleContent,
} from './helpers/seed';
import { getUnpublishedMeme } from './helpers/test-assets';
import { extractMediaId } from './helpers/story-verification';

/**
 * Admin Mobile Journey E2E Test
 *
 * Simulates an admin reviewing, approving, rejecting, and scheduling
 * content on a mobile device (iPhone 14 Pro: 390x844).
 *
 * The StoryflowReviewLayout is mobile-centric:
 * - Phone preview scales down on small screens
 * - Sidebars hidden on mobile, replaced by inline "Details & Comment" toggle
 * - Direct Approve/Reject buttons (no dropdown menus)
 */

const TEST_TITLE_PREFIX = 'Admin Mobile Test';
const timestamp = Date.now();

test.use({
	viewport: { width: 390, height: 844 },
	video: { mode: 'on', size: { width: 390, height: 844 } },
});

test.describe('Admin Mobile Journey', () => {

	// Track seeded content IDs for cleanup
	let seededIds: string[] = [];

	test.beforeAll(async ({ browser }) => {
		const context = await browser.newContext({
			viewport: { width: 390, height: 844 },
		});
		const page = await context.newPage();

		// Sign in as admin to seed data
		await signInAsAdmin(page);

		// Create 3 pending submissions
		for (let i = 0; i < 3; i++) {
			const id = await createPendingContent(page, {
				title: `${TEST_TITLE_PREFIX} ${timestamp}-${i + 1}`,
				caption: `Mobile test caption ${i + 1}`,
				mediaIndex: 60 + i,
			});
			seededIds.push(id);
		}

		// Create 2 approved content items (for Ready to Schedule sidebar)
		for (let i = 0; i < 2; i++) {
			const id = await createApprovedContent(page, {
				title: `${TEST_TITLE_PREFIX} Approved ${timestamp}-${i + 1}`,
				caption: `Approved test caption ${i + 1}`,
				mediaIndex: 70 + i,
			});
			seededIds.push(id);
		}

		// Create 2 scheduled content items for today
		const now = new Date();
		for (let i = 0; i < 2; i++) {
			const scheduledTime = new Date(now);
			scheduledTime.setHours(10 + i * 4, 0, 0, 0); // 10:00 AM and 2:00 PM
			const id = await createScheduledContent(page, scheduledTime, {
				title: `${TEST_TITLE_PREFIX} Scheduled ${timestamp}-${i + 1}`,
				caption: `Scheduled test caption ${i + 1}`,
				mediaIndex: 80 + i,
			});
			seededIds.push(id);
		}

		await context.close();
	});

	test.afterAll(async ({ browser }) => {
		const context = await browser.newContext({
			viewport: { width: 390, height: 844 },
		});
		const page = await context.newPage();

		await signInAsAdmin(page);
		await cleanupTestContentByPattern(page, TEST_TITLE_PREFIX);

		await context.close();
	});

	test('AMJ-01: sign in and verify admin dashboard on mobile', async ({
		page,
	}) => {
		await signInAsAdmin(page);

		// Should land on homepage with admin dashboard
		await expect(page).toHaveURL(/\//);
		await page.waitForLoadState('domcontentloaded');

		// Verify dashboard stats are visible
		await expect(page.locator('text=Pending Review')).toBeVisible({
			timeout: 15000,
		});
		await expect(page.locator('text=Scheduled Today')).toBeVisible();
		await expect(page.locator('text=Published Today')).toBeVisible();

		// Verify Quick Actions section exists
		await expect(page.locator('text=Quick Actions')).toBeVisible();
		await expect(page.locator('text=Review Queue')).toBeVisible();
	});

	test('AMJ-02: navigate to review page and verify pending items on mobile', async ({
		page,
	}) => {
		await signInAsAdmin(page);
		await page.goto('/review');
		await page.waitForLoadState('domcontentloaded');

		// Verify Story Review Queue heading (StoryflowReviewLayout)
		await expect(page.locator('text=Story Review Queue')).toBeVisible({
			timeout: 15000,
		});

		// Verify pending count text (e.g., "3 stories pending review")
		await expect(page.locator('text=pending review')).toBeVisible({
			timeout: 10000,
		});

		// Verify phone preview area is visible on mobile
		await expect(page.locator('text=9:16 Preview')).toBeVisible({
			timeout: 10000,
		});
	});

	test('AMJ-03: approve a submission on mobile', async ({
		page,
	}) => {
		await signInAsAdmin(page);
		await page.goto('/review');
		await page.waitForLoadState('domcontentloaded');

		// Wait for review page to load
		await expect(page.locator('text=Story Review Queue')).toBeVisible({
			timeout: 15000,
		});

		// Direct Approve button in ReviewActionBar (no dropdown)
		const approveButton = page.getByRole('button', { name: 'Approve' });
		await expect(approveButton).toBeVisible({ timeout: 10000 });

		// Click Approve
		await approveButton.click();

		// Verify success toast
		await expect(page.locator('text=Story approved and ready to schedule')).toBeVisible({
			timeout: 10000,
		});
	});

	test('AMJ-04: reject a submission on mobile', async ({
		page,
	}) => {
		await signInAsAdmin(page);
		await page.goto('/review');
		await page.waitForLoadState('domcontentloaded');

		// Wait for review page to load
		await expect(page.locator('text=Story Review Queue')).toBeVisible({
			timeout: 15000,
		});

		// Direct Reject button in ReviewActionBar (no modal)
		const rejectButton = page.getByRole('button', { name: 'Reject' });
		await expect(rejectButton).toBeVisible({ timeout: 10000 });

		// Click Reject
		await rejectButton.click();

		// Verify success toast
		await expect(page.locator('text=Story rejected')).toBeVisible({
			timeout: 10000,
		});
	});

	test('AMJ-05: verify review queue updated after approve/reject', async ({
		page,
	}) => {
		await signInAsAdmin(page);
		await page.goto('/review');
		await page.waitForLoadState('domcontentloaded');

		// Wait for review page to load
		await expect(page.locator('text=Story Review Queue')).toBeVisible({
			timeout: 15000,
		});

		// Wait for the list to settle after previous approve/reject
		await page.waitForTimeout(2000);

		// Should still show pending review text for remaining item(s)
		await expect(page.locator('text=pending review')).toBeVisible({
			timeout: 10000,
		});
	});

	test('AMJ-06: navigate to schedule page and verify mobile layout', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/schedule');
		await page.waitForLoadState('domcontentloaded');

		// Verify schedule page loads
		await expect(page).toHaveURL(/\/schedule/);

		// Verify date text is visible in the header (e.g. "February 6, 2026")
		await expect(
			page.locator('h2').filter({ hasText: /[A-Z][a-z]+ \d{1,2}, \d{4}/ })
		).toBeVisible({ timeout: 15000 });

		// Verify "Today" button is visible
		await expect(page.getByRole('button', { name: 'Today' })).toBeVisible({
			timeout: 10000,
		});

		// Verify previous/next nav buttons are visible (ChevronLeft/ChevronRight icon buttons)
		const iconButtons = page.locator('header button');
		await expect(iconButtons.first()).toBeVisible({ timeout: 10000 });

		// Verify time labels are visible (AM/PM text in the calendar grid)
		await expect(page.locator('text=AM').first()).toBeVisible({ timeout: 10000 });

		// Verify footer legend
		await expect(page.locator('footer').filter({ hasText: 'Scheduled' })).toBeVisible({
			timeout: 10000,
		});
		await expect(page.locator('footer').filter({ hasText: 'Published' })).toBeVisible({
			timeout: 10000,
		});
	});

	test('AMJ-07: date navigation on schedule page', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/schedule');
		await page.waitForLoadState('domcontentloaded');

		// Wait for the date heading to load
		const dateHeading = page.locator('h2').filter({ hasText: /[A-Z][a-z]+ \d{1,2}, \d{4}/ });
		await expect(dateHeading).toBeVisible({ timeout: 15000 });

		// Capture current date text
		const initialDateText = await dateHeading.textContent();

		// Click the next-day button (the ChevronRight icon button next to the date text)
		// In the header, the structure is: ChevronLeft button, h2 date text, ChevronRight button
		// So the ChevronRight next button is the one immediately after the date heading
		const navButtons = page.locator('header .flex.items-center.gap-1 button');
		const nextButton = navButtons.nth(1); // second button = ChevronRight (next)
		await nextButton.click();

		// Wait briefly for date to update
		await page.waitForTimeout(500);

		// Verify date text changed
		const newDateText = await dateHeading.textContent();
		expect(newDateText).not.toBe(initialDateText);

		// Click "Today" button to return
		await page.getByRole('button', { name: 'Today' }).click();
		await page.waitForTimeout(500);

		// Verify date returns to today
		const todayDateText = await dateHeading.textContent();
		expect(todayDateText).toBe(initialDateText);
	});

	test('AMJ-08: view scheduled content on calendar', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/schedule');
		await page.waitForLoadState('domcontentloaded');

		// Wait for the calendar to load
		await expect(
			page.locator('h2').filter({ hasText: /[A-Z][a-z]+ \d{1,2}, \d{4}/ })
		).toBeVisible({ timeout: 15000 });

		// Wait for SWR data fetch to complete
		await page.waitForResponse(
			(resp) => resp.url().includes('/api/content') && resp.status() === 200,
			{ timeout: 15000 },
		);

		// Look for at least one of the seeded scheduled item titles on the grid
		const scheduledTitle1 = page.locator(`text=${TEST_TITLE_PREFIX} Scheduled ${timestamp}-1`);
		const scheduledTitle2 = page.locator(`text=${TEST_TITLE_PREFIX} Scheduled ${timestamp}-2`);

		// At least one should be visible (they're scheduled for 10 AM and 2 PM today)
		await expect(scheduledTitle1.or(scheduledTitle2).first()).toBeVisible({ timeout: 15000 });
	});

	test('AMJ-09: open mobile sidebar and verify ready-to-schedule items', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/schedule');
		await page.waitForLoadState('domcontentloaded');

		// Wait for page to load
		await expect(
			page.locator('h2').filter({ hasText: /[A-Z][a-z]+ \d{1,2}, \d{4}/ })
		).toBeVisible({ timeout: 15000 });

		// Look for the floating "Ready" toggle button (visible only on mobile via lg:hidden)
		const readyButton = page.locator('button').filter({ hasText: 'Ready' });
		await expect(readyButton).toBeVisible({ timeout: 10000 });

		// Click to open mobile sidebar
		await readyButton.click();

		// Verify "Ready to Schedule" heading appears in the overlay sidebar
		// Use the mobile overlay container (the fixed inset-0 overlay) to scope selectors
		const mobileSidebar = page.locator('.fixed.inset-0.z-50 aside');
		await expect(mobileSidebar.locator('text=Ready to Schedule')).toBeVisible({ timeout: 10000 });

		// Verify at least one approved item is visible (check for the "assets" count text)
		await expect(mobileSidebar.locator('text=assets')).toBeVisible({ timeout: 10000 });

		// Verify filter tabs are visible
		await expect(mobileSidebar.locator('button').filter({ hasText: 'All' })).toBeVisible({ timeout: 10000 });
		await expect(mobileSidebar.locator('button').filter({ hasText: 'Recent' })).toBeVisible({ timeout: 10000 });
		await expect(mobileSidebar.locator('button').filter({ hasText: 'Approved' })).toBeVisible({ timeout: 10000 });

		// Close sidebar using the X close button
		const closeButton = mobileSidebar.locator('button[aria-label="Close sidebar"]');
		await expect(closeButton).toBeVisible({ timeout: 10000 });
		await closeButton.click();

		// Verify sidebar overlay closes
		await expect(page.locator('.fixed.inset-0.z-50')).not.toBeVisible({ timeout: 10000 });
	});

	test('AMJ-10: quick-schedule popover from mobile sidebar', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/schedule');
		await page.waitForLoadState('domcontentloaded');

		// Wait for page to load
		await expect(
			page.locator('h2').filter({ hasText: /[A-Z][a-z]+ \d{1,2}, \d{4}/ })
		).toBeVisible({ timeout: 15000 });

		// Wait for SWR data fetch to complete before interacting
		await page.waitForResponse(
			(resp) => resp.url().includes('/api/content') && resp.status() === 200,
			{ timeout: 15000 },
		);

		// Open mobile sidebar
		const readyButton = page.locator('button').filter({ hasText: 'Ready' });
		await expect(readyButton).toBeVisible({ timeout: 10000 });
		await readyButton.click();

		// Wait for sidebar to open (scope to the mobile overlay)
		const mobileSidebar = page.locator('.fixed.inset-0.z-50 aside');
		await expect(mobileSidebar.locator('text=Ready to Schedule')).toBeVisible({ timeout: 10000 });

		// Click on the first asset card (9:16 aspect ratio cards with cursor-grab class)
		const assetCards = mobileSidebar.locator('[class*="aspect-\\[9\\/16\\]"][class*="cursor-grab"]');
		await expect(assetCards.first()).toBeVisible({ timeout: 10000 });

		// Use dispatchEvent to ensure the click bypasses any drag listener interference
		await assetCards.first().dispatchEvent('click');

		// Verify QuickSchedulePopover opens with "Schedule for" label
		// The popover uses position:fixed with z-[60] to render above the sidebar overlay
		await expect(page.locator('label:has-text("Schedule for")')).toBeVisible({ timeout: 10000 });

		// Verify the popover has Schedule button visible
		const popover = page.locator('.fixed.bottom-4');
		await expect(popover.locator('button').filter({ hasText: 'Schedule' })).toBeVisible({ timeout: 10000 });

		// Close popover via Escape key (avoids Next.js dev overlay blocking bottom buttons)
		await page.keyboard.press('Escape');

		// Verify popover closes
		await expect(page.locator('label:has-text("Schedule for")')).not.toBeVisible({ timeout: 10000 });
	});

	// =========================================================================
	// Live Instagram Publishing (requires real IG account)
	// =========================================================================
	test.describe('Live Instagram Publishing', () => {
		const enableRealIG = process.env.ENABLE_REAL_IG_TESTS === 'true';
		const enableLivePublish = process.env.ENABLE_LIVE_IG_PUBLISH === 'true';

		test.skip(
			() => !enableRealIG || !enableLivePublish,
			'Requires ENABLE_REAL_IG_TESTS=true and ENABLE_LIVE_IG_PUBLISH=true'
		);

		test('AMJ-11: publish image to Instagram from mobile debug page', async ({
			page,
			request,
		}) => {
			// Sign in as real IG account
			await signInAsRealIG(page);

			// Navigate to debug page
			await page.goto('/debug');
			await page.waitForLoadState('domcontentloaded');

			// Verify Instagram account is connected
			await expect(page.locator('text=www_hehe_pl')).toBeVisible({
				timeout: 10000,
			});

			// Get an unpublished meme (24h de-duplication)
			const testImagePath = await getUnpublishedMeme(request);
			if (!testImagePath) {
				console.warn(
					'All memes published in last 24 hours, skipping live publish test'
				);
				test.skip();
				return;
			}

			// Upload meme via file input
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles(testImagePath);

			// Wait for upload to complete
			const urlInput = page.locator('input#debug-image-url');
			await expect(urlInput).not.toHaveValue('', { timeout: 30000 });

			// Click publish button
			const publishButton = page.getByRole('button', {
				name: /Publish to Instagram Now/i,
			});
			await expect(publishButton).toBeEnabled();
			await publishButton.click();

			// Wait for success or failure (60s timeout for Instagram API)
			const successAlert = page.locator('text=Published Successfully!');
			const failAlert = page.locator('text=Publish Failed');
			await expect(successAlert.or(failAlert)).toBeVisible({
				timeout: 60000,
			});

			if (await successAlert.isVisible()) {
				// Extract Media ID from the result
				const resultArea = page.locator(
					'.font-semibold:has-text("Published Successfully!")'
				);
				const resultText = await resultArea.locator('..').innerText();
				const mediaId = extractMediaId(resultText);

				if (mediaId) {
					console.log(`Published on mobile - Media ID: ${mediaId}`);
				}

				// Verify success in logs
				const logsSection = page.locator('text=Debug Logs').locator('..');
				await expect(logsSection.locator('text=SUCCESS')).toBeVisible();
			} else {
				const errorText = await failAlert.locator('..').innerText();
				console.error('Mobile publish failed:', errorText);
				// Don't fail the test - log for investigation
				expect
					.soft(await successAlert.isVisible())
					.toBeTruthy();
			}
		});
	});
});
