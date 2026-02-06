/**
 * User Mobile Journey E2E Test
 *
 * Simulates a real user on mobile (iPhone 14 Pro - 390x844 viewport)
 * performing the full meme submission lifecycle:
 * submit -> verify in dashboard -> edit -> delete
 *
 * Uses real authentication via signInAsUser helper.
 */

import { test, expect } from '@playwright/test';
import { signInAsUser, signInAsAdmin } from './helpers/auth';
import { cleanupTestContentByPattern } from './helpers/seed';
import path from 'path';
import fs from 'fs';

const TEST_TITLE_PREFIX = 'E2E Mobile Test';

// Pick a random meme from the /memes folder to avoid phash duplicate detection
const MEMES_DIR = path.join(process.cwd(), 'memes');
const memeFiles = fs.readdirSync(MEMES_DIR).filter((f) => f.endsWith('.jpg'));
const randomMeme = memeFiles[Math.floor(Math.random() * memeFiles.length)];
const TEST_IMAGE_PATH = path.join(MEMES_DIR, randomMeme);

test.use({
	viewport: { width: 390, height: 844 },
	video: { mode: 'on', size: { width: 390, height: 844 } },
});

test.describe.serial('User Mobile Journey', () => {

	// Clean up leftover meme submissions from previous test runs
	// Use admin account since phash duplicate detection is global across all users
	test.beforeAll(async ({ browser }) => {
		const context = await browser.newContext({
			viewport: { width: 390, height: 844 },
		});
		const page = await context.newPage();
		try {
			// Sign in as admin to see ALL memes (not just user's own)
			await signInAsAdmin(page);
			const response = await page.request.get('/api/memes?limit=100');
			if (response.ok()) {
				const data = await response.json();
				const memes = data.memes || [];
				let cleaned = 0;
				for (const meme of memes) {
					if (meme.title?.includes(TEST_TITLE_PREFIX)) {
						await page.request.delete(`/api/memes/${meme.id}`);
						cleaned++;
					}
				}
				if (cleaned > 0) {
					console.log(`beforeAll: cleaned ${cleaned} leftover meme submissions`);
				}
			}
			await cleanupTestContentByPattern(page, TEST_TITLE_PREFIX);
		} catch (error) {
			console.warn('beforeAll cleanup failed (this may be expected):', error);
		} finally {
			await context.close();
		}
	});

	test.beforeEach(async ({ page }) => {
		await signInAsUser(page);
	});

	test.afterAll(async ({ browser }) => {
		const context = await browser.newContext({
			viewport: { width: 390, height: 844 },
		});
		const page = await context.newPage();
		try {
			await signInAsUser(page);
			// Clean up meme submissions
			const response = await page.request.get('/api/memes?limit=100');
			if (response.ok()) {
				const data = await response.json();
				const memes = data.memes || [];
				let memeCount = 0;
				for (const meme of memes) {
					if (meme.title?.includes(TEST_TITLE_PREFIX)) {
						await page.request.delete(`/api/memes/${meme.id}`);
						memeCount++;
					}
				}
				if (memeCount > 0) {
					console.log(`Cleanup: removed ${memeCount} test meme submissions`);
				}
			}
			// Also clean content items
			const deleted = await cleanupTestContentByPattern(
				page,
				TEST_TITLE_PREFIX,
			);
			console.log(
				`Cleanup: removed ${deleted} test content items matching "${TEST_TITLE_PREFIX}"`,
			);
		} catch (error) {
			console.warn('Cleanup failed (this may be expected):', error);
		} finally {
			await context.close();
		}
	});

	const timestamp = Date.now();
	const testTitle = `${TEST_TITLE_PREFIX} ${timestamp}`;
	const testCaption = 'Mobile journey test';
	const updatedTitle = `${TEST_TITLE_PREFIX} Updated ${timestamp}`;

	// Track whether submission succeeded for dependent tests
	let submissionSucceeded = false;

	test('USER-MOB-01: Navigate to submit page and verify mobile layout', async ({
		page,
	}) => {
		await page.goto('/memes/submit', { waitUntil: 'load', timeout: 15000 });

		// Verify page loaded correctly on mobile
		await expect(page.locator('h1')).toContainText('Submit a Meme', {
			timeout: 10000,
		});

		// Verify the form is present
		const form = page.locator('form');
		await expect(form).toBeVisible({ timeout: 10000 });

		// Verify file upload area is present and tappable
		const uploadArea = page.locator('input[type="file"]');
		await expect(uploadArea).toBeAttached();

		// Verify title input is visible and usable (not clipped)
		const titleInput = page.locator('input[placeholder="A catchy title..."]');
		await expect(titleInput).toBeVisible();
		const titleBox = await titleInput.boundingBox();
		expect(titleBox).toBeTruthy();
		expect(titleBox!.width).toBeGreaterThan(100);

		// Verify caption input is visible
		const captionInput = page.locator(
			'input[placeholder="Add a fun caption..."]',
		);
		await expect(captionInput).toBeVisible();

		// Verify submit button is visible on mobile
		const submitButton = page.getByRole('button', {
			name: /Submit Meme for Review/i,
		});
		await expect(submitButton).toBeVisible();
		const buttonBox = await submitButton.boundingBox();
		expect(buttonBox).toBeTruthy();
		// Button should not be off-screen
		expect(buttonBox!.x).toBeGreaterThanOrEqual(0);
		expect(buttonBox!.x + buttonBox!.width).toBeLessThanOrEqual(390);
	});

	test('USER-MOB-02: Upload image and submit meme', async ({ page }) => {
		await page.goto('/memes/submit', { waitUntil: 'load', timeout: 15000 });

		// Wait for form to be ready
		await expect(page.locator('form')).toBeVisible({ timeout: 10000 });

		// Intercept the memes API call to capture exact error
		const apiResponsePromise = page.waitForResponse(
			(resp) => resp.url().includes('/api/memes') && resp.request().method() === 'POST',
			{ timeout: 30000 },
		);

		// Upload test image via file input
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(TEST_IMAGE_PATH);

		// Wait for upload to complete (preview image visible means upload finished)
		await expect(
			page.locator('img[alt="Preview"]'),
		).toBeVisible({ timeout: 30000 });

		// Fill in title
		const titleInput = page.locator('input[placeholder="A catchy title..."]');
		await titleInput.fill(testTitle);

		// Fill in caption
		const captionInput = page.locator(
			'input[placeholder="Add a fun caption..."]',
		);
		await captionInput.fill(testCaption);

		// Click submit
		const submitButton = page.getByRole('button', {
			name: /Submit Meme for Review/i,
		});
		await expect(submitButton).toBeEnabled({ timeout: 5000 });
		await submitButton.click();

		// Wait for the API response to understand what happened
		const apiResponse = await apiResponsePromise;
		const responseStatus = apiResponse.status();

		if (responseStatus !== 200) {
			const responseBody = await apiResponse.json().catch(() => null);
			console.error(
				`USER-MOB-02: POST /api/memes returned ${responseStatus}:`,
				JSON.stringify(responseBody, null, 2),
			);
		}

		// Verify success toast
		await expect(page.locator('text=Meme submitted successfully')).toBeVisible({
			timeout: 15000,
		});

		submissionSucceeded = true;
	});

	test('USER-MOB-03: Verify submission appears in meme dashboard', async ({
		page,
	}) => {
		test.skip(!submissionSucceeded, 'Skipping: USER-MOB-02 submission did not succeed');

		await page.goto('/memes', { waitUntil: 'load', timeout: 15000 });

		// Wait for dashboard to load
		await expect(
			page.locator('h2').filter({ hasText: /Your Submissions/i }),
		).toBeVisible({ timeout: 10000 });

		// Wait for memes to load (loading spinner goes away)
		await expect(page.locator('text=Loading your submissions')).toBeHidden({
			timeout: 15000,
		});

		// Look for our test submission by title
		const memeCard = page.locator(`text=${testTitle}`).first();
		await expect(memeCard).toBeVisible({ timeout: 10000 });

		// Verify status badge shows "Pending Review"
		await expect(page.locator('text=Pending Review').first()).toBeVisible({
			timeout: 5000,
		});
	});

	test('USER-MOB-04: Edit pending submission via modal', async ({ page }) => {
		test.skip(!submissionSucceeded, 'Skipping: USER-MOB-02 submission did not succeed');

		await page.goto('/memes', { waitUntil: 'load', timeout: 15000 });

		// Wait for dashboard to load
		await expect(page.locator('text=Loading your submissions')).toBeHidden({
			timeout: 15000,
		});

		// Find the card with our test title and click Edit
		const testCard = page
			.locator(`text=${testTitle}`)
			.first()
			.locator('xpath=ancestor::div[contains(@class, "rounded-3xl")]');

		const editButton = testCard.getByRole('button', { name: 'Edit' });
		await expect(editButton).toBeVisible({ timeout: 5000 });
		await editButton.click();

		// Verify edit modal opens on mobile
		await expect(page.locator('text=Edit Meme Submission')).toBeVisible({
			timeout: 5000,
		});

		// Verify modal renders correctly on mobile (not clipped)
		const modal = page.locator('text=Edit Meme Submission').locator('xpath=ancestor::div[contains(@class, "max-w-2xl")]');
		const modalBox = await modal.boundingBox();
		expect(modalBox).toBeTruthy();
		// Modal should fit within mobile viewport width
		expect(modalBox!.width).toBeLessThanOrEqual(390);

		// Clear and update the title
		const titleInput = page.locator(
			'input[placeholder="Add a title to your meme"]',
		);
		await expect(titleInput).toBeVisible();
		await titleInput.clear();
		await titleInput.fill(updatedTitle);

		// Save changes
		const saveButton = page.getByRole('button', { name: /Save Changes/i });
		await expect(saveButton).toBeVisible();
		await saveButton.click();

		// Verify success toast
		await expect(page.locator('text=Meme updated successfully')).toBeVisible({
			timeout: 10000,
		});

		// Verify updated title appears on card
		await expect(page.locator(`text=${updatedTitle}`).first()).toBeVisible({
			timeout: 10000,
		});
	});

	test('USER-MOB-05: Delete submission', async ({ page }) => {
		test.skip(!submissionSucceeded, 'Skipping: USER-MOB-02 submission did not succeed');

		await page.goto('/memes', { waitUntil: 'load', timeout: 15000 });

		// Wait for dashboard to load
		await expect(page.locator('text=Loading your submissions')).toBeHidden({
			timeout: 15000,
		});

		// Find the card with the updated title
		const testCard = page
			.locator(`text=${updatedTitle}`)
			.first()
			.locator('xpath=ancestor::div[contains(@class, "rounded-3xl")]');

		// Click Delete button
		const deleteButton = testCard.getByRole('button', { name: 'Delete' });
		await expect(deleteButton).toBeVisible({ timeout: 5000 });

		// Set up dialog handler for the confirm prompt
		page.on('dialog', async (dialog) => {
			expect(dialog.type()).toBe('confirm');
			await dialog.accept();
		});

		await deleteButton.click();

		// Verify success toast
		await expect(page.locator('text=Meme deleted successfully')).toBeVisible({
			timeout: 10000,
		});

		// Verify submission is removed from the list
		await expect(page.locator(`text=${updatedTitle}`)).toBeHidden({
			timeout: 10000,
		});
	});
});
