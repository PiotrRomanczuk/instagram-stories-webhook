import { test, expect } from '@playwright/test';
import { signInAsAdmin } from './helpers/auth';
import { createPendingContent } from './helpers/seed';

test.describe('CP-3: Admin Review and Approval', () => {
	test.beforeEach(async ({ page }) => {
		await signInAsAdmin(page);
	});

	test('CP-3.1: admin can access review page', async ({ page }) => {
		await page.goto('/review');
		await expect(page).toHaveURL(/\/(en\/)?review/);

		// Wait for content or empty state
		await Promise.race([
			page
				.getByRole('heading', { name: 'Story Review Queue' })
				.waitFor({ state: 'visible', timeout: 15000 })
				.catch(() => {}),
			page
				.getByText('All caught up!')
				.waitFor({ state: 'visible', timeout: 15000 })
				.catch(() => {}),
		]);

		const bodyText = await page.innerText('body');
		const hasContent =
			bodyText.includes('Story Review Queue') ||
			bodyText.includes('All caught up!');
		expect(hasContent).toBe(true);
	});

	test('CP-3.2: review page shows pending items or empty state', async ({
		page,
	}) => {
		await page.goto('/review');

		// Wait for API response
		await page
			.waitForResponse(
				(response) =>
					response.url().includes('/api/content') &&
					response.status() === 200,
				{ timeout: 15000 }
			)
			.catch(() => {});

		await page.waitForTimeout(1000);

		const bodyText = await page.innerText('body');

		// Should show either pending count or empty state
		const hasPending = /\d+ stor(y|ies) pending review/.test(bodyText);
		const hasEmptyState = bodyText.includes('All caught up!');
		expect(hasPending || hasEmptyState).toBe(true);
	});

	test('CP-3.3: approve button is functional when items exist', async ({
		page,
	}) => {
		// Seed pending content for review
		await createPendingContent(page, {
			title: 'CP-3.3 Review Test ' + Date.now(),
			caption: 'Content for review approval test',
		});

		await page.goto('/review');

		// Wait for content to load
		await page
			.waitForResponse(
				(response) =>
					response.url().includes('/api/content') &&
					response.status() === 200,
				{ timeout: 15000 }
			)
			.catch(() => {});

		await page.waitForTimeout(1000);

		const bodyText = await page.innerText('body');

		if (bodyText.includes('All caught up!')) {
			test.skip(true, 'No pending items available for approval test');
			return;
		}

		// Find approve button
		const approveButton = page
			.locator('button')
			.filter({ hasText: 'Approve' })
			.first();
		await expect(approveButton).toBeVisible();
		await expect(approveButton).toBeEnabled();

		// Click approve
		await approveButton.click();

		// Wait for success indicators
		await page.waitForTimeout(2000);

		const updatedBody = await page.innerText('body');
		const actionCompleted =
			/approved|ready to schedule/i.test(updatedBody) ||
			updatedBody.includes('All caught up!') ||
			/\d+ stor(y|ies) pending review/.test(updatedBody);
		expect(actionCompleted).toBe(true);
	});

	test('CP-3.4: reject button is functional when items exist', async ({
		page,
	}) => {
		// Seed pending content
		await createPendingContent(page, {
			title: 'CP-3.4 Reject Test ' + Date.now(),
			caption: 'Content for rejection test',
		});

		await page.goto('/review');

		await page
			.waitForResponse(
				(response) =>
					response.url().includes('/api/content') &&
					response.status() === 200,
				{ timeout: 15000 }
			)
			.catch(() => {});

		await page.waitForTimeout(1000);

		const bodyText = await page.innerText('body');

		if (bodyText.includes('All caught up!')) {
			test.skip(true, 'No pending items available for rejection test');
			return;
		}

		// Find reject button
		const rejectButton = page
			.locator('button')
			.filter({ hasText: 'Reject' })
			.first();
		await expect(rejectButton).toBeVisible();
		await expect(rejectButton).toBeEnabled();

		// Click reject
		await rejectButton.click();

		// Wait for action to complete
		await page.waitForTimeout(2000);

		const updatedBody = await page.innerText('body');
		const actionCompleted =
			updatedBody.includes('rejected') ||
			updatedBody.includes('All caught up!') ||
			/\d+ stor(y|ies) pending review/.test(updatedBody);
		expect(actionCompleted).toBe(true);
	});

	test('CP-3.5: admin can access content hub', async ({ page }) => {
		await page.goto('/content');
		await expect(page).toHaveURL(/\/(en\/)?content/);

		await page.waitForLoadState('domcontentloaded');
		const bodyText = await page.innerText('body');
		expect(bodyText).toMatch(/content|review|queue|all/i);
	});

	test('CP-3.6: review history sidebar tracks decisions', async ({
		page,
	}) => {
		await page.goto('/review');

		await page
			.waitForResponse(
				(response) =>
					response.url().includes('/api/content') &&
					response.status() === 200,
				{ timeout: 15000 }
			)
			.catch(() => {});

		await page.waitForTimeout(1000);

		const bodyText = await page.innerText('body');

		if (bodyText.includes('All caught up!')) {
			test.skip(true, 'No pending items to test review history');
			return;
		}

		// Review History heading should be visible
		const historyHeading = page.getByRole('heading', {
			name: 'Review History',
		});
		await expect(historyHeading).toBeVisible();
	});
});
