/**
 * Visual Documentation Capture Script
 *
 * Standalone Playwright script that captures screenshots and GIF recordings
 * of every page in the app, organized by user role.
 *
 * Usage: npm run capture-docs
 * Prerequisites: Dev server running on localhost:3000
 */

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const BASE_URL = 'http://localhost:3000';
const DOCS_DIR = path.join(__dirname, '..', 'docs');
const SCREENSHOTS_DIR = path.join(DOCS_DIR, 'screenshots');
const GIFS_DIR = path.join(DOCS_DIR, 'gifs');
const TEST_IMAGE = path.join(
	__dirname,
	'..',
	'__tests__',
	'e2e',
	'fixtures',
	'test-images',
	'valid-story.jpg',
);

const DESKTOP_VIEWPORT = { width: 1920, height: 1080 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };

// ─── Auth Helpers ────────────────────────────────────────────────────────────

async function signInAsUser(page: Page): Promise<void> {
	await page.context().clearCookies();
	await page.goto('/auth/signin', { waitUntil: 'load', timeout: 30000 });
	const devOnly = page.locator('text=Test Mode');
	await devOnly.waitFor({ state: 'visible', timeout: 20000 });
	const btn = page.getByRole('button', { name: 'Test User' });
	await btn.waitFor({ state: 'visible', timeout: 10000 });
	await page.waitForTimeout(1000);
	await btn.click({ timeout: 5000 });
	await page.waitForURL((url) => !url.pathname.includes('/auth/signin'), { timeout: 30000 });
}

async function signInAsAdmin(page: Page): Promise<void> {
	await page.context().clearCookies();
	await page.goto('/auth/signin', { waitUntil: 'load', timeout: 30000 });
	const devOnly = page.locator('text=Test Mode');
	await devOnly.waitFor({ state: 'visible', timeout: 20000 });
	const btn = page.getByRole('button', { name: 'Test Admin' });
	await btn.waitFor({ state: 'visible', timeout: 10000 });
	await page.waitForTimeout(1000);
	await btn.click({ timeout: 5000 });
	await page.waitForURL((url) => !url.pathname.includes('/auth/signin'), { timeout: 30000 });
}

async function signInAsDeveloper(page: Page): Promise<void> {
	await page.context().clearCookies();
	await page.goto('/auth/signin', { waitUntil: 'load', timeout: 30000 });
	const devOnly = page.locator('text=Test Mode');
	await devOnly.waitFor({ state: 'visible', timeout: 20000 });

	// Developer role has no dedicated UI button — use credentials provider via evaluate
	await page.evaluate(async () => {
		const res = await fetch('/api/auth/callback/test-credentials', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				email: 'developer@test.com',
				csrfToken: document.cookie
					.split('; ')
					.find((c) => c.startsWith('next-auth.csrf-token'))
					?.split('=')
					.slice(1)
					.join('=')
					?.split('|')[0] ?? '',
			}),
			redirect: 'follow',
		});
		return res.url;
	});

	await page.goto('/', { waitUntil: 'load', timeout: 30000 });
	await page.waitForTimeout(2000);
}

// ─── Screenshot Helpers ──────────────────────────────────────────────────────

async function captureScreenshot(
	page: Page,
	urlPath: string,
	outputPath: string,
	label: string,
	options: { waitForSelector?: string; preAction?: (p: Page) => Promise<void> } = {},
): Promise<void> {
	const fullPath = path.join(SCREENSHOTS_DIR, outputPath);
	const dir = path.dirname(fullPath);
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

	await page.goto(urlPath, { waitUntil: 'load', timeout: 30000 });
	await page.waitForLoadState('networkidle').catch(() => {});
	await page.waitForTimeout(1500);

	if (options.waitForSelector) {
		await page.waitForSelector(options.waitForSelector, { timeout: 10000 }).catch(() => {});
	}
	if (options.preAction) {
		await options.preAction(page);
		await page.waitForTimeout(500);
	}

	await page.screenshot({ path: fullPath, fullPage: true });
	console.log(`  ✅ ${label} → ${outputPath}`);
}

// ─── GIF Recording Helpers ───────────────────────────────────────────────────

function hasFFmpeg(): boolean {
	try {
		execSync('which ffmpeg', { stdio: 'ignore' });
		return true;
	} catch {
		return false;
	}
}

function convertWebmToGif(webmPath: string, gifPath: string, width: number): void {
	const cmd = [
		'ffmpeg -y -i',
		`"${webmPath}"`,
		'-vf',
		`"fps=12,scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse"`,
		'-loop 0',
		`"${gifPath}"`,
	].join(' ');
	execSync(cmd, { stdio: 'ignore' });
}

interface GifCapture {
	name: string;
	output: string;
	viewport: { width: number; height: number };
	gifWidth: number;
	perform: (page: Page) => Promise<void>;
}

async function recordGif(
	browser: Browser,
	capture: GifCapture,
	ffmpegAvailable: boolean,
): Promise<void> {
	const tempDir = path.join(GIFS_DIR, '.temp');
	if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

	const context = await browser.newContext({
		viewport: capture.viewport,
		recordVideo: { dir: tempDir, size: capture.viewport },
		baseURL: BASE_URL,
	});
	const page = await context.newPage();

	try {
		await capture.perform(page);
	} catch (err) {
		console.warn(`  ⚠️  GIF "${capture.name}" interaction failed: ${err}`);
	}

	await page.close();
	const videoPath = await page.video()?.path();
	await context.close();

	if (!videoPath || !fs.existsSync(videoPath)) {
		console.warn(`  ⚠️  No video recorded for "${capture.name}"`);
		return;
	}

	const gifPath = path.join(GIFS_DIR, capture.output);

	if (ffmpegAvailable) {
		try {
			convertWebmToGif(videoPath, gifPath, capture.gifWidth);
			fs.unlinkSync(videoPath);
			console.log(`  ✅ ${capture.name} → ${capture.output}`);
		} catch (err) {
			// Keep webm as fallback
			const webmOutput = capture.output.replace('.gif', '.webm');
			const webmDest = path.join(GIFS_DIR, webmOutput);
			fs.renameSync(videoPath, webmDest);
			console.log(`  ⚠️  ${capture.name} → ${webmOutput} (ffmpeg conversion failed)`);
		}
	} else {
		const webmOutput = capture.output.replace('.gif', '.webm');
		const webmDest = path.join(GIFS_DIR, webmOutput);
		fs.renameSync(videoPath, webmDest);
		console.log(`  ✅ ${capture.name} → ${webmOutput} (install ffmpeg for .gif)`);
	}

	// Clean temp dir
	try {
		fs.rmSync(tempDir, { recursive: true, force: true });
	} catch {}
}

// ─── Main Capture Sequences ──────────────────────────────────────────────────

async function capturePublicPages(page: Page): Promise<void> {
	console.log('\n📸 Public Pages');
	await page.context().clearCookies();
	await captureScreenshot(page, '/auth/signin', 'public/01-signin.png', 'Sign In');
}

async function captureUserPages(page: Page): Promise<void> {
	console.log('\n📸 User Pages');
	await signInAsUser(page);

	await captureScreenshot(page, '/', 'user/01-dashboard.png', 'User Dashboard');
	await captureScreenshot(page, '/submit', 'user/02-submit-empty.png', 'Submit (empty)');
	await captureScreenshot(page, '/submit', 'user/03-submit-with-image.png', 'Submit (with image)', {
		preAction: async (p) => {
			const input = p.locator('input[type="file"]');
			if ((await input.count()) > 0) {
				await input.setInputFiles(TEST_IMAGE);
				await p.waitForTimeout(2000);
			}
		},
	});
	await captureScreenshot(page, '/submissions', 'user/04-submissions.png', 'Submissions');
	await captureScreenshot(page, '/memes', 'user/05-memes.png', 'Memes Gallery');
	await captureScreenshot(page, '/memes/submit', 'user/06-meme-submit.png', 'Meme Submit');
}

async function captureAdminPages(page: Page): Promise<void> {
	console.log('\n📸 Admin Pages');
	await signInAsAdmin(page);

	await captureScreenshot(page, '/', 'admin/01-dashboard.png', 'Admin Dashboard');
	await captureScreenshot(page, '/review', 'admin/02-review.png', 'Review Queue');

	// Schedule views
	await captureScreenshot(page, '/schedule', 'admin/03-schedule-day.png', 'Schedule (day)', {
		preAction: async (p) => {
			const dayBtn = p.getByRole('button', { name: /day/i });
			if ((await dayBtn.count()) > 0) await dayBtn.first().click();
			await p.waitForTimeout(500);
		},
	});
	await captureScreenshot(page, '/schedule', 'admin/04-schedule-week.png', 'Schedule (week)', {
		preAction: async (p) => {
			const weekBtn = p.getByRole('button', { name: /week/i });
			if ((await weekBtn.count()) > 0) await weekBtn.first().click();
			await p.waitForTimeout(500);
		},
	});
	await captureScreenshot(page, '/schedule', 'admin/05-schedule-month.png', 'Schedule (month)', {
		preAction: async (p) => {
			const monthBtn = p.getByRole('button', { name: /month/i });
			if ((await monthBtn.count()) > 0) await monthBtn.first().click();
			await p.waitForTimeout(500);
		},
	});
	await captureScreenshot(page, '/schedule', 'admin/06-schedule-list.png', 'Schedule (list)', {
		preAction: async (p) => {
			const listBtn = p.getByRole('button', { name: /list/i });
			if ((await listBtn.count()) > 0) await listBtn.first().click();
			await p.waitForTimeout(500);
		},
	});

	// Content hub
	await captureScreenshot(page, '/content', 'admin/07-content-kanban.png', 'Content (kanban)');
	await captureScreenshot(page, '/content?view=list', 'admin/08-content-list.png', 'Content (list)');

	// Other admin pages
	await captureScreenshot(page, '/posted-stories', 'admin/09-posted-stories.png', 'Posted Stories');
	await captureScreenshot(page, '/analytics', 'admin/10-analytics.png', 'Analytics');
	await captureScreenshot(page, '/insights', 'admin/11-insights.png', 'Insights');
	await captureScreenshot(page, '/inbox', 'admin/12-inbox.png', 'Inbox');
	await captureScreenshot(page, '/admin', 'admin/13-admin-monitoring.png', 'Admin Monitoring');
	await captureScreenshot(page, '/users', 'admin/14-users.png', 'User Management');
	await captureScreenshot(page, '/developer', 'admin/15-developer-tools.png', 'Developer Tools');
	await captureScreenshot(
		page,
		'/developer/cron-debug',
		'admin/16-cron-debug.png',
		'Cron Debug',
	);
	await captureScreenshot(page, '/release-notes', 'admin/17-release-notes.png', 'Release Notes');
	await captureScreenshot(page, '/debug', 'admin/18-debug.png', 'Debug Info');
}

async function captureDeveloperPages(page: Page): Promise<void> {
	console.log('\n📸 Developer Pages');
	await signInAsDeveloper(page);
	await captureScreenshot(page, '/settings', 'developer/01-settings.png', 'Settings');
}

async function captureMobilePages(browser: Browser): Promise<void> {
	console.log('\n📱 Mobile Pages');
	const context = await browser.newContext({
		viewport: MOBILE_VIEWPORT,
		baseURL: BASE_URL,
		isMobile: true,
		hasTouch: true,
	});
	const page = await context.newPage();

	try {
		// Public
		await page.context().clearCookies();
		await captureScreenshot(page, '/auth/signin', 'mobile/01-signin.png', 'Mobile Sign In');

		// User
		await signInAsUser(page);
		await captureScreenshot(page, '/', 'mobile/02-user-dashboard.png', 'Mobile User Dashboard');
		await captureScreenshot(page, '/submit', 'mobile/03-submit.png', 'Mobile Submit');
		await captureScreenshot(
			page,
			'/submissions',
			'mobile/04-submissions.png',
			'Mobile Submissions',
		);

		// Admin
		await signInAsAdmin(page);
		await captureScreenshot(page, '/', 'mobile/05-admin-dashboard.png', 'Mobile Admin Dashboard');
		await captureScreenshot(page, '/review', 'mobile/06-review.png', 'Mobile Review');
		await captureScreenshot(
			page,
			'/schedule-mobile',
			'mobile/07-schedule-timeline.png',
			'Mobile Schedule',
		);
		await captureScreenshot(page, '/content', 'mobile/08-content.png', 'Mobile Content');
	} finally {
		await context.close();
	}
}

// ─── GIF Definitions ─────────────────────────────────────────────────────────

function getGifCaptures(): GifCapture[] {
	return [
		{
			name: 'Login Flow',
			output: '01-login-flow.gif',
			viewport: { width: 1280, height: 720 },
			gifWidth: 960,
			perform: async (page) => {
				await page.context().clearCookies();
				await page.goto('/auth/signin', { waitUntil: 'load', timeout: 30000 });
				const devOnly = page.locator('text=Test Mode');
				await devOnly.waitFor({ state: 'visible', timeout: 20000 });
				await page.waitForTimeout(1000);
				const btn = page.getByRole('button', { name: 'Test Admin' });
				await btn.click({ timeout: 5000 });
				await page.waitForURL((url) => !url.pathname.includes('/auth/signin'), {
					timeout: 30000,
				});
				await page.waitForTimeout(2000);
			},
		},
		{
			name: 'Content Submission',
			output: '02-content-submission.gif',
			viewport: { width: 1280, height: 720 },
			gifWidth: 960,
			perform: async (page) => {
				await signInAsUser(page);
				await page.goto('/submit', { waitUntil: 'load', timeout: 30000 });
				await page.waitForTimeout(1000);
				const input = page.locator('input[type="file"]');
				if ((await input.count()) > 0) {
					await input.setInputFiles(TEST_IMAGE);
					await page.waitForTimeout(2000);
				}
				const caption = page.locator('textarea').first();
				if ((await caption.count()) > 0) {
					await caption.fill('Check out this amazing story! 🌟');
					await page.waitForTimeout(1000);
				}
			},
		},
		{
			name: 'Swipe Review',
			output: '03-swipe-review.gif',
			viewport: { width: 1280, height: 720 },
			gifWidth: 960,
			perform: async (page) => {
				await signInAsAdmin(page);
				await page.goto('/review', { waitUntil: 'load', timeout: 30000 });
				await page.waitForTimeout(2000);

				// Attempt swipe-right gesture (approve)
				const card = page.locator('[data-testid="review-card"]').first();
				if ((await card.count()) > 0) {
					const box = await card.boundingBox();
					if (box) {
						const startX = box.x + box.width / 2;
						const startY = box.y + box.height / 2;
						await page.mouse.move(startX, startY, { steps: 5 });
						await page.mouse.down();
						await page.mouse.move(startX + 300, startY, { steps: 20 });
						await page.waitForTimeout(500);
						await page.mouse.up();
						await page.waitForTimeout(1000);
					}
				}

				// Attempt swipe-left gesture (reject) on next card
				const nextCard = page.locator('[data-testid="review-card"]').first();
				if ((await nextCard.count()) > 0) {
					const box = await nextCard.boundingBox();
					if (box) {
						const startX = box.x + box.width / 2;
						const startY = box.y + box.height / 2;
						await page.mouse.move(startX, startY, { steps: 5 });
						await page.mouse.down();
						await page.mouse.move(startX - 300, startY, { steps: 20 });
						await page.waitForTimeout(500);
						await page.mouse.up();
						await page.waitForTimeout(1000);
					}
				}
			},
		},
		{
			name: 'Drag-and-Drop Scheduling',
			output: '04-drag-drop-schedule.gif',
			viewport: { width: 1440, height: 900 },
			gifWidth: 1080,
			perform: async (page) => {
				await signInAsAdmin(page);
				await page.goto('/schedule', { waitUntil: 'load', timeout: 30000 });
				await page.waitForTimeout(2000);

				// Look for draggable items in the sidebar
				const sidebarItem = page.locator('[data-testid="ready-item"]').first();
				const calendarSlot = page.locator('[data-testid="calendar-slot"]').first();

				if ((await sidebarItem.count()) > 0 && (await calendarSlot.count()) > 0) {
					const srcBox = await sidebarItem.boundingBox();
					const dstBox = await calendarSlot.boundingBox();
					if (srcBox && dstBox) {
						const startX = srcBox.x + srcBox.width / 2;
						const startY = srcBox.y + srcBox.height / 2;
						const endX = dstBox.x + dstBox.width / 2;
						const endY = dstBox.y + dstBox.height / 2;
						await page.mouse.move(startX, startY, { steps: 5 });
						await page.mouse.down();
						await page.mouse.move(endX, endY, { steps: 20 });
						await page.waitForTimeout(500);
						await page.mouse.up();
						await page.waitForTimeout(1500);
					}
				}
			},
		},
		{
			name: 'Kanban Drag',
			output: '05-kanban-drag.gif',
			viewport: { width: 1440, height: 900 },
			gifWidth: 1080,
			perform: async (page) => {
				await signInAsAdmin(page);
				await page.goto('/content', { waitUntil: 'load', timeout: 30000 });
				await page.waitForTimeout(2000);

				// Drag first card from one column to next
				const card = page.locator('[data-testid="kanban-card"]').first();
				if ((await card.count()) > 0) {
					const box = await card.boundingBox();
					if (box) {
						const startX = box.x + box.width / 2;
						const startY = box.y + box.height / 2;
						await page.mouse.move(startX, startY, { steps: 5 });
						await page.mouse.down();
						await page.mouse.move(startX + 350, startY, { steps: 20 });
						await page.waitForTimeout(500);
						await page.mouse.up();
						await page.waitForTimeout(1500);
					}
				}
			},
		},
		{
			name: 'Content Preview Modal',
			output: '06-content-preview.gif',
			viewport: { width: 1440, height: 900 },
			gifWidth: 1080,
			perform: async (page) => {
				await signInAsAdmin(page);
				await page.goto('/content?view=list', { waitUntil: 'load', timeout: 30000 });
				await page.waitForTimeout(2000);

				// Click first content item to open preview
				const firstItem = page.locator('table tbody tr').first();
				if ((await firstItem.count()) > 0) {
					await firstItem.click();
					await page.waitForTimeout(2000);

					// Close preview
					const closeBtn = page.locator('[data-testid="close-preview"], button:has-text("Close"), [aria-label="Close"]').first();
					if ((await closeBtn.count()) > 0) {
						await closeBtn.click();
						await page.waitForTimeout(1000);
					}
				}
			},
		},
		{
			name: 'Mobile Navigation',
			output: '07-mobile-navigation.gif',
			viewport: { width: 390, height: 844 },
			gifWidth: 390,
			perform: async (page) => {
				await signInAsAdmin(page);
				await page.goto('/', { waitUntil: 'load', timeout: 30000 });
				await page.waitForTimeout(1500);

				// Tap through bottom nav tabs
				const navItems = ['Review', 'Schedule', 'Content'];
				for (const name of navItems) {
					const tab = page.locator(`nav a, nav button`).filter({ hasText: name }).first();
					if ((await tab.count()) > 0) {
						await tab.click();
						await page.waitForTimeout(1500);
					}
				}
			},
		},
		{
			name: 'Theme Toggle',
			output: '08-theme-toggle.gif',
			viewport: { width: 1280, height: 720 },
			gifWidth: 960,
			perform: async (page) => {
				await signInAsAdmin(page);
				await page.goto('/', { waitUntil: 'load', timeout: 30000 });
				await page.waitForTimeout(1500);

				// Look for theme toggle button
				const themeBtn = page.locator(
					'[data-testid="theme-toggle"], button[aria-label*="theme"], button[aria-label*="Theme"], button[aria-label*="dark"], button[aria-label*="light"]',
				).first();
				if ((await themeBtn.count()) > 0) {
					await themeBtn.click();
					await page.waitForTimeout(1500);
					await themeBtn.click();
					await page.waitForTimeout(1500);
				}
			},
		},
	];
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
	console.log('🎬 Starting Visual Documentation Capture');
	console.log(`   Base URL: ${BASE_URL}`);
	console.log(`   Output:   ${DOCS_DIR}`);

	// Verify dev server is running
	try {
		const res = await fetch(BASE_URL);
		if (!res.ok) throw new Error(`Status ${res.status}`);
	} catch {
		console.error('\n❌ Dev server not running at ' + BASE_URL);
		console.error('   Start it with: npm run dev\n');
		process.exit(1);
	}

	const ffmpegAvailable = hasFFmpeg();
	if (!ffmpegAvailable) {
		console.log('   ⚠️  ffmpeg not found — GIFs will be saved as .webm');
		console.log('   Install ffmpeg for .gif output: brew install ffmpeg\n');
	}

	// Ensure output directories exist
	for (const sub of ['public', 'user', 'admin', 'developer', 'mobile']) {
		fs.mkdirSync(path.join(SCREENSHOTS_DIR, sub), { recursive: true });
	}
	fs.mkdirSync(GIFS_DIR, { recursive: true });

	const browser = await chromium.launch({ headless: true });

	try {
		// Desktop screenshots
		const context = await browser.newContext({
			viewport: DESKTOP_VIEWPORT,
			baseURL: BASE_URL,
		});
		const page = await context.newPage();

		await capturePublicPages(page);
		await captureUserPages(page);
		await captureAdminPages(page);
		await captureDeveloperPages(page);
		await context.close();

		// Mobile screenshots
		await captureMobilePages(browser);

		// GIF recordings
		console.log('\n🎥 GIF Recordings');
		const gifCaptures = getGifCaptures();
		for (const capture of gifCaptures) {
			await recordGif(browser, capture, ffmpegAvailable);
		}
	} finally {
		await browser.close();
	}

	// Summary
	const screenshotCount = countFiles(SCREENSHOTS_DIR, '.png');
	const gifCount = countFiles(GIFS_DIR, '.gif') + countFiles(GIFS_DIR, '.webm');
	console.log(`\n✅ Done! ${screenshotCount} screenshots, ${gifCount} recordings`);
	console.log(`   View the guide: docs/VISUAL-GUIDE.md`);
}

function countFiles(dir: string, ext: string): number {
	let count = 0;
	if (!fs.existsSync(dir)) return 0;
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			count += countFiles(path.join(dir, entry.name), ext);
		} else if (entry.name.endsWith(ext)) {
			count++;
		}
	}
	return count;
}

main().catch((err) => {
	console.error('❌ Capture failed:', err);
	process.exit(1);
});
