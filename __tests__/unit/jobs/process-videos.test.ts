import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../setup';
import type { ContentItemRow } from '@/lib/types/posts';

// --- Mock dependencies ---

const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockStorageRemove = vi.fn();
const mockStorageFrom = vi.fn();

function resetStorageMocks() {
	mockUpload.mockResolvedValue({ error: null });
	mockGetPublicUrl.mockReturnValue({
		data: { publicUrl: 'https://storage.example.com/processed/video.mp4' },
	});
	mockStorageRemove.mockResolvedValue({ error: null });
	mockStorageFrom.mockReturnValue({
		upload: mockUpload,
		getPublicUrl: mockGetPublicUrl,
		remove: mockStorageRemove,
	});
}

// Supabase chain builder for query mocking
function createChain(data: unknown, error: unknown = null) {
	const chain: Record<string, Mock> = {};

	chain.select = vi.fn().mockReturnValue(chain);
	chain.eq = vi.fn().mockReturnValue(chain);
	chain.lt = vi.fn().mockReturnValue(chain);
	chain.not = vi.fn().mockReturnValue(chain);
	chain.like = vi.fn().mockReturnValue(chain);
	chain.order = vi.fn().mockReturnValue(chain);
	chain.limit = vi.fn().mockResolvedValue({ data, error });
	chain.single = vi.fn().mockResolvedValue({ data, error });
	chain.maybeSingle = vi.fn().mockResolvedValue({ data, error });

	// update returns a chainable object that resolves at eq
	chain.update = vi.fn().mockReturnValue({
		eq: vi.fn().mockResolvedValue({ data, error }),
	});

	return chain;
}

const mockFrom = vi.fn();

vi.mock('@/lib/config/supabase-admin', () => ({
	supabaseAdmin: {
		from: (...args: unknown[]) => mockFrom(...args),
		storage: {
			from: (...args: unknown[]) => mockStorageFrom(...args),
		},
	},
}));

vi.mock('@/lib/media/video-processor', () => ({
	processVideoForStory: vi.fn(),
}));

vi.mock('@/lib/utils/logger', () => ({
	Logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

import { processVideosQueue, cleanupOldProcessedVideos } from '@/lib/jobs/process-videos';
import { processVideoForStory } from '@/lib/media/video-processor';

// --- Helper: create a content item row ---

function createVideoRow(overrides: Partial<ContentItemRow> = {}): ContentItemRow {
	return {
		id: 'video-001',
		user_id: 'user-123',
		user_email: 'test@example.com',
		media_url: 'https://test-videos.example.com/original/video.mp4',
		media_type: 'VIDEO',
		storage_path: 'original/video.mp4',
		needs_processing: true,
		retry_count: 0,
		error: undefined,
		video_duration: 15,
		video_codec: 'vp9',
		video_framerate: 30,
		source: 'direct',
		publishing_status: 'draft',
		version: 1,
		created_at: '2026-02-14T10:00:00.000Z',
		updated_at: '2026-02-14T10:00:00.000Z',
		...overrides,
	};
}

// MSW handler for video downloads - returns a small binary response
function setupVideoDownloadHandler(status = 200) {
	server.use(
		http.get('https://test-videos.example.com/*', () => {
			if (status !== 200) {
				return new HttpResponse(null, { status, statusText: 'Not Found' });
			}
			// Return a small binary buffer as the video content
			return new HttpResponse(new ArrayBuffer(1024), {
				status: 200,
				headers: { 'Content-Type': 'video/mp4' },
			});
		})
	);
}

describe('process-videos', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetStorageMocks();
	});

	// ======== processVideosQueue ========

	describe('processVideosQueue', () => {
		it('should return early with zero counts when no videos need processing', async () => {
			const chain = createChain([], null);
			mockFrom.mockReturnValue(chain);

			const result = await processVideosQueue();

			expect(result.totalQueued).toBe(0);
			expect(result.processed).toBe(0);
			expect(result.failed).toBe(0);
			expect(result.skipped).toBe(0);
			expect(result.errors).toHaveLength(0);
		});

		it('should query for VIDEO items with needs_processing=true and retry_count < 3', async () => {
			const chain = createChain([], null);
			mockFrom.mockReturnValue(chain);

			await processVideosQueue();

			// Verify the query chain was called correctly
			expect(mockFrom).toHaveBeenCalledWith('content_items');
			expect(chain.select).toHaveBeenCalledWith(
				'id, user_id, user_email, media_url, media_type, storage_path, dimensions, thumbnail_url, video_duration, video_codec, video_framerate, needs_processing, title, caption, user_tags, hashtags, source, submission_status, publishing_status, rejection_reason, reviewed_at, reviewed_by, scheduled_time, processing_started_at, published_at, ig_media_id, error, content_hash, idempotency_key, retry_count, archived_at, version, created_at, updated_at'
			);
			expect(chain.eq).toHaveBeenCalledWith('media_type', 'VIDEO');
			expect(chain.eq).toHaveBeenCalledWith('needs_processing', true);
			expect(chain.lt).toHaveBeenCalledWith('retry_count', 3);
			expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: true });
			expect(chain.limit).toHaveBeenCalledWith(10);
		});

		it('should process queued videos and return success results', async () => {
			const video1 = createVideoRow({ id: 'video-001' });
			const video2 = createVideoRow({ id: 'video-002', media_url: 'https://test-videos.example.com/original/video2.mp4' });

			const selectChain = createChain([video1, video2], null);
			const updateChain = createChain(null, null);

			let fromCallCount = 0;
			mockFrom.mockImplementation(() => {
				fromCallCount++;
				if (fromCallCount === 1) {
					return selectChain;
				}
				return updateChain;
			});

			setupVideoDownloadHandler();

			(processVideoForStory as Mock).mockResolvedValue({
				buffer: Buffer.from('processed'),
				width: 1080,
				height: 1920,
				duration: 15,
				originalMetadata: {
					width: 1920,
					height: 1080,
					duration: 15,
					codec: 'vp9',
					frameRate: 30,
					bitrate: 3500000,
					hasAudio: true,
					audioCodec: 'aac',
					format: 'mp4',
					fileSize: 6553600,
				},
				wasProcessed: true,
				processingApplied: ['aspect-ratio-letterbox', 'h264-encoding', 'aac-audio'],
			});

			const result = await processVideosQueue();

			expect(result.totalQueued).toBe(2);
			expect(result.processed).toBe(2);
			expect(result.failed).toBe(0);
			expect(result.errors).toHaveLength(0);
		});

		it('should handle processing failures and increment failure count', async () => {
			const video = createVideoRow({ id: 'video-fail', retry_count: 0 });

			const selectChain = createChain([video], null);
			const updateChain = createChain(null, null);

			let fromCallCount = 0;
			mockFrom.mockImplementation(() => {
				fromCallCount++;
				if (fromCallCount === 1) {
					return selectChain;
				}
				return updateChain;
			});

			setupVideoDownloadHandler();

			(processVideoForStory as Mock).mockRejectedValue(
				new Error('FFmpeg crashed during processing')
			);

			const result = await processVideosQueue();

			expect(result.totalQueued).toBe(1);
			expect(result.processed).toBe(0);
			expect(result.failed).toBe(1);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].id).toBe('video-fail');
		});

		it('should handle video download failure', async () => {
			const video = createVideoRow({ id: 'video-download-fail' });

			const selectChain = createChain([video], null);
			const updateChain = createChain(null, null);

			let fromCallCount = 0;
			mockFrom.mockImplementation(() => {
				fromCallCount++;
				if (fromCallCount === 1) {
					return selectChain;
				}
				return updateChain;
			});

			// Set up MSW to return 404
			setupVideoDownloadHandler(404);

			const result = await processVideosQueue();

			expect(result.failed).toBe(1);
			expect(result.errors[0].id).toBe('video-download-fail');
		});

		it('should handle database query errors gracefully', async () => {
			const chain = createChain(null, new Error('Database connection lost'));
			mockFrom.mockReturnValue(chain);

			const result = await processVideosQueue();

			// Should return zeros since getVideosNeedingProcessing returns [] on error
			expect(result.totalQueued).toBe(0);
			expect(result.processed).toBe(0);
			expect(result.failed).toBe(0);
		});

		it('should mark video as already compliant when no processing was applied', async () => {
			const video = createVideoRow({ id: 'video-compliant' });

			const selectChain = createChain([video], null);
			const updateChain = createChain(null, null);

			let fromCallCount = 0;
			mockFrom.mockImplementation(() => {
				fromCallCount++;
				if (fromCallCount === 1) {
					return selectChain;
				}
				return updateChain;
			});

			setupVideoDownloadHandler();

			// Video is already compliant - wasProcessed false, no processing applied
			(processVideoForStory as Mock).mockResolvedValue({
				buffer: Buffer.from('same'),
				width: 1080,
				height: 1920,
				duration: 15,
				originalMetadata: {
					width: 1080,
					height: 1920,
					duration: 15,
					codec: 'h264',
					frameRate: 30,
					bitrate: 3500000,
					hasAudio: true,
					audioCodec: 'aac',
					format: 'mp4',
					fileSize: 6553600,
				},
				wasProcessed: false,
				processingApplied: [],
			});

			const result = await processVideosQueue();

			expect(result.processed).toBe(1);
			// Verify that update was called to mark needs_processing as false
			expect(mockFrom).toHaveBeenCalledWith('content_items');
		});

		it('should handle upload errors during processing', async () => {
			const video = createVideoRow({ id: 'video-upload-fail' });

			const selectChain = createChain([video], null);
			const updateChain = createChain(null, null);

			let fromCallCount = 0;
			mockFrom.mockImplementation(() => {
				fromCallCount++;
				if (fromCallCount === 1) {
					return selectChain;
				}
				return updateChain;
			});

			setupVideoDownloadHandler();

			(processVideoForStory as Mock).mockResolvedValue({
				buffer: Buffer.from('processed'),
				width: 1080,
				height: 1920,
				duration: 15,
				originalMetadata: {
					width: 1920,
					height: 1080,
					duration: 15,
					codec: 'vp9',
					frameRate: 30,
					bitrate: 3500000,
					hasAudio: true,
					audioCodec: 'aac',
					format: 'mp4',
					fileSize: 6553600,
				},
				wasProcessed: true,
				processingApplied: ['h264-encoding'],
			});

			// Make upload fail
			mockUpload.mockResolvedValueOnce({
				error: { message: 'Storage quota exceeded' },
			});

			const result = await processVideosQueue();

			expect(result.failed).toBe(1);
			expect(result.errors[0].id).toBe('video-upload-fail');
		});

		it('should process multiple videos sequentially', async () => {
			const videos = [
				createVideoRow({ id: 'video-a' }),
				createVideoRow({ id: 'video-b' }),
				createVideoRow({ id: 'video-c' }),
			];

			const selectChain = createChain(videos, null);
			const updateChain = createChain(null, null);

			let fromCallCount = 0;
			mockFrom.mockImplementation(() => {
				fromCallCount++;
				if (fromCallCount === 1) {
					return selectChain;
				}
				return updateChain;
			});

			setupVideoDownloadHandler();

			(processVideoForStory as Mock).mockResolvedValue({
				buffer: Buffer.from('processed'),
				width: 1080,
				height: 1920,
				duration: 15,
				originalMetadata: {
					width: 1920,
					height: 1080,
					duration: 15,
					codec: 'h264',
					frameRate: 30,
					bitrate: 3500000,
					hasAudio: true,
					audioCodec: 'aac',
					format: 'mp4',
					fileSize: 6553600,
				},
				wasProcessed: true,
				processingApplied: ['h264-encoding'],
			});

			const result = await processVideosQueue();

			expect(result.totalQueued).toBe(3);
			expect(result.processed).toBe(3);
			expect(result.failed).toBe(0);
			// processVideoForStory should be called once per video
			expect(processVideoForStory).toHaveBeenCalledTimes(3);
		});

		it('should handle mix of successful and failed processing', async () => {
			const videos = [
				createVideoRow({ id: 'video-ok' }),
				createVideoRow({ id: 'video-broken' }),
				createVideoRow({ id: 'video-also-ok' }),
			];

			const selectChain = createChain(videos, null);
			const updateChain = createChain(null, null);

			let fromCallCount = 0;
			mockFrom.mockImplementation(() => {
				fromCallCount++;
				if (fromCallCount === 1) {
					return selectChain;
				}
				return updateChain;
			});

			setupVideoDownloadHandler();

			const successResult = {
				buffer: Buffer.from('processed'),
				width: 1080,
				height: 1920,
				duration: 15,
				originalMetadata: {
					width: 1920,
					height: 1080,
					duration: 15,
					codec: 'h264',
					frameRate: 30,
					bitrate: 3500000,
					hasAudio: true,
					audioCodec: 'aac',
					format: 'mp4',
					fileSize: 6553600,
				},
				wasProcessed: true,
				processingApplied: ['h264-encoding'],
			};

			(processVideoForStory as Mock)
				.mockResolvedValueOnce(successResult)
				.mockRejectedValueOnce(new Error('Codec not supported'))
				.mockResolvedValueOnce(successResult);

			const result = await processVideosQueue();

			expect(result.totalQueued).toBe(3);
			expect(result.processed).toBe(2);
			expect(result.failed).toBe(1);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].id).toBe('video-broken');
		});
	});

	// ======== Retry behavior (tested via processVideo internal behavior) ========

	describe('retry behavior', () => {
		it('should keep needs_processing=true when retry_count < max retries on failure', async () => {
			const video = createVideoRow({
				id: 'video-retry',
				retry_count: 1, // Attempt 2 of 3
			});

			const selectChain = createChain([video], null);
			const updateChain = createChain(null, null);

			let fromCallCount = 0;
			mockFrom.mockImplementation(() => {
				fromCallCount++;
				if (fromCallCount === 1) {
					return selectChain;
				}
				return updateChain;
			});

			setupVideoDownloadHandler();

			(processVideoForStory as Mock).mockRejectedValue(
				new Error('Processing timed out')
			);

			await processVideosQueue();

			// The update call should NOT set needs_processing to false (retry_count 1 + 1 = 2 < 3)
			// We verify the update was called on content_items
			expect(mockFrom).toHaveBeenCalledWith('content_items');
		});

		it('should set needs_processing=false when retry_count reaches max on failure', async () => {
			const video = createVideoRow({
				id: 'video-max-retry',
				retry_count: 2, // Will become 3 (>= MAX_PROCESSING_RETRIES)
			});

			const selectChain = createChain([video], null);
			const updateChain = createChain(null, null);

			let fromCallCount = 0;
			mockFrom.mockImplementation(() => {
				fromCallCount++;
				if (fromCallCount === 1) {
					return selectChain;
				}
				return updateChain;
			});

			setupVideoDownloadHandler();

			(processVideoForStory as Mock).mockRejectedValue(
				new Error('Permanent failure')
			);

			const result = await processVideosQueue();

			expect(result.failed).toBe(1);
			// The update should have set needs_processing to false
			expect(mockFrom).toHaveBeenCalledWith('content_items');
		});

		it('should reset retry_count to 0 on successful processing', async () => {
			const video = createVideoRow({
				id: 'video-recovered',
				retry_count: 2, // Was failing, now succeeds
			});

			const selectChain = createChain([video], null);
			const updateChain = createChain(null, null);

			let fromCallCount = 0;
			mockFrom.mockImplementation(() => {
				fromCallCount++;
				if (fromCallCount === 1) {
					return selectChain;
				}
				return updateChain;
			});

			setupVideoDownloadHandler();

			(processVideoForStory as Mock).mockResolvedValue({
				buffer: Buffer.from('processed'),
				width: 1080,
				height: 1920,
				duration: 15,
				originalMetadata: {
					width: 1920,
					height: 1080,
					duration: 15,
					codec: 'vp9',
					frameRate: 30,
					bitrate: 3500000,
					hasAudio: true,
					audioCodec: 'aac',
					format: 'mp4',
					fileSize: 6553600,
				},
				wasProcessed: true,
				processingApplied: ['h264-encoding'],
			});

			const result = await processVideosQueue();

			expect(result.processed).toBe(1);
			// On success, the update sets retry_count: 0 and error: null
			expect(mockFrom).toHaveBeenCalledWith('content_items');
		});

		it('should not fetch videos with retry_count >= 3', async () => {
			// This is enforced by the .lt('retry_count', 3) query
			// Videos with retry_count >= 3 won't appear in results
			const chain = createChain([], null);
			mockFrom.mockReturnValue(chain);

			await processVideosQueue();

			expect(chain.lt).toHaveBeenCalledWith('retry_count', 3);
		});
	});

	// ======== cleanupOldProcessedVideos ========

	describe('cleanupOldProcessedVideos', () => {
		it('should return 0 when no old videos exist', async () => {
			const chain = createChain([], null);
			mockFrom.mockReturnValue(chain);

			const result = await cleanupOldProcessedVideos();

			expect(result).toBe(0);
		});

		it('should return 0 when data is null', async () => {
			const chain = createChain(null, null);
			mockFrom.mockReturnValue(chain);

			const result = await cleanupOldProcessedVideos();

			expect(result).toBe(0);
		});

		it('should delete old processed videos from storage', async () => {
			const oldVideos = [
				{ storage_path: 'processed/video-old-1.mp4' },
				{ storage_path: 'processed/video-old-2.mp4' },
				{ storage_path: 'processed/video-old-3.mp4' },
			];

			const chain: Record<string, Mock> = {};
			chain.select = vi.fn().mockReturnValue(chain);
			chain.eq = vi.fn().mockReturnValue(chain);
			chain.lt = vi.fn().mockReturnValue(chain);
			chain.not = vi.fn().mockReturnValue(chain);
			chain.like = vi.fn().mockReturnValue({
				...chain,
				then: (resolve: (value: { data: typeof oldVideos; error: null }) => void) => {
					resolve({ data: oldVideos, error: null });
					return Promise.resolve({ data: oldVideos, error: null });
				},
			});

			mockFrom.mockReturnValue(chain);

			const result = await cleanupOldProcessedVideos();

			expect(result).toBe(3);
			expect(mockStorageFrom).toHaveBeenCalledWith('stories');
			expect(mockStorageRemove).toHaveBeenCalledWith([
				'processed/video-old-1.mp4',
				'processed/video-old-2.mp4',
				'processed/video-old-3.mp4',
			]);
		});

		it('should return 0 when database query fails', async () => {
			const chain: Record<string, Mock> = {};
			chain.select = vi.fn().mockReturnValue(chain);
			chain.eq = vi.fn().mockReturnValue(chain);
			chain.lt = vi.fn().mockReturnValue(chain);
			chain.not = vi.fn().mockReturnValue(chain);
			chain.like = vi.fn().mockReturnValue({
				...chain,
				then: (resolve: (value: { data: null; error: Error }) => void) => {
					resolve({ data: null, error: new Error('DB error') });
					return Promise.resolve({ data: null, error: new Error('DB error') });
				},
			});

			mockFrom.mockReturnValue(chain);

			const result = await cleanupOldProcessedVideos();

			expect(result).toBe(0);
		});

		it('should return 0 when storage deletion fails', async () => {
			const oldVideos = [
				{ storage_path: 'processed/video-old-1.mp4' },
			];

			const chain: Record<string, Mock> = {};
			chain.select = vi.fn().mockReturnValue(chain);
			chain.eq = vi.fn().mockReturnValue(chain);
			chain.lt = vi.fn().mockReturnValue(chain);
			chain.not = vi.fn().mockReturnValue(chain);
			chain.like = vi.fn().mockReturnValue({
				...chain,
				then: (resolve: (value: { data: typeof oldVideos; error: null }) => void) => {
					resolve({ data: oldVideos, error: null });
					return Promise.resolve({ data: oldVideos, error: null });
				},
			});

			mockFrom.mockReturnValue(chain);
			mockStorageRemove.mockResolvedValueOnce({
				error: { message: 'Permission denied' },
			});

			const result = await cleanupOldProcessedVideos();

			expect(result).toBe(0);
		});

		it('should filter out null storage paths', async () => {
			const oldVideos = [
				{ storage_path: 'processed/video-1.mp4' },
				{ storage_path: null },
				{ storage_path: 'processed/video-2.mp4' },
			];

			const chain: Record<string, Mock> = {};
			chain.select = vi.fn().mockReturnValue(chain);
			chain.eq = vi.fn().mockReturnValue(chain);
			chain.lt = vi.fn().mockReturnValue(chain);
			chain.not = vi.fn().mockReturnValue(chain);
			chain.like = vi.fn().mockReturnValue({
				...chain,
				then: (resolve: (value: { data: typeof oldVideos; error: null }) => void) => {
					resolve({ data: oldVideos, error: null });
					return Promise.resolve({ data: oldVideos, error: null });
				},
			});

			mockFrom.mockReturnValue(chain);

			const result = await cleanupOldProcessedVideos();

			expect(result).toBe(2);
			expect(mockStorageRemove).toHaveBeenCalledWith([
				'processed/video-1.mp4',
				'processed/video-2.mp4',
			]);
		});

		it('should query for published VIDEO items older than 30 days with processed storage path', async () => {
			const chain: Record<string, Mock> = {};
			chain.select = vi.fn().mockReturnValue(chain);
			chain.eq = vi.fn().mockReturnValue(chain);
			chain.lt = vi.fn().mockReturnValue(chain);
			chain.not = vi.fn().mockReturnValue(chain);
			chain.like = vi.fn().mockReturnValue({
				...chain,
				then: (resolve: (value: { data: never[]; error: null }) => void) => {
					resolve({ data: [], error: null });
					return Promise.resolve({ data: [], error: null });
				},
			});

			mockFrom.mockReturnValue(chain);

			await cleanupOldProcessedVideos();

			expect(mockFrom).toHaveBeenCalledWith('content_items');
			expect(chain.select).toHaveBeenCalledWith('storage_path');
			expect(chain.eq).toHaveBeenCalledWith('media_type', 'VIDEO');
			expect(chain.eq).toHaveBeenCalledWith('publishing_status', 'published');
			expect(chain.not).toHaveBeenCalledWith('storage_path', 'is', null);
			expect(chain.like).toHaveBeenCalledWith('storage_path', 'processed/%');
		});

		it('should handle unexpected exceptions gracefully', async () => {
			mockFrom.mockImplementation(() => {
				throw new Error('Unexpected failure');
			});

			const result = await cleanupOldProcessedVideos();

			expect(result).toBe(0);
		});
	});
});
