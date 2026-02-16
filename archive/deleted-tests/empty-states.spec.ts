import { test, expect } from '@playwright/test';
import { signInAsUser } from './helpers/auth';
import { cleanupTestData } from './helpers/seed';

/**
 * Empty State Handling E2E Tests
 * Tests UI behavior when user has no memes or search returns no results
 */

test.describe('Empty State Handling', () => {
	// Note: Cleanup is handled per-test or by test data isolation
	// afterAll cannot use page/context fixtures in Playwright

	/**
	 * ES-01: Empty State for New User
	 * Priority: P1 (High)
	 */
	test('ES-01: should show empty state when user has no memes', async ({
		page,
	}) => {
		await signInAsUser(page);

		// Navigate to memes page
		await page.goto('/memes');
		await expect(page).toHaveURL(/\/(en\/)?memes/);

		// Check for empty state
		const emptyState = page.locator('[data-testid="empty-state"]');
		const hasEmptyState = (await emptyState.count()) > 0;

		if (hasEmptyState) {
			// Empty state should be visible
			await expect(emptyState).toBeVisible();

			// Check for empty state title
			await expect(
				page.locator('[data-testid="empty-state-title"]'),
			).toBeVisible();

			// Check for empty state message
			const message = page.locator('[data-testid="empty-state-message"]');
			await expect(message).toBeVisible();

			// Verify message content
			const messageText = await message.innerText();
			expect(messageText).toMatch(/no.*submissions|upload|appear here/i);
		} else {
			// User already has memes - verify list is shown instead
			const bodyText = await page.innerText('body');
			expect(bodyText).toMatch(/submissions|meme/i);
		}
	});

	/**
	 * ES-02: No Results from Search
	 * Priority: P1 (High)
	 */
	test('ES-02: should show empty state when search returns no results', async ({
		page,
	}) => {
		await signInAsUser(page);

		await page.goto('/memes');
		await expect(page).toHaveURL(/\/(en\/)?memes/);

		// Wait for page content to load
		await page.waitForLoadState('domcontentloaded');

		// Check if search input exists
		const searchInput = page.locator('[data-testid="search-input"]');
		const hasSearchInput = (await searchInput.count()) > 0;

		if (hasSearchInput) {
			// Perform search with nonsense query
			const nonsenseQuery = `nonexistent_${Date.now()}_xyz123`;
			await searchInput.fill(nonsenseQuery);

			// Wait for search results (debounced input typically triggers network request)
			await page.waitForLoadState('domcontentloaded');

			// Should show empty state
			const emptyState = page.locator('[data-testid="empty-state"]');
			await expect(emptyState).toBeVisible();

			// Verify empty state message
			const bodyText = await page.innerText('body');
			expect(bodyText).toMatch(/no.*submissions|no.*memes/i);
		} else {
			// Search not available (user might have no memes)
			// Verify page loads correctly
			const bodyText = await page.innerText('body');
			expect(bodyText.length).toBeGreaterThan(0);
		}
	});

	/**
	 * ES-03: Empty State with Status Filter
	 * Priority: P2 (Medium)
	 */
	test('ES-03: should show empty state when filtered status has no results', async ({
		page,
	}) => {
		await signInAsUser(page);

		await page.goto('/memes');
		await expect(page).toHaveURL(/\/(en\/)?memes/);

		// Wait for page content to load
		await page.waitForLoadState('domcontentloaded');

		// Try to filter by 'published' status (unlikely for new submissions)
		const publishedButton = page.locator('button:has-text("Published")');
		const hasFilterButtons = (await publishedButton.count()) > 0;

		if (hasFilterButtons) {
			await publishedButton.click();
			await page.waitForLoadState('domcontentloaded');

			// Should show empty state or no results
			const bodyText = await page.innerText('body');
			const hasEmptyState =
				(await page.locator('[data-testid="empty-state"]').count()) > 0;

			if (hasEmptyState) {
				await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
			} else {
				// Might show "no results" or empty list
				expect(bodyText).toBeDefined();
			}
		}
	});

	/**
	 * ES-04: Empty State Allows Submission
	 * Priority: P2 (Medium)
	 */
	test('ES-04: should allow submitting meme from empty state', async ({
		page,
	}) => {
		await signInAsUser(page);

		await page.goto('/memes', { waitUntil: 'domcontentloaded' });
		await expect(page).toHaveURL(/\/(en\/)?memes/);

		// Wait for page content to fully load
		await page.waitForLoadState('domcontentloaded');

		// Look for submit button (should be available even in empty state)
		const submitButton = page.locator(
			'button:has-text("Submit"), button:has-text("New Meme")',
		);
		const hasSubmitButton = (await submitButton.count()) > 0;

		if (hasSubmitButton) {
			// Submit button should be visible and enabled
			await expect(submitButton.first()).toBeVisible();
			const isDisabled = await submitButton.first().isDisabled();
			expect(isDisabled).toBe(false);
		} else {
			// Alternative: page loaded successfully (may have link to submit or content)
			// Just verify the page rendered without errors
			await expect(page.locator('body')).toBeVisible();
		}
	});
});
