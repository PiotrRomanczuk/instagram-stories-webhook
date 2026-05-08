import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ContentItem } from '@/lib/types';

vi.mock('@/lib/instagram', () => ({
	publishMedia: vi.fn(),
}));
vi.mock('@/lib/media/story-processor', () => ({
	processAndUploadStoryImage: vi.fn().mockResolvedValue('https://processed.example.com/image.jpg'),
}));
vi.mock('@/lib/media/video-processor', () => ({
	processAndUploadStoryVideo: vi.fn().mockResolvedValue('https://processed.example.com/video.mp4'),
}));
vi.mock('@/lib/database/linked-accounts', () => ({
	getFacebookAccessToken: vi.fn().mockResolvedValue('test-token'),
}));
vi.mock('@/lib/utils/duplicate-detection', () => ({
	generateContentHash: vi.fn().mockResolvedValue('hash-123'),
	checkForRecentPublish: vi.fn().mockResolvedValue({ isDuplicate: false }),
}));
vi.mock('@/lib/utils/admin-alerts', () => ({
	alertPublishFailure: vi.fn(),
}));
vi.mock('@/lib/utils/logger', () => ({
	Logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { publishContentItem } from '@/lib/scheduler/publish-content-item';
import { InMemoryContentLifecycle } from '@/lib/scheduler/content-lifecycle';
import { publishMedia } from '@/lib/instagram';
import { processAndUploadStoryVideo } from '@/lib/media/video-processor';
import { checkForRecentPublish } from '@/lib/utils/duplicate-detection';
import { alertPublishFailure } from '@/lib/utils/admin-alerts';

function makeItem(overrides: Partial<ContentItem> = {}): ContentItem {
	return {
		id: 'item-1',
		userId: 'user-1',
		userEmail: 'test@example.com',
		mediaUrl: 'https://cdn.example.com/image.jpg',
		mediaType: 'IMAGE',
		source: 'direct',
		publishingStatus: 'scheduled',
		scheduledTime: Date.now() - 1000,
		version: 1,
		createdAt: '2026-02-01T00:00:00Z',
		updatedAt: '2026-02-01T00:00:00Z',
		...overrides,
	};
}

describe('publishContentItem', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(publishMedia).mockResolvedValue({ id: 'ig-media-123' });
		vi.mocked(checkForRecentPublish).mockResolvedValue({ isDuplicate: false });
	});

	it('returns "skipped-locked" when the lock cannot be acquired and does not publish', async () => {
		const lifecycle = new InMemoryContentLifecycle();
		const item = makeItem({ id: 'locked-1' });
		lifecycle.seed([item]);
		// Pre-acquire the lock from another worker.
		await lifecycle.acquireLock(item.id);
		// Reset events so we only observe what publishContentItem does.
		lifecycle.events = [];

		const outcome = await publishContentItem(item, lifecycle);

		expect(outcome).toEqual({ id: 'locked-1', status: 'skipped-locked' });
		expect(publishMedia).not.toHaveBeenCalled();
		// No state transitions emitted by publishContentItem — the fake only
		// records `acquireLock` events on successful lock acquisition.
		expect(lifecycle.events.map((e) => e.op)).toEqual([]);
	});

	it('returns "skipped-duplicate" and marks cancelled when content was recently published', async () => {
		vi.mocked(checkForRecentPublish).mockResolvedValueOnce({
			isDuplicate: true,
			existingPostId: 'previously-published-id',
		});

		const lifecycle = new InMemoryContentLifecycle();
		const item = makeItem({ id: 'dup-1', contentHash: 'preset-hash' });
		lifecycle.seed([item]);

		const outcome = await publishContentItem(item, lifecycle);

		expect(outcome).toEqual({
			id: 'dup-1',
			status: 'skipped-duplicate',
			existingPostId: 'previously-published-id',
		});
		expect(publishMedia).not.toHaveBeenCalled();
		expect(lifecycle.events.map((e) => e.op)).toEqual(['acquireLock', 'markCancelled']);
	});

	it('emits markStoryProcessingComplete after a successful video processing pass', async () => {
		const lifecycle = new InMemoryContentLifecycle();
		const item = makeItem({
			id: 'video-1',
			mediaType: 'VIDEO',
			mediaUrl: 'https://cdn.example.com/video.mp4',
			storyReady: false,
		});
		lifecycle.seed([item]);

		const outcome = await publishContentItem(item, lifecycle);

		expect(outcome.status).toBe('published');
		expect(processAndUploadStoryVideo).toHaveBeenCalledOnce();
		expect(lifecycle.events.map((e) => e.op)).toEqual([
			'acquireLock',
			'markStoryProcessingComplete',
			'markPublished',
		]);
		expect(lifecycle.snapshot('video-1')?.storyReady).toBe(true);
	});

	it('skips video story-processing when story_ready=true', async () => {
		const lifecycle = new InMemoryContentLifecycle();
		const item = makeItem({
			id: 'video-2',
			mediaType: 'VIDEO',
			mediaUrl: 'https://cdn.example.com/video.mp4',
			storyReady: true,
		});
		lifecycle.seed([item]);

		const outcome = await publishContentItem(item, lifecycle);

		expect(outcome.status).toBe('published');
		expect(processAndUploadStoryVideo).not.toHaveBeenCalled();
		expect(lifecycle.events.map((e) => e.op)).toEqual(['acquireLock', 'markPublished']);
	});

	it('returns "failed-retryable" with retryCount=1 when publish throws and retries remain', async () => {
		vi.mocked(publishMedia).mockRejectedValueOnce(new Error('Instagram is down'));

		const lifecycle = new InMemoryContentLifecycle();
		const item = makeItem({ id: 'fail-1' });
		lifecycle.seed([item]);

		const outcome = await publishContentItem(item, lifecycle);

		expect(outcome).toMatchObject({
			id: 'fail-1',
			status: 'failed-retryable',
			retryCount: 1,
		});
		expect(outcome.status === 'failed-retryable' && outcome.error).toMatch(/Instagram is down/);
		expect(lifecycle.events.map((e) => e.op)).toEqual(['acquireLock', 'markFailed']);
		// Retryable failures do NOT alert admins — that's the terminal-only path.
		expect(alertPublishFailure).not.toHaveBeenCalled();
		// And the fake's backoff fidelity: scheduledTime was bumped into the future.
		const snap = lifecycle.snapshot('fail-1');
		expect(snap?.scheduledTime).toBeGreaterThan(Date.now());
	});
});
