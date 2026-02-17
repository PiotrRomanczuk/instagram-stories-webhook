import { test, expect } from '@playwright/test';
import { signInAsAdmin } from './helpers/auth';

/**
 * User Whitelist Management - Search & Filter E2E Tests
 *
 * Tests search and filtering functionality:
 * - Search by email
 * - Filter by role
 * - Combined search + filter
 * - Empty states
 * - Clear filters
 *
 * Test IDs: UW-SRCH-01 to UW-SRCH-05
 */

test.describe('User Whitelist - Search & Filter', () => {
	const testUsers = [
		{ email: 'alice.developer@test.com', role: 'developer', display_name: 'Alice Developer' },
		{ email: 'bob.admin@test.com', role: 'admin', display_name: 'Bob Admin' },
		{ email: 'charlie.user@test.com', role: 'user', display_name: 'Charlie User' },
		{ email: 'diana.admin@test.com', role: 'admin', display_name: 'Diana Admin' },
		{ email: 'eve.user@test.com', role: 'user', display_name: 'Eve User' },
	];

	test.beforeEach(async ({ page }) => {
		// Sign in as admin
		await signInAsAdmin(page);

		// Create test users for searching/filtering
		for (const user of testUsers) {
			await page.request.post('/api/users', {
				data: user,
			});
		}

		// Navigate to users page
		await page.goto('/users');
		await page.waitForLoadState('domcontentloaded');
	});

	test.afterEach(async ({ page }) => {
		// Cleanup: Remove test users
		for (const user of testUsers) {
			try {
				await page.request.delete(`/api/users/${encodeURIComponent(user.email)}`);
			} catch (error) {
				// Ignore cleanup errors
			}
		}
	});

	/**
	 * UW-SRCH-01: Search by Email
	 * Priority: P0 (Critical)
	 * Verifies search filters users by email (partial match)
	 */
	test('UW-SRCH-01: should filter users by email search', async ({ page }) => {
		// Type in search input
		const searchInput = page.locator('input[placeholder*="Search"]');
		await expect(searchInput).toBeVisible();
		await searchInput.fill('alice');

		// Wait for debounce (300ms)
		await page.waitForTimeout(500);

		// Should only show Alice
		await expect(page.locator('tr:has-text("alice.developer@test.com")')).toBeVisible();

		// Should not show Bob, Charlie, Diana, Eve
		await expect(page.locator('tr:has-text("bob.admin@test.com")')).not.toBeVisible();
		await expect(page.locator('tr:has-text("charlie.user@test.com")')).not.toBeVisible();
		await expect(page.locator('tr:has-text("diana.admin@test.com")')).not.toBeVisible();
		await expect(page.locator('tr:has-text("eve.user@test.com")')).not.toBeVisible();

		// Test partial search
		await searchInput.clear();
		await searchInput.fill('admin');
		await page.waitForTimeout(500);

		// Should show Bob and Diana (admins)
		await expect(page.locator('tr:has-text("bob.admin@test.com")')).toBeVisible();
		await expect(page.locator('tr:has-text("diana.admin@test.com")')).toBeVisible();

		// Test display name search
		await searchInput.clear();
		await searchInput.fill('Charlie');
		await page.waitForTimeout(500);

		// Should show Charlie
		await expect(page.locator('tr:has-text("charlie.user@test.com")')).toBeVisible();
	});

	/**
	 * UW-SRCH-02: Filter by Role
	 * Priority: P0 (Critical)
	 * Verifies role filter dropdown works correctly
	 */
	test('UW-SRCH-02: should filter users by role', async ({ page }) => {
		// Find role filter dropdown
		const roleFilter = page.locator('button:has-text("All Roles")').or(
			page.locator('[role="combobox"]:has-text("All Roles")')
		);
		await expect(roleFilter).toBeVisible();

		// Filter by Developer
		await roleFilter.click();
		await page.click('text=Developer');
		await page.waitForTimeout(300);

		// Should only show Alice (developer)
		await expect(page.locator('tr:has-text("alice.developer@test.com")')).toBeVisible();
		await expect(page.locator('tr:has-text("bob.admin@test.com")')).not.toBeVisible();
		await expect(page.locator('tr:has-text("charlie.user@test.com")')).not.toBeVisible();

		// Filter by Admin
		await roleFilter.click();
		await page.click('text=Admin');
		await page.waitForTimeout(300);

		// Should show Bob and Diana (admins)
		await expect(page.locator('tr:has-text("bob.admin@test.com")')).toBeVisible();
		await expect(page.locator('tr:has-text("diana.admin@test.com")')).toBeVisible();
		await expect(page.locator('tr:has-text("alice.developer@test.com")')).not.toBeVisible();
		await expect(page.locator('tr:has-text("charlie.user@test.com")')).not.toBeVisible();

		// Filter by User
		await roleFilter.click();
		await page.click('text=User');
		await page.waitForTimeout(300);

		// Should show Charlie and Eve (users)
		await expect(page.locator('tr:has-text("charlie.user@test.com")')).toBeVisible();
		await expect(page.locator('tr:has-text("eve.user@test.com")')).toBeVisible();
		await expect(page.locator('tr:has-text("alice.developer@test.com")')).not.toBeVisible();
		await expect(page.locator('tr:has-text("bob.admin@test.com")')).not.toBeVisible();
	});

	/**
	 * UW-SRCH-03: Combined Search + Role Filter
	 * Priority: P1 (High)
	 * Verifies search and filter work together
	 */
	test('UW-SRCH-03: should combine search and role filter', async ({ page }) => {
		// Search for "admin" (matches Bob and Diana by email)
		const searchInput = page.locator('input[placeholder*="Search"]');
		await searchInput.fill('admin');
		await page.waitForTimeout(500);

		// Both Bob and Diana should be visible
		await expect(page.locator('tr:has-text("bob.admin@test.com")')).toBeVisible();
		await expect(page.locator('tr:has-text("diana.admin@test.com")')).toBeVisible();

		// Now filter by Admin role
		const roleFilter = page.locator('button:has-text("All Roles")').or(
			page.locator('[role="combobox"]:has-text("All Roles")')
		);
		await roleFilter.click();
		await page.click('text=Admin');
		await page.waitForTimeout(300);

		// Still both Bob and Diana (they match both search and filter)
		await expect(page.locator('tr:has-text("bob.admin@test.com")')).toBeVisible();
		await expect(page.locator('tr:has-text("diana.admin@test.com")')).toBeVisible();

		// Change filter to User
		await roleFilter.click();
		await page.click('text=User');
		await page.waitForTimeout(300);

		// No results (no users have "admin" in email)
		await expect(page.locator('tr:has-text("bob.admin@test.com")')).not.toBeVisible();
		await expect(page.locator('tr:has-text("diana.admin@test.com")')).not.toBeVisible();

		// Should see empty state or "No users found"
		const bodyText = await page.innerText('body');
		expect(bodyText).toMatch(/no users|no results|not found/i);
	});

	/**
	 * UW-SRCH-04: Empty State for No Results
	 * Priority: P2 (Medium)
	 * Verifies empty state is shown when filters return no results
	 */
	test('UW-SRCH-04: should show empty state when no results', async ({ page }) => {
		// Search for something that doesn't exist
		const searchInput = page.locator('input[placeholder*="Search"]');
		await searchInput.fill('nonexistent-user-xyz123');
		await page.waitForTimeout(500);

		// Should see empty state
		const bodyText = await page.innerText('body');
		expect(bodyText).toMatch(/no users|no results|not found/i);

		// Table should be empty or show empty state message
		const emptyState = page.locator('text=/no users|no results|not found/i');
		await expect(emptyState).toBeVisible();
	});

	/**
	 * UW-SRCH-05: Clear Filters - Show All Users
	 * Priority: P1 (High)
	 * Verifies clearing search and selecting "All Roles" shows all users
	 */
	test('UW-SRCH-05: should clear filters and show all users', async ({ page }) => {
		// Apply search filter
		const searchInput = page.locator('input[placeholder*="Search"]');
		await searchInput.fill('alice');
		await page.waitForTimeout(500);

		// Only Alice visible
		await expect(page.locator('tr:has-text("alice.developer@test.com")')).toBeVisible();

		// Apply role filter
		const roleFilter = page.locator('button:has-text("All Roles")').or(
			page.locator('[role="combobox"]:has-text("All Roles")')
		);
		await roleFilter.click();
		await page.click('text=Developer');
		await page.waitForTimeout(300);

		// Still only Alice
		await expect(page.locator('tr:has-text("alice.developer@test.com")')).toBeVisible();

		// Clear search
		await searchInput.clear();
		await page.waitForTimeout(500);

		// Now should show all developers (Alice + Test Admin if developer)
		// At minimum, Alice should be visible
		await expect(page.locator('tr:has-text("alice.developer@test.com")')).toBeVisible();

		// Reset role filter to All Roles
		await roleFilter.click();
		await page.click('text=All Roles');
		await page.waitForTimeout(300);

		// Should show all test users
		await expect(page.locator('tr:has-text("alice.developer@test.com")')).toBeVisible();
		await expect(page.locator('tr:has-text("bob.admin@test.com")')).toBeVisible();
		await expect(page.locator('tr:has-text("charlie.user@test.com")')).toBeVisible();
		await expect(page.locator('tr:has-text("diana.admin@test.com")')).toBeVisible();
		await expect(page.locator('tr:has-text("eve.user@test.com")')).toBeVisible();
	});

	/**
	 * Bonus: Case-Insensitive Search
	 * Priority: P2 (Medium)
	 * Verifies search is case-insensitive
	 */
	test('should perform case-insensitive search', async ({ page }) => {
		const searchInput = page.locator('input[placeholder*="Search"]');

		// Search with uppercase
		await searchInput.fill('ALICE');
		await page.waitForTimeout(500);

		// Should still find alice
		await expect(page.locator('tr:has-text("alice.developer@test.com")')).toBeVisible();

		// Search with mixed case
		await searchInput.clear();
		await searchInput.fill('BoB');
		await page.waitForTimeout(500);

		// Should find Bob
		await expect(page.locator('tr:has-text("bob.admin@test.com")')).toBeVisible();
	});

	/**
	 * Bonus: Real-time Search (Debounced)
	 * Priority: P2 (Medium)
	 * Verifies search updates in real-time after debounce delay
	 */
	test('should update results in real-time with debounce', async ({ page }) => {
		const searchInput = page.locator('input[placeholder*="Search"]');

		// Type quickly (simulate real user typing)
		await searchInput.type('a', { delay: 50 });
		await searchInput.type('l', { delay: 50 });
		await searchInput.type('i', { delay: 50 });

		// Before debounce completes, might still show all users
		// After debounce (300ms), should filter
		await page.waitForTimeout(500);

		// Should show Alice
		await expect(page.locator('tr:has-text("alice.developer@test.com")')).toBeVisible();

		// Continue typing
		await searchInput.type('c', { delay: 50 });
		await searchInput.type('e', { delay: 50 });

		// Wait for debounce
		await page.waitForTimeout(500);

		// Should still show Alice
		await expect(page.locator('tr:has-text("alice.developer@test.com")')).toBeVisible();
	});
});
