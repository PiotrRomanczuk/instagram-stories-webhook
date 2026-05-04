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
    getAllLinkedAccounts: vi.fn().mockResolvedValue([]),
    calculateDaysRemaining: vi.fn().mockReturnValue(30),
    isTokenExpired: vi.fn().mockReturnValue(false),
    isTokenExpiringSoon: vi.fn().mockReturnValue(false),
    getLinkedFacebookAccount: vi.fn().mockResolvedValue(null),
}));
vi.mock('@/lib/utils/duplicate-detection', () => ({
    generateContentHash: vi.fn().mockResolvedValue('hash-123'),
    checkForRecentPublish: vi.fn().mockResolvedValue({ isDuplicate: false }),
}));
vi.mock('@/lib/utils/admin-alerts', () => ({
    alertPublishFailure: vi.fn(),
    alertTokenExpiry: vi.fn(),
    alertHighQuota: vi.fn(),
}));
vi.mock('@/lib/utils/logger', () => ({
    Logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/config/supabase-admin', () => ({
    supabaseAdmin: { from: vi.fn() },
}));

import { processScheduledPosts } from '@/lib/scheduler/process-service';
import { InMemoryContentLifecycle } from '@/lib/scheduler/content-lifecycle';
import { publishMedia } from '@/lib/instagram';
import { processAndUploadStoryVideo } from '@/lib/media/video-processor';

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

describe('processScheduledPosts against ContentLifecycle seam', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(publishMedia).mockResolvedValue({ id: 'ig-media-123' });
    });

    it('drives the lifecycle: acquireLock → markPublished on IMAGE happy path', async () => {
        const lifecycle = new InMemoryContentLifecycle();
        lifecycle.seed([makeItem({ id: 'image-1' })]);

        const result = await processScheduledPosts('image-1', false, lifecycle);

        expect(result.succeeded).toBe(1);
        expect(result.failed).toBe(0);
        expect(lifecycle.events.map((e) => e.op)).toEqual(['acquireLock', 'markPublished']);
        expect(lifecycle.snapshot('image-1')?.publishingStatus).toBe('published');
        expect(lifecycle.snapshot('image-1')?.igMediaId).toBe('ig-media-123');
    });

    it('marks story-processing-complete after a successful video processing pass', async () => {
        const lifecycle = new InMemoryContentLifecycle();
        lifecycle.seed([
            makeItem({
                id: 'video-1',
                mediaType: 'VIDEO',
                mediaUrl: 'https://cdn.example.com/video.mp4',
                storyReady: false,
            }),
        ]);

        await processScheduledPosts('video-1', false, lifecycle);

        expect(processAndUploadStoryVideo).toHaveBeenCalledOnce();
        expect(lifecycle.events.map((e) => e.op)).toEqual([
            'acquireLock',
            'markStoryProcessingComplete',
            'markPublished',
        ]);
        expect(lifecycle.snapshot('video-1')?.storyReady).toBe(true);
    });

    it('skips story processing when story_ready=true', async () => {
        const lifecycle = new InMemoryContentLifecycle();
        lifecycle.seed([
            makeItem({
                id: 'video-2',
                mediaType: 'VIDEO',
                mediaUrl: 'https://cdn.example.com/video.mp4',
                storyReady: true,
            }),
        ]);

        await processScheduledPosts('video-2', false, lifecycle);

        expect(processAndUploadStoryVideo).not.toHaveBeenCalled();
        expect(lifecycle.events.map((e) => e.op)).toEqual(['acquireLock', 'markPublished']);
    });

    it('marks failed and retries when publishMedia throws', async () => {
        vi.mocked(publishMedia).mockRejectedValueOnce(new Error('Instagram down'));

        const lifecycle = new InMemoryContentLifecycle();
        lifecycle.seed([makeItem({ id: 'image-fail' })]);

        const result = await processScheduledPosts('image-fail', false, lifecycle);

        expect(result.failed).toBe(1);
        expect(lifecycle.events.map((e) => e.op)).toEqual(['acquireLock', 'markFailed']);
        const failEvent = lifecycle.events.find((e) => e.op === 'markFailed');
        expect(failEvent?.payload?.errorMessage).toMatch(/Instagram down/);
        expect(failEvent?.payload?.retryCount).toBe(1);
    });

    it('cancels the post when a duplicate is detected', async () => {
        const dup = await import('@/lib/utils/duplicate-detection');
        vi.mocked(dup.checkForRecentPublish).mockResolvedValueOnce({
            isDuplicate: true,
            existingPostId: 'previously-published',
        });

        const lifecycle = new InMemoryContentLifecycle();
        lifecycle.seed([makeItem({ id: 'dup-1', contentHash: 'preset-hash' })]);

        await processScheduledPosts('dup-1', false, lifecycle);

        expect(publishMedia).not.toHaveBeenCalled();
        expect(lifecycle.events.map((e) => e.op)).toEqual(['acquireLock', 'markCancelled']);
    });
});
