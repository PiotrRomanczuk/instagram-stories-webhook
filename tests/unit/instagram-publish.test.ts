/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { publishMedia } from '@/lib/instagram/publish';
import { getFacebookAccessToken, getInstagramUserId } from '@/lib/database/linked-accounts';
import { waitForContainerReady } from '@/lib/instagram/container';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { http, HttpResponse } from 'msw';
import { server } from '../setup';

// Mock dependencies
vi.mock('@/lib/database/linked-accounts', () => ({
    getFacebookAccessToken: vi.fn(),
    getInstagramUserId: vi.fn(),
}));

vi.mock('@/lib/instagram/container', () => ({
    waitForContainerReady: vi.fn(),
}));

// Mock Supabase with a chainable interface
vi.mock('@/lib/config/supabase-admin', () => ({
    supabaseAdmin: {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
    } as unknown as { from: any; insert: any; update: any; select: any; delete: any; eq: any; single: any },
}));

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

describe('publishMedia', () => {
    const mockUserId = 'user-123';
    const mockAccessToken = 'access-token-456';
    const mockIgUserId = 'ig-user-789';
    const mockContainerId = 'container-111';
    const mockMediaId = 'media-222';
    const mockImageUrl = 'https://example.com/image.jpg';

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Default mock implementations
        vi.mocked(getFacebookAccessToken).mockResolvedValue(mockAccessToken);
        vi.mocked(getInstagramUserId).mockResolvedValue(mockIgUserId);
        vi.mocked(waitForContainerReady).mockResolvedValue(undefined);
    });

    it('should successfully publish an image story', async () => {
        // Setup MSW handlers for this specific test
        server.use(
            http.post(`${GRAPH_API_BASE}/${mockIgUserId}/media`, () => {
                return HttpResponse.json({ id: mockContainerId });
            }),
            http.post(`${GRAPH_API_BASE}/${mockIgUserId}/media_publish`, () => {
                return HttpResponse.json({ id: mockMediaId });
            })
        );

        const result = await publishMedia(mockImageUrl, 'IMAGE', 'STORY', undefined, mockUserId);

        expect(result.id).toBe(mockMediaId);
        expect(getFacebookAccessToken).toHaveBeenCalledWith(mockUserId);
        expect(getInstagramUserId).toHaveBeenCalledWith(mockUserId);
        expect(waitForContainerReady).toHaveBeenCalledWith(mockContainerId, mockAccessToken);
        
        // Verify success log was inserted
        expect((supabaseAdmin as unknown as any).from).toHaveBeenCalledWith('publishing_logs');
        expect((supabaseAdmin as unknown as any).insert).toHaveBeenCalledWith(expect.objectContaining({
            status: 'SUCCESS',
            ig_media_id: mockMediaId
        }));
    });

    it('should throw error if userId is missing', async () => {
        await expect(publishMedia(mockImageUrl, 'IMAGE', 'STORY', undefined, undefined))
            .rejects.toThrow('UserId is required');
    });

    it('should throw error if access token is missing', async () => {
        vi.mocked(getFacebookAccessToken).mockResolvedValue(null);
        await expect(publishMedia(mockImageUrl, 'IMAGE', 'STORY', undefined, mockUserId))
            .rejects.toThrow('No active Facebook connection found');
    });

    it('should handle and log Instagram API errors with retry verification', async () => {
        let attempts = 0;
        server.use(
            http.post(`${GRAPH_API_BASE}/${mockIgUserId}/media`, () => {
                attempts++;
                if (attempts < 2) {
                    return new HttpResponse(null, { status: 500 });
                }
                return HttpResponse.json({ id: mockContainerId });
            }),
            http.post(`${GRAPH_API_BASE}/${mockIgUserId}/media_publish`, () => {
                return HttpResponse.json({ id: mockMediaId });
            })
        );

        const result = await publishMedia(mockImageUrl, 'IMAGE', 'STORY', undefined, mockUserId);
        
        expect(attempts).toBe(2); // Retried once
        expect(result.id).toBe(mockMediaId);
    });

    it('should fail and log FAILED status after max retries', async () => {
        server.use(
            http.post(`${GRAPH_API_BASE}/${mockIgUserId}/media`, () => {
                return new HttpResponse(null, { status: 500 });
            })
        );

        // We use a shorter timeout/retry for tests if possible, but here we just wait
        await expect(publishMedia(mockImageUrl, 'IMAGE', 'STORY', undefined, mockUserId))
            .rejects.toThrow();

        expect((supabaseAdmin as unknown as any).insert).toHaveBeenCalledWith(expect.objectContaining({
            status: 'FAILED'
        }));
    });
});
