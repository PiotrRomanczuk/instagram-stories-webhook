import { test, expect } from '@playwright/test';
import { signInAsAdmin, signInAsUser, signOut, isAuthenticated } from './helpers/auth';

/**
 * Authentication & Authorization E2E Tests
 * Tests authentication flows, session management, and access control
 */

test.describe('Authentication & Authorization', () => {
  /**
   * AC-01: Unauthenticated User Redirection
   * Priority: P0 (Critical)
   */
  test('AC-01: should redirect unauthenticated user to sign-in page', async ({ page }) => {
    // Navigate to root without authentication
    await page.goto('/');

    // Should redirect to sign-in page
    await expect(page).toHaveURL(/\/auth\/signin/);

    // Check page title
    await expect(page).toHaveTitle(/Instagram/i);
  });

  /**
   * AC-02: Google OAuth Sign-In Flow
   * Priority: P0 (Critical)
   */
  test('AC-02: should complete Google OAuth sign-in flow', async ({ page }) => {
    await page.goto('/auth/signin');

    // Check for sign-in options
    const bodyText = await page.innerText('body');
    expect(bodyText).toMatch(/Google|Sign in|Welcome/i);

    // Mock sign-in (in real test, this would go through OAuth flow)
    await signInAsUser(page);

    // Verify authenticated state
    expect(await isAuthenticated(page)).toBe(true);

    // Should be on homepage or dashboard
    await expect(page).not.toHaveURL(/\/auth\/signin/);
  });

  /**
   * AC-03: Session Persistence
   * Priority: P1 (High)
   */
  test('AC-03: should persist session across page refreshes', async ({ page }) => {
    // Sign in
    await signInAsUser(page);

    // Verify authenticated
    const initialUrl = page.url();
    expect(await isAuthenticated(page)).toBe(true);

    // Refresh page
    await page.reload();

    // Should still be authenticated
    expect(await isAuthenticated(page)).toBe(true);
    await expect(page).toHaveURL(initialUrl);
  });

  /**
   * AC-04: Sign Out Flow
   * Priority: P1 (High)
   */
  test('AC-04: should sign out user and redirect to sign-in page', async ({ page }) => {
    // Sign in first
    await signInAsUser(page);
    expect(await isAuthenticated(page)).toBe(true);

    // Sign out
    await signOut(page);

    // Navigate to protected route
    await page.goto('/schedule');

    // Should redirect to sign-in
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  /**
   * AC-05: Unauthorized Access Protection
   * Priority: P0 (Critical)
   */
  test('AC-05: should prevent non-admin access to admin routes', async ({ page }) => {
    // Sign in as regular user
    await signInAsUser(page);

    // Attempt to access admin route (users page is admin-only)
    const response = await page.goto('/users');

    // Should get 403 Forbidden or be redirected
    if (response) {
      const status = response.status();
      expect([403, 302, 307, 308]).toContain(status);
    }

    // Verify not on admin page or access denied
    const url = page.url();
    if (url.includes('/users')) {
      // If still on users route, check for "Access Denied" or "Unauthorized" message
      const bodyText = await page.innerText('body');
      expect(bodyText).toMatch(/access denied|unauthorized|forbidden|not authorized/i);
    }
  });

  /**
   * AC-06: Email Whitelist Check
   * Priority: P1 (High)
   */
  test('AC-06: should deny access to non-whitelisted email', async ({ page }) => {
    await page.goto('/auth/signin');

    // Mock sign-in with non-whitelisted email
    await page.evaluate(() => {
      localStorage.setItem('test-auth-user', JSON.stringify({
        email: 'not-whitelisted@example.com',
        name: 'Non Whitelisted User',
        role: 'user',
      }));
    });

    // Try to access protected route
    const response = await page.goto('/');

    // Should either get error or redirect to sign-in
    if (response) {
      const status = response.status();
      // Accept various redirect/error codes
      expect([401, 403, 302, 307, 308, 200]).toContain(status);
    }

    // Check for access denied message or redirect to signin
    const url = page.url();
    if (!url.includes('/auth/signin')) {
      const bodyText = await page.innerText('body');
      // Look for any indication of denied access
      const hasDenialMessage =
        bodyText.includes('not authorized') ||
        bodyText.includes('access denied') ||
        bodyText.includes('whitelist') ||
        bodyText.includes('not allowed');

      if (!hasDenialMessage) {
        // If no denial message, check if user is actually authenticated
        const isAuth = await isAuthenticated(page);
        // Non-whitelisted users should not be authenticated
        expect(isAuth).toBe(false);
      }
    }
  });

  /**
   * Additional test: Admin can access admin routes
   * Priority: P0 (Critical)
   */
  test('should allow admin access to admin routes', async ({ page }) => {
    // Sign in as admin
    await signInAsAdmin(page);

    // Access admin routes
    await page.goto('/content');

    // Should successfully load content hub
    await expect(page).toHaveURL(/\/content/);

    // Check for admin content
    const bodyText = await page.innerText('body');
    expect(bodyText).toMatch(/content|meme|review|pending/i);

    // Access users page
    await page.goto('/users');
    await expect(page).toHaveURL(/\/users/);
  });

  /**
   * Edge case: Session timeout handling
   * Priority: P2 (Medium)
   */
  test('should handle expired session gracefully', async ({ page }) => {
    // Sign in
    await signInAsUser(page);

    // Clear cookies to simulate expired session
    await page.context().clearCookies();

    // Try to access protected route
    await page.goto('/schedule');

    // Should redirect to sign-in
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
});
