import { test, expect } from '@playwright/test';
import { signInAsUser } from './helpers/auth';
import { cleanupTestData } from './helpers/seed';

/**
 * XSS Security Tests
 * Verifies that user inputs are properly sanitized to prevent XSS attacks
 */

test.describe('XSS Protection', () => {
	// Note: Cleanup is handled per-test or by test data isolation
	// afterAll cannot use page/context fixtures in Playwright

	test('XSS-01: should sanitize XSS payloads in meme submission', async ({
		page,
	}) => {
		await signInAsUser(page);
		await page.goto('/memes');

		// Wait for page to load
		await expect(page).toHaveURL(/\/memes/);

		const xssTitle = 'Test XSS <script>alert("xss")</script> Title';
		const xssCaption = 'Test XSS <img src=x onerror=alert(1)> Caption';
		const uniqueId = Date.now();

		// Use API for submission to verify backend sanitization directly
		const response = await page.request.post('/api/memes', {
			data: {
				title: xssTitle,
				caption: xssCaption,
				mediaUrl: `https://placehold.co/600x400.png?xss1=${uniqueId}`,
				storagePath: `test/xss-test-${uniqueId}.png`,
			},
		});

		// Check if submission succeeded or was rejected
		const status = response.status();

		if (status === 201) {
			const responseBody = await response.json();

			// Verify the response body is sanitized
			expect(responseBody.title).not.toContain('<script>');
			expect(responseBody.caption).not.toContain('<img');
			expect(responseBody.caption).not.toContain('onerror');
		} else {
			// API rejected - acceptable for security reasons
			expect([400, 409, 422]).toContain(status);
		}
	});

	test('XSS-02: should sanitize XSS payloads in meme edit', async ({
		page,
	}) => {
		await signInAsUser(page);

		const uniqueId = Date.now();

		// Create a clean meme first
		const createResponse = await page.request.post('/api/memes', {
			data: {
				title: 'Original Safe Title',
				caption: 'Original Safe Caption',
				mediaUrl: `https://placehold.co/600x400.png?xss2=${uniqueId}`,
				storagePath: `test/xss-edit-test-${uniqueId}.png`,
			},
		});

		// If creation fails (duplicate), skip edit test
		if (createResponse.status() !== 201) {
			// Skip - can't test edit without a meme
			expect([400, 409, 422]).toContain(createResponse.status());
			return;
		}

		const meme = await createResponse.json();

		// Attempt to update with XSS
		const editResponse = await page.request.patch(
			`/api/memes/${meme.id}/edit`,
			{
				data: {
					title: 'Edited <script>alert("xss")</script> Title',
					caption: 'Edited <b onmouseover=alert(1)>Caption</b>',
				},
			},
		);

		// Check if edit succeeded or was rejected for security
		const status = editResponse.status();

		if (status === 200) {
			const updatedMeme = await editResponse.json();

			// Verify sanitization
			expect(updatedMeme.title).not.toContain('<script>');
			expect(updatedMeme.caption).not.toContain('onmouseover');
		} else {
			// Edit rejected - acceptable
			expect([400, 403, 404, 422]).toContain(status);
		}
	});
});
