/**
 * E2E Tests: Video Upload Flow
 * Tests video upload, validation, and thumbnail selection
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { signInAsUser } from './helpers/auth';

// Helper to create a test video file
function createTestVideo(): string {
	const testVideoPath = path.join(__dirname, '../fixtures/test-video.mp4');

	// Check if test video exists
	if (!fs.existsSync(testVideoPath)) {
		// Skip if no test video (will be created by setup)
		return '';
	}

	return testVideoPath;
}

test.describe('Video Upload Flow', () => {
	test.beforeEach(async ({ page }) => {
		// Login as test user using the proper auth helper
		await signInAsUser(page);
	});

	test('should show video upload option in submit form', async ({ page }) => {
		// Navigate to content submission
		await page.goto('/en');

		// Open submit form (look for button/link that opens it)
		const submitButton = page.locator('button:has-text("Submit"), a:has-text("Submit"), button:has-text("Create")').first();

		if (await submitButton.isVisible()) {
			await submitButton.click();
		} else {
			// Try direct navigation
			await page.goto('/en/content');
		}

		// Check for media type selector
		await expect(page.locator('text=Media Type, text=Image, text=Video').first()).toBeVisible({ timeout: 10000 });

		// Click Video button
		const videoButton = page.locator('button:has-text("Video"), button:has-text("🎥")').first();
		await expect(videoButton).toBeVisible();
		await videoButton.click();

		// Verify video uploader appears
		await expect(page.locator('text=Drop video here, text=Upload Video, text=MP4')).toBeVisible();
	});

	test('should validate video file type', async ({ page }) => {
		// Navigate to submit form
		await page.goto('/en');

		const submitButton = page.locator('button:has-text("Submit"), a:has-text("Submit"), button:has-text("Create")').first();
		if (await submitButton.isVisible()) {
			await submitButton.click();
		}

		// Select Video mode
		const videoButton = page.locator('button:has-text("Video"), button:has-text("🎥")').first();
		if (await videoButton.isVisible()) {
			await videoButton.click();
		}

		// Try to upload non-video file (create temp text file)
		const tempFilePath = path.join(__dirname, '../fixtures/test.txt');
		fs.writeFileSync(tempFilePath, 'This is not a video');

		const fileInput = page.locator('input[type="file"]').first();
		await fileInput.setInputFiles(tempFilePath);

		// Should show error
		await expect(page.locator('text=Please upload a video, text=video file, text=invalid').first()).toBeVisible({ timeout: 5000 });

		// Cleanup
		fs.unlinkSync(tempFilePath);
	});

	test('should upload video and show thumbnail selector', async ({ page }) => {
		const testVideoPath = createTestVideo();

		if (!testVideoPath) {
			test.skip('Test video not available');
			return;
		}

		// Navigate to submit form
		await page.goto('/en');

		const submitButton = page.locator('button:has-text("Submit"), button:has-text("Create")').first();
		if (await submitButton.isVisible()) {
			await submitButton.click();
		}

		// Select Video mode
		const videoButton = page.locator('button:has-text("Video"), button:has-text("🎥")').first();
		if (await videoButton.isVisible()) {
			await videoButton.click();
		}

		// Upload video
		const fileInput = page.locator('input[type="file"][accept*="video"]').first();
		await fileInput.setInputFiles(testVideoPath);

		// Wait for upload and validation
		await expect(page.locator('text=Uploading, text=Validating').first()).toBeVisible({ timeout: 3000 });

		// Should show video preview
		await expect(page.locator('video')).toBeVisible({ timeout: 15000 });

		// Should show thumbnail selector
		await expect(page.locator('text=Select Thumbnail, text=Suggested Frames').first()).toBeVisible({ timeout: 10000 });

		// Should show frame options
		await expect(page.locator('.thumbnail-option, button:has(img)')).toHaveCount(6, { timeout: 10000 });
	});

	test('should allow thumbnail selection from suggested frames', async ({ page }) => {
		const testVideoPath = createTestVideo();

		if (!testVideoPath) {
			test.skip('Test video not available');
			return;
		}

		await page.goto('/en');

		const submitButton = page.locator('button:has-text("Submit"), button:has-text("Create")').first();
		if (await submitButton.isVisible()) {
			await submitButton.click();
		}

		const videoButton = page.locator('button:has-text("Video"), button:has-text("🎥")').first();
		if (await videoButton.isVisible()) {
			await videoButton.click();
		}

		const fileInput = page.locator('input[type="file"][accept*="video"]').first();
		await fileInput.setInputFiles(testVideoPath);

		// Wait for thumbnail selector
		await page.waitForSelector('text=Select Thumbnail, text=Suggested', { timeout: 15000 });

		// Click first suggested frame
		const firstFrame = page.locator('.thumbnail-option, button:has(img)').first();
		await firstFrame.click();

		// Click confirm button
		const confirmButton = page.locator('button:has-text("Confirm")').first();
		await confirmButton.click();

		// Should show selected thumbnail preview
		await expect(page.locator('text=Selected Thumbnail')).toBeVisible({ timeout: 5000 });
		await expect(page.locator('img[alt*="thumbnail"]')).toBeVisible();
	});

	test('should allow custom frame capture from video scrubber', async ({ page }) => {
		const testVideoPath = createTestVideo();

		if (!testVideoPath) {
			test.skip('Test video not available');
			return;
		}

		await page.goto('/en');

		const submitButton = page.locator('button:has-text("Submit"), button:has-text("Create")').first();
		if (await submitButton.isVisible()) {
			await submitButton.click();
		}

		const videoButton = page.locator('button:has-text("Video"), button:has-text("🎥")').first();
		if (await videoButton.isVisible()) {
			await videoButton.click();
		}

		const fileInput = page.locator('input[type="file"][accept*="video"]').first();
		await fileInput.setInputFiles(testVideoPath);

		// Wait for thumbnail selector
		await page.waitForSelector('text=Select Thumbnail', { timeout: 15000 });

		// Find video element in thumbnail selector
		const videoElement = page.locator('video[controls]').first();
		await expect(videoElement).toBeVisible();

		// Click capture current frame button
		const captureButton = page.locator('button:has-text("Capture Current Frame")').first();
		await captureButton.click();

		// Should update selected frame
		await expect(page.locator('.thumbnail-option').filter({ hasText: '0%' })).toHaveClass(/selected|border-primary/);
	});

	test('should require thumbnail selection before submission', async ({ page }) => {
		const testVideoPath = createTestVideo();

		if (!testVideoPath) {
			test.skip('Test video not available');
			return;
		}

		await page.goto('/en');

		const submitButton = page.locator('button:has-text("Submit"), button:has-text("Create")').first();
		if (await submitButton.isVisible()) {
			await submitButton.click();
		}

		const videoButton = page.locator('button:has-text("Video"), button:has-text("🎥")').first();
		if (await videoButton.isVisible()) {
			await videoButton.click();
		}

		const fileInput = page.locator('input[type="file"][accept*="video"]').first();
		await fileInput.setInputFiles(testVideoPath);

		// Wait for upload
		await page.waitForSelector('video', { timeout: 15000 });

		// Try to submit without selecting thumbnail
		const submitFormButton = page.locator('button[type="submit"]:has-text("Submit")').first();

		// Button should be disabled or show error
		const isDisabled = await submitFormButton.isDisabled();

		if (!isDisabled) {
			await submitFormButton.click();
			// Should show error message
			await expect(page.locator('text=Please select a thumbnail, text=thumbnail required').first()).toBeVisible({ timeout: 3000 });
		} else {
			expect(isDisabled).toBe(true);
		}
	});

	test('should complete full video submission flow', async ({ page }) => {
		const testVideoPath = createTestVideo();

		if (!testVideoPath) {
			test.skip('Test video not available');
			return;
		}

		await page.goto('/en');

		const submitButton = page.locator('button:has-text("Submit"), button:has-text("Create")').first();
		if (await submitButton.isVisible()) {
			await submitButton.click();
		}

		// Select Video
		const videoButton = page.locator('button:has-text("Video"), button:has-text("🎥")').first();
		if (await videoButton.isVisible()) {
			await videoButton.click();
		}

		// Upload video
		const fileInput = page.locator('input[type="file"][accept*="video"]').first();
		await fileInput.setInputFiles(testVideoPath);

		// Wait for thumbnail selector
		await page.waitForSelector('text=Select Thumbnail', { timeout: 15000 });

		// Select first frame
		const firstFrame = page.locator('.thumbnail-option, button:has(img)').first();
		await firstFrame.click();

		// Confirm thumbnail
		const confirmButton = page.locator('button:has-text("Confirm")').first();
		await confirmButton.click();

		// Add title and caption
		const titleInput = page.locator('input[placeholder*="title"], input[name="title"]').first();
		if (await titleInput.isVisible()) {
			await titleInput.fill('E2E Test Video');
		}

		const captionInput = page.locator('textarea[placeholder*="caption"], textarea[name="caption"]').first();
		if (await captionInput.isVisible()) {
			await captionInput.fill('This is a test video uploaded via E2E tests');
		}

		// Submit form
		const submitFormButton = page.locator('button[type="submit"]:has-text("Submit")').first();
		await submitFormButton.click();

		// Should show success message or redirect
		await expect(
			page.locator('text=success, text=submitted, text=created').first()
		).toBeVisible({ timeout: 10000 });
	});
});
