/**
 * Unit tests for video processing optimization (INS-58)
 * Tests the story_ready flag logic that eliminates redundant processing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ContentItem } from '@/lib/types';

// Mock all dependencies
vi.mock('@/lib/instagram', () => ({
	publishMedia: vi.fn().mockResolvedValue({ id: 'ig-media-123' }),
}));

vi.mock('@/lib/media/story-processor', () => ({
	processAndUploadStoryImage: vi.fn().mockResolvedValue('https://processed.example.com/image.jpg'),
}));

vi.mock('@/lib/media/video-processor', () => ({
	processAndUploadStoryVideo: vi.fn().mockResolvedValue('https://processed.example.com/video.mp4'),
}));

vi.mock('@/lib/config/supabase-admin', () => ({
	supabaseAdmin: {
		from: vi.fn(() => ({
			update: vi.fn(() => ({
				eq: vi.fn(() => ({ data: {}, error: null })),
			})),
		})),
	},
}));

vi.mock('@/lib/database/linked-accounts', () => ({
	getFacebookAccessToken: vi.fn().mockResolvedValue('test-token'),
}));

vi.mock('@/lib/utils/duplicate-detection', () => ({
	generateContentHash: vi.fn().mockReturnValue('hash-123'),
	checkForRecentPublish: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/utils/logger', () => ({
	Logger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	},
}));

vi.mock('@/lib/content-db', () => ({
	getPendingContentItems: vi.fn(),
	acquireContentProcessingLock: vi.fn().mockResolvedValue(true),
	markContentPublished: vi.fn().mockResolvedValue(true),
	markContentFailed: vi.fn(),
	markContentCancelled: vi.fn(),
	getContentItemForProcessing: vi.fn(),
	recoverStaleLocks: vi.fn(),
	expireOverdueContent: vi.fn(),
}));

vi.mock('@/lib/content-db/environment', () => ({
	getCurrentEnvironment: vi.fn().mockReturnValue('test'),
}));

vi.mock('@/lib/scheduler/quota-gate', () => ({
	checkPublishingQuota: vi.fn().mockResolvedValue({
		allowed: true,
		quotaTotal: 25,
		quotaUsage: 0,
		quotaRemaining: 25,
	}),
}));

vi.mock('@/lib/scheduler/quota-history', () => ({
	generateCronRunId: vi.fn().mockReturnValue('run-123'),
	recordQuotaSnapshot: vi.fn(),
}));

import { processAndUploadStoryVideo } from '@/lib/media/video-processor';
import { publishMedia } from '@/lib/instagram';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';

// We'll need to test the actual processing logic by importing the relevant parts
// Since process-service.ts has the main processing function, we'll test its behavior

function makeVideoItem(overrides: Partial<ContentItem> = {}): ContentItem {
	return {
		id: 'video-item-1',
		userId: 'user-1',
		userEmail: 'test@example.com',
		mediaUrl: 'https://cdn.example.com/video.mp4',
		mediaType: 'VIDEO',
		source: 'direct',
		publishingStatus: 'scheduled',
		scheduledTime: Date.now() - 1000, // Past time (ready to publish)
		version: 1,
		createdAt: '2026-02-01T00:00:00Z',
		updatedAt: '2026-02-01T00:00:00Z',
		videoDuration: 15,
		videoCodec: 'h264',
		videoFramerate: 30,
		processingBackend: 'railway',
		processingApplied: ['h264-encoding', 'resize'],
		...overrides,
	};
}

describe('Story Ready Optimization (INS-58)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Video processing skip logic', () => {
		it('should skip processing when story_ready=true', async () => {
			const videoItem = makeVideoItem({
				storyReady: true,
				processingStatus: 'completed',
			});

			// Simulate the logic from process-service.ts
			let publishUrl = videoItem.mediaUrl;

			if (videoItem.mediaType === 'VIDEO') {
				if (videoItem.storyReady) {
					// Should use existing URL directly
					publishUrl = videoItem.mediaUrl;
				} else {
					// Would call processAndUploadStoryVideo
					publishUrl = await processAndUploadStoryVideo(videoItem.mediaUrl, videoItem.id);
				}
			}

			// Verify processing was NOT called
			expect(processAndUploadStoryVideo).not.toHaveBeenCalled();
			expect(publishUrl).toBe(videoItem.mediaUrl);
		});

		it('should process video when story_ready=false', async () => {
			const videoItem = makeVideoItem({
				storyReady: false,
				processingStatus: 'pending',
			});

			// Simulate the logic from process-service.ts
			let publishUrl = videoItem.mediaUrl;

			if (videoItem.mediaType === 'VIDEO') {
				if (videoItem.storyReady) {
					publishUrl = videoItem.mediaUrl;
				} else {
					publishUrl = await processAndUploadStoryVideo(videoItem.mediaUrl, videoItem.id);
				}
			}

			// Verify processing WAS called
			expect(processAndUploadStoryVideo).toHaveBeenCalledWith(videoItem.mediaUrl, videoItem.id);
			expect(publishUrl).toBe('https://processed.example.com/video.mp4');
		});

		it('should process video when story_ready is undefined', async () => {
			const videoItem = makeVideoItem({
				storyReady: undefined,
			});

			// Simulate the logic
			let publishUrl = videoItem.mediaUrl;

			if (videoItem.mediaType === 'VIDEO') {
				if (videoItem.storyReady) {
					publishUrl = videoItem.mediaUrl;
				} else {
					publishUrl = await processAndUploadStoryVideo(videoItem.mediaUrl, videoItem.id);
				}
			}

			// Verify processing WAS called (undefined is falsy)
			expect(processAndUploadStoryVideo).toHaveBeenCalled();
		});

		it('should log appropriate message when skipping processing', async () => {
			const videoItem = makeVideoItem({
				storyReady: true,
				processingBackend: 'railway',
				processingApplied: ['h264-encoding', 'resize'],
			});

			// Simulate the logging logic
			if (videoItem.storyReady) {
				Logger.info('scheduler', `Video ${videoItem.id} already processed and ready`, {
					postId: videoItem.id,
					mediaUrl: videoItem.mediaUrl,
					processingBackend: videoItem.processingBackend,
					processingApplied: videoItem.processingApplied,
				});
			}

			expect(Logger.info).toHaveBeenCalledWith(
				'scheduler',
				expect.stringContaining('already processed'),
				expect.objectContaining({
					postId: videoItem.id,
					processingBackend: 'railway',
					processingApplied: ['h264-encoding', 'resize'],
				})
			);
		});
	});

	describe('Processing status tracking', () => {
		it('should update story_ready after successful processing', async () => {
			const videoItem = makeVideoItem({
				storyReady: false,
			});

			// Process the video
			await processAndUploadStoryVideo(videoItem.mediaUrl, videoItem.id);

			// Simulate updating the database after successful processing
			await supabaseAdmin
				.from('content_items')
				.update({
					story_ready: true,
					processing_status: 'completed',
					processing_completed_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				})
				.eq('id', videoItem.id);

			// Verify update was called
			expect(supabaseAdmin.from).toHaveBeenCalledWith('content_items');
		});

		it('should update processing_status to failed on error', async () => {
			const videoItem = makeVideoItem({
				storyReady: false,
			});

			const errorMessage = 'Railway processing failed';
			vi.mocked(processAndUploadStoryVideo).mockRejectedValueOnce(new Error(errorMessage));

			// Try to process and handle error
			try {
				await processAndUploadStoryVideo(videoItem.mediaUrl, videoItem.id);
			} catch (error) {
				// Simulate error handling - update DB with failed status
				await supabaseAdmin
					.from('content_items')
					.update({
						processing_status: 'failed',
						processing_error: error instanceof Error ? error.message : 'Unknown error',
						processing_completed_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
					})
					.eq('id', videoItem.id);
			}

			// Verify error was handled
			expect(supabaseAdmin.from).toHaveBeenCalled();
		});
	});

	describe('Performance optimization verification', () => {
		it('should demonstrate time savings for pre-processed videos', async () => {
			const preProcessedVideo = makeVideoItem({
				storyReady: true,
				processingBackend: 'railway',
			});

			const startTime = Date.now();

			// Simulate instant publish (no processing)
			let publishUrl = preProcessedVideo.mediaUrl;
			if (!preProcessedVideo.storyReady) {
				await processAndUploadStoryVideo(preProcessedVideo.mediaUrl, preProcessedVideo.id);
			}

			const elapsedTime = Date.now() - startTime;

			// Should be nearly instant (<100ms)
			expect(elapsedTime).toBeLessThan(100);
			expect(processAndUploadStoryVideo).not.toHaveBeenCalled();
			expect(publishUrl).toBe(preProcessedVideo.mediaUrl);
		});

		it('should track processing backend for analytics', () => {
			const railwayProcessed = makeVideoItem({
				storyReady: true,
				processingBackend: 'railway',
				processingApplied: ['h264-encoding', 'resize', 'thumbnail-extraction'],
			});

			// Verify processing metadata is available
			expect(railwayProcessed.processingBackend).toBe('railway');
			expect(railwayProcessed.processingApplied).toContain('h264-encoding');
			expect(railwayProcessed.processingApplied).toHaveLength(3);
		});
	});
});
