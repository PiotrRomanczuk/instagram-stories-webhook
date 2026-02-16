/**
 * User Mobile Full Journey - Single Video Recording
 *
 * One continuous test that walks through the entire user mobile experience
 * on iPhone 14 Pro (390x844) viewport, producing a single video file.
 *
 * Journey: Sign In → Dashboard → Navigate tabs → Submit content →
 *          Submissions page → Tab filters → Edit submission →
 *          Navigate via bottom nav → Cleanup
 */

import { test, expect } from '@playwright/test';
import { signInAsUser } from './helpers/auth';
import { cleanupTestContentByPattern } from './helpers/seed';
import { getRandomMeme } from './helpers/test-assets';

const TEST_IMAGE_PATH = getRandomMeme();
const TEST_CAPTION_PREFIX = 'E2E Full Journey';

test.use({
	viewport: { width: 390, height: 844 },
	video: { mode: 'on', size: { width: 390, height: 844 } },
});

test('Full User Mobile Journey', async ({ page }) => {
	// ─── CHAPTER 1: Sign In ───────────────────────────────────────────
	await page.goto('/auth/signin', { waitUntil: 'load', timeout: 15000 });

	// Verify sign-in page renders
	const devOnlyText = page.locator('text=Development Only');
	await devOnlyText.waitFor({ state: 'visible', timeout: 20000 });
	await expect(page.locator('h1')).toContainText('Welcome Back');

	// Bottom nav should NOT be visible on sign-in page
	const bottomNav = page.locator('nav.fixed.bottom-0');
	await expect(bottomNav).toBeHidden({ timeout: 5000 });

	// Verify sign-in buttons
	await expect(page.getByRole('button', { name: 'Test User' })).toBeVisible();
	await expect(
		page.getByRole('button', { name: /Continue with Google/i }),
	).toBeVisible();

	// Sign in
	await signInAsUser(page);

	// ─── CHAPTER 2: Dashboard ─────────────────────────────────────────
	await page.goto('/', { waitUntil: 'load', timeout: 15000 });

	// Welcome greeting
	const heading = page.locator('h1');
	await expect(heading).toBeVisible({ timeout: 10000 });
	await expect(heading).toContainText('Hello,');
	await page.waitForTimeout(500); // Pause for video clarity

	// Stats grid loads
	const statsGrid = page.locator('[data-tour="user-stats-grid"]');
	await expect(statsGrid).toBeVisible({ timeout: 30000 });

	// Verify all 4 stat cards
	await expect(
		statsGrid.getByText('Pending Review', { exact: true }),
	).toBeVisible({ timeout: 5000 });
	await expect(
		statsGrid.getByText('Approved', { exact: true }),
	).toBeVisible({ timeout: 5000 });
	await expect(
		statsGrid.getByText('Scheduled', { exact: true }),
	).toBeVisible({ timeout: 5000 });
	await expect(
		statsGrid.getByText('Published', { exact: true }),
	).toBeVisible({ timeout: 5000 });
	await page.waitForTimeout(500);

	// Submit New CTA
	const submitLink = page.getByRole('link', { name: /Submit New/i });
	await expect(submitLink).toBeVisible({ timeout: 5000 });

	// Recent Submissions section
	const recentCard = page.locator('[data-tour="user-recent-submissions"]');
	await expect(recentCard).toBeVisible({ timeout: 15000 });
	await expect(recentCard.locator('text=Recent Submissions')).toBeVisible();
	await page.waitForTimeout(800);

	// ─── CHAPTER 3: Bottom Navigation ─────────────────────────────────
	await expect(bottomNav).toBeVisible({ timeout: 10000 });

	// Verify 5 tabs
	const expectedTabs = ['Home', 'Schedule', 'New', 'Review', 'Profile'];
	for (const label of expectedTabs) {
		await expect(bottomNav.getByText(label, { exact: true })).toBeVisible();
	}
	await page.waitForTimeout(500);

	// Verify FAB styling
	const fabLink = bottomNav.locator('a.-mt-5');
	await expect(fabLink).toBeVisible();
	const fabCircle = fabLink.locator('.rounded-full');
	await expect(fabCircle).toBeVisible();
	await page.waitForTimeout(300);

	// Home tab is highlighted (blue)
	const homeLink = bottomNav.locator('a').filter({ hasText: 'Home' });
	const homeColor = await homeLink.evaluate(
		(el) => getComputedStyle(el).color,
	);
	expect(homeColor).toContain('43'); // rgb(43, 108, 238)
	await page.waitForTimeout(300);

	// ─── CHAPTER 4: Navigate to Submit via FAB ────────────────────────
	await bottomNav.getByText('New', { exact: true }).click();
	await page.waitForURL((url) => url.pathname.includes('/submit'), {
		timeout: 10000,
	});
	expect(page.url()).toContain('/submit');
	await page.waitForTimeout(500);

	// ─── CHAPTER 5: Submit Page Layout ────────────────────────────────
	await expect(
		page.getByRole('heading', { name: /Submit for Review/i }),
	).toBeVisible({ timeout: 10000 });

	// Drop zone
	await expect(
		page.locator('text=Drop image here or click to upload'),
	).toBeVisible({ timeout: 5000 });

	// Caption textarea
	const captionTextarea = page.locator(
		'textarea[placeholder="Add a caption for your story..."]',
	);
	await expect(captionTextarea).toBeVisible();
	await expect(page.locator('text=0/2200')).toBeVisible();

	// Mobile submit button (disabled before upload)
	const mobileSubmitButton = page
		.locator('div.lg\\:hidden')
		.getByRole('button', { name: /Submit for Review/i });
	await expect(mobileSubmitButton).toBeVisible();
	await expect(mobileSubmitButton).toBeDisabled();
	await page.waitForTimeout(500);

	// ─── CHAPTER 6: Upload Image ──────────────────────────────────────
	const fileInput = page.locator('input[type="file"]');
	await fileInput.setInputFiles(TEST_IMAGE_PATH);

	// Wait for preview
	await expect(page.locator('img[alt="Uploaded image"]')).toBeVisible({
		timeout: 30000,
	});
	await page.waitForTimeout(500);

	// Mobile compact preview
	const mobilePreview = page.locator('div.lg\\:hidden').filter({
		hasText: 'Preview',
	});
	await expect(mobilePreview).toBeVisible({ timeout: 10000 });

	// Submit button now enabled
	await expect(mobileSubmitButton).toBeEnabled({ timeout: 5000 });
	await page.waitForTimeout(500);

	// ─── CHAPTER 7: Fill Caption & Submit ─────────────────────────────
	const testCaption = `${TEST_CAPTION_PREFIX} ${Date.now()}`;
	await captionTextarea.fill(testCaption);
	await page.waitForTimeout(300);

	// Character counter updates
	await expect(
		page.locator(`text=${testCaption.length}/2200`),
	).toBeVisible({ timeout: 5000 });
	await page.waitForTimeout(500);

	// Intercept API
	const apiResponsePromise = page.waitForResponse(
		(resp) =>
			resp.url().includes('/api/content') &&
			resp.request().method() === 'POST',
		{ timeout: 30000 },
	);

	// Submit
	await mobileSubmitButton.click();

	// Wait for API response
	await apiResponsePromise;

	// Success toast
	await expect(
		page.locator('text=Submission sent for review!'),
	).toBeVisible({ timeout: 15000 });
	await page.waitForTimeout(800);

	// Redirect to submissions
	await page.waitForURL(/\/(en\/)?submissions/, { timeout: 15000 });

	// ─── CHAPTER 8: Submissions Page ──────────────────────────────────
	await expect(page.locator('h1')).toContainText('My Submissions', {
		timeout: 10000,
	});
	await page.waitForTimeout(500);

	// Stats grid in 2-column layout
	const subsStatsGrid = page.locator('.grid.grid-cols-2').first();
	await expect(subsStatsGrid).toBeVisible({ timeout: 10000 });
	await page.waitForTimeout(300);

	// Tab filters
	const allTab = page.locator('button:has-text("All Submissions")');
	await expect(allTab).toBeVisible({ timeout: 10000 });
	await expect(allTab).toHaveClass(/border-\[#2b6cee\]/, { timeout: 5000 });
	await page.waitForTimeout(300);

	// Switch to Pending Review tab
	const pendingTab = page.locator('button:has-text("Pending Review")');
	await pendingTab.click();
	await expect(pendingTab).toHaveClass(/border-\[#2b6cee\]/, {
		timeout: 5000,
	});
	await expect(allTab).toHaveClass(/border-transparent/, { timeout: 5000 });
	await page.waitForTimeout(500);

	// Switch to Scheduled tab (may need scroll)
	const scheduledTab = page.locator('button:has-text("Scheduled")');
	await scheduledTab.scrollIntoViewIfNeeded();
	await scheduledTab.click();
	await expect(scheduledTab).toHaveClass(/border-\[#2b6cee\]/, {
		timeout: 5000,
	});
	await page.waitForTimeout(500);

	// Back to All Submissions
	await allTab.scrollIntoViewIfNeeded();
	await allTab.click();
	await expect(allTab).toHaveClass(/border-\[#2b6cee\]/, { timeout: 5000 });
	await page.waitForTimeout(500);

	// Submission grid
	const submissionGrid = page.locator(
		'.grid.grid-cols-2.md\\:grid-cols-3',
	);
	const hasGrid = await submissionGrid
		.isVisible({ timeout: 5000 })
		.catch(() => false);
	if (hasGrid) {
		const cards = submissionGrid.locator('.aspect-\\[9\\/16\\]');
		const cardCount = await cards.count();
		expect(cardCount).toBeGreaterThanOrEqual(1);
	}
	await page.waitForTimeout(500);

	// ─── CHAPTER 9: Edit Submission ───────────────────────────────────

	// Switch to Pending Review tab to find our just-submitted content
	await pendingTab.scrollIntoViewIfNeeded();
	await pendingTab.click();
	await expect(pendingTab).toHaveClass(/border-\[#2b6cee\]/, {
		timeout: 5000,
	});
	await page.waitForTimeout(500);

	// Wait for grid to show pending submissions
	const pendingGrid = page.locator('.grid.grid-cols-2.md\\:grid-cols-3');
	await expect(pendingGrid).toBeVisible({ timeout: 10000 });

	// Click the Edit button on the first pending submission card
	// On mobile, the edit button (pencil icon) is always visible (opacity-100)
	const editButton = pendingGrid
		.locator('.aspect-\\[9\\/16\\]')
		.first()
		.getByRole('button', { name: /edit/i });
	await expect(editButton).toBeVisible({ timeout: 5000 });
	await editButton.click();
	await page.waitForTimeout(300);

	// Edit dialog opens
	const editDialog = page.locator('[role="dialog"]');
	await expect(editDialog).toBeVisible({ timeout: 5000 });
	await expect(editDialog.locator('text=Edit Submission')).toBeVisible();
	await expect(
		editDialog.locator("text=Update your submission before it's reviewed."),
	).toBeVisible();
	await page.waitForTimeout(500);

	// Image preview is shown in the dialog
	const dialogImage = editDialog.locator('img[alt="Submission"]');
	await expect(dialogImage).toBeVisible({ timeout: 5000 });

	// Caption textarea is pre-filled
	const editCaptionField = editDialog.locator('#edit-caption');
	await expect(editCaptionField).toBeVisible();
	const currentCaption = await editCaptionField.inputValue();
	expect(currentCaption.length).toBeGreaterThan(0);
	await page.waitForTimeout(300);

	// Edit the caption
	const updatedCaption = `${TEST_CAPTION_PREFIX} EDITED ${Date.now()}`;
	await editCaptionField.clear();
	await editCaptionField.fill(updatedCaption);
	await page.waitForTimeout(300);

	// Character counter updates
	await expect(
		editDialog.locator(`text=${updatedCaption.length}/2200`),
	).toBeVisible({ timeout: 5000 });
	await page.waitForTimeout(500);

	// Intercept the PUT API call
	const editApiPromise = page.waitForResponse(
		(resp) =>
			resp.url().includes('/api/content/') &&
			resp.request().method() === 'PATCH',
		{ timeout: 15000 },
	);

	// Click Save Changes
	const saveButton = editDialog.getByRole('button', {
		name: /Save Changes/i,
	});
	await expect(saveButton).toBeVisible();
	await saveButton.click();

	// Wait for API response
	const editApiResponse = await editApiPromise;
	expect(editApiResponse.status()).toBe(200);

	// Dialog closes
	await expect(editDialog).not.toBeVisible({ timeout: 5000 });

	// Success toast
	await expect(
		page.locator('text=Submission updated'),
	).toBeVisible({ timeout: 10000 });
	await page.waitForTimeout(800);

	// ─── CHAPTER 10: Navigate via Bottom Nav ──────────────────────────

	// Dismiss dev tools overlay if present
	await page.keyboard.press('Escape');
	await page.waitForTimeout(300);

	// Navigate Home via bottom nav
	const homeNavLink = bottomNav.locator('a').filter({ hasText: 'Home' });
	await homeNavLink.evaluate((el) => (el as HTMLAnchorElement).click());
	await page.waitForURL(
		(url) => {
			const p = url.pathname;
			return p === '/' || /^\/[a-z]{2}\/?$/.test(p);
		},
		{ timeout: 15000 },
	);
	expect(page.url()).not.toContain('/submit');
	await page.waitForTimeout(500);

	// Navigate to Profile via bottom nav
	await bottomNav.getByText('Profile', { exact: true }).click();
	await page.waitForURL((url) => url.pathname.includes('/submissions'), {
		timeout: 10000,
	});
	expect(page.url()).toContain('/submissions');
	await page.waitForTimeout(500);

	// Navigate back Home
	await page.keyboard.press('Escape');
	await page.waitForTimeout(300);
	await homeNavLink.evaluate((el) => (el as HTMLAnchorElement).click());
	await page.waitForURL(
		(url) => {
			const p = url.pathname;
			return p === '/' || /^\/[a-z]{2}\/?$/.test(p);
		},
		{ timeout: 15000 },
	);
	await page.waitForTimeout(800);

	// ─── CHAPTER 11: Cleanup ──────────────────────────────────────────
	const deleted = await cleanupTestContentByPattern(
		page,
		TEST_CAPTION_PREFIX,
	);
	if (deleted > 0) {
		console.log(`Journey cleanup: removed ${deleted} test content items`);
	}
});
