/**
 * Test video preview rendering across different pages
 * Run with: npx tsx scripts/test-video-preview.ts
 */

import { chromium } from '@playwright/test';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(process.cwd(), '__tests__/fixtures/screenshots');

async function main() {
	console.log('🚀 Starting video preview test...');

	const browser = await chromium.launch({ headless: false });
	const context = await browser.newContext({
		viewport: { width: 1920, height: 1080 },
	});
	const page = await context.newPage();

	try {
		// 1. Login first
		console.log('📝 Logging in...');
		await page.goto(`${BASE_URL}/auth/signin`);
		await page.waitForLoadState('networkidle');

		// Take screenshot of current state
		await page.screenshot({
			path: path.join(SCREENSHOT_DIR, '1-signin-page.png'),
			fullPage: true,
		});
		console.log('✅ Saved signin page screenshot');

		// Click Google signin if available
		const googleButton = page.locator('button:has-text("Sign in with Google")').or(
			page.locator('button:has-text("Google")')
		);

		if (await googleButton.count() > 0) {
			console.log('⚠️  Manual login required - please sign in through Google OAuth');
			console.log('⏳ Waiting 60 seconds for manual login...');
			await page.waitForURL(/\/(en|pl)\//, { timeout: 60000 });
		}

		// 2. Navigate to submissions page
		console.log('📄 Navigating to submissions...');
		await page.goto(`${BASE_URL}/en/submissions`);
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(2000); // Wait for data to load

		await page.screenshot({
			path: path.join(SCREENSHOT_DIR, '2-submissions-page.png'),
			fullPage: true,
		});
		console.log('✅ Saved submissions page screenshot');

		// Check for video content
		const videoCards = await page.locator('[data-video="true"], video, img[src*="thumbnail"]').count();
		console.log(`📹 Found ${videoCards} potential video elements on submissions page`);

		// 3. Navigate to review page
		console.log('📄 Navigating to review...');
		await page.goto(`${BASE_URL}/en/review`);
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(2000);

		await page.screenshot({
			path: path.join(SCREENSHOT_DIR, '3-review-page.png'),
			fullPage: true,
		});
		console.log('✅ Saved review page screenshot');

		// 4. Navigate to schedule page
		console.log('📄 Navigating to schedule...');
		await page.goto(`${BASE_URL}/en/schedule`);
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(2000);

		await page.screenshot({
			path: path.join(SCREENSHOT_DIR, '4-schedule-page.png'),
			fullPage: true,
		});
		console.log('✅ Saved schedule page screenshot');

		// 5. Inspect DOM for video elements
		console.log('🔍 Inspecting video preview elements...');
		const playIcons = await page.locator('[class*="Play"]').count();
		const videoTags = await page.locator('video').count();
		const thumbnailImages = await page.locator('img[src*="thumbnail"]').count();

		console.log(`\n📊 Element counts:`);
		console.log(`  - Play icons: ${playIcons}`);
		console.log(`  - <video> tags: ${videoTags}`);
		console.log(`  - Thumbnail images: ${thumbnailImages}`);

		// 6. Check for any video content items in the DOM
		const contentCards = await page.locator('[class*="Card"], [class*="card"]').all();
		console.log(`\n🎴 Found ${contentCards.length} content cards`);

		for (let i = 0; i < Math.min(3, contentCards.length); i++) {
			const card = contentCards[i];
			const hasPlayIcon = await card.locator('[class*="Play"]').count() > 0;
			const hasVideo = await card.locator('video').count() > 0;
			const imgSrc = await card.locator('img').first().getAttribute('src').catch(() => null);

			console.log(`\n  Card ${i + 1}:`);
			console.log(`    - Has Play icon: ${hasPlayIcon}`);
			console.log(`    - Has <video> tag: ${hasVideo}`);
			console.log(`    - Image src: ${imgSrc?.substring(0, 60)}...`);
		}

		console.log('\n✅ Test complete! Check screenshots in __tests__/fixtures/screenshots/');
	} catch (error) {
		console.error('❌ Error during test:', error);
		await page.screenshot({
			path: path.join(SCREENSHOT_DIR, 'error-state.png'),
			fullPage: true,
		});
	} finally {
		await browser.close();
	}
}

main();
