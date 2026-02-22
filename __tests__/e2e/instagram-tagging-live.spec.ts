import { test, expect } from '@playwright/test';
import { signInAsRealIG } from './helpers/auth';
import { getUnpublishedMeme } from './helpers/test-assets';

/**
 * Instagram User Tagging Tests - LIVE
 *
 * These tests ACTUALLY PUBLISH stories with user tags to Instagram (@www_hehe_pl).
 * Tests the user tagging functionality end-to-end with REAL Instagram API.
 *
 * Test User: @konstanty03 (Instagram test account for tagging)
 *
 * REQUIREMENTS:
 * - ENABLE_REAL_IG_TESTS=true
 * - ENABLE_LIVE_IG_PUBLISH=true
 * - Valid Instagram tokens for p.romanczuk@gmail.com
 * - App running in development mode (not production)
 */
test.describe('Instagram User Tagging - LIVE', () => {
	// Skip in CI - never run live publishing in CI
	test.skip(
		() => process.env.CI === 'true',
		'NEVER run live publishing tests in CI',
	);

	// Require explicit opt-in for real IG tests
	test.skip(
		() => !process.env.ENABLE_REAL_IG_TESTS,
		'Set ENABLE_REAL_IG_TESTS=true to run',
	);

	// Require DOUBLE opt-in for live publishing
	test.skip(
		() => process.env.ENABLE_LIVE_IG_PUBLISH !== 'true',
		'Set ENABLE_LIVE_IG_PUBLISH=true to ACTUALLY publish to Instagram',
	);

	test.beforeEach(async ({ page }) => {
		await signInAsRealIG(page);
	});

	/**
	 * LIVE-PUB-05: Publish story with user tags
	 *
	 * Tests publishing a story with multiple user tags via API.
	 * Verifies tags are included in the request and story is published.
	 * Includes 24-hour deduplication to avoid duplicate content errors.
	 */
	test('LIVE-PUB-05: publish story with user tags', async ({ page, request }) => {
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		await expect(page.locator('text=www_hehe_pl')).toBeVisible({ timeout: 10000 });

		const testImagePath = await getUnpublishedMeme(request);

		if (!testImagePath) {
			console.warn('All memes published in last 24 hours, skipping');
			test.skip();
			return;
		}

		// Upload test image
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(testImagePath);

		const urlInput = page.locator('input#debug-image-url');
		await expect(urlInput).not.toHaveValue('', { timeout: 30000 });
		const uploadedUrl = await urlInput.inputValue();

		// Publish via API with multiple user tags
		const userTags = [
			{ username: 'konstanty03', x: 0.3, y: 0.4 },
			{ username: 'test_account_ig', x: 0.7, y: 0.4 },
		];

		const publishResponse = await request.post('/api/debug/publish', {
			data: { url: uploadedUrl, type: 'IMAGE', userTags }
		});

		expect(publishResponse.ok()).toBe(true);
		const publishData = await publishResponse.json();

		if (publishData.success) {
			console.log(`Published with ${userTags.length} user tags, Media ID: ${publishData.result?.id}`);

			// Verify story appears in recent stories
			await page.waitForTimeout(2000);
			const storiesResponse = await request.get('/api/instagram/recent-stories?limit=5');
			expect(storiesResponse.ok()).toBe(true);

			const stories = await storiesResponse.json();
			const publishedStory = stories.find((s: Record<string, unknown>) => s.id === publishData.result?.id);
			expect(publishedStory).toBeDefined();
		} else {
			throw new Error(`Publishing with user tags failed: ${publishData.error}`);
		}
	});
});
