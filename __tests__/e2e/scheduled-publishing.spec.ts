import { test, expect } from '@playwright/test';
import { signInAsRealIG } from './helpers/auth';
import { getMemeByIndex } from './helpers/test-assets';

test.describe('CP-4: Scheduled Publishing Flow', () => {
	// Skip in preview mode (production-only tests)
	test.skip(
		() => process.env.PREVIEW_MODE === 'true',
		'Production-only tests - skipped in preview mode'
	);

	// Skip unless real IG tests are enabled
	test.skip(
		() => !process.env.ENABLE_REAL_IG_TESTS,
		'Set ENABLE_REAL_IG_TESTS=true to run'
	);

	test.skip(
		() => process.env.ENABLE_LIVE_IG_PUBLISH !== 'true',
		'Set ENABLE_LIVE_IG_PUBLISH=true to ACTUALLY publish to Instagram'
	);

	test.skip(
		() => process.env.CI === 'true',
		'NEVER run live publishing tests in CI'
	);

	test.beforeEach(async ({ page }) => {
		await signInAsRealIG(page);
	});

	test('CP-4.1: Instagram account is connected', async ({ page }) => {
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Verify Instagram connection
		await expect(page.locator('text=www_hehe_pl')).toBeVisible({
			timeout: 10000,
		});

		// Should NOT show expired
		const bodyText = await page.innerText('body');
		expect(bodyText.toLowerCase()).not.toContain('expired');
	});

	test('CP-4.2: debug publisher UI loads correctly', async ({ page }) => {
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		await expect(page.locator('text=Debug Publisher')).toBeVisible();
		await expect(page.locator('input#debug-image-url')).toBeVisible();
		await expect(
			page.getByRole('button', { name: /Publish to Instagram Now/i })
		).toBeVisible();
	});

	test('CP-4.3: image upload to storage works', async ({ page }) => {
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Upload test image
		const testImagePath = getMemeByIndex(25);
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(testImagePath);

		// Wait for upload to complete
		const urlInput = page.locator('input#debug-image-url');
		await expect(urlInput).not.toHaveValue('', { timeout: 30000 });

		const uploadedUrl = await urlInput.inputValue();
		expect(uploadedUrl).toContain('supabase');

		// Verify preview appears
		await expect(page.locator('img[alt="Preview"]')).toBeVisible();
	});

	// NOTE: Actual image/video publish tests live in instagram-publishing-live.spec.ts

	test('CP-4.4: schedule page loads for admin', async ({ page }) => {
		await page.goto('/schedule');
		await page.waitForLoadState('domcontentloaded');

		await expect(page).toHaveURL(/\/(en\/)?schedule/);
		const bodyText = await page.innerText('body');
		expect(bodyText).toMatch(/schedule|calendar|content/i);
	});
});
