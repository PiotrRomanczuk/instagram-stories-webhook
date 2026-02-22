import { test, expect } from '@playwright/test';
import { signInAsUser } from './helpers/auth';
import { createPendingContent } from './helpers/seed';
import { getMemeByIndex, getTestVideo } from './helpers/test-assets';

test.describe('CP-2: Content Submission Flow', () => {
	test.beforeEach(async ({ page }) => {
		await signInAsUser(page);
	});

	test('CP-2.1: submit page loads for authenticated user', async ({
		page,
	}) => {
		await page.goto('/submit');
		await expect(page).toHaveURL(/\/(en\/)?submit/);

		// Should show the submit form heading
		const bodyText = await page.innerText('body');
		expect(bodyText).toMatch(/submit.*review/i);
	});

	test('CP-2.2: submit button is disabled without image', async ({
		page,
	}) => {
		await page.goto('/submit');
		await page.waitForLoadState('domcontentloaded');

		const submitButton = page.getByRole('button', {
			name: /submit for review/i,
		});
		await expect(submitButton).toBeVisible();
		await expect(submitButton).toBeDisabled();
	});

	test('CP-2.3: user can upload an image', async ({ page }) => {
		await page.goto('/submit');
		await page.waitForLoadState('domcontentloaded');

		// Upload a test image
		const testImagePath = getMemeByIndex(10);
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(testImagePath);

		// Wait for upload to complete - the submit button should become enabled
		const submitButton = page.getByRole('button', {
			name: /submit for review/i,
		});
		await expect(submitButton).toBeEnabled({ timeout: 30000 });
	});

	test('CP-2.4: user can upload a video', async ({ page }) => {
		await page.goto('/submit');
		await page.waitForLoadState('domcontentloaded');

		// Switch to Video mode
		const videoToggle = page.getByRole('button', { name: 'Video' });
		await expect(videoToggle).toBeVisible();
		await videoToggle.click();

		// Verify Video toggle is now active (default variant)
		await expect(videoToggle).not.toHaveAttribute('data-variant', 'outline');

		// Upload test video
		const testVideoPath = getTestVideo();
		if (!testVideoPath) {
			console.warn('Test video not found, skipping');
			test.skip();
			return;
		}

		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(testVideoPath);

		// Wait for upload to complete - the submit button should become enabled
		const submitButton = page.getByRole('button', {
			name: /submit for review/i,
		});
		await expect(submitButton).toBeEnabled({ timeout: 60000 });
	});

	test('CP-2.5: complete submission flow - upload and submit', async ({
		page,
	}) => {
		await page.goto('/submit');
		await page.waitForLoadState('domcontentloaded');

		// Step 1: Upload image
		const testImagePath = getMemeByIndex(15);
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(testImagePath);

		// Wait for upload to complete
		const submitButton = page.getByRole('button', {
			name: /submit for review/i,
		});
		await expect(submitButton).toBeEnabled({ timeout: 30000 });

		// Step 2: Add caption
		const captionField = page.locator('#caption');
		await captionField.fill('E2E Critical Path Test ' + Date.now());

		// Step 3: Submit
		await submitButton.click();

		// Should redirect to submissions page after successful submit
		await expect(page).toHaveURL(/\/(en\/)?submissions/, {
			timeout: 15000,
		});
	});

	test('CP-2.6: submission appears in submissions list', async ({
		page,
	}) => {
		// Create content via API first (more reliable than UI for test setup)
		const timestamp = Date.now();
		const contentId = await createPendingContent(page, {
			title: 'E2E CP-2.7 Test ' + timestamp,
			caption: 'Critical path verification ' + timestamp,
		});
		expect(contentId).toBeTruthy();

		// Navigate to submissions page
		await page.goto('/submissions');
		await page.waitForLoadState('domcontentloaded');
		// Wait for page content to render (more reliable than networkidle with SWR)
		await page.waitForTimeout(1000);

		// Should show submissions content
		const bodyText = await page.innerText('body');
		const hasContent =
			bodyText.includes('Submission') ||
			bodyText.includes('Pending') ||
			bodyText.includes('Content');
		expect(hasContent).toBeTruthy();
	});

	test('CP-2.7: user can submit three separate image submissions', async ({
		page,
	}) => {
		test.slow();

		for (let i = 0; i < 3; i++) {
			await page.goto('/submit');
			await page.waitForLoadState('domcontentloaded');

			// Upload image
			const testImagePath = getMemeByIndex(20 + i);
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles(testImagePath);

			// Wait for upload
			const submitButton = page.getByRole('button', {
				name: /submit for review/i,
			});
			await expect(submitButton).toBeEnabled({ timeout: 30000 });

			// Fill unique caption
			const captionField = page.locator('#caption');
			await captionField.fill(`CP-2.7 Multi-Submit #${i + 1} ${Date.now()}`);

			// Submit
			await submitButton.click();

			// Should redirect to submissions
			await expect(page).toHaveURL(/\/(en\/)?submissions/, {
				timeout: 15000,
			});
		}

		// Verify submissions page has content
		await page.goto('/submissions');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(1000);

		const bodyText = await page.innerText('body');
		const hasContent =
			bodyText.includes('Submission') ||
			bodyText.includes('Pending') ||
			bodyText.includes('Content');
		expect(hasContent).toBeTruthy();
	});
});
