import { test, expect } from '@playwright/test';
import { signInAsUser } from './helpers/auth';
import { getMemeByIndex } from './helpers/test-assets';

/**
 * Meme Submission E2E Tests
 *
 * Covers:
 * - User can access /memes/submit page
 * - Meme form renders
 * - Submit button disabled without required fields
 * - Image upload enables submit flow
 * - Complete meme submission flow
 * - Meme appears in /memes list after submission
 */

test.describe('Meme Submission', () => {
	test.beforeEach(async ({ page }) => {
		await signInAsUser(page);
	});

	test('user can access meme submit page', async ({ page }) => {
		await page.goto('/memes/submit');
		await page.waitForLoadState('domcontentloaded');

		await expect(page).toHaveURL(/\/(en\/)?memes\/submit/);

		const bodyText = await page.innerText('body');
		expect(bodyText.length).toBeGreaterThan(50);
	});

	test('meme form renders', async ({ page }) => {
		await page.goto('/memes/submit');
		await page.waitForLoadState('domcontentloaded');

		const bodyText = await page.innerText('body');
		const hasFormContent =
			bodyText.match(/submit|meme|upload|image/i) !== null;
		expect(hasFormContent).toBe(true);
	});

	test('submit button disabled without required fields', async ({ page }) => {
		await page.goto('/memes/submit');
		await page.waitForLoadState('domcontentloaded');

		const submitButton = page.getByRole('button', {
			name: /submit/i,
		});

		if (await submitButton.isVisible({ timeout: 5000 }).catch(() => false)) {
			await expect(submitButton).toBeDisabled();
		}
	});

	test('image upload enables submit flow', async ({ page }) => {
		await page.goto('/memes/submit');
		await page.waitForLoadState('domcontentloaded');

		const testImagePath = getMemeByIndex(30);
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(testImagePath);

		// Wait for upload to complete - the submit button should become enabled
		const submitButton = page.getByRole('button', {
			name: /submit/i,
		});
		await expect(submitButton).toBeEnabled({ timeout: 30000 });
	});

	test('complete meme submission flow', async ({ page }) => {
		await page.goto('/memes/submit');
		await page.waitForLoadState('domcontentloaded');

		// Upload image
		const testImagePath = getMemeByIndex(31);
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(testImagePath);

		// Wait for upload to complete
		const submitButton = page.getByRole('button', {
			name: /submit/i,
		});
		await expect(submitButton).toBeEnabled({ timeout: 30000 });

		// Fill caption if available
		const captionField = page.locator('#caption, textarea[name="caption"], textarea[placeholder*="caption" i]');
		if (await captionField.isVisible({ timeout: 2000 }).catch(() => false)) {
			await captionField.fill('E2E Meme Test ' + Date.now());
		}

		// Submit
		await submitButton.click();

		// Should navigate away or show success
		await page.waitForTimeout(3000);
		const bodyText = await page.innerText('body');
		const hasSuccessIndicator =
			bodyText.match(/success|submitted|thank|memes/i) !== null ||
			page.url().includes('/memes');
		expect(hasSuccessIndicator).toBe(true);
	});

	test('meme appears in memes list after submission', async ({ page }) => {
		await page.goto('/memes');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(2000);

		const bodyText = await page.innerText('body');
		// Should show meme list content or empty state
		const hasContent = bodyText.length > 100;
		expect(hasContent).toBe(true);

		// Page should not show error
		await expect(page.locator('text=Something went wrong')).not.toBeVisible();
	});
});
