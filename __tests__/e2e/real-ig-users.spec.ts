import { test, expect } from '@playwright/test';
import { signInAsRealIG } from './helpers/auth';

/**
 * User Management E2E Tests (Real Account)
 *
 * These tests verify user management functionality using a real Instagram
 * account (p.romanczuk@gmail.com) with linked Meta tokens.
 *
 * IMPORTANT:
 * - Skip in CI to avoid running against real Instagram API
 * - Requires the account to have valid linked Instagram tokens
 * - Tests user listing, filtering, search, and pagination
 */

test.describe('User Management (Real Account)', () => {
	// Skip in CI environments
	test.skip(
		() => process.env.CI === 'true',
		'Skipping in CI - requires real Instagram tokens',
	);

	// Also skip if ENABLE_REAL_IG_TESTS is not set
	test.skip(
		() => !process.env.ENABLE_REAL_IG_TESTS,
		'Set ENABLE_REAL_IG_TESTS=true to run real Instagram tests',
	);

	test.beforeEach(async ({ page }) => {
		await signInAsRealIG(page);
	});

	/**
	 * USR-01: Access Users Page
	 * Priority: P0 (Critical)
	 * Verifies admin can access the users management page
	 */
	test('USR-01: should access users page', async ({ page }) => {
		await page.goto('/users');
		await page.waitForLoadState('domcontentloaded');

		// Should be on the users page (may have locale prefix)
		await expect(page).toHaveURL(/\/(en\/)?users/);

		// Should see the page title
		const pageTitle = page.locator('h2');
		await expect(pageTitle).toContainText('Team & User Management');
	});

	/**
	 * USR-02: Stats Header Display
	 * Priority: P1 (High)
	 * Verifies the stats cards are displayed with correct data
	 */
	test('USR-02: should display stats header cards', async ({ page }) => {
		await page.goto('/users');
		await page.waitForLoadState('domcontentloaded');

		// Should show three stat cards: Total Creators, Active Stories, Avg. Performance
		await expect(page.locator('text=Total Creators')).toBeVisible();
		await expect(page.locator('text=Active Stories')).toBeVisible();
		await expect(page.locator('text=Avg. Performance')).toBeVisible();

		// Verify stats have numeric values
		const statsSection = page.locator('.grid.grid-cols-1.gap-4');
		await expect(statsSection).toBeVisible();

		// Each stat card should have a value displayed
		const statValues = statsSection.locator('p.text-3xl');
		const count = await statValues.count();
		expect(count).toBeGreaterThanOrEqual(3);
	});

	/**
	 * USR-03: Tab Filter - All Users
	 * Priority: P1 (High)
	 * Verifies the All Users tab shows all team members
	 */
	test('USR-03: should show all users when All tab is selected', async ({ page }) => {
		await page.goto('/users');
		await page.waitForLoadState('domcontentloaded');

		// Find and click All Users tab
		const allTab = page.locator('button:has-text("All Users")');
		await expect(allTab).toBeVisible();
		await allTab.click();

		// Tab should be active (has border indicator)
		await expect(allTab).toHaveClass(/border-\[#2b6cee\]/);

		// Should display the users table
		const table = page.locator('table');
		await expect(table).toBeVisible();

		// Table should have headers
		await expect(page.locator('th:has-text("Creator")')).toBeVisible();
		await expect(page.locator('th:has-text("Role")')).toBeVisible();
		await expect(page.locator('th:has-text("Workload")')).toBeVisible();
	});

	/**
	 * USR-04: Tab Filter - Managers
	 * Priority: P2 (Medium)
	 * Verifies filtering users by manager role
	 */
	test('USR-04: should filter users by managers role', async ({ page }) => {
		await page.goto('/users');
		await page.waitForLoadState('domcontentloaded');

		// Click the Managers tab
		const managersTab = page.locator('button:has-text("Managers")');
		await expect(managersTab).toBeVisible();
		await managersTab.click();

		// Wait for filter to apply
		await page.waitForTimeout(300);

		// Tab should be active
		await expect(managersTab).toHaveClass(/border-\[#2b6cee\]/);

		// If there are users displayed, they should have Manager role
		const roleLabels = page.locator('span:has-text("Manager")');
		const roleCount = await roleLabels.count();

		if (roleCount > 0) {
			// All displayed users should be managers
			const tableRows = page.locator('tbody tr');
			const rowCount = await tableRows.count();

			// Every row should contain "Manager" badge
			for (let i = 0; i < rowCount; i++) {
				const row = tableRows.nth(i);
				await expect(row.locator('span:has-text("Manager")')).toBeVisible();
			}
		}
	});

	/**
	 * USR-05: Tab Filter - Creators
	 * Priority: P2 (Medium)
	 * Verifies filtering users by creator role
	 */
	test('USR-05: should filter users by creators role', async ({ page }) => {
		await page.goto('/users');
		await page.waitForLoadState('domcontentloaded');

		// Click the Creators tab
		const creatorsTab = page.locator('button:has-text("Creators")').first();
		await expect(creatorsTab).toBeVisible();
		await creatorsTab.click();

		// Wait for filter to apply
		await page.waitForTimeout(300);

		// Tab should be active
		await expect(creatorsTab).toHaveClass(/border-\[#2b6cee\]/);

		// Should see creators in the table (or empty state)
		const table = page.locator('table');
		await expect(table).toBeVisible();
	});

	/**
	 * USR-06: Search Users
	 * Priority: P1 (High)
	 * Verifies the search functionality filters users by name/email
	 */
	test('USR-06: should search users by name or email', async ({ page }) => {
		await page.goto('/users');
		await page.waitForLoadState('domcontentloaded');

		// Find the search input
		const searchInput = page.locator('input[placeholder*="Search"]');
		await expect(searchInput).toBeVisible();

		// Count initial rows
		const initialRowCount = await page.locator('tbody tr').count();

		// Type a search query
		await searchInput.fill('Sarah');
		await page.waitForTimeout(300);

		// Results should be filtered
		const filteredRowCount = await page.locator('tbody tr').count();

		// If Sarah exists in data, should show fewer or equal results
		if (initialRowCount > 0) {
			expect(filteredRowCount).toBeLessThanOrEqual(initialRowCount);
		}

		// Clear search and verify reset
		await searchInput.clear();
		await page.waitForTimeout(300);

		const resetRowCount = await page.locator('tbody tr').count();
		expect(resetRowCount).toBe(initialRowCount);
	});

	/**
	 * USR-07: Pagination Controls
	 * Priority: P2 (Medium)
	 * Verifies pagination controls work correctly
	 */
	test('USR-07: should display and navigate pagination', async ({ page }) => {
		await page.goto('/users');
		await page.waitForLoadState('domcontentloaded');

		// Check if pagination is displayed (only shows when > 10 users)
		const paginationSection = page.locator('text=Showing');

		// Pagination may or may not be visible depending on data
		const hasPagination = await paginationSection.count() > 0;

		if (hasPagination) {
			// Should show "Showing X to Y of Z" text
			await expect(paginationSection).toBeVisible();

			// Check for Previous/Next buttons
			const prevButton = page.locator('button:has-text("Previous")');
			const nextButton = page.locator('button:has-text("Next")');

			await expect(prevButton).toBeVisible();
			await expect(nextButton).toBeVisible();

			// Previous should be disabled on first page
			await expect(prevButton).toBeDisabled();
		} else {
			// No pagination means all users fit on one page
			const table = page.locator('table');
			await expect(table).toBeVisible();
		}
	});

	/**
	 * USR-08: Add User Button
	 * Priority: P2 (Medium)
	 * Verifies the Add User button is present and clickable
	 */
	test('USR-08: should display add user button', async ({ page }) => {
		await page.goto('/users');
		await page.waitForLoadState('domcontentloaded');

		// Find the Add User button
		const addUserBtn = page.locator('button:has-text("Add User")');
		await expect(addUserBtn).toBeVisible();
		await expect(addUserBtn).toBeEnabled();

		// Button should have the plus icon (UserPlus)
		const buttonIcon = addUserBtn.locator('svg');
		await expect(buttonIcon).toBeVisible();
	});

	/**
	 * USR-09: User Status Display
	 * Priority: P1 (High)
	 * Verifies user status is displayed correctly with proper styling
	 */
	test('USR-09: should display user status with correct styling', async ({ page }) => {
		await page.goto('/users');
		await page.waitForLoadState('domcontentloaded');

		// Wait for table to load
		const table = page.locator('table');
		await expect(table).toBeVisible();

		// Check for status column header
		await expect(page.locator('th:has-text("Status")')).toBeVisible();

		// Look for status indicators (Active or Deactivated)
		const activeStatus = page.locator('text=Active').first();
		const deactivatedStatus = page.locator('text=Deactivated').first();

		// At least one status type should be visible
		const hasActiveUsers = await activeStatus.count() > 0;
		const hasDeactivatedUsers = await deactivatedStatus.count() > 0;

		expect(hasActiveUsers || hasDeactivatedUsers).toBe(true);

		// If active users exist, check for green dot
		if (hasActiveUsers) {
			const greenDot = page.locator('.bg-\\[\\#0bda5e\\]').first();
			await expect(greenDot).toBeVisible();
		}

		// If deactivated users exist, check for gray dot
		if (hasDeactivatedUsers) {
			const grayDot = page.locator('.bg-slate-500').first();
			await expect(grayDot).toBeVisible();
		}
	});

	/**
	 * USR-10: Workload Display
	 * Priority: P2 (Medium)
	 * Verifies workload progress bar and values are displayed
	 */
	test('USR-10: should display user workload with progress bar', async ({ page }) => {
		await page.goto('/users');
		await page.waitForLoadState('domcontentloaded');

		// Check for workload column header
		await expect(page.locator('th:has-text("Workload")')).toBeVisible();

		// Find workload cells in the table
		const workloadCells = page.locator('td').filter({ hasText: /Pending.*Total/ });
		const workloadCount = await workloadCells.count();

		if (workloadCount > 0) {
			// First workload cell should have pending and total values
			const firstWorkload = workloadCells.first();
			await expect(firstWorkload).toContainText('Pending');
			await expect(firstWorkload).toContainText('Total');

			// Should have a progress bar (Progress component)
			const progressBar = firstWorkload.locator('[role="progressbar"], .h-1\\.5');
			await expect(progressBar).toBeVisible();
		}
	});
});
