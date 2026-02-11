/**
 * Integration tests for cron service (BMS-148)
 * Tests processScheduledPosts and forceProcessPost with vi.mock (no real DB/API).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ContentItem, BatchResult } from '@/lib/types';

// ── vi.mock all external dependencies ──────────────────────────────────

vi.mock('@/lib/instagram', () => ({
	publishMedia: vi.fn(),
}));

vi.mock('@/lib/media/story-processor', () => ({
	processAndUploadStoryImage: vi.fn(),
}));

vi.mock('@/lib/config/supabase-admin', () => ({
	supabaseAdmin: {
		from: vi.fn().mockReturnValue({
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			gt: vi.fn().mockReturnThis(),
			lte: vi.fn().mockReturnThis(),
		}),
	},
}));

vi.mock('@/lib/utils/logger', () => ({
	Logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/utils/duplicate-detection', () => ({
	generateContentHash: vi.fn(),
	checkForRecentPublish: vi.fn(),
}));

vi.mock('@/lib/content-db', () => ({
	getPendingContentItems: vi.fn(),
	acquireContentProcessingLock: vi.fn(),
	releaseContentProcessingLock: vi.fn(),
	markContentPublished: vi.fn(),
	markContentFailed: vi.fn(),
	markContentCancelled: vi.fn(),
	getContentItemForProcessing: vi.fn(),
}));

import { processScheduledPosts, forceProcessPost } from '@/lib/scheduler/process-service';
import { publishMedia } from '@/lib/instagram';
import { processAndUploadStoryImage } from '@/lib/media/story-processor';
import {
	getPendingContentItems,
	acquireContentProcessingLock,
	releaseContentProcessingLock,
	markContentPublished,
	markContentFailed,
	markContentCancelled,
	getContentItemForProcessing,
} from '@/lib/content-db';
import { generateContentHash, checkForRecentPublish } from '@/lib/utils/duplicate-detection';

// ── Helper: build a ContentItem with defaults ──────────────────────────

function makeItem(overrides: Partial<ContentItem> = {}): ContentItem {
	return {
		id: 'item-1',
		userId: 'user-1',
		userEmail: 'test@example.com',
		mediaUrl: 'https://cdn.example.com/img.jpg',
		mediaType: 'IMAGE',
		source: 'direct',
		publishingStatus: 'scheduled',
		version: 1,
		createdAt: '2026-02-01T00:00:00Z',
		updatedAt: '2026-02-01T00:00:00Z',
		...overrides,
	};
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('processScheduledPosts (mocked)', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Defaults that most tests need
		vi.mocked(acquireContentProcessingLock).mockResolvedValue(true);
		vi.mocked(releaseContentProcessingLock).mockResolvedValue(true);
		vi.mocked(markContentPublished).mockResolvedValue(true);
		vi.mocked(markContentFailed).mockResolvedValue(true);
		vi.mocked(markContentCancelled).mockResolvedValue(true);
		vi.mocked(generateContentHash).mockResolvedValue('hash-abc123');
		vi.mocked(checkForRecentPublish).mockResolvedValue({ isDuplicate: false });
		vi.mocked(publishMedia).mockResolvedValue({ id: 'ig-media-1' });
		vi.mocked(processAndUploadStoryImage).mockResolvedValue('https://cdn.example.com/processed.jpg');
	});

	// ── Batch processing (no postId) ──

	it('should return empty result when no pending items', async () => {
		vi.mocked(getPendingContentItems).mockResolvedValue([]);

		const result = await processScheduledPosts();
		expect(result.processed).toBe(0);
		expect(result.succeeded).toBe(0);
		expect(result.results).toHaveLength(0);
	});

	it('should process a single post successfully', async () => {
		const item = makeItem();
		vi.mocked(getPendingContentItems).mockResolvedValue([item]);

		const result = await processScheduledPosts();

		expect(result.processed).toBe(1);
		expect(result.succeeded).toBe(1);
		expect(result.failed).toBe(0);
		expect(result.results[0].success).toBe(true);
		expect(markContentPublished).toHaveBeenCalledWith('item-1', 'ig-media-1', 'hash-abc123');
	});

	it('should process IMAGE story through processAndUploadStoryImage', async () => {
		const item = makeItem({ mediaType: 'IMAGE' });
		vi.mocked(getPendingContentItems).mockResolvedValue([item]);

		await processScheduledPosts();

		expect(processAndUploadStoryImage).toHaveBeenCalledWith(item.mediaUrl, item.id);
		// publishMedia should receive the processed URL
		expect(publishMedia).toHaveBeenCalledWith(
			'https://cdn.example.com/processed.jpg',
			'IMAGE',
			'STORY',
			undefined, // caption
			'user-1',
			undefined, // userTags
		);
	});

	it('should fall back to original URL if image processing fails', async () => {
		const item = makeItem({ mediaType: 'IMAGE' });
		vi.mocked(getPendingContentItems).mockResolvedValue([item]);
		vi.mocked(processAndUploadStoryImage).mockRejectedValue(new Error('Sharp not available'));

		const result = await processScheduledPosts();

		expect(result.succeeded).toBe(1);
		// Falls back to original mediaUrl
		expect(publishMedia).toHaveBeenCalledWith(
			item.mediaUrl,
			'IMAGE',
			'STORY',
			undefined,
			'user-1',
			undefined,
		);
	});

	it('should process multiple posts', async () => {
		const items = [
			makeItem({ id: 'item-1' }),
			makeItem({ id: 'item-2', userId: 'user-2' }),
		];
		vi.mocked(getPendingContentItems).mockResolvedValue(items);

		const result = await processScheduledPosts();

		expect(result.processed).toBe(2);
		expect(result.succeeded).toBe(2);
		expect(markContentPublished).toHaveBeenCalledTimes(2);
	});

	it('should skip post when lock acquisition fails', async () => {
		const item = makeItem();
		vi.mocked(getPendingContentItems).mockResolvedValue([item]);
		vi.mocked(acquireContentProcessingLock).mockResolvedValue(false);

		const result = await processScheduledPosts();

		// Post is skipped (not in results)
		expect(result.processed).toBe(0);
		expect(publishMedia).not.toHaveBeenCalled();
	});

	it('should release lock and increment retry on publish failure', async () => {
		const item = makeItem({ retryCount: 0 });
		vi.mocked(getPendingContentItems).mockResolvedValue([item]);
		vi.mocked(publishMedia).mockRejectedValue(new Error('Token expired'));

		const result = await processScheduledPosts();

		expect(result.failed).toBe(1);
		expect(result.results[0].error).toBe('Token expired');
		expect(releaseContentProcessingLock).toHaveBeenCalledWith('item-1');
		expect(markContentFailed).toHaveBeenCalledWith(
			'item-1',
			'Token expired (attempt 1/3)',
			1,
		);
	});

	it('should mark as permanently failed after max retries', async () => {
		const item = makeItem({ retryCount: 2 }); // This will be attempt 3
		vi.mocked(getPendingContentItems).mockResolvedValue([item]);
		vi.mocked(publishMedia).mockRejectedValue(new Error('Still broken'));

		const result = await processScheduledPosts();

		expect(result.failed).toBe(1);
		expect(markContentFailed).toHaveBeenCalledWith(
			'item-1',
			'Still broken (after 3 attempts)',
			3,
		);
	});

	it('should cancel post when duplicate is detected', async () => {
		const item = makeItem();
		vi.mocked(getPendingContentItems).mockResolvedValue([item]);
		vi.mocked(checkForRecentPublish).mockResolvedValue({
			isDuplicate: true,
			existingPostId: 'old-post-99',
		});

		const result = await processScheduledPosts();

		expect(result.processed).toBe(0); // cancelled posts are not in results
		expect(markContentCancelled).toHaveBeenCalledWith(
			'item-1',
			expect.stringContaining('old-post-99'),
		);
		expect(publishMedia).not.toHaveBeenCalled();
	});

	it('should bypass duplicate check when flag is set', async () => {
		const item = makeItem();
		vi.mocked(getPendingContentItems).mockResolvedValue([item]);

		const result = await processScheduledPosts(undefined, true);

		expect(result.succeeded).toBe(1);
		expect(checkForRecentPublish).not.toHaveBeenCalled();
	});

	it('should proceed when content hash generation fails', async () => {
		const item = makeItem({ contentHash: undefined });
		vi.mocked(getPendingContentItems).mockResolvedValue([item]);
		vi.mocked(generateContentHash).mockRejectedValue(new Error('Network error'));

		const result = await processScheduledPosts();

		expect(result.succeeded).toBe(1);
		// Still publishes - hash failure is non-fatal
		expect(publishMedia).toHaveBeenCalled();
		// Published with undefined hash since generation failed
		expect(markContentPublished).toHaveBeenCalledWith('item-1', 'ig-media-1', undefined);
	});

	// ── Specific post processing (with postId) ──

	it('should process a specific post by ID', async () => {
		const item = makeItem({ id: 'specific-1' });
		vi.mocked(getContentItemForProcessing).mockResolvedValue(item);

		const result = await processScheduledPosts('specific-1');

		expect(result.processed).toBe(1);
		expect(result.succeeded).toBe(1);
		expect(getPendingContentItems).not.toHaveBeenCalled(); // Bypasses batch query
	});

	it('should return empty result when specific post not found', async () => {
		vi.mocked(getContentItemForProcessing).mockResolvedValue(null);

		const result = await processScheduledPosts('missing-id');

		expect(result.processed).toBe(0);
		expect(result.message).toContain('not found');
	});
});

describe('forceProcessPost (mocked)', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(acquireContentProcessingLock).mockResolvedValue(true);
		vi.mocked(releaseContentProcessingLock).mockResolvedValue(true);
		vi.mocked(markContentPublished).mockResolvedValue(true);
		vi.mocked(markContentFailed).mockResolvedValue(true);
		vi.mocked(markContentCancelled).mockResolvedValue(true);
		vi.mocked(generateContentHash).mockResolvedValue('hash-xyz');
		vi.mocked(checkForRecentPublish).mockResolvedValue({ isDuplicate: false });
		vi.mocked(publishMedia).mockResolvedValue({ id: 'ig-media-forced' });
		vi.mocked(processAndUploadStoryImage).mockResolvedValue('https://cdn.example.com/processed.jpg');
	});

	it('should force-process a scheduled post successfully', async () => {
		const item = makeItem({ id: 'force-1', publishingStatus: 'scheduled' });
		vi.mocked(getContentItemForProcessing).mockResolvedValue(item);

		const result = await forceProcessPost('force-1', false);

		expect(result.success).toBe(true);
		expect(result.error).toBeUndefined();
	});

	it('should return error when post not found', async () => {
		vi.mocked(getContentItemForProcessing).mockResolvedValue(null);

		const result = await forceProcessPost('missing-99', false);

		expect(result.success).toBe(false);
		expect(result.error).toBe('Post not found');
	});

	it('should reject posts with invalid status', async () => {
		const item = makeItem({ id: 'pub-1', publishingStatus: 'published' });
		vi.mocked(getContentItemForProcessing).mockResolvedValue(item);

		const result = await forceProcessPost('pub-1', false);

		expect(result.success).toBe(false);
		expect(result.error).toContain('published');
	});

	it('should allow processing status for force-process', async () => {
		const item = makeItem({ id: 'proc-1', publishingStatus: 'processing' });
		vi.mocked(getContentItemForProcessing).mockResolvedValue(item);

		const result = await forceProcessPost('proc-1', true);

		expect(result.success).toBe(true);
	});

	it('should handle errors gracefully', async () => {
		vi.mocked(getContentItemForProcessing).mockRejectedValue(new Error('DB down'));

		const result = await forceProcessPost('err-1', false);

		expect(result.success).toBe(false);
		expect(result.error).toBe('DB down');
	});

	it('should pass bypassDuplicates flag through to processScheduledPosts', async () => {
		const item = makeItem({ id: 'dup-1', publishingStatus: 'scheduled' });
		vi.mocked(getContentItemForProcessing).mockResolvedValue(item);

		await forceProcessPost('dup-1', true);

		// When bypass=true, checkForRecentPublish should not be called
		expect(checkForRecentPublish).not.toHaveBeenCalled();
	});
});
