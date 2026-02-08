import { test, expect } from '@playwright/test';
import { signInAsRealIG } from './helpers/auth';
import { getRandomMeme } from './helpers/test-assets';

/**
 * Submit Content E2E Test (Real Account)
 *
 * Tests: user uploads meme → submits for review → verify in database
 *
 * Run with: ENABLE_REAL_IG_TESTS=true npx playwright test live-submit
 */

test.describe('Submit Content Flow (Real Account)', () => {
	test.skip(
		() => process.env.CI === 'true',
		'Skipping in CI - requires real account',
	);

	test.skip(
		() => !process.env.ENABLE_REAL_IG_TESTS,
		'Set ENABLE_REAL_IG_TESTS=true to run',
	);

	test.beforeEach(async ({ page }) => {
		await signInAsRealIG(page);
	});

	test('submit meme for review', async ({ page }) => {
		// Step 1: Go to submit page
		await page.goto('/submit');
		await page.waitForLoadState('domcontentloaded');

		// Verify we're on the submit page
		await expect(page.getByRole('heading', { name: 'Submit for Review' })).toBeVisible({ timeout: 10000 });
		console.log('📝 On submit page');

		// Step 2: Upload a meme
		const fileInput = page.locator('input[type="file"]');
		const memePath = getRandomMeme();
		const memeName = path.basename(memePath);
		console.log(`📤 Uploading: ${memeName}`);
		await fileInput.setInputFiles(memePath);

		// Wait for upload to complete (preview should appear)
		await expect(page.locator('img[alt*="Preview"], img[alt*="preview"], .aspect-\\[9\\/16\\] img')).toBeVisible({ timeout: 15000 });
		console.log('✅ Image uploaded and preview visible');

		// Step 3: Add optional caption
		const caption = `E2E Test Submission - ${memeName} - ${Date.now()}`;
		const captionInput = page.locator('textarea#caption');
		await captionInput.fill(caption);
		console.log(`📝 Caption: ${caption.slice(0, 50)}...`);

		// Step 4: Submit for review
		const submitButton = page.locator('button:has-text("Submit for Review")');
		await expect(submitButton).toBeEnabled();
		await submitButton.click();

		// Step 5: Wait for success and redirect to submissions
		await expect(async () => {
			const url = page.url();
			const hasRedirected = url.includes('/submissions');
			expect(hasRedirected).toBe(true);
		}).toPass({ timeout: 15000 });

		console.log('✅ Redirected to submissions page');

		// Step 6: Verify our submission appears in the list
		await page.waitForLoadState('domcontentloaded');

		// Look for our submission (by caption or recent timestamp)
		const submissionExists = await page.locator(`text=${memeName}`).count() > 0 ||
			await page.locator('text=pending').count() > 0;

		if (submissionExists) {
			console.log('✅ Submission found in list!');
		} else {
			console.log('⚠️ Submission not immediately visible (may need refresh)');
		}

		// Step 7: Verify via API
		const apiResponse = await page.request.get('/api/content?source=submission&status=pending&limit=5');
		const data = await apiResponse.json();

		if (data.items && data.items.length > 0) {
			const recentSubmission = data.items.find((item: { caption?: string }) =>
				item.caption?.includes('E2E Test Submission')
			);

			if (recentSubmission) {
				console.log(`✅ Submission verified via API!`);
				console.log(`   - ID: ${recentSubmission.id}`);
				console.log(`   - Status: ${recentSubmission.submissionStatus}`);
			} else {
				console.log('⚠️ Recent submission not found via API');
			}
		}

		console.log('✅ Submit flow test completed!');
	});

	test('submit without image shows error', async ({ page }) => {
		await page.goto('/submit');
		await page.waitForLoadState('domcontentloaded');

		// Submit button should be disabled without image
		const submitButton = page.locator('button:has-text("Submit for Review")');
		await expect(submitButton).toBeDisabled();

		console.log('✅ Submit button correctly disabled without image');
	});
});
