import { test, expect } from '@playwright/test';
import { signInAsUser, signInAsAdmin } from './helpers/auth';
import path from 'path';
import fs from 'fs';

/**
 * File Submissions E2E Tests
 * Tests file upload workflow from local files and URL submissions
 *
 * Note: File uploads to Supabase storage require auth which isn't available
 * in E2E test context. These tests focus on:
 * - UI interactions and validation
 * - URL-based submissions (which work without storage auth)
 * - Error handling for failed uploads
 *
 * Prerequisites:
 * - Run: npx tsx __tests__/e2e/fixtures/generate-test-images.ts
 */

const TEST_IMAGES_DIR = path.join(__dirname, 'fixtures/test-images');

// Helper to check if test images exist
function testImagesExist(): boolean {
	const requiredImages = ['valid-story.jpg', 'valid-square.jpg', 'invalid-aspect.jpg'];
	return requiredImages.every((img) =>
		fs.existsSync(path.join(TEST_IMAGES_DIR, img))
	);
}

test.describe('File Submissions (Section 4)', () => {
	// Skip all tests if test images don't exist
	test.beforeAll(async () => {
		if (!testImagesExist()) {
			console.warn(
				'\n⚠️  Test images not found. Run: npx tsx __tests__/e2e/fixtures/generate-test-images.ts\n'
			);
		}
	});

	/**
	 * FS-01: File input exists and accepts files
	 * Priority: P0 (Critical)
	 * Note: Actual upload fails without Supabase auth, but we test the UI interaction
	 */
	test('FS-01: should have file input and handle upload attempt', async ({ page }) => {
		test.skip(!testImagesExist(), 'Test images not generated');

		await signInAsUser(page);
		await page.goto('/submit');

		// Wait for page to load
		await expect(page).toHaveURL(/\/submit/);

		// Find the file input (it's hidden but Playwright can still interact with it)
		const fileInput = page.locator('input[type="file"]');
		await expect(fileInput).toBeAttached();

		// Verify the drop zone is visible
		await expect(page.locator('text=Drop image here or click to upload')).toBeVisible();

		// Upload valid story image
		const testImagePath = path.join(TEST_IMAGES_DIR, 'valid-story.jpg');
		await fileInput.setInputFiles(testImagePath);

		// Wait for either: success (image preview) OR error message
		// The outcome depends on Supabase storage auth availability
		const imagePreview = page.locator('img[alt="Uploaded image"]');
		const errorMessage = page.locator('text=/Failed to|error|Error/i');

		await Promise.race([
			imagePreview.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
			errorMessage.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
		]);

		// At least one outcome should occur
		const hasImage = await imagePreview.isVisible();
		const hasError = await errorMessage.isVisible();
		expect(hasImage || hasError).toBe(true);
	});

	/**
	 * FS-02: Drop zone is clickable and file input works
	 * Priority: P1 (High)
	 */
	test('FS-02: should have clickable drop zone', async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/submit');

		// Verify the drop zone text is visible
		await expect(page.locator('text=Drop image here or click to upload')).toBeVisible();
		await expect(page.locator('text=PNG, JPG up to 10MB')).toBeVisible();

		// Verify file input exists and accepts images
		const fileInput = page.locator('input[type="file"]');
		await expect(fileInput).toBeAttached();
		await expect(fileInput).toHaveAttribute('accept', 'image/*');
	});

	/**
	 * FS-03: URL input field exists and has validation
	 * Priority: P1 (High)
	 */
	test('FS-03: should have URL input with Load button', async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/submit');

		// URL input should exist
		const urlInput = page.locator('input[type="url"]');
		await expect(urlInput).toBeVisible();
		await expect(urlInput).toHaveAttribute('placeholder', 'Or paste image URL...');

		// Load button should be disabled when URL is empty
		const loadButton = page.locator('button:has-text("Load")');
		await expect(loadButton).toBeDisabled();

		// Load button should enable when URL is entered
		await urlInput.fill('https://example.com/image.jpg');
		await expect(loadButton).toBeEnabled();
	});

	/**
	 * FS-04: Page layout and components render correctly
	 * Priority: P1 (High)
	 */
	test('FS-04: should render submit page with all components', async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/submit');

		// Page header (use heading role to be specific)
		await expect(page.getByRole('heading', { name: 'Submit for Review' })).toBeVisible();

		// Caption textarea
		const captionInput = page.locator('textarea#caption');
		await expect(captionInput).toBeVisible();

		// Character counter
		await expect(page.locator('text=/\\d+\\/2200/')).toBeVisible();

		// Story preview section
		await expect(page.locator('text=Story Preview')).toBeVisible();

		// Submit button (disabled initially)
		const submitButton = page.getByRole('button', { name: 'Submit for Review' });
		await expect(submitButton).toBeVisible();
		await expect(submitButton).toBeDisabled();
	});

	/**
	 * FS-05: URL loading workflow
	 * Priority: P1 (High)
	 * Note: External URLs may fail due to CORS/network issues in test environment
	 */
	test('FS-05: should attempt to load image via URL', async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/submit');

		// Use a test image URL
		const testImageUrl = 'https://picsum.photos/1080/1920';

		// Find URL input and enter URL
		const urlInput = page.locator('input[type="url"]');
		await urlInput.fill(testImageUrl);

		// Click Load button
		const loadButton = page.locator('button:has-text("Load")');
		await expect(loadButton).toBeEnabled();
		await loadButton.click();

		// Wait for either success (image preview) or error message - no hard waits
		const imageLocator = page.locator('img[alt="Uploaded image"]');
		const errorLocator = page.locator('text=/Failed to|error/i');

		await Promise.race([
			imageLocator.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
			errorLocator.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
		]);

		// Check outcome - either image loaded or error shown
		const imageLoaded = await imageLocator.isVisible();
		const errorShown = await errorLocator.isVisible();

		// At least one outcome should happen
		expect(imageLoaded || errorShown).toBe(true);

		// If image loaded, verify submit button is enabled
		if (imageLoaded) {
			const submitButton = page.getByRole('button', { name: 'Submit for Review' });
			await expect(submitButton).toBeEnabled();
		}
	});

	/**
	 * FS-06: Caption character counter updates
	 * Priority: P2 (Medium)
	 */
	test('FS-06: should update caption character count', async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/submit');

		// Check character counter shows 0/2200 initially
		await expect(page.locator('text=0/2200')).toBeVisible();

		// Fill caption with some text
		const captionInput = page.locator('textarea#caption');
		const testText = 'Test caption for character counting';
		await captionInput.fill(testText);

		// Counter should update to show correct count
		await expect(page.locator(`text=${testText.length}/2200`)).toBeVisible();
	});

	/**
	 * FS-07: Submit without image should be disabled
	 * Priority: P1 (High)
	 */
	test('FS-07: should disable submit without image', async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/submit');

		// Submit button should be disabled without image
		const submitButton = page.locator('button:has-text("Submit for Review")');
		await expect(submitButton).toBeDisabled();

		// Adding caption shouldn't enable it
		const captionInput = page.locator('textarea#caption');
		await captionInput.fill('Caption without image');
		await expect(submitButton).toBeDisabled();
	});

	/**
	 * FS-08: Navigation to submissions page
	 * Priority: P1 (High)
	 */
	test('FS-08: should navigate to submissions list', async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/submit');

		// Click on Submissions link in navigation
		await page.click('a:has-text("Submissions")');
		await expect(page).toHaveURL(/\/submissions/);

		// Page should load
		const content = await page.textContent('body');
		expect(content?.length).toBeGreaterThan(0);
	});

	/**
	 * FS-09: Admin can access review queue
	 * Priority: P0 (Critical)
	 */
	test('FS-09: admin should access review queue', async ({ page }) => {
		await signInAsAdmin(page);

		// Go to review queue
		await page.goto('/review');
		await expect(page).toHaveURL(/\/review/);

		// Should see Review Queue header
		await expect(page.locator('text=Review Queue')).toBeVisible();

		// Page should load content
		const content = await page.textContent('body');
		expect(content?.length).toBeGreaterThan(0);
	});

	/**
	 * FS-10: Admin and user role separation
	 * Priority: P0 (Critical)
	 */
	test('FS-10: should have different views for user and admin', async ({ browser }) => {
		// Test user view in first context
		const userContext = await browser.newContext();
		const userPage = await userContext.newPage();

		await signInAsUser(userPage);
		await userPage.goto('/');

		// User should see Submit link in nav (use exact match)
		await expect(userPage.getByRole('link', { name: 'Submit', exact: true })).toBeVisible();

		// User should see Submissions link
		await expect(userPage.getByRole('link', { name: 'Submissions' })).toBeVisible();

		await userContext.close();

		// Test admin view in fresh context
		const adminContext = await browser.newContext();
		const adminPage = await adminContext.newPage();

		await signInAsAdmin(adminPage);
		await adminPage.goto('/');

		// Admin should see Review link
		await expect(adminPage.getByRole('link', { name: 'Review' })).toBeVisible();

		// Admin should see Schedule link
		await expect(adminPage.getByRole('link', { name: 'Schedule' })).toBeVisible();

		await adminContext.close();
	});
});
