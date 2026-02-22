import { test, expect } from '@playwright/test';
import { signInAsUser } from './helpers/auth';
import { getTestVideo } from './helpers/test-assets';

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
