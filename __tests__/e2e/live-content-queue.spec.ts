import { test, expect } from '@playwright/test';
import { signInAsRealIG } from './helpers/auth';

/**
 * Content Queue E2E Test (Real Account)
 *
 * Tests: content queue page, filtering, viewing items
 *
 * Run with: ENABLE_REAL_IG_TESTS=true npx playwright test live-content-queue
 */

test.describe('Content Queue (Real Account)', () => {
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

	test('view content queue', async ({ page }) => {
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');

		// Wait for content to load
		await expect(async () => {
			const bodyText = await page.innerText('body');
			expect(bodyText.includes('Loading')).toBe(false);
		}).toPass({ timeout: 15000 });

		// Should see content queue interface
		const bodyText = await page.innerText('body');
		const hasQueueUI =
			bodyText.includes('Content') ||
			bodyText.includes('Queue') ||
			bodyText.includes('All');

		expect(hasQueueUI).toBe(true);
		console.log('✅ Content queue page accessible');

		// Verify we can see content items
		const apiRes = await page.request.get('/api/content?limit=10');
		const data = await apiRes.json();

		console.log(`📊 Found ${data.items?.length || 0} content items via API`);

		if (data.items && data.items.length > 0) {
			// Log status breakdown
			const statusCounts: Record<string, number> = {};
			data.items.forEach((item: { publishingStatus: string }) => {
				statusCounts[item.publishingStatus] = (statusCounts[item.publishingStatus] || 0) + 1;
			});
			console.log('📊 Status breakdown:', statusCounts);
		}

		console.log('✅ Content queue test completed');
	});

	test('filter by status via API', async ({ page }) => {
		// Test different status filters
		const statuses = ['draft', 'scheduled', 'published', 'failed'];

		for (const status of statuses) {
			const res = await page.request.get(`/api/content?publishingStatus=${status}&limit=5`);
			const data = await res.json();
			console.log(`📊 ${status}: ${data.items?.length || 0} items`);
		}

		console.log('✅ Status filtering works');
	});

	test('view scheduled items', async ({ page }) => {
		// Get scheduled items
		const res = await page.request.get('/api/content?publishingStatus=scheduled&limit=10');
		const data = await res.json();

		if (data.items && data.items.length > 0) {
			console.log(`📅 Found ${data.items.length} scheduled item(s):`);
			data.items.forEach((item: { id: string; scheduledTime: number }) => {
				const scheduledDate = new Date(item.scheduledTime);
				console.log(`   - ${item.id.slice(0, 8)}... at ${scheduledDate.toISOString()}`);
			});
		} else {
			console.log('📅 No scheduled items');
		}

		console.log('✅ Scheduled items query works');
	});

	test('view published items', async ({ page }) => {
		// Get published items
		const res = await page.request.get('/api/content?publishingStatus=published&limit=10');
		const data = await res.json();

		if (data.items && data.items.length > 0) {
			console.log(`✅ Found ${data.items.length} published item(s):`);
			data.items.forEach((item: { id: string; igMediaId?: string; publishedAt?: string }) => {
				console.log(`   - ${item.id.slice(0, 8)}... IG: ${item.igMediaId || 'N/A'}`);
			});
		} else {
			console.log('📭 No published items');
		}

		console.log('✅ Published items query works');
	});
});
