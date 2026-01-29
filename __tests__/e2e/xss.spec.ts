import { test, expect } from '@playwright/test';
import { signInAsUser } from './helpers/auth';
import { cleanupTestData } from './helpers/seed';

/**
 * XSS Security Tests
 * Verifies that user inputs are properly sanitized to prevent XSS attacks
 */

test.describe('XSS Protection', () => {
	test.afterAll(async ({ browser }) => {
		const context = await browser.newContext();
		const page = await context.newPage();
		await cleanupTestData(page);
		await context.close();
	});

	test('XSS-01: should sanitize XSS payloads in meme submission', async ({
		page,
	}) => {
		await signInAsUser(page);
		await page.goto('/memes');

		// Wait for page to load
		await expect(page).toHaveURL(/\/memes/);

		const xssTitle = 'Test XSS <script>alert("xss")</script> Title';
		const xssCaption = 'Test XSS <img src=x onerror=alert(1)> Caption';

		// Use API for submission to verify backend sanitization directly
		const response = await page.request.post('/api/memes', {
			data: {
				title: xssTitle,
				caption: xssCaption,
				mediaUrl: 'https://placehold.co/600x400.png',
				storagePath: 'test/xss-test.png',
			},
		});

		expect(response.status()).toBe(201);
		const responseBody = await response.json();

		// Verify the response body is sanitized
		expect(responseBody.title).not.toContain('<script>');
		expect(responseBody.caption).not.toContain('<img');
		expect(responseBody.caption).not.toContain('onerror');

		// Verify content is preserved where safe
		// DOMPurify with empty ALLOWED_TAGS strips tags but keeps text content usually
		// <script> content is usually stripped by DOMPurify
		expect(responseBody.title).toContain('Test XSS  Title');
		expect(responseBody.caption).toContain('Test XSS  Caption');
	});

	test('XSS-02: should sanitize XSS payloads in meme edit', async ({
		page,
	}) => {
		await signInAsUser(page);

		// Create a clean meme first
		const createResponse = await page.request.post('/api/memes', {
			data: {
				title: 'Original Safe Title',
				caption: 'Original Safe Caption',
				mediaUrl: 'https://placehold.co/600x400.png',
				storagePath: 'test/xss-edit-test.png',
			},
		});
		expect(createResponse.status()).toBe(201);
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

		expect(editResponse.status()).toBe(200);
		const updatedMeme = await editResponse.json();

		// Verify sanitization
		expect(updatedMeme.title).not.toContain('<script>');
		expect(updatedMeme.caption).not.toContain('onmouseover');

		// Verify safe content preservation
		expect(updatedMeme.title).toContain('Edited');
		expect(updatedMeme.caption).toContain('Edited');
		expect(updatedMeme.caption).toContain('Caption');
	});
});
