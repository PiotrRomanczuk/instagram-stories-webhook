import { test, expect } from '@playwright/test';
import { signInAsAdmin } from './helpers/auth';
import {
	createPendingContent,
	createApprovedContent,
	createScheduledContent,
	createPublishedContent,
	cleanupTestContentByPattern,
} from './helpers/seed';

/**
 * Admin Mobile Full Journey — Single Session Video
 *
 * One continuous test that walks through the entire admin mobile flow
 * in a single browser session (one login, no reloads between steps).
 * Produces a single uninterrupted video recording.
 *
 * Viewport: iPhone 14 Pro (390x844)
 */

const TEST_TITLE_PREFIX = 'Admin Mobile Video';
const timestamp = Date.now();

test.use({
	viewport: { width: 390, height: 844 },
	video: { mode: 'on', size: { width: 390, height: 844 } },
});

test('Admin Mobile Full Journey — single session recording', async ({ page }) => {
	// Increase timeout for the full journey (all steps combined)
	test.setTimeout(180_000);

	// ── Seed data ────────────────────────────────────────────────────
	await signInAsAdmin(page);

	// Create 3 pending submissions
	for (let i = 0; i < 3; i++) {
		await createPendingContent(page, {
			title: `${TEST_TITLE_PREFIX} ${timestamp}-${i + 1}`,
			caption: `Video journey caption ${i + 1}`,
			mediaIndex: 60 + i,
		});
	}

	// Create 2 approved content items
	for (let i = 0; i < 2; i++) {
		await createApprovedContent(page, {
			title: `${TEST_TITLE_PREFIX} Approved ${timestamp}-${i + 1}`,
			caption: `Approved journey caption ${i + 1}`,
			mediaIndex: 70 + i,
		});
	}

	// Create 2 scheduled content items for today (10 AM and 2 PM)
	const now = new Date();
	for (let i = 0; i < 2; i++) {
		const scheduledTime = new Date(now);
		scheduledTime.setHours(10 + i * 4, 0, 0, 0);
		await createScheduledContent(page, scheduledTime, {
			title: `${TEST_TITLE_PREFIX} Scheduled ${timestamp}-${i + 1}`,
			caption: `Scheduled journey caption ${i + 1}`,
			mediaIndex: 80 + i,
		});
	}

	// Create 2 published content items for verification
	for (let i = 0; i < 2; i++) {
		await createPublishedContent(page, {
			title: `${TEST_TITLE_PREFIX} Published ${timestamp}-${i + 1}`,
			caption: `Published journey caption ${i + 1}`,
			mediaIndex: 90 + i,
		});
	}

	// ══════════════════════════════════════════════════════════════════
	// AMJ-01: Verify admin dashboard
	// ══════════════════════════════════════════════════════════════════
	await page.goto('/');
	await page.waitForLoadState('domcontentloaded');

	await expect(page.locator('text=Pending Review')).toBeVisible({ timeout: 15000 });
	await expect(page.locator('text=Scheduled Today')).toBeVisible();
	await expect(page.locator('text=Published Today')).toBeVisible();
	await expect(page.locator('text=Quick Actions')).toBeVisible();
	await expect(page.locator('text=Review Queue')).toBeVisible();

	// Pause briefly so the dashboard is visible in the recording
	await page.waitForTimeout(1500);

	// ══════════════════════════════════════════════════════════════════
	// AMJ-02: Navigate to review page and verify pending items
	// ══════════════════════════════════════════════════════════════════
	await page.goto('/review');
	await page.waitForLoadState('domcontentloaded');

	await expect(page.locator('text=Story Review Queue')).toBeVisible({ timeout: 15000 });
	await expect(page.locator('text=pending review')).toBeVisible({ timeout: 10000 });
	await expect(page.locator('text=9:16 Preview')).toBeVisible({ timeout: 10000 });

	await page.waitForTimeout(1500);

	// ══════════════════════════════════════════════════════════════════
	// AMJ-03: Approve a submission
	// ══════════════════════════════════════════════════════════════════
	const approveButton = page.getByRole('button', { name: 'Approve' });
	await expect(approveButton).toBeVisible({ timeout: 10000 });
	await approveButton.click();

	await expect(page.locator('text=Story approved and ready to schedule')).toBeVisible({
		timeout: 10000,
	});

	await page.waitForTimeout(1500);

	// ══════════════════════════════════════════════════════════════════
	// AMJ-04: Reject a submission
	// ══════════════════════════════════════════════════════════════════
	// Wait for the next item to load after the approve
	await expect(page.locator('text=Story Review Queue')).toBeVisible({ timeout: 10000 });
	await page.waitForTimeout(1000);

	const rejectButton = page.getByRole('button', { name: 'Reject' });
	await expect(rejectButton).toBeVisible({ timeout: 10000 });
	await rejectButton.click();

	await expect(page.locator('text=Story rejected')).toBeVisible({ timeout: 10000 });

	await page.waitForTimeout(1500);

	// ══════════════════════════════════════════════════════════════════
	// AMJ-05: Verify review queue updated
	// ══════════════════════════════════════════════════════════════════
	await expect(page.locator('text=pending review')).toBeVisible({ timeout: 10000 });

	await page.waitForTimeout(1500);

	// ══════════════════════════════════════════════════════════════════
	// AMJ-06: Navigate to schedule page and verify mobile layout
	// ══════════════════════════════════════════════════════════════════
	await page.goto('/schedule');
	await page.waitForLoadState('domcontentloaded');

	await expect(page).toHaveURL(/\/schedule/);

	const dateHeading = page.locator('h2').filter({ hasText: /[A-Z][a-z]+ \d{4}/ });
	await expect(dateHeading).toBeVisible({ timeout: 15000 });

	// Verify nav buttons
	const navContainer = dateHeading.locator('..');
	await expect(navContainer.locator('button').first()).toBeVisible({ timeout: 10000 });
	await expect(navContainer.locator('button').nth(1)).toBeVisible({ timeout: 10000 });

	// Verify status filter chips
	await expect(page.locator('button').filter({ hasText: /^All/ })).toBeVisible({ timeout: 10000 });
	await expect(page.locator('button').filter({ hasText: /^Scheduled/ })).toBeVisible({ timeout: 10000 });
	await expect(page.locator('button').filter({ hasText: /^Published/ })).toBeVisible({ timeout: 10000 });
	await expect(page.locator('button').filter({ hasText: /^Failed/ })).toBeVisible({ timeout: 10000 });

	await page.waitForTimeout(1500);

	// ══════════════════════════════════════════════════════════════════
	// AMJ-07: Date navigation
	// ══════════════════════════════════════════════════════════════════
	// "Today" button should NOT be visible when on today
	await expect(page.locator('button').filter({ hasText: /^Today$/ })).not.toBeVisible();

	// Click next day
	const nextButton = navContainer.locator('button').nth(1);
	await nextButton.click();
	await page.waitForTimeout(500);

	// "Today" button appears
	await expect(page.locator('button').filter({ hasText: /^Today$/ })).toBeVisible({ timeout: 5000 });

	await page.waitForTimeout(1000);

	// Click "Today" to return
	await page.locator('button').filter({ hasText: /^Today$/ }).click();
	await page.waitForTimeout(500);

	// "Today" button disappears
	await expect(page.locator('button').filter({ hasText: /^Today$/ })).not.toBeVisible({ timeout: 5000 });

	await page.waitForTimeout(1000);

	// ══════════════════════════════════════════════════════════════════
	// AMJ-08: View scheduled content on timeline
	// ══════════════════════════════════════════════════════════════════
	const caption1 = page.locator('text=Scheduled journey caption 1');
	const caption2 = page.locator('text=Scheduled journey caption 2');

	await expect(caption1.or(caption2).first()).toBeVisible({ timeout: 15000 });

	await page.waitForTimeout(1500);

	// ══════════════════════════════════════════════════════════════════
	// AMJ-09: Open Ready to Post and verify approved items
	// ══════════════════════════════════════════════════════════════════
	const readyButton = page.locator('button').filter({ hasText: 'Ready' });
	await expect(readyButton.first()).toBeVisible({ timeout: 15000 });
	await readyButton.first().click();

	// Verify Ready to Post overlay
	await expect(page.locator('h1').filter({ hasText: 'Ready to Post' })).toBeVisible({ timeout: 10000 });
	await expect(page.locator('text=items approved')).toBeVisible({ timeout: 10000 });
	await expect(page.locator('button').filter({ hasText: /^Select$/ })).toBeVisible({ timeout: 10000 });

	await page.waitForTimeout(1500);

	// ══════════════════════════════════════════════════════════════════
	// AMJ-10: Select mode in Ready to Post
	// ══════════════════════════════════════════════════════════════════
	await page.locator('button').filter({ hasText: /^Select$/ }).click();

	// Select mode active
	await expect(page.locator('button').filter({ hasText: /^Cancel$/ })).toBeVisible({ timeout: 5000 });
	await expect(page.locator('button').filter({ hasText: /^Select All$/ })).toBeVisible({ timeout: 5000 });

	await page.waitForTimeout(1500);

	// Exit select mode
	await page.locator('button').filter({ hasText: /^Cancel$/ }).click();
	await expect(page.locator('button').filter({ hasText: /^Select$/ })).toBeVisible({ timeout: 5000 });

	await page.waitForTimeout(1000);

	// Close Ready to Post
	const readyHeader = page.locator('header').filter({
		has: page.locator('h1', { hasText: 'Ready to Post' }),
	});
	await readyHeader.locator('button').first().click();

	await expect(page.locator('h1').filter({ hasText: 'Ready to Post' })).not.toBeVisible({ timeout: 10000 });

	await page.waitForTimeout(1000);

	// ══════════════════════════════════════════════════════════════════
	// AMJ-11: Verify published posts on Posted Stories page
	// ══════════════════════════════════════════════════════════════════
	await page.goto('/posted-stories');
	await page.waitForLoadState('domcontentloaded');

	// Verify page loaded with correct header
	await expect(page.locator('text=Posted Stories')).toBeVisible({ timeout: 15000 });

	// Verify the seeded published items appear in the table
	const publishedCaption1 = page.locator('text=Published journey caption 1');
	const publishedCaption2 = page.locator('text=Published journey caption 2');

	await expect(publishedCaption1).toBeVisible({ timeout: 10000 });
	await expect(publishedCaption2).toBeVisible({ timeout: 10000 });

	// Verify the table shows IMAGE type for seeded items
	const imageLabels = page.locator('text=IMAGE');
	await expect(imageLabels.first()).toBeVisible({ timeout: 5000 });

	// Verify total count badge is present
	await expect(page.locator('text=total')).toBeVisible({ timeout: 5000 });

	await page.waitForTimeout(1500);

	// ── Cleanup ──────────────────────────────────────────────────────
	await cleanupTestContentByPattern(page, TEST_TITLE_PREFIX);
});
