import { test, expect, Page } from '@playwright/test';
import { signInAsAdmin } from './helpers/auth';

/**
 * Dashboard Statistics E2E Tests
 *
 * Verifies that admin dashboard statistics accurately reflect the actual data
 * by comparing dashboard stats with API responses (same data source).
 */

// Configure retries for flaky auth
test.describe.configure({ retries: 2 });

// Helper: Robust sign-in with verification
async function signInAndVerify(page: Page) {
	await signInAsAdmin(page);

	// Verify we're actually signed in by checking we're not on sign-in page
	const url = page.url();
	if (url.includes('/auth/signin')) {
		// Auth failed, try one more time
		await page.reload();
		await page.waitForTimeout(1000);
		await signInAsAdmin(page);
	}

	// Final check - if still on sign-in, the test will fail with a clear message
	await expect(page).not.toHaveURL(/\/auth\/signin/, { timeout: 5000 });
}

// Helper: Wait for dashboard stats to load (skeletons disappear)
async function waitForDashboardLoad(page: Page) {
	// First wait for the page to be in a stable state
	await page.waitForLoadState('domcontentloaded');

	// Wait for either skeletons to disappear OR stats to be visible
	await Promise.race([
		page.waitForFunction(() => {
			const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
			return skeletons.length === 0;
		}, { timeout: 15000 }),
		page.waitForSelector('text=Pending Review', { state: 'visible', timeout: 15000 }),
	]);

	// Additional wait to ensure stats are rendered
	await page.waitForSelector('text=Pending Review', { state: 'visible', timeout: 10000 });
}

// Helper: Get stat value by label text from dashboard
async function getStatByLabel(page: Page, label: string): Promise<number | string> {
	// Stats card structure: label is in p.text-sm.font-medium.text-muted-foreground
	// Value is in sibling p.text-3xl.font-bold
	const statsCard = page.locator(`text=${label}`).locator('xpath=..').locator('p.text-3xl');
	const valueText = await statsCard.innerText();

	// Return as number if numeric, otherwise as string (e.g., "OK" for API Quota)
	const numValue = parseInt(valueText, 10);
	return isNaN(numValue) ? valueText : numValue;
}

// Helper: Fetch content via API
async function fetchContentFromAPI(page: Page, queryParams = ''): Promise<unknown[]> {
	return await page.evaluate(async (params) => {
		const response = await fetch(`/api/content?limit=100${params ? '&' + params : ''}`);
		const data = await response.json();
		return data.items || data.data || [];
	}, queryParams);
}

// Helper: Fetch users via API
async function fetchUsersFromAPI(page: Page): Promise<unknown[]> {
	return await page.evaluate(async () => {
		const response = await fetch('/api/users');
		const data = await response.json();
		return data.users || [];
	});
}

test.describe('Dashboard Statistics Verification', () => {
	/**
	 * DS-01: Pending Review Stat Matches API Data
	 * Priority: P0
	 *
	 * Verifies that the "Pending Review" stat on the dashboard matches
	 * the count of pending submissions from the API.
	 */
	test('DS-01: pending review stat matches API data', async ({ page }) => {
		// Sign in as admin and go to dashboard
		await signInAndVerify(page);
		await page.goto('/');
		await waitForDashboardLoad(page);

		// Get the pending review stat from dashboard
		const dashboardPendingReview = await getStatByLabel(page, 'Pending Review');

		// Fetch content via API and calculate pending review count
		const allItems = await fetchContentFromAPI(page);

		// Calculate pending review count (same logic as dashboard)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const pendingReviewCount = allItems.filter((item: any) =>
			item.source === 'submission' && item.submissionStatus === 'pending'
		).length;

		// Compare counts
		expect(dashboardPendingReview).toBe(pendingReviewCount);
	});

	/**
	 * DS-02: Scheduled Today Stat Matches API Data
	 * Priority: P0
	 *
	 * Verifies that the "Scheduled Today" stat on the dashboard matches
	 * the count of items scheduled for today from the API.
	 */
	test('DS-02: scheduled today stat matches API data', async ({ page }) => {
		// Sign in as admin and go to dashboard
		await signInAndVerify(page);
		await page.goto('/');
		await waitForDashboardLoad(page);

		// Get the scheduled today stat from dashboard
		const dashboardScheduledToday = await getStatByLabel(page, 'Scheduled Today');

		// Fetch content via API
		const allItems = await fetchContentFromAPI(page);

		// Calculate scheduled today count (same logic as dashboard)
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const todayTimestamp = today.getTime();

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const scheduledTodayCount = allItems.filter((item: any) =>
			item.publishingStatus === 'scheduled' &&
			item.scheduledTime &&
			item.scheduledTime >= todayTimestamp &&
			item.scheduledTime < todayTimestamp + 86400000
		).length;

		// Compare counts
		expect(dashboardScheduledToday).toBe(scheduledTodayCount);
	});

	/**
	 * DS-03: Published Today Stat Matches API Data
	 * Priority: P1
	 *
	 * Verifies that the "Published Today" stat on the dashboard matches
	 * the count of items published today from the API.
	 */
	test('DS-03: published today stat matches API data', async ({ page }) => {
		// Sign in as admin and go to dashboard
		await signInAndVerify(page);
		await page.goto('/');
		await waitForDashboardLoad(page);

		// Get the published today stat from dashboard
		const dashboardPublishedToday = await getStatByLabel(page, 'Published Today');

		// Fetch content via API
		const allItems = await fetchContentFromAPI(page);

		// Calculate published today count (same logic as dashboard)
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const todayTimestamp = today.getTime();

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const publishedTodayCount = allItems.filter((item: any) =>
			item.publishingStatus === 'published' &&
			item.publishedAt &&
			new Date(item.publishedAt).getTime() >= todayTimestamp
		).length;

		// Compare counts
		expect(dashboardPublishedToday).toBe(publishedTodayCount);
	});

	/**
	 * DS-04: Failed Stat Matches API Data
	 * Priority: P0
	 *
	 * Verifies that the "Failed" stat on the dashboard matches
	 * the count of failed items from the API.
	 */
	test('DS-04: failed stat matches API data', async ({ page }) => {
		// Sign in as admin and go to dashboard
		await signInAndVerify(page);
		await page.goto('/');
		await waitForDashboardLoad(page);

		// Get the failed stat from dashboard
		const dashboardFailed = await getStatByLabel(page, 'Failed');

		// Fetch content via API
		const allItems = await fetchContentFromAPI(page);

		// Calculate failed count (same logic as dashboard)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const failedCount = allItems.filter((item: any) =>
			item.publishingStatus === 'failed'
		).length;

		// Compare counts
		expect(dashboardFailed).toBe(failedCount);
	});

	/**
	 * DS-05: Total Users Stat Matches API Data
	 * Priority: P0
	 *
	 * Verifies that the "Total Users" stat on the dashboard matches
	 * the count of users from the API.
	 */
	test('DS-05: total users stat matches API data', async ({ page }) => {
		// Sign in as admin and go to dashboard
		await signInAndVerify(page);
		await page.goto('/');
		await waitForDashboardLoad(page);

		// Get the total users stat from dashboard
		const dashboardTotalUsers = await getStatByLabel(page, 'Total Users');

		// Fetch users via API
		const users = await fetchUsersFromAPI(page);

		// Compare counts
		expect(dashboardTotalUsers).toBe(users.length);
	});

	/**
	 * DS-06: All Stats Are Non-Negative Numbers
	 * Priority: P1
	 *
	 * Verifies that all numeric stats on the dashboard are valid non-negative numbers.
	 */
	test('DS-06: all numeric stats are non-negative', async ({ page }) => {
		// Sign in as admin and go to dashboard
		await signInAndVerify(page);
		await page.goto('/');
		await waitForDashboardLoad(page);

		// Get all numeric stats
		const pendingReview = await getStatByLabel(page, 'Pending Review');
		const scheduledToday = await getStatByLabel(page, 'Scheduled Today');
		const publishedToday = await getStatByLabel(page, 'Published Today');
		const failed = await getStatByLabel(page, 'Failed');
		const totalUsers = await getStatByLabel(page, 'Total Users');
		const apiQuota = await getStatByLabel(page, 'API Quota');

		// Verify numeric stats are non-negative
		expect(typeof pendingReview).toBe('number');
		expect(pendingReview as number).toBeGreaterThanOrEqual(0);

		expect(typeof scheduledToday).toBe('number');
		expect(scheduledToday as number).toBeGreaterThanOrEqual(0);

		expect(typeof publishedToday).toBe('number');
		expect(publishedToday as number).toBeGreaterThanOrEqual(0);

		expect(typeof failed).toBe('number');
		expect(failed as number).toBeGreaterThanOrEqual(0);

		expect(typeof totalUsers).toBe('number');
		expect(totalUsers as number).toBeGreaterThanOrEqual(0);

		// API Quota is a string ("OK")
		expect(apiQuota).toBe('OK');
	});
});
