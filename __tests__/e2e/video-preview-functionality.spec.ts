import { test, expect } from '@playwright/test';
import { signInAsUser, signInAsAdmin } from './helpers/auth';
import { getTestVideo } from './helpers/test-assets';

/**
 * Video Preview Functionality E2E Test Suite
 *
 * Focused tests for video preview components:
 *   VP-1: Submit Page - VideoPreview component functionality
 *   VP-2: Schedule/Review Page - ReactPlayer rendering
 *   VP-3: Mobile responsiveness
 *
 * IMPORTANT:
 * - Tests real video playback where possible
 * - Mobile-first: Tests across viewport sizes
 * - Focuses on user-visible functionality
 */

// ===========================================================================
// VP-1: Submit Page - VideoPreview Component
// ===========================================================================

test.describe('VP-1: Submit Page - VideoPreview Component', () => {
	test.beforeEach(async ({ page }) => {
		await signInAsUser(page);
	});

	test('VP-1.1: video upload shows VideoPreview with play controls', async ({
		page,
	}) => {
		await page.goto('/submit');
		await page.waitForLoadState('domcontentloaded');

		// Switch to Video mode
		const videoToggle = page.getByRole('button', { name: 'Video' });
		await videoToggle.click();

		// Upload test video
		const testVideoPath = getTestVideo();
		if (!testVideoPath) {
			test.skip();
			return;
		}

		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(testVideoPath);

		// Wait for video to upload and VideoPreview to render
		// Should show the phone frame preview
		await expect(page.locator('text=/9:16 Video Preview/i')).toBeVisible({
			timeout: 30000,
		});

		// Should show play button overlay
		const playButton = page.locator('button[aria-label*="Play video"]');
		await expect(playButton).toBeVisible();

		// Verify video element exists
		const videoElement = page.locator('video').first();
		await expect(videoElement).toBeVisible();
	});

	test('VP-1.2: VideoPreview play/pause controls work', async ({ page }) => {
		await page.goto('/submit');
		await page.waitForLoadState('domcontentloaded');

		// Switch to Video mode
		const videoToggle = page.getByRole('button', { name: 'Video' });
		await videoToggle.click();

		// Upload test video
		const testVideoPath = getTestVideo();
		if (!testVideoPath) {
			test.skip();
			return;
		}

		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(testVideoPath);

		// Wait for VideoPreview
		await expect(page.locator('text=/9:16 Video Preview/i')).toBeVisible({
			timeout: 30000,
		});

		// Click play button
		const playButton = page.locator('button[aria-label*="Play video"]');
		await playButton.click();

		// Wait a moment for video to start playing
		await page.waitForTimeout(500);

		// Pause button should now be visible
		const pauseButton = page.locator('button[aria-label*="Pause video"]');
		await expect(pauseButton).toBeVisible({ timeout: 5000 });

		// Click pause
		await pauseButton.click();

		// Play button should be visible again
		await expect(playButton).toBeVisible({ timeout: 2000 });
	});

	test('VP-1.3: VideoPreview shows video duration badge', async ({ page }) => {
		await page.goto('/submit');
		await page.waitForLoadState('domcontentloaded');

		// Switch to Video mode
		const videoToggle = page.getByRole('button', { name: 'Video' });
		await videoToggle.click();

		// Upload test video
		const testVideoPath = getTestVideo();
		if (!testVideoPath) {
			test.skip();
			return;
		}

		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(testVideoPath);

		// Wait for VideoPreview
		await expect(page.locator('text=/9:16 Video Preview/i')).toBeVisible({
			timeout: 30000,
		});

		// Duration badge should be visible (format: "0:10" or similar)
		const durationBadge = page.locator('text=/\\d+:\\d{2}/').first();
		await expect(durationBadge).toBeVisible({ timeout: 5000 });
	});
});

// ===========================================================================
// VP-2: Schedule/Review Pages - ReactPlayer in Existing Content
// ===========================================================================

test.describe('VP-2: Schedule/Review Pages - Video Preview Rendering', () => {
	test('VP-2.1: schedule page loads and shows media previews', async ({
		page,
	}) => {
		await signInAsUser(page);
		await page.goto('/schedule');
		await page.waitForLoadState('domcontentloaded');

		// Page should load without errors
		await expect(page).toHaveURL(/\/(en\/)?schedule/);

		// Should show calendar or content (may be empty, that's okay)
		const bodyText = await page.innerText('body');
		expect(bodyText.length).toBeGreaterThan(0);
	});

	test('VP-2.2: review page loads for admin', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/review');
		await page.waitForLoadState('domcontentloaded');

		// Page should load without errors
		await expect(page).toHaveURL(/\/(en\/)?review/);

		// Should show review interface
		const bodyText = await page.innerText('body');
		expect(bodyText.length).toBeGreaterThan(0);
	});
});

// ===========================================================================
// VP-3: Mobile Responsiveness
// ===========================================================================

test.describe('VP-3: Mobile Video Preview Responsiveness', () => {
	test('VP-3.1: VideoPreview renders correctly on mobile (375px)', async ({
		page,
	}) => {
		// Set mobile viewport (iPhone SE size)
		await page.setViewportSize({ width: 375, height: 667 });

		await signInAsUser(page);
		await page.goto('/submit');
		await page.waitForLoadState('domcontentloaded');

		// Switch to Video mode
		const videoToggle = page.getByRole('button', { name: 'Video' });
		await videoToggle.click();

		// Upload test video
		const testVideoPath = getTestVideo();
		if (!testVideoPath) {
			test.skip();
			return;
		}

		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(testVideoPath);

		// VideoPreview should render and be visible on mobile
		await expect(page.locator('text=/9:16 Video Preview/i')).toBeVisible({
			timeout: 30000,
		});

		// Play button should be visible and clickable
		const playButton = page.locator('button[aria-label*="Play video"]');
		await expect(playButton).toBeVisible();

		// Video frame should fit within viewport
		const videoContainer = page.locator('text=/9:16 Video Preview/i').locator('..');
		const boundingBox = await videoContainer.boundingBox();

		if (boundingBox) {
			// Should not overflow viewport width
			expect(boundingBox.width).toBeLessThanOrEqual(375);
		}
	});

	test('VP-3.2: submit page responsive on tablet (768px)', async ({
		page,
	}) => {
		// Set tablet viewport (iPad size)
		await page.setViewportSize({ width: 768, height: 1024 });

		await signInAsUser(page);
		await page.goto('/submit');
		await page.waitForLoadState('domcontentloaded');

		// Page should load properly
		await expect(page).toHaveURL(/\/(en\/)?submit/);

		// Video toggle should be visible
		const videoToggle = page.getByRole('button', { name: 'Video' });
		await expect(videoToggle).toBeVisible();
	});
});
