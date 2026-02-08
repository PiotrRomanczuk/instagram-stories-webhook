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

		// Verify month/year heading is visible in mobile view (e.g. "Feb 2026")
		const dateHeading = page.locator('h2').filter({ hasText: /[A-Z][a-z]+ \d{4}/ });
		await expect(dateHeading).toBeVisible({ timeout: 15000 });

		// Verify prev/next day navigation buttons are present around the heading
		const navContainer = dateHeading.locator('..');
		await expect(navContainer.locator('button').first()).toBeVisible({ timeout: 10000 });
		await expect(navContainer.locator('button').nth(1)).toBeVisible({ timeout: 10000 });

		// Verify status filter chips are visible (All, Scheduled, Published, Failed)
		await expect(page.locator('button').filter({ hasText: /^All/ })).toBeVisible({ timeout: 10000 });
		await expect(page.locator('button').filter({ hasText: /^Scheduled/ })).toBeVisible({ timeout: 10000 });
		await expect(page.locator('button').filter({ hasText: /^Published/ })).toBeVisible({ timeout: 10000 });
		await expect(page.locator('button').filter({ hasText: /^Failed/ })).toBeVisible({ timeout: 10000 });
	});

	test('AMJ-07: date navigation on schedule page', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/schedule');
		await page.waitForLoadState('domcontentloaded');

		// Wait for the month heading to load (mobile shows "MMM yyyy" format)
		const dateHeading = page.locator('h2').filter({ hasText: /[A-Z][a-z]+ \d{4}/ });
		await expect(dateHeading).toBeVisible({ timeout: 15000 });

		// "Today" button should NOT be visible when viewing today
		await expect(page.locator('button').filter({ hasText: /^Today$/ })).not.toBeVisible();

		// Click the next-day button (second button in the nav container around the heading)
		const navContainer = dateHeading.locator('..');
		const nextButton = navContainer.locator('button').nth(1);
		await nextButton.click();

		// Wait briefly for React re-render
		await page.waitForTimeout(500);

		// "Today" button should now be visible (navigated away from today)
		await expect(page.locator('button').filter({ hasText: /^Today$/ })).toBeVisible({ timeout: 5000 });

		// Click "Today" to return to today
		await page.locator('button').filter({ hasText: /^Today$/ }).click();
		await page.waitForTimeout(500);

		// "Today" button should disappear again (back on today)
		await expect(page.locator('button').filter({ hasText: /^Today$/ })).not.toBeVisible({ timeout: 5000 });
	});

	test('AMJ-08: view scheduled content on calendar', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/schedule');
		await page.waitForLoadState('domcontentloaded');

		// Wait for the mobile schedule view to load
		await expect(
			page.locator('h2').filter({ hasText: /[A-Z][a-z]+ \d{4}/ })
		).toBeVisible({ timeout: 15000 });

		// Mobile timeline cards display caption text (not title) as displayTitle
		// The TimelineCard uses: item.caption || item.title
		// Our seeded items have caption: "Scheduled test caption 1" / "Scheduled test caption 2"
		const caption1 = page.locator('text=Scheduled test caption 1');
		const caption2 = page.locator('text=Scheduled test caption 2');

		// At least one should be visible (they're scheduled for 10 AM and 2 PM today)
		await expect(caption1.or(caption2).first()).toBeVisible({ timeout: 15000 });
	});

	test('AMJ-09: open mobile Ready to Post and verify approved items', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/schedule');
		await page.waitForLoadState('domcontentloaded');

		// Wait for page to load
		await expect(
			page.locator('h2').filter({ hasText: /[A-Z][a-z]+ \d{4}/ })
		).toBeVisible({ timeout: 15000 });

		// Look for the floating "Ready" button (appears after content data loads)
		const readyButton = page.locator('button').filter({ hasText: 'Ready' });
		await expect(readyButton.first()).toBeVisible({ timeout: 15000 });

		// Click to open mobile Ready to Post full-screen view
		await readyButton.first().click();

		// Verify "Ready to Post" heading appears (MobileReadyToPost component)
		await expect(page.locator('h1').filter({ hasText: 'Ready to Post' })).toBeVisible({ timeout: 10000 });

		// Verify items count text (e.g., "5 items approved")
		await expect(page.locator('text=items approved')).toBeVisible({ timeout: 10000 });

		// Verify "Select" button is visible in header
		await expect(page.locator('button').filter({ hasText: /^Select$/ })).toBeVisible({ timeout: 10000 });

		// Close by clicking the back arrow button (first button in the overlay header)
		const readyHeader = page.locator('header').filter({
			has: page.locator('h1', { hasText: 'Ready to Post' }),
		});
		await readyHeader.locator('button').first().click();

		// Verify the Ready to Post overlay closes
		await expect(page.locator('h1').filter({ hasText: 'Ready to Post' })).not.toBeVisible({ timeout: 10000 });
	});

	test('AMJ-10: select mode and batch scheduling in mobile Ready to Post', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/schedule');
		await page.waitForLoadState('domcontentloaded');

		// Wait for page to load
		await expect(
			page.locator('h2').filter({ hasText: /[A-Z][a-z]+ \d{4}/ })
		).toBeVisible({ timeout: 15000 });

		// Open mobile Ready to Post view
		const readyButton = page.locator('button').filter({ hasText: 'Ready' });
		await expect(readyButton.first()).toBeVisible({ timeout: 15000 });
		await readyButton.first().click();

		// Wait for Ready to Post view
		await expect(page.locator('h1').filter({ hasText: 'Ready to Post' })).toBeVisible({ timeout: 10000 });

		// Tap "Select" to enter selection mode
		await page.locator('button').filter({ hasText: /^Select$/ }).click();

		// Verify "Cancel" button appears (select mode is active)
		await expect(page.locator('button').filter({ hasText: /^Cancel$/ })).toBeVisible({ timeout: 5000 });

		// Verify "Select All" button appears in select mode
		await expect(page.locator('button').filter({ hasText: /^Select All$/ })).toBeVisible({ timeout: 5000 });

		// Exit select mode by clicking Cancel
		await page.locator('button').filter({ hasText: /^Cancel$/ }).click();

		// Verify Select button is back (normal mode)
		await expect(page.locator('button').filter({ hasText: /^Select$/ })).toBeVisible({ timeout: 5000 });
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
