import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitForContainerReady } from '@/lib/instagram/container';
import axios from 'axios';
import { mockInstagramResponses } from '../../mocks/instagram-api';

vi.mock('axios');

describe('waitForContainerReady', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should resolve immediately if status is FINISHED', async () => {
        (axios.get as any).mockResolvedValue({
            data: { status_code: 'FINISHED' }
        });

        const promise = waitForContainerReady('cont_123', 'token');

        // Fast-forward not needed if it resolves on first check? 
        // Usually code checks immediately or after delay. 
        // Let's assume implementation might wait initially?
        // If it waits, we need to advance timers.

        await vi.runAllTimersAsync();
        await expect(promise).resolves.toBe(undefined);
    });

    it('should retry if status is IN_PROGRESS', async () => {
        (axios.get as any)
            .mockResolvedValueOnce({ data: { status_code: 'IN_PROGRESS' } })
            .mockResolvedValueOnce({ data: { status_code: 'IN_PROGRESS' } })
            .mockResolvedValueOnce({ data: { status_code: 'FINISHED' } });

        // 5 attempts, 100ms delay
        const promise = waitForContainerReady('cont_123', 'token', 5, 100);

        // Advance timers enough for 3 checks (2 delays)
        await vi.advanceTimersByTimeAsync(1000);

        await expect(promise).resolves.toBe(undefined); // Function returns void on success
        expect(axios.get).toHaveBeenCalledTimes(3);
    });

    it('should throw if status is ERROR', async () => {
        (axios.get as any).mockResolvedValue({
            data: { status_code: 'ERROR', status: 'Something went wrong' }
        });

        const promise = waitForContainerReady('cont_123', 'token', 3, 100);
        await vi.runAllTimersAsync();

        await expect(promise).rejects.toThrow('Media container not ready');
    });

    it('should throw on timeout', async () => {
        (axios.get as any).mockResolvedValue({
            data: { status_code: 'IN_PROGRESS' }
        });

        // 3 attempts, 100ms delay. Should fail after 3rd attempt.
        const promise = waitForContainerReady('cont_123', 'token', 3, 100);

        await vi.advanceTimersByTimeAsync(5000);

        await expect(promise).rejects.toThrow('Media container not ready after 3 attempts');
    });
});
