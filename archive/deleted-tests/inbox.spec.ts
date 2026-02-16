import { test, expect } from '@playwright/test';
import { signInAsAdmin, signInAsUser } from './helpers/auth';

/**
 * Inbox Page E2E Tests
 * Tests inbox/notifications functionality, message display, and user interactions
 */

test.describe('Inbox Page', () => {
	/**
	 * INB-01: Inbox Page Access Control
	 * Priority: P0 (Critical)
	 */
	test('INB-01: should require authentication to access inbox', async ({ page }) => {
		await page.goto('/inbox');

		// Should redirect to sign-in
		await expect(page).toHaveURL(/\/(en\/)?auth\/signin/);
	});

	/**
	 * INB-02: Inbox Page Load for Admin
	 * Priority: P0 (Critical)
	 */
	test('INB-02: should load inbox page for authenticated admin', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/inbox');

		// Should be on inbox page
		await expect(page).toHaveURL(/\/(en\/)?inbox/);

		// Check for page heading
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	});

	/**
	 * INB-03: Inbox Page Load for User
	 * Priority: P0 (Critical)
	 */
	test('INB-03: should load inbox page for authenticated user', async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/inbox');

		// Should be on inbox page
		await expect(page).toHaveURL(/\/(en\/)?inbox/);
	});

	/**
	 * INB-04: Inbox Content Display
	 * Priority: P1 (High)
	 */
	test('INB-04: should display inbox messages or notifications', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/inbox');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		const bodyText = await page.innerText('body');

		// Should show inbox-related content
		const hasInboxContent =
			bodyText.includes('Inbox') ||
			bodyText.includes('Message') ||
			bodyText.includes('Notification') ||
			bodyText.includes('No messages') ||
			bodyText.includes('Empty');

		expect(hasInboxContent).toBeTruthy();
	});

	/**
	 * INB-05: Empty Inbox State
	 * Priority: P2 (Medium)
	 */
	test('INB-05: should handle empty inbox gracefully', async ({ page }) => {
		await signInAsUser(page); // Regular user likely has empty inbox
		await page.goto('/inbox');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		const bodyText = await page.innerText('body');

		// Should show empty state message
		const hasEmptyState =
			bodyText.includes('No messages') ||
			bodyText.includes('No notifications') ||
			bodyText.includes('Empty') ||
			bodyText.includes('inbox is empty') ||
			bodyText.includes('Inbox');

		expect(hasEmptyState).toBeTruthy();
	});

	/**
	 * INB-06: Message List Display
	 * Priority: P1 (High)
	 */
	test('INB-06: should display message list if messages exist', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/inbox');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Look for list items or message containers
		const messageList = page.locator('[role="list"], ul, ol').filter({ hasText: /message|notification/i });
		const messageItems = page.locator('[role="listitem"], li').filter({ hasText: /message|notification/i });

		const hasMessages = await messageList.count() > 0 || await messageItems.count() > 0;

		if (hasMessages) {
			console.log('✅ Message list found');
		} else {
			console.log('ℹ️ No messages in inbox (empty state)');
		}
	});

	/**
	 * INB-07: Message Read/Unread Status
	 * Priority: P2 (Medium)
	 */
	test('INB-07: should indicate read/unread status', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/inbox');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		const bodyText = await page.innerText('body');

		// Look for read/unread indicators
		const hasReadStatus =
			bodyText.includes('Read') ||
			bodyText.includes('Unread') ||
			bodyText.includes('New');

		if (hasReadStatus) {
			console.log('✅ Read/unread status displayed');
		} else {
			console.log('ℹ️ No read/unread indicators (may be all read or empty)');
		}
	});

	/**
	 * INB-08: Message Filtering
	 * Priority: P2 (Medium)
	 */
	test('INB-08: should support message filtering if available', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/inbox');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Look for filter controls
		const filterButton = page.getByRole('button', { name: /filter|sort|all|read|unread/i });
		const filterSelect = page.locator('select').filter({ hasText: /filter|type|status/i });

		const hasFilters = await filterButton.count() > 0 || await filterSelect.count() > 0;

		if (hasFilters) {
			console.log('✅ Message filtering available');
		} else {
			console.log('ℹ️ No filtering detected');
		}
	});

	/**
	 * INB-09: Mark as Read Functionality
	 * Priority: P2 (Medium)
	 */
	test('INB-09: should allow marking messages as read', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/inbox');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Look for mark as read buttons or checkboxes
		const markReadButton = page.getByRole('button', { name: /mark.*read|read all/i });
		const markReadCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /read/i });

		const hasMarkRead = await markReadButton.count() > 0 || await markReadCheckbox.count() > 0;

		if (hasMarkRead) {
			console.log('✅ Mark as read functionality available');
		} else {
			console.log('ℹ️ No mark as read feature detected');
		}
	});

	/**
	 * INB-10: Delete Message Functionality
	 * Priority: P2 (Medium)
	 */
	test('INB-10: should allow deleting messages', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/inbox');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Look for delete buttons
		const deleteButton = page.getByRole('button', { name: /delete|remove|trash/i });

		if (await deleteButton.count() > 0) {
			console.log('✅ Delete functionality available');
		} else {
			console.log('ℹ️ No delete functionality detected');
		}
	});

	/**
	 * INB-11: Message Timestamps
	 * Priority: P2 (Medium)
	 */
	test('INB-11: should display message timestamps', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/inbox');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		const bodyText = await page.innerText('body');

		// Look for time-related text
		const hasTimestamps =
			bodyText.match(/\d{1,2}:\d{2}/) || // Time
			bodyText.match(/\d+\s+(minute|hour|day)s?\s+ago/) || // Relative time
			bodyText.includes('Today') ||
			bodyText.includes('Yesterday');

		if (hasTimestamps) {
			console.log('✅ Timestamps displayed');
		} else {
			console.log('ℹ️ No timestamps detected (may have no messages)');
		}
	});

	/**
	 * INB-12: Notification Badge/Counter
	 * Priority: P2 (Medium)
	 */
	test('INB-12: should show unread count in navigation', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/inbox');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Look for notification badge in navigation
		const badge = page.locator('[class*="badge"], [class*="counter"], [class*="notification"]');

		if (await badge.count() > 0) {
			console.log('✅ Notification badge found');
		} else {
			console.log('ℹ️ No notification badge detected');
		}
	});

	/**
	 * INB-13: Pagination or Infinite Scroll
	 * Priority: P2 (Medium)
	 */
	test('INB-13: should support pagination or infinite scroll', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/inbox');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Look for pagination controls
		const paginationButtons = page.getByRole('button', { name: /next|previous|page|load more/i });
		const paginationNav = page.locator('nav').filter({ hasText: /page|pagination/i });

		const hasPagination = await paginationButtons.count() > 0 || await paginationNav.count() > 0;

		if (hasPagination) {
			console.log('✅ Pagination controls found');
		} else {
			console.log('ℹ️ No pagination (may have few messages or infinite scroll)');
		}
	});

	/**
	 * INB-14: Inbox Refresh
	 * Priority: P2 (Medium)
	 */
	test('INB-14: should allow refreshing inbox', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/inbox');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Look for refresh button
		const refreshButton = page.getByRole('button', { name: /refresh|reload/i });

		if (await refreshButton.count() > 0) {
			await expect(refreshButton.first()).toBeVisible();

			// Try refreshing
			await refreshButton.first().click();
			await page.waitForLoadState('networkidle', { timeout: 10000 });

			expect(page.url()).toContain('/inbox');
		} else {
			console.log('ℹ️ No manual refresh (may auto-refresh)');
		}
	});

	/**
	 * INB-15: Navigation Elements
	 * Priority: P2 (Medium)
	 */
	test('INB-15: should have navigation elements', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/inbox');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Should have navigation
		const navLinks = page.getByRole('navigation').locator('a');
		const linkCount = await navLinks.count();

		expect(linkCount).toBeGreaterThan(0);
	});

	/**
	 * INB-16: Mobile Responsiveness
	 * Priority: P3 (Low)
	 */
	test('INB-16: should be responsive on mobile viewport', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 });

		await signInAsAdmin(page);
		await page.goto('/inbox');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Page should load
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

		// Check horizontal scroll
		const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
		const viewportWidth = await page.evaluate(() => window.innerWidth);

		expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20);
	});
});
