/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/webhook/story/route';
import { publishMedia } from '@/lib/instagram';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/instagram', () => ({
    publishMedia: vi.fn(),
}));

vi.mock('@/lib/config/supabase-admin', () => ({
    supabaseAdmin: {
        schema: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
        insert: vi.fn().mockReturnThis(), // for Logger
    } as any,
}));

describe('Webhook API (header-secret only)', () => {
    const mockSecret = 'test-secret';
    const mockUrl = 'https://example.com/image.jpg';
    const mockEmail = 'test@example.com';
    const mockUserId = 'user-123';

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.WEBHOOK_SECRET = mockSecret;

        // Default: user lookup returns the mock user.
        const singleMock = vi.fn().mockResolvedValue({
            data: { id: mockUserId },
            error: null,
        });
        (supabaseAdmin.schema as any).mockReturnValue({
            from: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: singleMock,
                    }),
                }),
            }),
        });
    });

    it('rejects requests without the secret header', async () => {
        const req = new NextRequest('http://localhost/api/webhook/story', {
            method: 'POST',
            body: JSON.stringify({ url: mockUrl, email: mockEmail }),
        });

        const res = await POST(req);
        expect(res.status).toBe(401);
    });

    it('accepts requests with the correct secret header', async () => {
        (publishMedia as any).mockResolvedValue({ id: 'media-123' });

        const req = new NextRequest('http://localhost/api/webhook/story', {
            method: 'POST',
            body: JSON.stringify({ url: mockUrl, email: mockEmail }),
            headers: { 'x-webhook-secret': mockSecret },
        });

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(publishMedia).toHaveBeenCalledWith(mockUrl, 'IMAGE', 'STORY', undefined, mockUserId);
    });

    it('falls back to ADMIN_EMAIL when no email is provided', async () => {
        process.env.ADMIN_EMAIL = 'admin@test.com';
        (publishMedia as any).mockResolvedValue({ id: 'media-123' });

        const req = new NextRequest('http://localhost/api/webhook/story', {
            method: 'POST',
            body: JSON.stringify({ url: mockUrl }),
            headers: { 'x-webhook-secret': mockSecret },
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        expect(publishMedia).toHaveBeenCalled();
    });

    it('returns 404 if the resolved user is not in the database', async () => {
        const singleMock = vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
        });
        (supabaseAdmin.schema as any).mockReturnValue({
            from: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: singleMock,
                    }),
                }),
            }),
        });

        const req = new NextRequest('http://localhost/api/webhook/story', {
            method: 'POST',
            body: JSON.stringify({ url: mockUrl, email: mockEmail }),
            headers: { 'x-webhook-secret': mockSecret },
        });

        const res = await POST(req);
        expect(res.status).toBe(404);
    });

    it('returns 400 if url is missing', async () => {
        const req = new NextRequest('http://localhost/api/webhook/story', {
            method: 'POST',
            body: JSON.stringify({ email: mockEmail }),
            headers: { 'x-webhook-secret': mockSecret },
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
    });
});
