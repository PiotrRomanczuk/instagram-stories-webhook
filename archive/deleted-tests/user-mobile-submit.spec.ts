/**
 * User Mobile Submit Page E2E Test
 *
 * Tests the /submit page on mobile viewport (iPhone 14 Pro - 390x844).
 * Verifies mobile-specific layout, image upload, caption entry,
 * form submission, and proper redirect after success.
 *
 * Uses real authentication via signInAsUser helper.
 */

import { test, expect } from '@playwright/test';
import { signInAsUser } from './helpers/auth';
import { cleanupTestContentByPattern } from './helpers/seed';
import { getRandomMeme } from './helpers/test-assets';

const TEST_IMAGE_PATH = getRandomMeme();

const TEST_CAPTION_PREFIX = 'E2E Submit Mobile Test';

test.use({
	viewport: { width: 390, height: 844 },
	video: { mode: 'on', size: { width: 390, height: 844 } },
});

test.describe.serial('User Mobile Submit Page', () => {
	test.beforeEach(async ({ page }) => {
		await signInAsUser(page);
	});

	test.afterAll(async ({ browser }) => {
		const context = await browser.newContext({
			viewport: { width: 390, height: 844 },
		});
		const page = await context.newPage();
		try {
			await signInAsUser(page);
			const deleted = await cleanupTestContentByPattern(
				page,
				TEST_CAPTION_PREFIX,
			);
			console.log(
				`Cleanup: removed ${deleted} test content items matching "${TEST_CAPTION_PREFIX}"`,
			);
		} catch (error) {
			console.warn('Cleanup failed (this may be expected):', error);
		} finally {
			await context.close();
		}
	});

	test('USER-SUB-01: Navigate to submit page and verify mobile layout', async ({
		page,
	}) => {
		await page.goto('/submit', { waitUntil: 'load', timeout: 15000 });

		// Verify page header
		await expect(
			page.getByRole('heading', { name: /Submit for Review/i }),
		).toBeVisible({ timeout: 10000 });

		// Verify description text
		await expect(
			page.locator(
				'text=Upload an image to submit for review. Once approved, it will be scheduled for publishing.',
			),
		).toBeVisible({ timeout: 5000 });

		// Verify the form is present
		const form = page.locator('form');
		await expect(form).toBeVisible({ timeout: 5000 });

		// Verify image upload area is present (drop zone with text)
		await expect(
			page.locator('text=Drop image here or click to upload'),
		).toBeVisible({ timeout: 5000 });

		// Verify caption textarea is visible
		const captionTextarea = page.locator(
			'textarea[placeholder="Add a caption for your story..."]',
		);
		await expect(captionTextarea).toBeVisible();

		// Verify mobile submit button is visible (the lg:hidden one)
		const mobileSubmitButton = page
			.locator('div.lg\\:hidden')
			.getByRole('button', { name: /Submit for Review/i });
		await expect(mobileSubmitButton).toBeVisible();

		// Verify desktop submit button is NOT visible on mobile
		const desktopSubmitContainer = page.locator(
			'div.hidden.lg\\:flex',
		);
		// On mobile (390px), the hidden lg:flex container should not be visible
		const desktopButtons = desktopSubmitContainer.getByRole('button', {
			name: /Submit for Review/i,
		});
		// Either not visible or count is 0 on mobile
		const count = await desktopButtons.count();
		if (count > 0) {
			await expect(desktopButtons.first()).not.toBeVisible();
		}
	});

	test('USER-SUB-02: Verify image upload area is present and usable on mobile', async ({
		page,
	}) => {
		await page.goto('/submit', { waitUntil: 'load', timeout: 15000 });
		await expect(page.locator('form')).toBeVisible({ timeout: 10000 });

		// Verify file input exists and is attached
		const fileInput = page.locator('input[type="file"]');
		await expect(fileInput).toBeAttached();

		// Verify the drop zone is visible and properly sized for mobile
		const dropZone = page.locator(
			'text=Drop image here or click to upload',
		);
		await expect(dropZone).toBeVisible();

		const dropZoneContainer = dropZone.locator('xpath=ancestor::div[contains(@class, "border-dashed")]');
		const dropZoneBox = await dropZoneContainer.boundingBox();
		expect(dropZoneBox).toBeTruthy();
		// Should span most of the mobile viewport width
		expect(dropZoneBox!.width).toBeGreaterThan(300);
		// Should be within viewport bounds
		expect(dropZoneBox!.x + dropZoneBox!.width).toBeLessThanOrEqual(390 + 2);

		// Verify size hint text
		await expect(page.locator('text=PNG, JPG up to 10MB')).toBeVisible();
	});

	test('USER-SUB-03: Upload test image and verify mobile compact preview', async ({
		page,
	}) => {
		await page.goto('/submit', { waitUntil: 'load', timeout: 15000 });
		await expect(page.locator('form')).toBeVisible({ timeout: 10000 });

		// Upload test image via hidden file input
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(TEST_IMAGE_PATH);

		// Wait for upload to complete - the uploaded image preview replaces the drop zone
		await expect(
			page.locator('img[alt="Uploaded image"]'),
		).toBeVisible({ timeout: 30000 });

		// Verify mobile compact preview appears (the lg:hidden preview section)
		const mobilePreview = page.locator('div.lg\\:hidden').filter({
			hasText: 'Preview',
		});
		await expect(mobilePreview).toBeVisible({ timeout: 10000 });

		// Verify the desktop full preview is NOT visible on mobile
		const desktopPreview = page.locator('div.hidden.lg\\:flex');
		const desktopPreviewCount = await desktopPreview.count();
		if (desktopPreviewCount > 0) {
			await expect(desktopPreview.first()).not.toBeVisible();
		}
	});

	test('USER-SUB-04: Fill caption textarea and verify character counter', async ({
		page,
	}) => {
		await page.goto('/submit', { waitUntil: 'load', timeout: 15000 });
		await expect(page.locator('form')).toBeVisible({ timeout: 10000 });

		// Verify initial character counter shows 0/2200
		await expect(page.locator('text=0/2200')).toBeVisible({
			timeout: 5000,
		});

		// Fill in caption
		const captionTextarea = page.locator(
			'textarea[placeholder="Add a caption for your story..."]',
		);
		const testCaption = 'Hello from mobile test';
		await captionTextarea.fill(testCaption);

		// Verify character counter updates
		await expect(
			page.locator(`text=${testCaption.length}/2200`),
		).toBeVisible({ timeout: 5000 });

		// Verify textarea value
		await expect(captionTextarea).toHaveValue(testCaption);

		// Test with longer text to ensure counter keeps updating
		const longerCaption = 'A'.repeat(100);
		await captionTextarea.fill(longerCaption);
		await expect(page.locator('text=100/2200')).toBeVisible({
			timeout: 5000,
		});
	});

	test('USER-SUB-05: Submit form with image and verify success toast and redirect', async ({
		page,
	}) => {
		await page.goto('/submit', { waitUntil: 'load', timeout: 15000 });
		await expect(page.locator('form')).toBeVisible({ timeout: 10000 });

		// Upload test image
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(TEST_IMAGE_PATH);

		// Wait for upload to complete
		await expect(
			page.locator('img[alt="Uploaded image"]'),
		).toBeVisible({ timeout: 30000 });

		// Fill caption with identifiable test content for cleanup
		const testCaption = `${TEST_CAPTION_PREFIX} ${Date.now()}`;
		const captionTextarea = page.locator(
			'textarea[placeholder="Add a caption for your story..."]',
		);
		await captionTextarea.fill(testCaption);

		// Intercept the content API call
		const apiResponsePromise = page.waitForResponse(
			(resp) =>
				resp.url().includes('/api/content') &&
				resp.request().method() === 'POST',
			{ timeout: 30000 },
		);

		// Click the mobile submit button
		const mobileSubmitButton = page
			.locator('div.lg\\:hidden')
			.getByRole('button', { name: /Submit for Review/i });
		await expect(mobileSubmitButton).toBeEnabled({ timeout: 5000 });
		await mobileSubmitButton.click();

		// Wait for API response
		const apiResponse = await apiResponsePromise;
		const responseStatus = apiResponse.status();

		if (responseStatus !== 200 && responseStatus !== 201) {
			const responseBody = await apiResponse.json().catch(() => null);
			console.error(
				`USER-SUB-05: POST /api/content returned ${responseStatus}:`,
				JSON.stringify(responseBody, null, 2),
			);
		}

		// Verify success toast
		await expect(
			page.locator('text=Submission sent for review!'),
		).toBeVisible({ timeout: 15000 });

		// Verify redirect to /submissions
		await page.waitForURL(/\/(en\/)?submissions/, { timeout: 15000 });
	});

	test('USER-SUB-06: Verify submit button placement on mobile', async ({
		page,
	}) => {
		await page.goto('/submit', { waitUntil: 'load', timeout: 15000 });
		await expect(page.locator('form')).toBeVisible({ timeout: 10000 });

		// The mobile submit button should be within the lg:hidden container
		const mobileSubmitButton = page
			.locator('div.lg\\:hidden')
			.getByRole('button', { name: /Submit for Review/i });
		await expect(mobileSubmitButton).toBeVisible();

		// Check button bounding box fits within mobile viewport
		const buttonBox = await mobileSubmitButton.boundingBox();
		expect(buttonBox).toBeTruthy();
		// Button should be within viewport width
		expect(buttonBox!.x).toBeGreaterThanOrEqual(0);
		expect(buttonBox!.x + buttonBox!.width).toBeLessThanOrEqual(390 + 2);

		// Button should be disabled when no image is uploaded
		await expect(mobileSubmitButton).toBeDisabled();

		// Upload an image to enable the button
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(TEST_IMAGE_PATH);

		// Wait for upload to complete
		await expect(
			page.locator('img[alt="Uploaded image"]'),
		).toBeVisible({ timeout: 30000 });

		// Button should now be enabled
		await expect(mobileSubmitButton).toBeEnabled({ timeout: 5000 });
	});
});
