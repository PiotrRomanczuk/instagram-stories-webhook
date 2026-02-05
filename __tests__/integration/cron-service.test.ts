import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { processScheduledPosts } from '@/lib/scheduler/process-service';
import { supabaseAdmin } from '@/lib/config/supabase-admin';

/**
 * Integration Tests: Cron Job Service
 *
 * Tests the cron job processing logic without making real Instagram API calls.
 * Uses test database and mocked Instagram API (via MSW or manual mocks).
 *
 * These tests verify:
 * - Scheduled posts are processed correctly
 * - Status updates work (pending → processing → published/failed)
 * - Error handling for various failure scenarios
 * - Lock mechanism prevents concurrent processing
 *
 * NOTE: These tests are currently skipped because they require a test Supabase instance.
 * The actual processing logic is commented out and needs to be implemented with proper
 * MSW mocks or a test database setup.
 */

describe.skip('Cron Service: processScheduledPosts', () => {
	let testUserId: string;
	let createdPostIds: string[] = [];

	beforeEach(async () => {
		// Use a test user ID
		testUserId = 'test-user-cron-' + Date.now();

		// Clean up any existing test data
		await supabaseAdmin
			.from('content_items')
			.delete()
			.ilike('user_id', 'test-user-cron-%');

		createdPostIds = [];
	});

	afterEach(async () => {
		// Clean up test data
		if (createdPostIds.length > 0) {
			await supabaseAdmin
				.from('content_items')
				.delete()
				.in('id', createdPostIds);
		}

		// Clean up any remaining test posts
		await supabaseAdmin
			.from('content_items')
			.delete()
			.ilike('user_id', 'test-user-cron-%');
	});

	/**
	 * Test: Process Pending Posts
	 *
	 * Verifies that posts scheduled in the past are processed.
	 */
	it('should process pending posts scheduled in the past', async () => {
		// Create a test post scheduled 1 minute ago
		const { data: post, error } = await supabaseAdmin
			.from('content_items')
			.insert({
				user_id: testUserId,
				user_email: 'test@example.com',
				media_url: 'https://example.com/test-image.jpg',
				media_type: 'IMAGE',
				source: 'direct',
				publishing_status: 'scheduled',
				scheduled_time: Date.now() - 60 * 1000, // 1 minute ago (milliseconds)
			})
			.select()
			.single();

		expect(error).toBeNull();
		expect(post).toBeDefined();
		createdPostIds.push(post!.id);

		// Note: In a real integration test, you'd mock the Instagram API
		// For this example, we'll just verify the service can be called
		// You should set up MSW mocks for actual API testing

		// Run the cron job service
		// const result = await processScheduledPosts();

		// Verify the result
		// expect(result.processed).toBeGreaterThanOrEqual(1);

		// Verify post status was updated
		// const { data: updatedPost } = await supabaseAdmin
		// 	.from('scheduled_posts')
		// 	.select('status, published_at, error_message')
		// 	.eq('id', post.id)
		// 	.single();

		// expect(updatedPost?.status).toMatch(/published|failed|processing/);

		// For now, just verify we created the test post correctly
		expect(post.publishing_status).toBe('scheduled');
		expect(post.scheduled_time).toBeLessThan(Date.now());
	}, 30000); // 30 second timeout

	/**
	 * Test: Skip Future Posts
	 *
	 * Verifies that posts scheduled in the future are not processed.
	 */
	it('should not process posts scheduled in the future', async () => {
		// Create a test post scheduled 1 hour from now
		const { data: post, error } = await supabaseAdmin
			.from('content_items')
			.insert({
				user_id: testUserId,
				user_email: 'test@example.com',
				media_url: 'https://example.com/future-post.jpg',
				media_type: 'IMAGE',
				source: 'direct',
				publishing_status: 'scheduled',
				scheduled_time: Date.now() + 60 * 60 * 1000, // 1 hour from now (milliseconds)
			})
			.select()
			.single();

		expect(error).toBeNull();
		expect(post).toBeDefined();
		createdPostIds.push(post!.id);

		// Run the cron job service
		// const result = await processScheduledPosts();

		// Verify post was NOT processed (still pending)
		// const { data: stillPending } = await supabaseAdmin
		// 	.from('scheduled_posts')
		// 	.select('status')
		// 	.eq('id', post.id)
		// 	.single();

		// expect(stillPending?.status).toBe('pending');

		// For now, just verify the future timestamp
		expect(post.scheduled_time).toBeGreaterThan(Date.now());
	});

	/**
	 * Test: Handle Failed Posts
	 *
	 * Verifies that posts with invalid media URLs fail gracefully.
	 */
	it('should mark posts as failed when publishing fails', async () => {
		// Create a post with invalid media URL
		const { data: post, error } = await supabaseAdmin
			.from('content_items')
			.insert({
				user_id: testUserId,
				user_email: 'test@example.com',
				media_url: 'https://invalid-url-that-does-not-exist.com/image.jpg',
				media_type: 'IMAGE',
				source: 'direct',
				publishing_status: 'scheduled',
				scheduled_time: Date.now() - 60 * 1000,
			})
			.select()
			.single();

		expect(error).toBeNull();
		createdPostIds.push(post!.id);

		// Run the cron job (would fail due to invalid URL)
		// const result = await processScheduledPosts();

		// Verify post was marked as failed
		// const { data: failedPost } = await supabaseAdmin
		// 	.from('scheduled_posts')
		// 	.select('status, error_message')
		// 	.eq('id', post.id)
		// 	.single();

		// expect(failedPost?.status).toBe('failed');
		// expect(failedPost?.error_message).toBeDefined();

		// For now, just verify the setup
		expect(post).toBeDefined();
	});

	/**
	 * Test: Multiple Posts Processing
	 *
	 * Verifies that multiple pending posts are all processed.
	 */
	it('should process multiple pending posts', async () => {
		// Create multiple test posts
		const posts = await Promise.all([
			supabaseAdmin
				.from('content_items')
				.insert({
					user_id: testUserId,
					user_email: 'test@example.com',
					media_url: 'https://example.com/test-1.jpg',
					media_type: 'IMAGE',
					source: 'direct',
					publishing_status: 'scheduled',
					scheduled_time: Date.now() - 120 * 1000, // 2 min ago
				})
				.select()
				.single(),
			supabaseAdmin
				.from('content_items')
				.insert({
					user_id: testUserId,
					user_email: 'test@example.com',
					media_url: 'https://example.com/test-2.jpg',
					media_type: 'IMAGE',
					source: 'direct',
					publishing_status: 'scheduled',
					scheduled_time: Date.now() - 60 * 1000, // 1 min ago
				})
				.select()
				.single(),
		]);

		const createdPosts = posts.map(p => p.data).filter(p => p !== null);
		createdPostIds.push(...createdPosts.map(p => p!.id));

		expect(createdPosts.length).toBe(2);

		// Run the cron job
		// const result = await processScheduledPosts();
		// expect(result.processed).toBeGreaterThanOrEqual(2);

		// Verify both posts were processed
		// const { data: processedPosts } = await supabaseAdmin
		// 	.from('scheduled_posts')
		// 	.select('status')
		// 	.in('id', createdPostIds);

		// const allProcessed = processedPosts?.every(p => p.status !== 'pending');
		// expect(allProcessed).toBe(true);
	});

	/**
	 * Test: Idempotency (Processing Same Post Multiple Times)
	 *
	 * Verifies that processing a post multiple times doesn't cause issues.
	 */
	it('should handle idempotent processing', async () => {
		const { data: post, error } = await supabaseAdmin
			.from('content_items')
			.insert({
				user_id: testUserId,
				user_email: 'test@example.com',
				media_url: 'https://example.com/test-idempotent.jpg',
				media_type: 'IMAGE',
				source: 'direct',
				publishing_status: 'scheduled',
				scheduled_time: Date.now() - 60 * 1000,
			})
			.select()
			.single();

		expect(error).toBeNull();
		createdPostIds.push(post!.id);

		// Run cron job twice
		// const result1 = await processScheduledPosts();
		// const result2 = await processScheduledPosts();

		// Second run should not process the same post again
		// (it should already be marked as published or failed)
		// expect(result2.processed).toBe(0);
	});
});

/**
 * Mock Instagram API Example
 *
 * This shows how you would set up mocks for actual integration testing.
 * Uncomment and use MSW (Mock Service Worker) for real tests.
 *
 * Example:
 * ```
 * import { rest } from 'msw';
 * import { server } from '@/mocks/server';
 *
 * beforeEach(() => {
 *   // Mock Instagram API success response
 *   server.use(
 *     rest.post('https://graph.facebook.com/v-star/star/media', (req, res, ctx) => {
 *       return res(ctx.json({ id: 'mock_container_123' }));
 *     }),
 *     rest.get('https://graph.facebook.com/v-star/mock_container_123', (req, res, ctx) => {
 *       return res(ctx.json({ status_code: 'FINISHED' }));
 *     }),
 *     rest.post('https://graph.facebook.com/v-star/star/media_publish', (req, res, ctx) => {
 *       return res(ctx.json({ id: 'mock_media_456' }));
 *     })
 *   );
 * });
 * ```
 */

/**
 * E2E Cron Test
 *
 * For actual E2E testing of the cron endpoint, see:
 * __tests__/e2e/cron-debug.spec.ts
 */
