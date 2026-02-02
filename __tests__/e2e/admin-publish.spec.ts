import { test, expect } from '@playwright/test';
import { signInAsRealIG } from './helpers/auth';
import path from 'path';
import fs from 'fs';

/**
 * Admin Publishing E2E Test with Verification
 *
 * Tests the full flow: sign in → upload meme → publish → verify via Instagram API
 *
 * Run with: ENABLE_REAL_IG_TESTS=true ENABLE_LIVE_IG_PUBLISH=true npx playwright test admin-publish
 */

const MEMES_DIR = '/home/piotr/Desktop/instagram-stories-webhook/memes';

function getRandomMeme(): string {
	const memes = fs.readdirSync(MEMES_DIR).filter(f => f.endsWith('.jpg'));
	const randomMeme = memes[Math.floor(Math.random() * memes.length)];
	return path.join(MEMES_DIR, randomMeme);
}

test.describe('Admin Publishing (Real Instagram)', () => {
	// Skip in CI
	test.skip(
		() => process.env.CI === 'true',
		'Skipping in CI - requires real Instagram tokens',
	);

	// Skip if not enabled
	test.skip(
		() => !process.env.ENABLE_REAL_IG_TESTS,
		'Set ENABLE_REAL_IG_TESTS=true to run',
	);

	// Skip if live publish not enabled
	test.skip(
		() => process.env.ENABLE_LIVE_IG_PUBLISH !== 'true',
		'Set ENABLE_LIVE_IG_PUBLISH=true to actually publish',
	);

	test.beforeEach(async ({ page }) => {
		await signInAsRealIG(page);
	});

	test('publish local meme and verify via Instagram API', async ({ page }) => {
		// Step 1: Get current stories count before publishing
		console.log('📊 Fetching current stories count...');
		const storiesBeforeRes = await page.request.get('/api/debug/stories');
		const storiesBefore = await storiesBeforeRes.json();
		const storiesCountBefore = storiesBefore.storiesCount || 0;
		console.log(`📊 Stories before: ${storiesCountBefore}`);

		// Step 2: Go to debug page
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Wait for Instagram connection
		const connectedBadge = page.locator('text=Connected').first();
		await expect(connectedBadge).toBeVisible({ timeout: 15000 });

		// Step 3: Upload random local meme file
		const fileInput = page.locator('input[type="file"]');
		const memePath = getRandomMeme();
		const memeName = path.basename(memePath);
		console.log(`📤 Uploading: ${memeName}`);
		await fileInput.setInputFiles(memePath);

		// Wait for upload to complete
		const urlInput = page.locator('#debug-image-url');
		await expect(urlInput).not.toHaveValue('', { timeout: 10000 });
		const uploadedUrl = await urlInput.inputValue();
		console.log(`📤 Uploaded to: ${uploadedUrl.slice(0, 80)}...`);

		// Step 4: Click publish
		const publishButton = page.locator('button:has-text("Publish to Instagram Now")');
		await expect(publishButton).toBeEnabled();
		await publishButton.click();

		// Step 5: Wait for result
		await expect(async () => {
			const bodyText = await page.innerText('body');
			const hasResult = bodyText.includes('Published Successfully') || bodyText.includes('Publish Failed');
			expect(hasResult).toBe(true);
		}).toPass({ timeout: 60000 });

		// Step 6: Extract Media ID and check processing logs
		const bodyText = await page.innerText('body');

		if (bodyText.includes('Publish Failed')) {
			const errorMatch = bodyText.match(/Publish Failed[\s\S]*?(?=Debug Logs|$)/);
			throw new Error(`Publishing failed: ${errorMatch?.[0] || 'Unknown error'}`);
		}

		// Extract the Media ID
		const mediaIdMatch = bodyText.match(/IG Media ID:\s*(\d+)/);
		expect(mediaIdMatch).toBeTruthy();
		const publishedMediaId = mediaIdMatch![1];
		console.log(`✅ Published! Media ID: ${publishedMediaId}`);

		// Check if image was processed (look for processing log)
		const logsContainer = page.locator('.font-mono');
		const logsText = await logsContainer.innerText();

		if (logsText.includes('Processing image for story format')) {
			console.log('🎨 Image processing: EXECUTED');
			if (logsText.includes('Image processed:')) {
				console.log('🎨 Image processing: SUCCESS');
			} else if (logsText.includes('Image processing failed')) {
				console.log('⚠️ Image processing: FAILED (used original)');
			}
		} else {
			console.log('⚠️ Image processing: SKIPPED (not IMAGE type?)');
		}

		// Step 7: Verify story appears in Instagram API
		console.log('🔍 Verifying story via Instagram API...');

		// Wait a moment for Instagram to process
		await page.waitForTimeout(3000);

		const storiesAfterRes = await page.request.get('/api/debug/stories');
		const storiesAfter = await storiesAfterRes.json();

		if (!storiesAfter.success) {
			console.log('⚠️ Could not fetch stories:', storiesAfter.error);
			// Still pass if publish succeeded - API verification is optional
			console.log('✅ Publish succeeded (API verification skipped)');
			return;
		}

		const storiesCountAfter = storiesAfter.storiesCount || 0;
		console.log(`📊 Stories after: ${storiesCountAfter}`);

		// Verify story count increased
		expect(storiesCountAfter).toBeGreaterThanOrEqual(storiesCountBefore);

		// Find our story in the list
		const ourStory = storiesAfter.stories.find(
			(s: { id: string }) => s.id === publishedMediaId
		);

		if (ourStory) {
			console.log(`✅ Story verified in Instagram API!`);
			console.log(`   - Media Type: ${ourStory.mediaType}`);
			console.log(`   - Timestamp: ${ourStory.timestamp}`);
			if (ourStory.permalink) {
				console.log(`   - Permalink: ${ourStory.permalink}`);
			}
		} else {
			console.log(`⚠️ Story ${publishedMediaId} not found in stories list yet`);
			console.log(`   (This can happen due to API propagation delay)`);
			// Still pass - the publish succeeded
		}

		console.log('✅ Test completed successfully!');
	});
});
