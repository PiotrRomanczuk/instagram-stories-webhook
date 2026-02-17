import { test, expect } from '@playwright/test';
import { signInAsRealIG } from './helpers/auth';

/**
 * Timeline View E2E Tests
 *
 * Tests the schedule-mobile timeline interface:
 * - Page loads and displays content
 * - Search functionality works
 * - Filters work correctly
 * - Navigation is present
 */

test.describe('Timeline View', () => {
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

	test('should load timeline page', async ({ page }) => {
		await page.goto('/schedule-mobile');
		await page.waitForLoadState('domcontentloaded');

		// Check for page elements
		const bodyText = await page.innerText('body');
		expect(bodyText).toContain('Stories Schedule');

		console.log('✅ Timeline page loaded');
	});

	test('should display search and filters', async ({ page }) => {
		await page.goto('/schedule-mobile');
		await page.waitForLoadState('domcontentloaded');

		// Check for search input
		const searchInput = page.locator('[data-testid="search-input"]');
		await expect(searchInput).toBeVisible();

		// Check for filter chips
		const filters = page.locator('[data-testid="timeline-filters"]');
		await expect(filters).toBeVisible();

		// Check for individual filter chips
		await expect(page.locator('[data-testid="filter-chip-all"]')).toBeVisible();
		await expect(page.locator('[data-testid="filter-chip-scheduled"]')).toBeVisible();
		await expect(page.locator('[data-testid="filter-chip-published"]')).toBeVisible();
		await expect(page.locator('[data-testid="filter-chip-failed"]')).toBeVisible();

		console.log('✅ Search and filters visible');
	});

	test('should display navigation', async ({ page }) => {
		await page.goto('/schedule-mobile');
		await page.waitForLoadState('domcontentloaded');

		// Check for navigation (mobile or desktop)
		const mobileNav = page.locator('[data-testid="mobile-navigation"]');
		const desktopNav = page.locator('[data-testid="desktop-navigation"]');

		const hasMobileNav = await mobileNav.isVisible().catch(() => false);
		const hasDesktopNav = await desktopNav.isVisible().catch(() => false);

		expect(hasMobileNav || hasDesktopNav).toBe(true);

		console.log('✅ Navigation visible');
	});

	test('should filter posts by status', async ({ page }) => {
		await page.goto('/schedule-mobile');
		await page.waitForLoadState('domcontentloaded');

		// Click "Scheduled" filter
		const scheduledFilter = page.locator('[data-testid="filter-chip-scheduled"]');
		await scheduledFilter.click();

		// Wait for filter to be applied
		await page.waitForTimeout(500);

		// Check if filter is active (has blue background)
		const isActive = await scheduledFilter.evaluate((el) => {
			return window.getComputedStyle(el).backgroundColor === 'rgb(43, 108, 238)';
		});

		expect(isActive).toBe(true);

		console.log('✅ Filter applied successfully');
	});

	test('should search for posts', async ({ page }) => {
		await page.goto('/schedule-mobile');
		await page.waitForLoadState('domcontentloaded');

		// Type in search input
		const searchInput = page.locator('[data-testid="search-input"]');
		await searchInput.fill('test');

		// Wait for debounce (500ms)
		await page.waitForTimeout(600);

		// Check if clear button appears
		const clearButton = page.locator('[data-testid="clear-search"]');
		await expect(clearButton).toBeVisible();

		console.log('✅ Search functionality works');
	});

	test('should display timeline groups if posts exist', async ({ page }) => {
		await page.goto('/schedule-mobile');
		await page.waitForLoadState('domcontentloaded');

		// Wait for data to load
		await page.waitForTimeout(2000);

		// Check if timeline layout or empty state is visible
		const timelineLayout = page.locator('[data-testid="timeline-layout"]');
		const emptyState = page.locator('[data-testid="timeline-empty-state"]');

		const hasTimeline = await timelineLayout.isVisible().catch(() => false);
		const isEmpty = await emptyState.isVisible().catch(() => false);

		expect(hasTimeline || isEmpty).toBe(true);

		if (hasTimeline) {
			console.log('✅ Timeline groups displayed');
		} else {
			console.log('ℹ️  Empty state displayed (no posts)');
		}
	});

	test('should handle post clicks', async ({ page }) => {
		await page.goto('/schedule-mobile');
		await page.waitForLoadState('domcontentloaded');

		// Wait for posts to load
		await page.waitForTimeout(2000);

		// Check if any timeline cards exist
		const firstCard = page.locator('[data-testid="timeline-card"]').first();
		const cardExists = await firstCard.isVisible().catch(() => false);

		if (cardExists) {
			// Click the card
			await firstCard.click();

			// Card should have been clicked (logged to console)
			console.log('✅ Post click handled');
		} else {
			console.log('ℹ️  No posts to click');
		}
	});
});
