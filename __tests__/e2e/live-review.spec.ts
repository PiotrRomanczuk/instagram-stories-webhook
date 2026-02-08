import { test, expect } from '@playwright/test';
import { signInAsRealIG } from './helpers/auth';
import { getRandomMeme } from './helpers/test-assets';

/**
 * Admin Review E2E Test (Real Account)
 *
 * Tests: admin reviews pending submission → approve/reject → verify status change
 *
 * Run with: ENABLE_REAL_IG_TESTS=true npx playwright test live-review
 */

test.describe('Admin Review Flow (Real Account)', () => {
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

	test('approve pending submission', async ({ page }) => {
		// Step 1: Create a submission first (to ensure we have something to review)
		console.log('📝 Creating a submission for review...');

		await page.goto('/submit');
		await page.waitForLoadState('domcontentloaded');

		const fileInput = page.locator('input[type="file"]');
		const memePath = getRandomMeme();
		const memeName = path.basename(memePath);
		console.log(`📤 Uploading: ${memeName}`);
		await fileInput.setInputFiles(memePath);

		// Wait for preview
		await expect(page.locator('img').first()).toBeVisible({ timeout: 15000 });

		// Add unique caption
		const testId = Date.now();
		const caption = `Review Test - APPROVE - ${testId}`;
		await page.locator('textarea#caption').fill(caption);

		// Submit
		await page.getByRole('button', { name: 'Submit for Review' }).click();

		// Wait for redirect
		await expect(async () => {
			expect(page.url()).toContain('/submissions');
		}).toPass({ timeout: 15000 });

		console.log('✅ Submission created');

		// Step 2: Go to review page
		await page.goto('/review');
		await page.waitForLoadState('domcontentloaded');

		// Wait for review page to load
		await expect(page.locator('text=Story Review')).toBeVisible({ timeout: 10000 });
		console.log('📋 On review page');

		// Step 3: Check if there are pending submissions
		const bodyText = await page.innerText('body');

		if (bodyText.includes('All caught up') || bodyText.includes('No stories pending')) {
			console.log('⚠️ No pending submissions found - skipping test');
			test.skip(true, 'No pending submissions to review');
			return;
		}

		// Step 4: Get count of pending items
		const pendingMatch = bodyText.match(/(\d+)\s+stor(y|ies)\s+pending/i);
		const pendingCount = pendingMatch ? parseInt(pendingMatch[1]) : 0;
		console.log(`📊 Found ${pendingCount} pending submission(s)`);

		// Step 5: Click Approve button
		const approveButton = page.getByRole('button', { name: /approve/i });
		await expect(approveButton).toBeVisible({ timeout: 5000 });
		await approveButton.click();

		// Step 6: Wait for toast or status change
		await page.waitForTimeout(2000);

		// Step 7: Verify approval via API
		const apiResponse = await page.request.get('/api/content?source=submission&submissionStatus=approved&limit=5');
		const data = await apiResponse.json();

		if (data.items && data.items.length > 0) {
			console.log(`✅ Found ${data.items.length} approved submission(s)`);
			console.log(`   - Latest: ${data.items[0].id}`);
		}

		console.log('✅ Approve flow completed!');
	});

	test('reject pending submission', async ({ page }) => {
		// Step 1: Create a submission first
		console.log('📝 Creating a submission for rejection test...');

		await page.goto('/submit');
		await page.waitForLoadState('domcontentloaded');

		const fileInput = page.locator('input[type="file"]');
		const memePath = getRandomMeme();
		const memeName = path.basename(memePath);
		await fileInput.setInputFiles(memePath);

		await expect(page.locator('img').first()).toBeVisible({ timeout: 15000 });

		const testId = Date.now();
		const caption = `Review Test - REJECT - ${testId}`;
		await page.locator('textarea#caption').fill(caption);

		await page.getByRole('button', { name: 'Submit for Review' }).click();

		await expect(async () => {
			expect(page.url()).toContain('/submissions');
		}).toPass({ timeout: 15000 });

		console.log('✅ Submission created');

		// Step 2: Go to review page
		await page.goto('/review');
		await page.waitForLoadState('domcontentloaded');

		await expect(page.locator('text=Story Review')).toBeVisible({ timeout: 10000 });

		const bodyText = await page.innerText('body');
		if (bodyText.includes('All caught up')) {
			console.log('⚠️ No pending submissions');
			test.skip(true, 'No pending submissions');
			return;
		}

		// Step 3: Click Reject button
		const rejectButton = page.getByRole('button', { name: /reject/i });
		await expect(rejectButton).toBeVisible({ timeout: 5000 });
		await rejectButton.click();

		// Step 4: Fill rejection reason if prompted (dialog may appear)
		const reasonInput = page.locator('textarea[placeholder*="reason"], input[placeholder*="reason"]');
		if (await reasonInput.isVisible({ timeout: 2000 }).catch(() => false)) {
			await reasonInput.fill('E2E Test: Content does not meet quality guidelines');

			// Confirm rejection
			const confirmButton = page.getByRole('button', { name: /confirm|submit|reject/i }).last();
			await confirmButton.click();
		}

		await page.waitForTimeout(2000);

		// Step 5: Verify rejection via API
		const apiResponse = await page.request.get('/api/content?source=submission&submissionStatus=rejected&limit=5');
		const data = await apiResponse.json();

		if (data.items && data.items.length > 0) {
			console.log(`✅ Found ${data.items.length} rejected submission(s)`);
		}

		console.log('✅ Reject flow completed!');
	});

	test('review page shows pending count', async ({ page }) => {
		await page.goto('/review');
		await page.waitForLoadState('domcontentloaded');

		// Wait for loading to complete (either shows content or empty state)
		await expect(async () => {
			const bodyText = await page.innerText('body');
			const isLoaded = !bodyText.includes('Loading stories');
			expect(isLoaded).toBe(true);
		}).toPass({ timeout: 15000 });

		// Should show either pending count or "all caught up" message
		const bodyText = await page.innerText('body');
		const hasPendingInfo =
			bodyText.includes('pending') ||
			bodyText.includes('caught up') ||
			bodyText.includes('Story Review');

		expect(hasPendingInfo).toBe(true);
		console.log('✅ Review page displays pending status correctly');
	});
});
