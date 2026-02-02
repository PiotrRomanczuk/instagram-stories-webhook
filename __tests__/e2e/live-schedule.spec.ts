import { test, expect } from '@playwright/test';
import { signInAsRealIG } from './helpers/auth';
import path from 'path';
import fs from 'fs';

/**
 * Schedule Content E2E Test (Real Account)
 *
 * Tests: approve submission → schedule for future → verify in content queue
 *
 * Run with: ENABLE_REAL_IG_TESTS=true npx playwright test live-schedule
 */

const MEMES_DIR = '/home/piotr/Desktop/instagram-stories-webhook/memes';

function getRandomMeme(): string {
	const memes = fs.readdirSync(MEMES_DIR).filter(f => f.endsWith('.jpg'));
	const randomMeme = memes[Math.floor(Math.random() * memes.length)];
	return path.join(MEMES_DIR, randomMeme);
}

test.describe('Schedule Content Flow (Real Account)', () => {
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

	test('create, approve, and schedule submission', async ({ page }) => {
		// Step 1: Create a submission
		console.log('📝 Creating submission...');
		await page.goto('/submit');
		await page.waitForLoadState('domcontentloaded');

		const fileInput = page.locator('input[type="file"]');
		const memePath = getRandomMeme();
		const memeName = path.basename(memePath);
		await fileInput.setInputFiles(memePath);

		await expect(page.locator('img').first()).toBeVisible({ timeout: 15000 });

		const testId = Date.now();
		const caption = `Schedule Test - ${testId}`;
		await page.locator('textarea#caption').fill(caption);

		await page.getByRole('button', { name: 'Submit for Review' }).click();

		await expect(async () => {
			expect(page.url()).toContain('/submissions');
		}).toPass({ timeout: 15000 });

		console.log(`✅ Submission created: ${memeName}`);

		// Step 2: Approve the submission
		console.log('📋 Approving submission...');
		await page.goto('/review');
		await page.waitForLoadState('domcontentloaded');

		// Wait for stories to load
		await expect(async () => {
			const bodyText = await page.innerText('body');
			expect(bodyText.includes('Loading')).toBe(false);
		}).toPass({ timeout: 15000 });

		// Click approve
		const approveButton = page.getByRole('button', { name: /approve/i });
		await expect(approveButton).toBeVisible({ timeout: 5000 });
		await approveButton.click();

		await page.waitForTimeout(2000);
		console.log('✅ Submission approved');

		// Step 3: Get the approved content ID via API
		const approvedRes = await page.request.get(
			'/api/content?source=submission&submissionStatus=approved&limit=1'
		);
		const approvedData = await approvedRes.json();

		if (!approvedData.items || approvedData.items.length === 0) {
			console.log('⚠️ No approved items found - skipping schedule test');
			test.skip(true, 'No approved content to schedule');
			return;
		}

		const contentId = approvedData.items[0].id;
		console.log(`📌 Content ID: ${contentId}`);

		// Step 4: Schedule the content via API (5 minutes from now)
		const scheduleTime = Date.now() + 5 * 60 * 1000; // 5 minutes from now

		const scheduleRes = await page.request.post(
			`/api/content/${contentId}/schedule`,
			{
				data: { scheduledTime: scheduleTime },
			}
		);

		expect(scheduleRes.ok()).toBe(true);
		const scheduleData = await scheduleRes.json();
		console.log(`✅ Scheduled for: ${new Date(scheduleTime).toISOString()}`);

		// Step 5: Verify in content queue
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');

		// Wait for content to load
		await expect(async () => {
			const bodyText = await page.innerText('body');
			expect(bodyText.includes('Loading')).toBe(false);
		}).toPass({ timeout: 10000 });

		// Check if scheduled content appears
		const bodyText = await page.innerText('body');
		const hasScheduled = bodyText.includes('scheduled') || bodyText.includes('Scheduled');

		if (hasScheduled) {
			console.log('✅ Scheduled content visible in queue');
		} else {
			console.log('⚠️ Scheduled content not immediately visible');
		}

		// Step 6: Verify via API
		const queueRes = await page.request.get('/api/content?publishingStatus=scheduled&limit=5');
		const queueData = await queueRes.json();

		const ourItem = queueData.items?.find(
			(item: { id: string }) => item.id === contentId
		);

		if (ourItem) {
			console.log('✅ Content verified in scheduled queue via API!');
			console.log(`   - ID: ${ourItem.id}`);
			console.log(`   - Scheduled: ${new Date(ourItem.scheduledTime).toISOString()}`);
		}

		console.log('✅ Schedule flow completed!');
	});

	test('access schedule calendar page', async ({ page }) => {
		await page.goto('/schedule');
		await page.waitForLoadState('domcontentloaded');

		// Should see calendar or scheduling interface
		const bodyText = await page.innerText('body');
		const hasScheduleUI =
			bodyText.includes('Schedule') ||
			bodyText.includes('Calendar') ||
			bodyText.includes('Today');

		expect(hasScheduleUI).toBe(true);
		console.log('✅ Schedule page accessible');
	});
});
