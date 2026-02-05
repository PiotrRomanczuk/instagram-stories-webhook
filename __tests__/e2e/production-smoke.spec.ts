import { test, expect } from '@playwright/test';
import { signInAsRealIG } from './helpers/auth';
import { getTestVideo, canPublishTestVideo } from './helpers/test-assets';

/**
 * Production Smoke Tests
 *
 * These tests verify critical functionality on the DEPLOYED production site.
 *
 * IMPORTANT:
 * - Tests against REAL deployed URL (not localhost)
 * - Uses REAL Instagram account (@www_hehe_pl)
 * - Only runs critical paths (not full test suite)
 * - 24-hour de-duplication prevents duplicate publishes
 * - Rate limiting considerations apply
 *
 * RUN:
 *   BASE_URL=https://your-app.vercel.app \
 *   ENABLE_REAL_IG_TESTS=true \
 *   ENABLE_LIVE_IG_PUBLISH=true \
 *     npx playwright test --config=playwright.config.production.ts
 *
 * @smoke - Tag for production smoke tests
 */

test.describe('Production Smoke Tests @smoke', () => {
  // Skip in local development
  test.skip(
    () => !process.env.BASE_URL || process.env.BASE_URL.includes('localhost'),
    'Production tests require BASE_URL to be set to deployed site'
  );

  // Skip without explicit opt-in
  test.skip(
    () => process.env.ENABLE_LIVE_IG_PUBLISH !== 'true',
    'Set ENABLE_LIVE_IG_PUBLISH=true to run production smoke tests'
  );

  /**
   * SMOKE-01: Production site is accessible and loads
   */
  test('SMOKE-01: production site loads successfully', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Verify page loaded
    await expect(page).toHaveTitle(/Instagram Stories/i, { timeout: 10000 });

    console.log('✅ Production site accessible');
  });

  /**
   * SMOKE-02: Authentication works in production
   */
  test('SMOKE-02: can sign in with real Instagram account', async ({ page }) => {
    await signInAsRealIG(page);

    // Should be redirected to authenticated page
    await page.waitForLoadState('domcontentloaded');

    // Verify authenticated
    const bodyText = await page.innerText('body');
    expect(bodyText.toLowerCase()).toContain('sign out');

    console.log('✅ Authentication works in production');
  });

  /**
   * SMOKE-03: Debug page shows Instagram connection in production
   */
  test('SMOKE-03: Instagram connection status works', async ({ page }) => {
    await signInAsRealIG(page);
    await page.goto('/debug');
    await page.waitForLoadState('domcontentloaded');

    // Should show connected Instagram account
    await expect(page.locator('text=www_hehe_pl')).toBeVisible({ timeout: 15000 });

    // Should NOT show expired
    const bodyText = await page.innerText('body');
    expect(bodyText.toLowerCase()).not.toContain('expired');

    console.log('✅ Instagram connection works in production');
  });

  /**
   * SMOKE-04: Can upload and publish video to production Instagram
   *
   * This is THE critical production test - verifies end-to-end publishing works.
   * Includes 24-hour de-duplication to prevent rate limiting.
   */
  test('SMOKE-04: can publish video story to Instagram', async ({ page, request }) => {
    // Check if test video exists
    const testVideoPath = getTestVideo();

    if (!testVideoPath) {
      console.warn('⚠️ Test video not found, skipping production smoke test');
      test.skip();
      return;
    }

    // Check if video was published recently (24-hour de-duplication)
    const canPublish = await canPublishTestVideo(request);

    if (!canPublish) {
      console.warn('⚠️ Test video published in last 24h, skipping to avoid duplicate');
      test.skip();
      return;
    }

    await signInAsRealIG(page);
    await page.goto('/debug');
    await page.waitForLoadState('domcontentloaded');

    // Verify Instagram connected
    await expect(page.locator('text=www_hehe_pl')).toBeVisible({ timeout: 15000 });

    // Upload test video
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testVideoPath);
    console.log('📹 Uploading test video to production...');

    // Wait for upload (production may be slower)
    const urlInput = page.locator('input#debug-image-url');
    await expect(urlInput).not.toHaveValue('', { timeout: 90000 }); // 90s for production
    const uploadedUrl = await urlInput.inputValue();
    console.log(`✅ Video uploaded to production: ${uploadedUrl.substring(0, 50)}...`);

    // Verify preview
    await expect(page.locator('video, img[alt="Preview"]').first()).toBeVisible({ timeout: 15000 });

    // Publish to Instagram
    const publishButton = page.getByRole('button', { name: /Publish to Instagram Now/i });
    await expect(publishButton).toBeEnabled();
    console.log('🚀 Publishing video to Instagram from PRODUCTION...');
    console.log('⏳ Note: Production video processing can take 30-120 seconds...');
    await publishButton.click();

    // Wait for result (generous timeout for production)
    const successAlert = page.locator('text=Published Successfully!');
    const failAlert = page.locator('text=Publish Failed');

    await expect(successAlert.or(failAlert)).toBeVisible({ timeout: 180000 }); // 3 minutes

    // Verify success
    if (await successAlert.isVisible()) {
      const resultText = await page.locator('.font-semibold:has-text("Published Successfully!")').locator('..').innerText();
      console.log('✅ PRODUCTION VIDEO PUBLISH SUCCESS!', resultText);

      // Extract Media ID
      const logsSection = page.locator('text=Debug Logs').locator('..');
      const logs = await logsSection.innerText();
      const mediaIdMatch = logs.match(/Media ID: (\d+)/);
      if (mediaIdMatch) {
        console.log(`📱 Production Instagram Media ID: ${mediaIdMatch[1]}`);
      }
    } else {
      const errorText = await page.locator('text=Publish Failed').locator('..').innerText();
      console.error('❌ PRODUCTION PUBLISH FAILED:', errorText);

      const logsSection = page.locator('text=Debug Logs').locator('..');
      const logs = await logsSection.innerText();
      console.error('📋 Production Logs:', logs);

      throw new Error(`Production video publishing failed: ${errorText}`);
    }
  });

  /**
   * SMOKE-05: Content API works in production
   */
  test('SMOKE-05: content API returns data', async ({ request }) => {
    // Test public API endpoint
    const response = await request.get('/api/content?limit=5');

    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty('items');
    expect(Array.isArray(data.items)).toBe(true);

    console.log('✅ Content API works in production');
    console.log(`📊 Retrieved ${data.items.length} items from production`);
  });

  /**
   * SMOKE-06: Health check endpoint works
   */
  test('SMOKE-06: health check passes', async ({ request }) => {
    // Test health check endpoint (if you have one)
    const response = await request.get('/api/health');

    // Should return 200 or 404 if not implemented
    expect([200, 404]).toContain(response.status());

    if (response.ok()) {
      console.log('✅ Health check endpoint works');
    } else {
      console.log('ℹ️ No health check endpoint (add one at /api/health)');
    }
  });
});
