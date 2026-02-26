import { test, expect } from '@playwright/test';
import { signInAsUser } from './helpers/auth';
import { getTestVideo } from './helpers/test-assets';

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

		// Wait for the VideoPreview component to appear in DOM (may be below the fold)
		const videoPreviewLabel = page.locator('text=/9:16 Video Preview/i');
		await expect(videoPreviewLabel).toBeAttached({ timeout: 30000 });

		// On small mobile viewports (375x667), the video preview may render
		// below the fold. Scroll it into view before checking visibility.
		await videoPreviewLabel.scrollIntoViewIfNeeded();
		await expect(videoPreviewLabel).toBeVisible({ timeout: 10000 });

		// Play button should be visible and clickable
		const playButton = page.locator('button[aria-label*="Play video"]');
		await playButton.scrollIntoViewIfNeeded();
		await expect(playButton).toBeVisible();

		// Video frame should fit within viewport
		const videoContainer = videoPreviewLabel.locator('..');
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
