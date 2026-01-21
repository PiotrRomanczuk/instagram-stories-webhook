import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitForContainerReady } from '@/lib/instagram/container';
import { http, HttpResponse } from 'msw';
import { server } from '../setup';

// Mock Supabase to avoid initialization error when Logger is imported
vi.mock('@/lib/config/supabase-admin', () => ({
    supabaseAdmin: {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
    },
}));

const GRAPH_API_BASE = 'https://graph.facebook.com/v24.0';

describe('waitForContainerReady', () => {
    const mockContainerId = 'cont-123';
    const mockAccessToken = 'tok-456';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should resolve when container status is FINISHED', async () => {
        server.use(
            http.get(`${GRAPH_API_BASE}/${mockContainerId}`, () => {
                return HttpResponse.json({ status_code: 'FINISHED' });
            })
        );

        await expect(waitForContainerReady(mockContainerId, mockAccessToken)).resolves.not.toThrow();
    });

    it('should retry until FINISHED', async () => {
        let attempts = 0;
        server.use(
            http.get(`${GRAPH_API_BASE}/${mockContainerId}`, () => {
                attempts++;
                if (attempts < 3) {
                    return HttpResponse.json({ status_code: 'IN_PROGRESS' });
                }
                return HttpResponse.json({ status_code: 'FINISHED' });
            })
        );

        // We use a shorter delay for testing if we wanted to, but waitForContainerReady defaults to 2000ms.
        // For tests, we'll override the parameters to make it fast.
        await waitForContainerReady(mockContainerId, mockAccessToken, 10, 10);
        
        expect(attempts).toBe(3);
    });

    it('should throw error when status is ERROR', async () => {
        server.use(
            http.get(`${GRAPH_API_BASE}/${mockContainerId}`, () => {
                return HttpResponse.json({ status_code: 'ERROR' });
            })
        );

        await expect(waitForContainerReady(mockContainerId, mockAccessToken, 5, 10))
            .rejects.toThrow('Media container processing failed on Instagram servers');
    });

    it('should handle and retry transient API errors during status check', async () => {
        let apiAttempts = 0;
        server.use(
            http.get(`${GRAPH_API_BASE}/${mockContainerId}`, () => {
                apiAttempts++;
                if (apiAttempts === 1) {
                    return new HttpResponse(null, { status: 500 });
                }
                return HttpResponse.json({ status_code: 'FINISHED' });
            })
        );

        await waitForContainerReady(mockContainerId, mockAccessToken, 5, 10);
        
        expect(apiAttempts).toBe(2);
    });

    it('should throw error after max attempts', async () => {
        server.use(
            http.get(`${GRAPH_API_BASE}/${mockContainerId}`, () => {
                return HttpResponse.json({ status_code: 'IN_PROGRESS' });
            })
        );

        await expect(waitForContainerReady(mockContainerId, mockAccessToken, 3, 10))
            .rejects.toThrow('Media container not ready after 3 attempts');
    });
});
