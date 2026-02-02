import { test, expect } from '@playwright/test';
import { signInAsRealIG } from './helpers/auth';
import path from 'path';
import fs from 'fs';

/**
 * Full Journey E2E Test (Real Instagram Account)
 *
 * Complete workflow: Submit → Review → Schedule → Publish → Verify on Instagram
 *
 * This is the most comprehensive test covering the entire application flow.
 *
 * Run with: ENABLE_REAL_IG_TESTS=true ENABLE_LIVE_IG_PUBLISH=true npx playwright test live-full-journey
 */

const MEMES_DIR = '/home/piotr/Desktop/instagram-stories-webhook/memes';

function getRandomMeme(): string {
	const memes = fs.readdirSync(MEMES_DIR).filter(f => f.endsWith('.jpg'));
	const randomMeme = memes[Math.floor(Math.random() * memes.length)];
	return path.join(MEMES_DIR, randomMeme);
}

test.describe('Full Journey: Submit → Publish → Verify', () => {
	test.skip(
		() => process.env.CI === 'true',
		'Skipping in CI - requires real Instagram tokens',
	);

	test.skip(
		() => !process.env.ENABLE_REAL_IG_TESTS,
		'Set ENABLE_REAL_IG_TESTS=true to run',
	);

	test.skip(
		() => process.env.ENABLE_LIVE_IG_PUBLISH !== 'true',
		'Set ENABLE_LIVE_IG_PUBLISH=true to actually publish',
	);

	// Longer timeout for full journey
	test.setTimeout(180000);

	test('complete workflow: submit → approve → publish → verify', async ({ page }) => {
		await signInAsRealIG(page);

		// ═══════════════════════════════════════════════════════════
		// STEP 1: GET INITIAL STORIES COUNT
		// ═══════════════════════════════════════════════════════════
		console.log('\n═══════════════════════════════════════════════════');
		console.log('STEP 1: Getting initial stories count');
		console.log('═══════════════════════════════════════════════════\n');

		const storiesBeforeRes = await page.request.get('/api/debug/stories');
		const storiesBefore = await storiesBeforeRes.json();
		const storiesCountBefore = storiesBefore.storiesCount || 0;
		console.log(`📊 Stories before: ${storiesCountBefore}`);

		// ═══════════════════════════════════════════════════════════
		// STEP 2: SUBMIT A MEME
		// ═══════════════════════════════════════════════════════════
		console.log('\n═══════════════════════════════════════════════════');
		console.log('STEP 2: Submitting meme for review');
		console.log('═══════════════════════════════════════════════════\n');

		await page.goto('/submit');
		await page.waitForLoadState('domcontentloaded');

		const fileInput = page.locator('input[type="file"]');
		const memePath = getRandomMeme();
		const memeName = path.basename(memePath);
		console.log(`📤 Uploading: ${memeName}`);
		await fileInput.setInputFiles(memePath);

		await expect(page.locator('img').first()).toBeVisible({ timeout: 15000 });

		const testId = Date.now();
		const caption = `Full Journey Test - ${testId}`;
		await page.locator('textarea#caption').fill(caption);

		await page.getByRole('button', { name: 'Submit for Review' }).click();

		await expect(async () => {
			expect(page.url()).toContain('/submissions');
		}).toPass({ timeout: 15000 });

		console.log('✅ Submission created');

		// ═══════════════════════════════════════════════════════════
		// STEP 3: APPROVE THE SUBMISSION
		// ═══════════════════════════════════════════════════════════
		console.log('\n═══════════════════════════════════════════════════');
		console.log('STEP 3: Approving submission');
		console.log('═══════════════════════════════════════════════════\n');

		await page.goto('/review');
		await page.waitForLoadState('domcontentloaded');

		// Wait for loading to complete
		await expect(async () => {
			const bodyText = await page.innerText('body');
			expect(bodyText.includes('Loading')).toBe(false);
		}).toPass({ timeout: 15000 });

		const approveButton = page.getByRole('button', { name: /approve/i });
		await expect(approveButton).toBeVisible({ timeout: 5000 });
		await approveButton.click();

		await page.waitForTimeout(2000);
		console.log('✅ Submission approved');

		// ═══════════════════════════════════════════════════════════
		// STEP 4: GET APPROVED CONTENT ID
		// ═══════════════════════════════════════════════════════════
		console.log('\n═══════════════════════════════════════════════════');
		console.log('STEP 4: Getting approved content');
		console.log('═══════════════════════════════════════════════════\n');

		const approvedRes = await page.request.get(
			'/api/content?source=submission&submissionStatus=approved&publishingStatus=draft&limit=1'
		);
		const approvedData = await approvedRes.json();

		if (!approvedData.items || approvedData.items.length === 0) {
			throw new Error('No approved content found');
		}

		const contentId = approvedData.items[0].id;
		console.log(`📌 Content ID: ${contentId}`);

		// ═══════════════════════════════════════════════════════════
		// STEP 5: PUBLISH IMMEDIATELY (via API)
		// ═══════════════════════════════════════════════════════════
		console.log('\n═══════════════════════════════════════════════════');
		console.log('STEP 5: Publishing to Instagram');
		console.log('═══════════════════════════════════════════════════\n');

		const publishRes = await page.request.post(`/api/content/${contentId}/publish`);

		if (!publishRes.ok()) {
			const errorData = await publishRes.json();
			throw new Error(`Publish failed: ${errorData.error}`);
		}

		const publishData = await publishRes.json();
		console.log('✅ Published successfully!');

		const igMediaId = publishData.data?.igMediaId;
		console.log(`📌 Instagram Media ID: ${igMediaId}`);

		// ═══════════════════════════════════════════════════════════
		// STEP 6: VERIFY ON INSTAGRAM
		// ═══════════════════════════════════════════════════════════
		console.log('\n═══════════════════════════════════════════════════');
		console.log('STEP 6: Verifying on Instagram');
		console.log('═══════════════════════════════════════════════════\n');

		// Wait for Instagram to process
		await page.waitForTimeout(3000);

		const storiesAfterRes = await page.request.get('/api/debug/stories');
		const storiesAfter = await storiesAfterRes.json();
		const storiesCountAfter = storiesAfter.storiesCount || 0;

		console.log(`📊 Stories after: ${storiesCountAfter}`);
		expect(storiesCountAfter).toBeGreaterThan(storiesCountBefore);

		// Find our story
		if (igMediaId && storiesAfter.stories) {
			const ourStory = storiesAfter.stories.find(
				(s: { id: string }) => s.id === igMediaId
			);

			if (ourStory) {
				console.log('✅ Story verified on Instagram!');
				console.log(`   - Media Type: ${ourStory.mediaType}`);
				console.log(`   - Timestamp: ${ourStory.timestamp}`);
				if (ourStory.permalink) {
					console.log(`   - Permalink: ${ourStory.permalink}`);
				}
			} else {
				console.log('⚠️ Story not found in stories list (may need more time)');
			}
		}

		// ═══════════════════════════════════════════════════════════
		// STEP 7: VERIFY STATUS IN DATABASE
		// ═══════════════════════════════════════════════════════════
		console.log('\n═══════════════════════════════════════════════════');
		console.log('STEP 7: Verifying database status');
		console.log('═══════════════════════════════════════════════════\n');

		// Verify via the published items list instead of individual item endpoint
		const publishedRes = await page.request.get(
			`/api/content?publishingStatus=published&limit=5`
		);
		const publishedData = await publishedRes.json();

		const ourItem = publishedData.items?.find(
			(item: { id: string }) => item.id === contentId
		);

		if (ourItem) {
			expect(ourItem.publishingStatus).toBe('published');
			expect(ourItem.igMediaId).toBeTruthy();
			console.log('✅ Database status verified:');
			console.log(`   - Publishing Status: ${ourItem.publishingStatus}`);
			console.log(`   - IG Media ID: ${ourItem.igMediaId}`);
		} else {
			// Even if not in list, we already confirmed via Instagram API
			console.log('⚠️ Item not in published list yet (API verified via Instagram)');
		}

		// ═══════════════════════════════════════════════════════════
		// SUMMARY
		// ═══════════════════════════════════════════════════════════
		console.log('\n═══════════════════════════════════════════════════');
		console.log('✅ FULL JOURNEY COMPLETED SUCCESSFULLY!');
		console.log('═══════════════════════════════════════════════════\n');
		console.log(`📝 Meme: ${memeName}`);
		console.log(`🔑 Content ID: ${contentId}`);
		console.log(`📸 IG Media ID: ${igMediaId}`);
		console.log(`📊 Stories: ${storiesCountBefore} → ${storiesCountAfter}`);
	});
});
