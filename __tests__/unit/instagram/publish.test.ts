import { describe, it, expect, vi, beforeEach } from 'vitest';
import { publishMedia } from '@/lib/instagram/publish';
import axios from 'axios';
import { mockInstagramResponses } from '../../mocks/instagram-api';

// Mock dependencies
vi.mock('axios');
vi.mock('@/lib/linked-accounts-db', () => ({
    getFacebookAccessToken: vi.fn().mockResolvedValue('fake_access_token'),
    getInstagramUserId: vi.fn().mockResolvedValue('fake_ig_user_id'),
}));
vi.mock('@/lib/instagram/container', () => ({
    waitForContainerReady: vi.fn().mockResolvedValue(true),
}));
vi.mock('@/lib/supabase-admin', () => ({
    supabaseAdmin: {
        from: vi.fn().mockReturnValue({
            insert: vi.fn().mockResolvedValue({ error: null }),
        }),
    },
}));

describe('publishMedia', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should successfully publish an image story', async () => {
        // Mock successful calls
        (axios.post as any)
            .mockResolvedValueOnce({ data: mockInstagramResponses.createContainer }) // Create container
            .mockResolvedValueOnce({ data: mockInstagramResponses.publishMedia });   // Publish

        const result = await publishMedia(
            'https://example.com/image.jpg',
            'IMAGE',
            'STORY',
            'Caption',
            'user_123'
        );

        expect(result.id).toBe(mockInstagramResponses.publishMedia.id);
        expect(axios.post).toHaveBeenCalledTimes(2);

        // Verify container creation payload
        expect(axios.post).toHaveBeenNthCalledWith(
            1,
            expect.stringContaining('/fake_ig_user_id/media'),
            expect.objectContaining({
                access_token: 'fake_access_token',
                image_url: 'https://example.com/image.jpg',
                media_type: 'STORIES',
            })
        );
    });

    it('should successfully publish a video reel', async () => {
        (axios.post as any)
            .mockResolvedValueOnce({ data: mockInstagramResponses.createContainer })
            .mockResolvedValueOnce({ data: mockInstagramResponses.publishMedia });

        await publishMedia(
            'https://example.com/video.mp4',
            'VIDEO',
            'REEL',
            'My Reel',
            'user_123'
        );

        expect(axios.post).toHaveBeenNthCalledWith(
            1,
            expect.any(String),
            expect.objectContaining({
                media_type: 'REELS',
                video_url: 'https://example.com/video.mp4',
                caption: 'My Reel',
            })
        );
    });

    it('should handling missing user ID', async () => {
        await expect(publishMedia('url', 'IMAGE', 'STORY'))
            .rejects.toThrow('UserId is required');
    });

    it('should handle API errors gracefully', async () => {
        // Mock failure on container creation
        const errorResponse = {
            response: {
                data: mockInstagramResponses.error
            }
        };
        (axios.post as any).mockRejectedValue(errorResponse);
        (axios.isAxiosError as any) = vi.fn().mockReturnValue(true);

        await expect(publishMedia('url', 'IMAGE', 'STORY', undefined, 'user_123'))
            .rejects.toThrow('Invalid OAuth access token');
    });

    it('should handle Rate Limit errors specific messaging', async () => {
        const errorResponse = {
            response: {
                data: mockInstagramResponses.contentPolicyError // Code 368
            }
        };
        (axios.post as any).mockRejectedValue(errorResponse);
        (axios.isAxiosError as any).mockReturnValue(true);

        await expect(publishMedia('url', 'IMAGE', 'STORY', undefined, 'user_123'))
            .rejects.toThrow('Action blocked by Instagram');
    });
});
