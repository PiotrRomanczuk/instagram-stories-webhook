import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockUpload, mockDestroy, mockUrl, mockConfig } = vi.hoisted(() => ({
    mockUpload: vi.fn(),
    mockDestroy: vi.fn(),
    mockUrl: vi.fn(),
    mockConfig: vi.fn(),
}));

vi.mock('cloudinary', () => ({
    v2: {
        config: mockConfig,
        uploader: {
            upload: mockUpload,
            destroy: mockDestroy,
        },
        url: mockUrl,
    },
}));

vi.mock('@/lib/utils/logger', () => ({
    Logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('@/lib/media/video-processor', () => ({
    VIDEO_STORY_WIDTH: 1080,
    VIDEO_STORY_HEIGHT: 1920,
    VIDEO_MAX_DURATION_SEC: 60,
    VIDEO_FRAME_RATE: 30,
}));

import {
    isCloudinaryConfigured,
    processVideoUrlWithCloudinary,
    getCloudinaryVideoThumbnail,
    extractThumbnailWithCloudinary,
    deleteCloudinaryVideo,
} from '@/lib/media/cloudinary-video-processor';

describe('cloudinary-video-processor', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = {
            ...originalEnv,
            CLOUDINARY_CLOUD_NAME: 'test-cloud',
            CLOUDINARY_API_KEY: 'test-key',
            CLOUDINARY_API_SECRET: 'test-secret',
        };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    // ======== isCloudinaryConfigured ========

    describe('isCloudinaryConfigured', () => {
        it('should return true when all env vars are set', () => {
            expect(isCloudinaryConfigured()).toBe(true);
        });

        it('should return false when CLOUDINARY_CLOUD_NAME is missing', () => {
            delete process.env.CLOUDINARY_CLOUD_NAME;
            expect(isCloudinaryConfigured()).toBe(false);
        });

        it('should return false when CLOUDINARY_API_KEY is missing', () => {
            delete process.env.CLOUDINARY_API_KEY;
            expect(isCloudinaryConfigured()).toBe(false);
        });

        it('should return false when CLOUDINARY_API_SECRET is missing', () => {
            delete process.env.CLOUDINARY_API_SECRET;
            expect(isCloudinaryConfigured()).toBe(false);
        });

        it('should return false when all env vars are missing', () => {
            delete process.env.CLOUDINARY_CLOUD_NAME;
            delete process.env.CLOUDINARY_API_KEY;
            delete process.env.CLOUDINARY_API_SECRET;
            expect(isCloudinaryConfigured()).toBe(false);
        });
    });

    // ======== processVideoUrlWithCloudinary ========

    describe('processVideoUrlWithCloudinary', () => {
        it('should upload video and return eager transformation result', async () => {
            mockUpload.mockResolvedValue({
                public_id: 'instagram-stories/processed/story-abc-123',
                duration: 15,
                eager: [
                    {
                        secure_url: 'https://res.cloudinary.com/test/transformed.mp4',
                        width: 1080,
                        height: 1920,
                    },
                ],
            });

            const result = await processVideoUrlWithCloudinary(
                'https://example.com/video.mp4',
                'abc'
            );

            expect(result.url).toBe('https://res.cloudinary.com/test/transformed.mp4');
            expect(result.width).toBe(1080);
            expect(result.height).toBe(1920);
            expect(result.duration).toBe(15);
            expect(result.format).toBe('mp4');
            expect(result.processingApplied).toContain('cloudinary-upload');
            expect(result.processingApplied).toContain('cloudinary-transformation');
            expect(result.processingApplied).toContain('h264-encoding');
            expect(result.processingApplied).toContain('aac-audio');
        });

        it('should fall back to URL transformation when eager result is empty', async () => {
            mockUpload.mockResolvedValue({
                public_id: 'instagram-stories/processed/story-abc-123',
                duration: 10,
                eager: [],
            });
            mockUrl.mockReturnValue('https://res.cloudinary.com/test/url-transformed.mp4');

            const result = await processVideoUrlWithCloudinary(
                'https://example.com/video.mp4',
                'abc'
            );

            expect(result.url).toBe('https://res.cloudinary.com/test/url-transformed.mp4');
            expect(result.processingApplied).toContain('cloudinary-url-transformation');
            expect(mockUrl).toHaveBeenCalled();
        });

        it('should fall back to URL transformation when eager is undefined', async () => {
            mockUpload.mockResolvedValue({
                public_id: 'instagram-stories/processed/story-abc-123',
                duration: 10,
            });
            mockUrl.mockReturnValue('https://res.cloudinary.com/test/url-transformed.mp4');

            const result = await processVideoUrlWithCloudinary(
                'https://example.com/video.mp4',
                'abc'
            );

            expect(result.url).toBe('https://res.cloudinary.com/test/url-transformed.mp4');
            expect(result.processingApplied).toContain('cloudinary-url-transformation');
        });

        it('should throw when Cloudinary is not configured', async () => {
            delete process.env.CLOUDINARY_CLOUD_NAME;

            await expect(
                processVideoUrlWithCloudinary('https://example.com/video.mp4', 'abc')
            ).rejects.toThrow('Cloudinary is not configured');
        });

        it('should use correct upload options', async () => {
            mockUpload.mockResolvedValue({
                public_id: 'test-id',
                duration: 5,
                eager: [{ secure_url: 'https://res.cloudinary.com/test/out.mp4', width: 1080, height: 1920 }],
            });

            await processVideoUrlWithCloudinary('https://example.com/video.mp4', 'content-42');

            expect(mockUpload).toHaveBeenCalledWith(
                'https://example.com/video.mp4',
                expect.objectContaining({
                    resource_type: 'video',
                    folder: 'instagram-stories/processed',
                    eager_async: false,
                    format: 'mp4',
                })
            );
        });
    });

    // ======== getCloudinaryVideoThumbnail ========

    describe('getCloudinaryVideoThumbnail', () => {
        it('should generate a thumbnail URL with default offset', () => {
            mockUrl.mockReturnValue('https://res.cloudinary.com/test/thumb.jpg');

            const result = getCloudinaryVideoThumbnail('video-public-id');

            expect(result.url).toBe('https://res.cloudinary.com/test/thumb.jpg');
            expect(result.width).toBe(540);
            expect(result.height).toBe(960);
            expect(mockUrl).toHaveBeenCalledWith(
                'video-public-id',
                expect.objectContaining({
                    resource_type: 'video',
                    format: 'jpg',
                    secure: true,
                })
            );
        });

        it('should use custom offset seconds', () => {
            mockUrl.mockReturnValue('https://res.cloudinary.com/test/thumb-5s.jpg');

            const result = getCloudinaryVideoThumbnail('video-public-id', 5);

            expect(result.url).toBe('https://res.cloudinary.com/test/thumb-5s.jpg');
            const callArgs = mockUrl.mock.calls[0][1];
            expect(callArgs.transformation[0].start_offset).toBe(5);
        });

        it('should throw when Cloudinary is not configured', () => {
            delete process.env.CLOUDINARY_CLOUD_NAME;

            expect(() => getCloudinaryVideoThumbnail('video-id')).toThrow(
                'Cloudinary is not configured'
            );
        });
    });

    // ======== extractThumbnailWithCloudinary ========

    describe('extractThumbnailWithCloudinary', () => {
        it('should upload video and extract thumbnail', async () => {
            mockUpload.mockResolvedValue({
                public_id: 'instagram-stories/thumbnails/thumb-abc-123',
                duration: 15,
            });
            mockUrl.mockReturnValue('https://res.cloudinary.com/test/thumbnail.jpg');

            const result = await extractThumbnailWithCloudinary(
                'https://example.com/video.mp4',
                'abc'
            );

            expect(result.url).toBe('https://res.cloudinary.com/test/thumbnail.jpg');
            expect(result.width).toBe(540);
            expect(result.height).toBe(960);
            expect(mockUpload).toHaveBeenCalledWith(
                'https://example.com/video.mp4',
                expect.objectContaining({
                    resource_type: 'video',
                    folder: 'instagram-stories/thumbnails',
                })
            );
        });

        it('should clamp offset to video duration', async () => {
            mockUpload.mockResolvedValue({
                public_id: 'thumb-id',
                duration: 1, // Short video
            });
            mockUrl.mockReturnValue('https://res.cloudinary.com/test/thumb.jpg');

            await extractThumbnailWithCloudinary(
                'https://example.com/short.mp4',
                'short',
                5 // Offset beyond duration
            );

            // getCloudinaryVideoThumbnail is called with clamped offset: min(5, 1) = 1
            const callArgs = mockUrl.mock.calls[0][1];
            expect(callArgs.transformation[0].start_offset).toBe(1);
        });

        it('should throw when Cloudinary is not configured', async () => {
            delete process.env.CLOUDINARY_CLOUD_NAME;

            await expect(
                extractThumbnailWithCloudinary('https://example.com/video.mp4', 'abc')
            ).rejects.toThrow('Cloudinary is not configured');
        });
    });

    // ======== deleteCloudinaryVideo ========

    describe('deleteCloudinaryVideo', () => {
        it('should delete a video by public ID', async () => {
            mockDestroy.mockResolvedValue({ result: 'ok' });

            await deleteCloudinaryVideo('instagram-stories/processed/story-abc');

            expect(mockDestroy).toHaveBeenCalledWith(
                'instagram-stories/processed/story-abc',
                { resource_type: 'video' }
            );
        });

        it('should not throw when deletion fails', async () => {
            mockDestroy.mockRejectedValue(new Error('Not found'));

            await expect(
                deleteCloudinaryVideo('nonexistent-id')
            ).resolves.not.toThrow();
        });
    });
});
