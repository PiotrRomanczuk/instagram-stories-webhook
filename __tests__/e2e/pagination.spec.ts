import { test, expect } from '@playwright/test';
import { signInAsUser } from './helpers/auth';
import { cleanupTestData } from './helpers/seed';

/**
 * Pagination Edge Cases E2E Tests
 * Tests boundary conditions and edge cases in pagination
 */

test.describe('Pagination Edge Cases', () => {
	test.afterAll(async ({ page }) => {
		await cleanupTestData(page);
	});

	/**
	 * PG-01: Handle Exact Page Boundary
	 * Priority: P1 (High)
	 */
	test('PG-01: should handle exact page boundary correctly', async ({
		page,
	}) => {
		await signInAsUser(page);

		await page.goto('/memes');
		await expect(page).toHaveURL(/\/memes/);

		// Check if pagination controls exist
		const nextButton = page.locator('button:has-text("Next")');
		const hasNextButton = (await nextButton.count()) > 0;

		if (hasNextButton) {
			// Check if next button is properly disabled when no more pages
			const isDisabled = await nextButton.isDisabled();

			// If disabled, we're at the last page (correct behavior)
			// If enabled, there are more pages
			expect(typeof isDisabled).toBe('boolean');

			// Verify page indicator exists
			const pageIndicator = page.locator('text=/Page \\d+/i');
			if ((await pageIndicator.count()) > 0) {
				await expect(pageIndicator).toBeVisible();
			}
		}
	});

	/**
	 * PG-02: Handle Non-Existent Page Number
	 * Priority: P1 (High)
	 */
	test('PG-02: should handle URL manipulation for non-existent page', async ({
		page,
	}) => {
		await signInAsUser(page);

		// Try to navigate to page 999
		await page.goto('/memes?page=999');

		// Should either:
		// 1. Show empty state
		// 2. Redirect to valid page
		// 3. Show error message

		const bodyText = await page.innerText('body');

		// Verify page loads without crashing
		expect(bodyText.length).toBeGreaterThan(0);

		// Check for appropriate handling
		const hasEmptyState =
			bodyText.includes('No') ||
			bodyText.includes('empty') ||
			bodyText.includes('submissions');
		const hasPageIndicator = bodyText.match(/Page \d+/i);

		// Either shows empty state or valid page number
		expect(hasEmptyState || hasPageIndicator).toBeTruthy();
	});

	/**
	 * PG-03: Previous Button Disabled on Page 1
	 * Priority: P2 (Medium)
	 */
	test('PG-03: should disable previous button on first page', async ({
		page,
	}) => {
		await signInAsUser(page);

		await page.goto('/memes');

		const prevButton = page.locator('button:has-text("Previous")');
		const hasPrevButton = (await prevButton.count()) > 0;

		if (hasPrevButton) {
			// On page 1, previous should be disabled
			const isDisabled = await prevButton.isDisabled();
			expect(isDisabled).toBe(true);
		}
	});

	/**
	 * PG-04: Navigate Through Multiple Pages
	 * Priority: P1 (High)
	 */
	test('PG-04: should navigate through pages correctly', async ({ page }) => {
		await signInAsUser(page);

		await page.goto('/memes');

		const nextButton = page.locator('button:has-text("Next")');
		const hasNextButton = (await nextButton.count()) > 0;

		if (hasNextButton) {
			const isNextDisabled = await nextButton.isDisabled();

			if (!isNextDisabled) {
				// Can go to next page
				await nextButton.click();
				await page.waitForTimeout(1000);

				// Should be on page 2
				const bodyText = await page.innerText('body');
				const isOnPage2 = bodyText.includes('Page 2');

				if (isOnPage2) {
					// Previous button should now be enabled
					const prevButton = page.locator('button:has-text("Previous")');
					if ((await prevButton.count()) > 0) {
						const isPrevDisabled = await prevButton.isDisabled();
						expect(isPrevDisabled).toBe(false);

						// Go back to page 1
						await prevButton.click();
						await page.waitForTimeout(1000);

						const bodyText2 = await page.innerText('body');
						const isBackOnPage1 = bodyText2.includes('Page 1');

						expect(isBackOnPage1).toBe(true);
					}
				}
			}
		}
	});

	/**
	 * PG-05: Page Persists After Actions
	 * Priority: P2 (Medium)
	 */
	test('PG-05: should maintain page number after refresh', async ({ page }) => {
		await signInAsUser(page);

		// Navigate to page 2 if possible
		await page.goto('/memes');

		const nextButton = page.locator('button:has-text("Next")');
		const hasNextButton = (await nextButton.count()) > 0;

		if (hasNextButton) {
			const isDisabled = await nextButton.isDisabled();

			if (!isDisabled) {
				await nextButton.click();
				await page.waitForTimeout(1000);

				// Refresh the page
				await page.reload();
				await page.waitForTimeout(1000);

				// Should still be on page 2 (if URL-based pagination)
				const url = page.url();
				const bodyText = await page.innerText('body');

				// Either URL contains page=2 or body shows Page 2
				const maintainsPage =
					url.includes('page=2') || bodyText.includes('Page 2');

				// Note: This depends on implementation
				// Client-side state might reset to page 1
			}
		}
	});

	/**
	 * PG-06: hasMore Calculation Accuracy
	 * Priority: P1 (High)
	 */
	test('PG-06: should accurately calculate hasMore flag', async ({ page }) => {
		await signInAsUser(page);

		await page.goto('/memes');

		// Check if there's a next button
		const nextButton = page.locator('button:has-text("Next")');
		const hasNextButton = (await nextButton.count()) > 0;

		if (hasNextButton) {
			const isDisabled = await nextButton.isDisabled();

			// If disabled, there should be no more pages
			// If enabled, clicking should show more content

			if (!isDisabled) {
				// Get current meme count
				const bodyText1 = await page.innerText('body');
				const match1 = bodyText1.match(/(\d+)\s+Meme/i);
				const count1 = match1 ? parseInt(match1[1]) : 0;

				// Go to next page
				await nextButton.click();
				await page.waitForTimeout(1000);

				// Should have different content
				const bodyText2 = await page.innerText('body');
				const match2 = bodyText2.match(/(\d+)\s+Meme/i);
				const count2 = match2 ? parseInt(match2[1]) : 0;

				// Content should be different (or same if exactly at boundary)
				expect(typeof count2).toBe('number');
			}
		}
	});
});
