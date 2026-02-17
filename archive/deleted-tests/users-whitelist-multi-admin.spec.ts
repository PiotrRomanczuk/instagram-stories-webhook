import { test, expect, Browser } from '@playwright/test';
import { signInAsAdmin } from './helpers/auth';

/**
 * User Whitelist Management - Multi-Admin Scenarios E2E Tests
 *
 * Tests concurrent operations when multiple admins work simultaneously:
 * - Concurrent edits (last write wins)
 * - Concurrent delete (first delete wins)
 * - Role change reflection across sessions
 *
 * Test IDs: UW-MULTI-01 to UW-MULTI-03
 */

test.describe('User Whitelist - Multi-Admin Scenarios', () => {
	/**
	 * UW-MULTI-01: Concurrent Edits (Last Write Wins)
	 * Priority: P1 (High)
	 * Verifies behavior when two admins edit the same user simultaneously
	 */
	test('UW-MULTI-01: concurrent edits - last write wins', async ({ browser }) => {
		const testEmail = 'test-concurrent-edit@example.com';

		// Create two browser contexts (two admin sessions)
		const context1 = await browser.newContext();
		const context2 = await browser.newContext();

		const page1 = await context1.newPage();
		const page2 = await context2.newPage();

		try {
			// Both admins sign in
			await signInAsAdmin(page1);
			await signInAsAdmin(page2);

			// Create a test user
			await page1.request.post('/api/users', {
				data: {
					email: testEmail,
					role: 'user',
					display_name: 'Concurrent Test User',
				},
			});

			// Both admins navigate to users page
			await page1.goto('/users');
			await page2.goto('/users');

			await page1.waitForLoadState('domcontentloaded');
			await page2.waitForLoadState('domcontentloaded');

			// Admin 1 starts editing - changes role to admin
			const userRow1 = page1.locator(`tr:has-text("${testEmail}")`);
			await expect(userRow1).toBeVisible();
			await userRow1.locator('button[aria-haspopup="menu"]').click();
			await page1.click('text=Set as Admin');
			await expect(page1.locator('text=Edit User Role')).toBeVisible();

			// Admin 2 also starts editing - changes role to developer
			const userRow2 = page2.locator(`tr:has-text("${testEmail}")`);
			await expect(userRow2).toBeVisible();
			await userRow2.locator('button[aria-haspopup="menu"]').click();
			await page2.click('text=Set as Developer');
			await expect(page2.locator('text=Edit User Role')).toBeVisible();

			// Admin 1 selects Admin role
			await page1.click('[role="combobox"]');
			await page1.click('text=Admin');

			// Admin 2 selects Developer role
			await page2.click('[role="combobox"]');
			await page2.click('text=Developer');

			// Admin 1 submits first
			await page1.click('button:has-text("Update Role")');
			await expect(page1.locator('text=Role updated successfully')).toBeVisible({ timeout: 5000 });

			// Wait a moment
			await page1.waitForTimeout(500);

			// Admin 2 submits second (last write wins)
			await page2.click('button:has-text("Update Role")');
			await expect(page2.locator('text=Role updated successfully')).toBeVisible({ timeout: 5000 });

			// Verify final state via API - should be Developer (last write)
			const response = await page1.request.get('/api/users');
			const data = await response.json();
			const user = data.users.find((u: any) => u.email === testEmail);
			expect(user.role).toBe('developer');

			// Cleanup
			await page1.request.delete(`/api/users/${encodeURIComponent(testEmail)}`);
		} finally {
			await context1.close();
			await context2.close();
		}
	});

	/**
	 * UW-MULTI-02: Concurrent Delete (First Delete Wins)
	 * Priority: P1 (High)
	 * Verifies behavior when two admins try to delete the same user
	 */
	test('UW-MULTI-02: concurrent delete - first delete wins', async ({ browser }) => {
		const testEmail = 'test-concurrent-delete@example.com';

		// Create two browser contexts
		const context1 = await browser.newContext();
		const context2 = await browser.newContext();

		const page1 = await context1.newPage();
		const page2 = await context2.newPage();

		try {
			// Both admins sign in
			await signInAsAdmin(page1);
			await signInAsAdmin(page2);

			// Create a test user
			await page1.request.post('/api/users', {
				data: {
					email: testEmail,
					role: 'user',
					display_name: 'User to Delete',
				},
			});

			// Both admins navigate to users page
			await page1.goto('/users');
			await page2.goto('/users');

			await page1.waitForLoadState('domcontentloaded');
			await page2.waitForLoadState('domcontentloaded');

			// Admin 1 initiates delete
			const userRow1 = page1.locator(`tr:has-text("${testEmail}")`);
			await expect(userRow1).toBeVisible();
			await userRow1.locator('button[aria-haspopup="menu"]').click();
			await page1.click('text=Remove User');
			await expect(page1.locator('text=Remove User from Whitelist')).toBeVisible();

			// Admin 2 also initiates delete
			const userRow2 = page2.locator(`tr:has-text("${testEmail}")`);
			await expect(userRow2).toBeVisible();
			await userRow2.locator('button[aria-haspopup="menu"]').click();
			await page2.click('text=Remove User');
			await expect(page2.locator('text=Remove User from Whitelist')).toBeVisible();

			// Admin 1 confirms delete first
			await page1.click('button:has-text("Remove User")');
			await expect(page1.locator('text=User removed successfully')).toBeVisible({ timeout: 5000 });

			// Wait a moment
			await page1.waitForTimeout(500);

			// Admin 2 confirms delete (should fail gracefully)
			await page2.click('button:has-text("Remove User")');

			// Admin 2 should see an error (user not found or already deleted)
			// OR success message with optimistic update (SWR will handle conflict)
			await page2.waitForTimeout(2000);

			// Verify user is deleted via API
			const response = await page1.request.get('/api/users');
			const data = await response.json();
			const deletedUser = data.users.find((u: any) => u.email === testEmail);
			expect(deletedUser).toBeUndefined();

			// Both pages should not show the user after refresh
			await page1.reload();
			await page2.reload();

			await page1.waitForLoadState('domcontentloaded');
			await page2.waitForLoadState('domcontentloaded');

			await expect(page1.locator(`tr:has-text("${testEmail}")`)).not.toBeVisible();
			await expect(page2.locator(`tr:has-text("${testEmail}")`)).not.toBeVisible();
		} finally {
			// Cleanup (if user somehow still exists)
			try {
				await page1.request.delete(`/api/users/${encodeURIComponent(testEmail)}`);
			} catch (error) {
				// Ignore - user was already deleted
			}

			await context1.close();
			await context2.close();
		}
	});

	/**
	 * UW-MULTI-03: Role Change Reflection Across Sessions
	 * Priority: P2 (Medium)
	 * Verifies that role changes are reflected when user refreshes
	 */
	test('UW-MULTI-03: role change reflects across sessions on refresh', async ({ browser }) => {
		const testEmail = 'test-role-reflection@example.com';

		// Create two browser contexts
		const context1 = await browser.newContext();
		const context2 = await browser.newContext();

		const page1 = await context1.newPage();
		const page2 = await context2.newPage();

		try {
			// Both admins sign in
			await signInAsAdmin(page1);
			await signInAsAdmin(page2);

			// Admin 1 creates a user
			await page1.request.post('/api/users', {
				data: {
					email: testEmail,
					role: 'user',
					display_name: 'Test Reflection User',
				},
			});

			// Both admins navigate to users page
			await page1.goto('/users');
			await page2.goto('/users');

			await page1.waitForLoadState('domcontentloaded');
			await page2.waitForLoadState('domcontentloaded');

			// Both should see the user with "User" role
			await expect(page1.locator(`tr:has-text("${testEmail}")`)).toBeVisible();
			await expect(page2.locator(`tr:has-text("${testEmail}")`)).toBeVisible();

			// Admin 1 changes role to Admin
			const userRow1 = page1.locator(`tr:has-text("${testEmail}")`);
			await userRow1.locator('button[aria-haspopup="menu"]').click();
			await page1.click('text=Set as Admin');
			await expect(page1.locator('text=Edit User Role')).toBeVisible();
			await page1.click('[role="combobox"]');
			await page1.click('text=Admin');
			await page1.click('button:has-text("Update Role")');
			await expect(page1.locator('text=Role updated successfully')).toBeVisible({ timeout: 5000 });

			// Admin 1 should see Admin badge immediately (optimistic update)
			await expect(userRow1.locator('[class*="bg-blue"]')).toBeVisible({ timeout: 5000 });

			// Admin 2 refreshes page
			await page2.reload();
			await page2.waitForLoadState('domcontentloaded');

			// Admin 2 should now see Admin badge (data refetched from server)
			const userRow2 = page2.locator(`tr:has-text("${testEmail}")`);
			await expect(userRow2).toBeVisible();
			await expect(userRow2.locator('[class*="bg-blue"]')).toBeVisible({ timeout: 5000 });

			// Verify via API
			const response = await page1.request.get('/api/users');
			const data = await response.json();
			const user = data.users.find((u: any) => u.email === testEmail);
			expect(user.role).toBe('admin');

			// Cleanup
			await page1.request.delete(`/api/users/${encodeURIComponent(testEmail)}`);
		} finally {
			await context1.close();
			await context2.close();
		}
	});
});
