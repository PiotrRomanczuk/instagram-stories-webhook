import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMediaInsights } from '@/lib/instagram/insights';
import axios from 'axios';
import { mockInstagramResponses } from '../../mocks/instagram-api';

vi.mock('axios');
vi.mock('@/lib/linked-accounts-db', () => ({
    getFacebookAccessToken: vi.fn().mockResolvedValue('fake_token'),
}));

// Mock Logger to avoid supabase calls during test
vi.mock('@/lib/logger', () => ({
    Logger: {
        error: vi.fn(),
    }
}));

describe('getMediaInsights', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should fetch story metrics successfully', async () => {
        (axios.get as any).mockResolvedValue({
            data: mockInstagramResponses.insights
        });

        const insights = await getMediaInsights('media_123', 'user_123', 'STORY');

        expect(insights).toBeDefined();
        expect(insights.length).toBe(2);
        expect(insights[0].name).toBe('impressions');
        expect(axios.get).toHaveBeenCalledWith(
            expect.stringContaining('/media_123/insights'),
            expect.objectContaining({
                params: expect.objectContaining({
                    metric: expect.stringContaining('impressions') // Story metrics
                })
            })
        );
    });

    it('should fetch reel metrics successfully', async () => {
        (axios.get as any).mockResolvedValue({
            data: mockInstagramResponses.insights
        });

        await getMediaInsights('media_123', 'user_123', 'REEL');

        expect(axios.get).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                params: expect.objectContaining({
                    metric: expect.stringContaining('video_views') // Reel metrics
                })
            })
        );
    });

    it('should throw if no access token', async () => {
        const { getFacebookAccessToken } = await import('@/lib/linked-accounts-db');
        (getFacebookAccessToken as any).mockResolvedValueOnce(null);

        await expect(getMediaInsights('media_123', 'user_123', 'STORY'))
            .rejects.toThrow('No access token found');
    });

    it('should handle API errors', async () => {
        (axios.get as any).mockRejectedValue(new Error('API Failure'));
        (axios.isAxiosError as any) = vi.fn().mockReturnValue(false);

        await expect(getMediaInsights('media_123', 'user_123', 'STORY'))
            .rejects.toThrow('API Failure');
    });
});
