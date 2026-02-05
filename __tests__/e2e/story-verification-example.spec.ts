import { test, expect } from '@playwright/test';
import { signInAsRealIG } from './helpers/auth';
import { getUnpublishedMeme } from './helpers/test-assets';
import {
	assertStoryPublished,
	waitForStoryVerification,
	wasMediaPublishedRecently,
	logStoriesDiagnostic,
	extractMediaId,
} from './helpers/story-verification';

/**
 * Story Verification Examples
 *
 * This file demonstrates how to use the story verification utilities
 * in E2E tests for Instagram publishing.
 *
 * NOTE: These are example tests showing the API usage.
 * For actual live publishing tests, see instagram-publishing-live.spec.ts
 */

test.describe('Story Verification Examples', () => {
	// Skip in CI
	test.skip(() => process.env.CI === 'true', 'Skip in CI');

	// Require real IG tests enabled
	test.skip(
		() => !process.env.ENABLE_REAL_IG_TESTS,
		'Set ENABLE_REAL_IG_TESTS=true to run'
	);

	test.beforeEach(async ({ page }) => {
		await signInAsRealIG(page);
	});

	/**
	 * Example 1: Basic Story Verification
	 *
	 * Shows the simplest way to verify a story after publishing.
	 */
	test('Example 1: Basic story verification', async ({ page, request }) => {
		await page.goto('/debug');

		// Check for unpublished meme (24-hour de-duplication)
		const testImagePath = await getUnpublishedMeme(request);
		if (!testImagePath) {
			console.warn('⚠️ All memes published recently, skipping');
			test.skip();
			return;
		}

		// Upload image
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(testImagePath);

		// Wait for upload
		const urlInput = page.locator('input#debug-image-url');
		await expect(urlInput).not.toHaveValue('', { timeout: 30000 });

		// Publish
		const publishButton = page.getByRole('button', { name: /Publish to Instagram Now/i });
		await publishButton.click();

		// Wait for success
		await expect(page.locator('text=Published Successfully!')).toBeVisible({ timeout: 60000 });

		// Extract media ID
		const pageText = await page.innerText('body');
		const mediaId = extractMediaId(pageText);

		if (!mediaId) {
			throw new Error('Could not extract media ID from page');
		}

		console.log(`📱 Published media ID: ${mediaId}`);

		// ✅ SIMPLE VERIFICATION: Use assertStoryPublished helper
		// This handles retries, delays, and error reporting automatically
		await assertStoryPublished(request, mediaId, 'IMAGE');
	});

	/**
	 * Example 2: Manual Verification with Custom Retry Logic
	 *
	 * Shows how to use waitForStoryVerification for more control.
	 */
	test('Example 2: Manual verification with custom logic', async ({ page, request }) => {
		await page.goto('/debug');

		const testImagePath = await getUnpublishedMeme(request);
		if (!testImagePath) {
			test.skip();
			return;
		}

		// Upload and publish (same as Example 1)
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(testImagePath);

		const urlInput = page.locator('input#debug-image-url');
		await expect(urlInput).not.toHaveValue('', { timeout: 30000 });

		const publishButton = page.getByRole('button', { name: /Publish to Instagram Now/i });
		await publishButton.click();

		await expect(page.locator('text=Published Successfully!')).toBeVisible({ timeout: 60000 });

		const pageText = await page.innerText('body');
		const mediaId = extractMediaId(pageText);

		if (!mediaId) {
			throw new Error('Could not extract media ID');
		}

		// ✅ MANUAL VERIFICATION: Get result object for custom handling
		const result = await waitForStoryVerification(request, mediaId, 'IMAGE');

		if (result.verified) {
			console.log(`✅ Verified after ${result.attempts} attempts`);
			console.log('Story details:', result.story);
		} else {
			// Log diagnostic info on failure
			await logStoriesDiagnostic(request);
			throw new Error(`Verification failed: ${result.error}`);
		}
	});

	/**
	 * Example 3: Preventing Duplicate Publishes
	 *
	 * Shows how to check if media was published recently to avoid duplicates.
	 */
	test('Example 3: Check for recent publishes', async ({ request }) => {
		// Example media URL (from Supabase storage)
		const testMediaUrl =
			'https://urfynxrvzaysvevbcowi.supabase.co/storage/v1/object/public/stories/test-meme.jpg';

		// Check if this URL was published in last 24 hours
		const wasPublished = await wasMediaPublishedRecently(request, testMediaUrl, 24);

		if (wasPublished) {
			console.log('⚠️ Media was published recently, skipping duplicate publish');
			// Skip the test or use different media
			test.skip();
			return;
		}

		console.log('✅ Media not published recently, safe to publish');
		// Proceed with publishing...
	});

	/**
	 * Example 4: Debugging Failed Tests
	 *
	 * Shows how to get diagnostic information when a test fails.
	 */
	test('Example 4: Get diagnostic info', async ({ request }) => {
		// This can be called at any time to debug issues
		await logStoriesDiagnostic(request);

		// Diagnostic info includes:
		// - Recent publishing logs from database
		// - Recent stories from Instagram API
		// - Analysis of missing/expired stories
		// - Troubleshooting suggestions
	});

	/**
	 * Example 5: Video Story Verification
	 *
	 * Videos require longer timeouts due to Instagram processing time.
	 */
	test('Example 5: Video story verification', async ({ page, request }) => {
		// Note: This is a skeleton example
		// For full video test, see instagram-publishing-live.spec.ts (LIVE-PUB-04)

		const testVideoPath = '/path/to/test-video.mp4'; // Replace with actual path

		// Upload video (similar to image)
		// ...

		// Publish video
		// ...

		// Extract media ID
		const mediaId = '123456789'; // Replace with actual extraction

		// ✅ VIDEO VERIFICATION: Uses longer timeouts automatically
		// Videos can take 30-90 seconds to process on Instagram
		await assertStoryPublished(request, mediaId, 'VIDEO');
	});
});

/**
 * Advanced Usage: Integration with Existing Tests
 */
test.describe('Integration Examples', () => {
	test.skip(() => process.env.CI === 'true', 'Skip in CI');
	test.skip(() => !process.env.ENABLE_REAL_IG_TESTS, 'Requires ENABLE_REAL_IG_TESTS=true');

	/**
	 * Example 6: Adding Verification to Existing Tests
	 *
	 * Shows how to add verification to tests that already publish stories.
	 */
	test('Example 6: Add verification to existing test', async ({ page, request }) => {
		await signInAsRealIG(page);
		await page.goto('/debug');

		// ... existing publishing code ...

		// After publishing succeeds, add verification:
		const pageText = await page.innerText('body');
		const mediaId = extractMediaId(pageText);

		if (mediaId) {
			// Quick verification - fails test if story not found
			await assertStoryPublished(request, mediaId);
		} else {
			console.warn('⚠️ Could not extract media ID, skipping verification');
		}
	});

	/**
	 * Example 7: Handling Verification Failures Gracefully
	 *
	 * Sometimes verification can fail due to Instagram issues.
	 * This shows how to handle failures without failing the entire test.
	 */
	test('Example 7: Graceful failure handling', async ({ page, request }) => {
		await signInAsRealIG(page);
		await page.goto('/debug');

		// ... publish story ...
		const mediaId = '123456789'; // Replace with actual

		try {
			await assertStoryPublished(request, mediaId);
			console.log('✅ Verification passed');
		} catch (error) {
			// Log error but don't fail test
			console.warn('⚠️ Verification failed, but publishing may have succeeded:', error);

			// Optional: Check if it's a known transient issue
			const diagnostic = await logStoriesDiagnostic(request);
			// Decide whether to fail test or continue based on diagnostic
		}
	});
});
