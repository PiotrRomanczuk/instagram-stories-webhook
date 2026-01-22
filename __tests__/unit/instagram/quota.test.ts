import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContentPublishingLimit } from '@/lib/instagram/quota';
import axios from 'axios';
import { mockInstagramResponses } from '../../mocks/instagram-api';

vi.mock('axios');
vi.mock('@/lib/linked-accounts-db', () => ({
    getFacebookAccessToken: vi.fn().mockResolvedValue('fake_token'),
}));

vi.mock('@/lib/logger', () => ({
    Logger: {
        debug: vi.fn(),
        error: vi.fn(),
    }
}));

describe('getContentPublishingLimit', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should parse quota response (array format)', async () => {
        (axios.get as any).mockResolvedValue({
            data: mockInstagramResponses.quota // contains { data: [...] }
        });

        const result = await getContentPublishingLimit('ig_user_123', 'user_123');

        expect(result).toBeDefined();
        expect(result.quota_usage).toBe(45);
        expect(axios.get).toHaveBeenCalledWith(
            expect.stringContaining('/ig_user_123/content_publishing_limit'),
            expect.anything()
        );
    });

    it('should handle single object response format', async () => {
        // Some endpoints might return direct object depending on API version quirks or mocks
        (axios.get as any).mockResolvedValue({
            data: { quota_usage: 10, config: { quota_total: 100 } }
        });

        const result = await getContentPublishingLimit('ig_user_123', 'user_123');

        // The logic in quota.ts handles "response.data?.data && Array.isArray" vs direct "response.data"
        // If we return direct object in response.data, code might fallback to returning it as `ContentPublishingLimit`
        // Wait, the code says: return response.data as ContentPublishingLimit if array check fails.

        expect(result.quota_usage).toBe(10);
    });

    it('should throw if no access token', async () => {
        const { getFacebookAccessToken } = await import('@/lib/linked-accounts-db');
        (getFacebookAccessToken as any).mockResolvedValueOnce(null);

        await expect(getContentPublishingLimit('ig_u', 'u'))
            .rejects.toThrow('No access token found');
    });

    it('should propagate API errors', async () => {
        (axios.get as any).mockRejectedValue(new Error('Network Error'));
        await expect(getContentPublishingLimit('ig_u', 'u'))
            .rejects.toThrow('Network Error');
    });
});
