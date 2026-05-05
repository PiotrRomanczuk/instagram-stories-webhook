import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    buildSubmissionNotification,
    notifySubmissionEvent,
} from '@/lib/notifications/submission-events';

vi.mock('@/lib/notifications', () => ({
    createNotification: vi.fn().mockResolvedValue({ id: 'n1' }),
}));

describe('buildSubmissionNotification', () => {
    it('formats approval messages', () => {
        const out = buildSubmissionNotification({
            kind: 'approved',
            userId: 'u1',
            contentId: 'c1',
            title: 'My Story',
        });
        expect(out.type).toBe('meme_approved');
        expect(out.title).toBe('Submission approved');
        expect(out.message).toContain('"My Story"');
    });

    it('includes the rejection reason when provided', () => {
        const out = buildSubmissionNotification({
            kind: 'rejected',
            userId: 'u1',
            contentId: 'c1',
            reason: 'wrong aspect ratio',
        });
        expect(out.type).toBe('meme_rejected');
        expect(out.message).toMatch(/wrong aspect ratio/);
    });

    it('falls back to a generic rejection message when no reason given', () => {
        const out = buildSubmissionNotification({
            kind: 'rejected',
            userId: 'u1',
            contentId: 'c1',
        });
        expect(out.message).toMatch(/guidelines/i);
    });

    it('includes the scheduled time when present', () => {
        const ts = Date.UTC(2026, 4, 4, 10, 30);
        const out = buildSubmissionNotification({
            kind: 'scheduled',
            userId: 'u1',
            contentId: 'c1',
            scheduledTime: ts,
        });
        expect(out.type).toBe('meme_scheduled');
        expect(out.message).toContain(new Date(ts).toUTCString());
    });

    it('builds a published message with the IG media id', () => {
        const out = buildSubmissionNotification({
            kind: 'published',
            userId: 'u1',
            contentId: 'c1',
            igMediaId: 'ig_123',
        });
        expect(out.type).toBe('meme_published');
        expect(out.message).toContain('ig_123');
    });
});

describe('notifySubmissionEvent', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('skips notification creation when userId is missing', async () => {
        const { createNotification } = await import('@/lib/notifications');
        await notifySubmissionEvent({
            kind: 'approved',
            userId: '',
            contentId: 'c1',
        });
        expect(createNotification).not.toHaveBeenCalled();
    });

    it('persists with the correct payload', async () => {
        const { createNotification } = await import('@/lib/notifications');
        await notifySubmissionEvent({
            kind: 'approved',
            userId: 'u1',
            contentId: 'c1',
            title: 'Hello',
        });
        expect(createNotification).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: 'u1',
                type: 'meme_approved',
                relatedType: 'content_item',
                relatedId: 'c1',
            }),
        );
    });

    it('does not throw when the underlying createNotification fails', async () => {
        const { createNotification } = await import('@/lib/notifications');
        vi.mocked(createNotification).mockRejectedValueOnce(new Error('db down'));
        await expect(
            notifySubmissionEvent({
                kind: 'published',
                userId: 'u1',
                contentId: 'c1',
                igMediaId: 'ig_99',
            }),
        ).resolves.toBeUndefined();
    });
});
