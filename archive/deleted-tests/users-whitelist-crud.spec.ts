import { test, expect } from '@playwright/test';
import { signInAsAdmin, signInAsUser, TEST_USERS } from './helpers/auth';

/**
 * User Whitelist Management - CRUD Operations E2E Tests
 *
 * Tests basic Create, Read, Update, Delete operations for user whitelist management.
 * Uses Test Admin account which has developer role (required for user management).
 *
 * Test IDs: UW-CRUD-01 to UW-CRUD-07
 */

test.describe('User Whitelist - CRUD Operations', () => {
	const testEmails = [
		'test-crud-01@example.com',
		'test-crud-02@example.com',
		'test-crud-03@example.com',
	];

	test.beforeEach(async ({ page }) => {
		// Sign in as admin (who is also developer in test environment)
		await signInAsAdmin(page);

		// Navigate to users page
		await page.goto('/users');
		await page.waitForLoadState('domcontentloaded');

		// Verify we're on the users page
		await expect(page).toHaveURL(/\/(en\/)?users/);
	});

	test.afterEach(async ({ page }) => {
		// Cleanup: Remove any test users created during tests
		for (const email of testEmails) {
			try {
				const response = await page.request.delete(`/api/users/${encodeURIComponent(email)}`);
				if (response.ok()) {
					console.log(`✅ Cleaned up test user: ${email}`);
				}
			} catch (error) {
				// Ignore cleanup errors - user may not exist
			}
		}
	});

	/**
	 * UW-CRUD-01: List Users in Table
	 * Priority: P0 (Critical)
	 * Verifies the users table displays with all expected columns
	 */
	test('UW-CRUD-01: should display users table with all columns', async ({ page }) => {
		// Should see the page title
		const pageTitle = page.locator('h2');
		await expect(pageTitle).toContainText('User Whitelist Management');

		// Should see stats cards
		await expect(page.locator('text=Total Users')).toBeVisible();
		await expect(page.locator('text=Developers')).toBeVisible();
		await expect(page.locator('text=Admins')).toBeVisible();

		// Should see the table with headers
		await expect(page.locator('th:has-text("Email")')).toBeVisible();
		await expect(page.locator('th:has-text("Display Name")')).toBeVisible();
		await expect(page.locator('th:has-text("Role")')).toBeVisible();
		await expect(page.locator('th:has-text("Added")')).toBeVisible();
		await expect(page.locator('th:has-text("Actions")')).toBeVisible();

		// Should see at least one user in the table (the logged-in admin)
		const tableRows = page.locator('tbody tr');
		await expect(tableRows).toHaveCount({ timeout: 5000 });
	});

	/**
	 * UW-CRUD-02: Add User - Success
	 * Priority: P0 (Critical)
	 * Verifies adding a new user with valid data
	 */
	test('UW-CRUD-02: should add new user successfully', async ({ page }) => {
		const testEmail = testEmails[0];
		const testDisplayName = 'Test User CRUD 01';

		// Click "Add User" button
		const addButton = page.getByRole('button', { name: /add user/i });
		await expect(addButton).toBeVisible();
		await addButton.click();

		// Modal should open
		await expect(page.locator('text=Add User to Whitelist')).toBeVisible({ timeout: 5000 });

		// Fill in the form
		await page.fill('input[name="email"]', testEmail);
		await page.fill('input[name="display_name"]', testDisplayName);

		// Select role (default is User, so we'll select Admin)
		await page.click('[role="combobox"]');
		await page.click('text=Admin');

		// Submit the form
		await page.click('button:has-text("Add User")');

		// Should see success toast
		await expect(page.locator('text=User added successfully')).toBeVisible({ timeout: 5000 });

		// Modal should close
		await expect(page.locator('text=Add User to Whitelist')).not.toBeVisible({ timeout: 5000 });

		// Verify user appears in table
		await expect(page.locator(`td:has-text("${testEmail}")`)).toBeVisible({ timeout: 5000 });
		await expect(page.locator(`td:has-text("${testDisplayName}")`)).toBeVisible();

		// Verify via API
		const response = await page.request.get('/api/users');
		expect(response.ok()).toBe(true);
		const data = await response.json();
		const addedUser = data.users.find((u: any) => u.email === testEmail);
		expect(addedUser).toBeDefined();
		expect(addedUser.display_name).toBe(testDisplayName);
		expect(addedUser.role).toBe('admin');
	});

	/**
	 * UW-CRUD-03: Add User - Duplicate Email Error
	 * Priority: P0 (Critical)
	 * Verifies error handling when adding duplicate email
	 */
	test('UW-CRUD-03: should show error for duplicate email', async ({ page }) => {
		const testEmail = testEmails[1];

		// First, add a user
		await page.request.post('/api/users', {
			data: {
				email: testEmail,
				role: 'user',
				display_name: 'Original User',
			},
		});

		// Refresh to see the new user
		await page.reload();
		await page.waitForLoadState('domcontentloaded');

		// Try to add the same email again
		await page.getByRole('button', { name: /add user/i }).click();
		await expect(page.locator('text=Add User to Whitelist')).toBeVisible();

		await page.fill('input[name="email"]', testEmail);
		await page.fill('input[name="display_name"]', 'Duplicate User');
		await page.click('button:has-text("Add User")');

		// Should see error toast
		await expect(
			page.locator('text=/already whitelisted|already exists/i')
		).toBeVisible({ timeout: 5000 });

		// Modal should remain open
		await expect(page.locator('text=Add User to Whitelist')).toBeVisible();
	});

	/**
	 * UW-CRUD-04: Add User - Invalid Email Validation
	 * Priority: P1 (High)
	 * Verifies form validation prevents invalid email submission
	 */
	test('UW-CRUD-04: should validate email format', async ({ page }) => {
		// Open add user modal
		await page.getByRole('button', { name: /add user/i }).click();
		await expect(page.locator('text=Add User to Whitelist')).toBeVisible();

		// Try to submit with invalid email
		await page.fill('input[name="email"]', 'invalid-email');
		await page.fill('input[name="display_name"]', 'Test User');
		await page.click('button:has-text("Add User")');

		// Should see validation error
		await expect(page.locator('text=/invalid email/i')).toBeVisible({ timeout: 3000 });

		// Submit button should still be enabled (form validation prevents submission)
		const submitButton = page.locator('button:has-text("Add User")');
		await expect(submitButton).toBeEnabled();

		// Modal should remain open
		await expect(page.locator('text=Add User to Whitelist')).toBeVisible();
	});

	/**
	 * UW-CRUD-05: Edit Role - Success
	 * Priority: P0 (Critical)
	 * Verifies changing a user's role
	 */
	test('UW-CRUD-05: should update user role successfully', async ({ page }) => {
		const testEmail = testEmails[2];

		// First, add a user with 'user' role
		await page.request.post('/api/users', {
			data: {
				email: testEmail,
				role: 'user',
				display_name: 'Test User for Role Change',
			},
		});

		// Refresh to see the new user
		await page.reload();
		await page.waitForLoadState('domcontentloaded');

		// Find the user's row
		const userRow = page.locator(`tr:has-text("${testEmail}")`);
		await expect(userRow).toBeVisible();

		// Verify initial role is "User"
		await expect(userRow.locator('text=User').first()).toBeVisible();

		// Open actions dropdown
		const actionsButton = userRow.locator('button[aria-haspopup="menu"]');
		await actionsButton.click();

		// Click "Set as Admin"
		await page.click('text=Set as Admin');

		// Modal should open
		await expect(page.locator('text=Edit User Role')).toBeVisible({ timeout: 5000 });

		// Change role to Admin
		await page.click('[role="combobox"]');
		await page.click('text=Admin');

		// Submit
		await page.click('button:has-text("Update Role")');

		// Should see success toast
		await expect(page.locator('text=Role updated successfully')).toBeVisible({ timeout: 5000 });

		// Modal should close
		await expect(page.locator('text=Edit User Role')).not.toBeVisible({ timeout: 5000 });

		// Verify role badge changed to Admin
		await expect(userRow.locator('[class*="bg-blue"]')).toBeVisible({ timeout: 5000 });

		// Verify via API
		const response = await page.request.get('/api/users');
		const data = await response.json();
		const updatedUser = data.users.find((u: any) => u.email === testEmail);
		expect(updatedUser.role).toBe('admin');
	});

	/**
	 * UW-CRUD-06: Edit Role - No Change (Submit Disabled)
	 * Priority: P2 (Medium)
	 * Verifies submit button is disabled when no change is made
	 */
	test('UW-CRUD-06: should disable submit when role unchanged', async ({ page }) => {
		// Use the admin email (current user)
		const adminEmail = TEST_USERS.admin.email;

		// Note: We can't test on our own row because the dropdown is disabled
		// So let's create a test user and test on them
		const testEmail = 'test-no-change@example.com';
		await page.request.post('/api/users', {
			data: {
				email: testEmail,
				role: 'user',
			},
		});

		await page.reload();
		await page.waitForLoadState('domcontentloaded');

		// Find the test user's row
		const userRow = page.locator(`tr:has-text("${testEmail}")`);
		await expect(userRow).toBeVisible();

		// Open actions dropdown
		const actionsButton = userRow.locator('button[aria-haspopup="menu"]');
		await actionsButton.click();

		// Click "Set as User" (same as current role)
		await page.click('text=Set as User');

		// Modal should open
		await expect(page.locator('text=Edit User Role')).toBeVisible();

		// Submit button should be disabled (no change made)
		const submitButton = page.locator('button:has-text("Update Role")');
		await expect(submitButton).toBeDisabled();

		// Cleanup
		await page.request.delete(`/api/users/${encodeURIComponent(testEmail)}`);
	});

	/**
	 * UW-CRUD-07: Delete User - Success
	 * Priority: P0 (Critical)
	 * Verifies deleting a user from the whitelist
	 */
	test('UW-CRUD-07: should delete user successfully', async ({ page }) => {
		const testEmail = 'test-delete@example.com';

		// First, add a user
		await page.request.post('/api/users', {
			data: {
				email: testEmail,
				role: 'user',
				display_name: 'User to Delete',
			},
		});

		// Refresh to see the new user
		await page.reload();
		await page.waitForLoadState('domcontentloaded');

		// Find the user's row
		const userRow = page.locator(`tr:has-text("${testEmail}")`);
		await expect(userRow).toBeVisible();

		// Open actions dropdown
		const actionsButton = userRow.locator('button[aria-haspopup="menu"]');
		await actionsButton.click();

		// Click "Remove User"
		await page.click('text=Remove User');

		// Confirmation modal should open
		await expect(page.locator('text=Remove User from Whitelist')).toBeVisible({ timeout: 5000 });
		await expect(page.locator(`text=${testEmail}`)).toBeVisible();

		// Confirm deletion
		await page.click('button:has-text("Remove User")');

		// Should see success toast
		await expect(page.locator('text=User removed successfully')).toBeVisible({ timeout: 5000 });

		// Modal should close
		await expect(page.locator('text=Remove User from Whitelist')).not.toBeVisible({ timeout: 5000 });

		// User should be removed from table
		await expect(page.locator(`tr:has-text("${testEmail}")`)).not.toBeVisible({ timeout: 5000 });

		// Verify via API
		const response = await page.request.get('/api/users');
		const data = await response.json();
		const deletedUser = data.users.find((u: any) => u.email === testEmail);
		expect(deletedUser).toBeUndefined();
	});
});
