/**
 * Happy path: submit → approve (UI) → schedule.
 *
 * Pins down the basic three-step lifecycle of a content item:
 *   1. A submission lands in `content_items` with submission_status='pending'.
 *   2. An admin clicks Approve in /review and the row flips to 'approved'.
 *   3. Scheduling sets publishing_status='scheduled' with the requested time.
 *
 * No real Instagram publish — that is covered separately in
 * content-lifecycle.spec.ts (production suite).
 */

import { test, expect } from '@playwright/test';
import { signInAsAdmin } from './helpers/auth';
import {
	createPendingContent,
	getContentById,
	scheduleContent,
	cleanupTestContent,
	TEST_TITLE_PREFIX,
} from './helpers/seed';

test.describe('Happy path: submit → approve → schedule', () => {
	test('full lifecycle of an image submission', async ({ page }) => {
		await signInAsAdmin(page);

		// --- 1. Submit ---
		const uniqueTitle = `Happy Path ${Date.now()}`;
		const contentId = await createPendingContent(page, {
			title: uniqueTitle,
			caption: 'happy path caption',
		});

		const afterSubmit = await getContentById(page, contentId);
		expect(afterSubmit?.source).toBe('submission');
		expect(afterSubmit?.submissionStatus).toBe('pending');
		expect(afterSubmit?.publishingStatus).toBe('draft');

		// --- 2. Approve via the admin review UI ---
		await page.goto('/review');
		await page
			.waitForResponse(
				(r) => r.url().includes('/api/content') && r.status() === 200,
				{ timeout: 15000 },
			)
			.catch(() => {});

		// Find the card for our submission by its unique title and click Approve.
		const card = page
			.locator('[data-testid="review-card"], article, li, div')
			.filter({ hasText: `${TEST_TITLE_PREFIX} ${uniqueTitle}` })
			.first();

		const approveBtn = card
			.getByRole('button', { name: /^Approve$/ })
			.first();
		await approveBtn.waitFor({ state: 'visible', timeout: 15000 });

		const approvalResponse = page.waitForResponse(
			(r) =>
				r.url().includes(`/api/content/${contentId}/review`) &&
				r.request().method() === 'POST',
			{ timeout: 15000 },
		);
		await approveBtn.click();
		const reviewRes = await approvalResponse;
		expect(reviewRes.status()).toBe(200);

		const afterApprove = await getContentById(page, contentId);
		expect(afterApprove?.submissionStatus).toBe('approved');

		// --- 3. Schedule (API; UI scheduling is covered by other specs) ---
		const scheduledFor = new Date(Date.now() + 10 * 60 * 1000); // +10 min
		await scheduleContent(page, contentId, scheduledFor);

		const afterSchedule = await getContentById(page, contentId);
		expect(afterSchedule?.publishingStatus).toBe('scheduled');
		expect(afterSchedule?.scheduledTime).toBeDefined();
		expect(
			Math.abs((afterSchedule!.scheduledTime as number) - scheduledFor.getTime()),
		).toBeLessThan(60 * 1000);

		// Cleanup
		await cleanupTestContent(page, [contentId]);
	});
});
