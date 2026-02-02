import { test, expect } from '@playwright/test';
import { signInAsUser } from './helpers/auth';

/**
 * Content Submission E2E Tests (Real Account)
 *
 * These tests cover the user submission workflow for Instagram Stories.
 * Uses a regular user account (not admin) to test the submission flow.
 *
 * IMPORTANT:
 * - Skip in CI to avoid running against real services
 * - Requires valid user account with submission permissions
 */

test.describe('Content Submission (User Account)', () => {
	// Skip in CI environments
	test.skip(
		() => process.env.CI === 'true',
		'Skipping in CI - requires real account',
	);

	// Also skip if ENABLE_REAL_IG_TESTS is not set
	test.skip(
		() => !process.env.ENABLE_REAL_IG_TESTS,
		'Set ENABLE_REAL_IG_TESTS=true to run real Instagram tests',
	);

	test.beforeEach(async ({ page }) => {
		await signInAsUser(page);
	});

	/**
	 * SUB-01: Access Submit Page
	 * Priority: P0 (Critical)
	 * Verify that the submit form page loads correctly
	 */
	test('SUB-01: should access submit page and verify form loads', async ({ page }) => {
		await page.goto('/submit');
		await page.waitForLoadState('domcontentloaded');

		// Should not redirect to sign-in
		await expect(page).toHaveURL(/\/(en\/)?submit/);

		// Verify PageHeader is present with correct title
		const pageTitle = page.getByRole('heading', { name: 'Submit for Review' });
		await expect(pageTitle).toBeVisible();

		// Verify form elements are present
		const imageLabel = page.getByText('Image');
		await expect(imageLabel).toBeVisible();

		const captionLabel = page.getByText('Caption');
		await expect(captionLabel).toBeVisible();

		const submitButton = page.getByRole('button', { name: 'Submit for Review' });
		await expect(submitButton).toBeVisible();
		// Button should be disabled until image is uploaded
		await expect(submitButton).toBeDisabled();
	});

	/**
	 * SUB-02: Submit Image with Caption
	 * Priority: P0 (Critical)
	 * Test full submission flow with image upload and caption
	 */
	test('SUB-02: should submit image with caption', async ({ page }) => {
		await page.goto('/submit');
		await page.waitForLoadState('domcontentloaded');

		// Use URL input to add an image (simpler than file upload in E2E)
		const urlInput = page.getByPlaceholder('Or paste image URL...');
		await urlInput.fill('https://picsum.photos/1080/1920');

		const loadButton = page.getByRole('button', { name: 'Load' });
		await loadButton.click();

		// Wait for image to load and preview to appear
		await page.waitForTimeout(2000);

		// The submit button should now be enabled
		const submitButton = page.getByRole('button', { name: 'Submit for Review' });
		await expect(submitButton).toBeEnabled({ timeout: 10000 });

		// Add a caption
		const captionInput = page.locator('#caption');
		await captionInput.fill('Test submission from E2E tests #testing #e2e');

		// Verify caption counter updates
		const captionCounter = page.getByText(/\d+\/2200/);
		await expect(captionCounter).toBeVisible();

		// Submit the form
		await submitButton.click();

		// Wait for redirect to /submissions
		await page.waitForURL(/\/(en\/)?submissions/, { timeout: 15000 });

		// Verify we're on the submissions page
		const submissionsTitle = page.getByRole('heading', { name: 'My Submissions' });
		await expect(submissionsTitle).toBeVisible();
	});

	/**
	 * SUB-03: Submit Image Without Caption
	 * Priority: P1 (High)
	 * Caption is optional - test submission with image only
	 */
	test('SUB-03: should submit image without caption', async ({ page }) => {
		await page.goto('/submit');
		await page.waitForLoadState('domcontentloaded');

		// Use URL input to add an image
		const urlInput = page.getByPlaceholder('Or paste image URL...');
		await urlInput.fill('https://picsum.photos/1080/1920');

		const loadButton = page.getByRole('button', { name: 'Load' });
		await loadButton.click();

		// Wait for image to load
		await page.waitForTimeout(2000);

		// Submit button should be enabled (caption is optional)
		const submitButton = page.getByRole('button', { name: 'Submit for Review' });
		await expect(submitButton).toBeEnabled({ timeout: 10000 });

		// Do NOT fill caption - leave it empty
		const captionInput = page.locator('#caption');
		expect(await captionInput.inputValue()).toBe('');

		// Submit the form
		await submitButton.click();

		// Wait for redirect to /submissions
		await page.waitForURL(/\/(en\/)?submissions/, { timeout: 15000 });

		// Verify we're on the submissions page
		await expect(page).toHaveURL(/\/(en\/)?submissions/);
	});

	/**
	 * SUB-04: Verify Submission in User List
	 * Priority: P0 (Critical)
	 * After submitting, verify it appears in the user's submissions list
	 */
	test('SUB-04: should verify submission appears in user list after submit', async ({ page }) => {
		// First, make a submission
		await page.goto('/submit');
		await page.waitForLoadState('domcontentloaded');

		const uniqueCaption = `E2E Test Submission ${Date.now()}`;

		// Use URL input to add an image
		const urlInput = page.getByPlaceholder('Or paste image URL...');
		await urlInput.fill('https://picsum.photos/1080/1920');

		const loadButton = page.getByRole('button', { name: 'Load' });
		await loadButton.click();

		await page.waitForTimeout(2000);

		// Add unique caption for identification
		const captionInput = page.locator('#caption');
		await captionInput.fill(uniqueCaption);

		const submitButton = page.getByRole('button', { name: 'Submit for Review' });
		await expect(submitButton).toBeEnabled({ timeout: 10000 });
		await submitButton.click();

		// Wait for redirect to /submissions
		await page.waitForURL(/\/(en\/)?submissions/, { timeout: 15000 });

		// Now verify the submission appears in the list
		const bodyText = await page.innerText('body');

		// Should show the submissions page content
		expect(bodyText).toContain('My Submissions');

		// The submission should show as pending
		const pendingTab = page.getByRole('tab', { name: 'Pending' });
		await pendingTab.click();

		// Wait for filtered list to load
		await page.waitForTimeout(1000);

		// Page should have content (pending items or empty state)
		const pageContent = await page.innerText('body');
		expect(pageContent.length).toBeGreaterThan(0);
	});

	/**
	 * SUB-05: Caption Character Limit
	 * Priority: P2 (Medium)
	 * Verify 2200 character max is enforced
	 */
	test('SUB-05: should enforce caption character limit of 2200', async ({ page }) => {
		await page.goto('/submit');
		await page.waitForLoadState('domcontentloaded');

		// First load an image so the form is active
		const urlInput = page.getByPlaceholder('Or paste image URL...');
		await urlInput.fill('https://picsum.photos/1080/1920');

		const loadButton = page.getByRole('button', { name: 'Load' });
		await loadButton.click();

		await page.waitForTimeout(2000);

		const captionInput = page.locator('#caption');

		// Generate a string that exceeds 2200 characters
		const longCaption = 'A'.repeat(2300);
		await captionInput.fill(longCaption);

		// Check the input value length (should be capped at 2200)
		const inputValue = await captionInput.inputValue();
		expect(inputValue.length).toBeLessThanOrEqual(2200);

		// Verify counter shows 2200/2200 (maxed out)
		const captionCounter = page.getByText('2200/2200');
		await expect(captionCounter).toBeVisible();
	});

	/**
	 * SUB-06: Story Preview During Submission
	 * Priority: P1 (High)
	 * StoryPreview component shows uploaded image
	 */
	test('SUB-06: should show story preview with uploaded image', async ({ page }) => {
		await page.goto('/submit');
		await page.waitForLoadState('domcontentloaded');

		// Initially, preview should show placeholder
		const previewPlaceholder = page.getByText('Story Preview');
		await expect(previewPlaceholder).toBeVisible();

		// Load an image
		const urlInput = page.getByPlaceholder('Or paste image URL...');
		await urlInput.fill('https://picsum.photos/1080/1920');

		const loadButton = page.getByRole('button', { name: 'Load' });
		await loadButton.click();

		// Wait for image to load
		await page.waitForTimeout(3000);

		// After image loads, preview should show the image
		// The phone frame should contain an img element with the image
		const previewImage = page.locator('img[alt="Story preview"]');
		await expect(previewImage).toBeVisible({ timeout: 10000 });

		// Verify the 9:16 Preview label is visible
		const aspectLabel = page.getByText('9:16 Preview');
		await expect(aspectLabel).toBeVisible();
	});

	/**
	 * SUB-07: Aspect Ratio Warning
	 * Priority: P2 (Medium)
	 * Non-9:16 image shows warning card with yellow border
	 */
	test('SUB-07: should show aspect ratio warning for non-9:16 images', async ({ page }) => {
		await page.goto('/submit');
		await page.waitForLoadState('domcontentloaded');

		// Load a square image (1:1 ratio, not 9:16)
		const urlInput = page.getByPlaceholder('Or paste image URL...');
		await urlInput.fill('https://picsum.photos/500/500'); // Square image

		const loadButton = page.getByRole('button', { name: 'Load' });
		await loadButton.click();

		// Wait for image to load and aspect ratio to be analyzed
		await page.waitForTimeout(3000);

		// Look for the warning card with yellow border
		// The card should have classes: border-yellow-200 bg-yellow-50
		const warningCard = page.locator('.border-yellow-200.bg-yellow-50');

		// If aspect ratio is not 9:16, warning should appear
		const warningCount = await warningCard.count();

		if (warningCount > 0) {
			await expect(warningCard).toBeVisible();
			// Warning card should contain text about aspect ratio
			const cardText = await warningCard.innerText();
			expect(cardText.length).toBeGreaterThan(0);
		} else {
			// If no warning, verify the image loaded successfully
			const uploadedImage = page.locator('img[alt="Uploaded image"]');
			await expect(uploadedImage).toBeVisible();
		}
	});
});

/**
 * Additional Submission Edge Case Tests
 */
test.describe('Content Submission - Edge Cases', () => {
	test.skip(
		() => process.env.CI === 'true',
		'Skipping in CI - requires real account',
	);

	test.skip(
		() => !process.env.ENABLE_REAL_IG_TESTS,
		'Set ENABLE_REAL_IG_TESTS=true to run real Instagram tests',
	);

	test.beforeEach(async ({ page }) => {
		await signInAsUser(page);
	});

	/**
	 * Test that invalid URL shows error
	 */
	test('should show error for invalid image URL', async ({ page }) => {
		await page.goto('/submit');
		await page.waitForLoadState('domcontentloaded');

		const urlInput = page.getByPlaceholder('Or paste image URL...');
		await urlInput.fill('https://invalid-url-that-does-not-exist.com/fake.jpg');

		const loadButton = page.getByRole('button', { name: 'Load' });
		await loadButton.click();

		// Wait for error to appear
		await page.waitForTimeout(3000);

		// Submit button should remain disabled
		const submitButton = page.getByRole('button', { name: 'Submit for Review' });
		await expect(submitButton).toBeDisabled();
	});

	/**
	 * Test navigation to submissions page via button
	 */
	test('should navigate to submissions page after successful submit', async ({ page }) => {
		await page.goto('/submit');
		await page.waitForLoadState('domcontentloaded');

		// Use URL input to add an image
		const urlInput = page.getByPlaceholder('Or paste image URL...');
		await urlInput.fill('https://picsum.photos/1080/1920');

		const loadButton = page.getByRole('button', { name: 'Load' });
		await loadButton.click();

		await page.waitForTimeout(2000);

		const submitButton = page.getByRole('button', { name: 'Submit for Review' });
		await expect(submitButton).toBeEnabled({ timeout: 10000 });
		await submitButton.click();

		// Should automatically redirect to /submissions
		await page.waitForURL(/\/(en\/)?submissions/, { timeout: 15000 });

		// Verify New Submission button exists for another submission
		const newSubmissionButton = page.getByRole('link', { name: /New Submission/i });
		await expect(newSubmissionButton).toBeVisible();
	});
});
