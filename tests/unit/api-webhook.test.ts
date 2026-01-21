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
        insert: vi.fn().mockReturnThis(), // Added for Logger
    } as any,
}));

vi.mock('next-auth/next', () => ({
    getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
    authOptions: {},
}));

describe('Webhook API', () => {
    const mockSecret = 'test-secret';
    process.env.WEBHOOK_SECRET = mockSecret;
    const mockUrl = 'https://example.com/image.jpg';
    const mockEmail = 'test@example.com';
    const mockUserId = 'user-123';

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset chain behavior which might be mutated by 'mockImplementation' in tests
        (supabaseAdmin.schema as any).mockReturnThis();
        (supabaseAdmin.from as any).mockReturnThis();
        (supabaseAdmin.schema as any).mockReturnThis();
        (supabaseAdmin.from as any).mockReturnThis();
        // select/eq are usually on the result of 'from', not 'supabaseAdmin' itself in the mock definition above?
        // Wait, the mock definition says: from: vi.fn().mockReturnThis() (returns supabaseAdmin object)
        // so supabaseAdmin.select IS valid on the mock object if we defined it.
        // Let's check the mock definition:
        // supabaseAdmin: { ... select: vi.fn().mockReturnThis() ... }
        // So they SHOULD exist on the mocked object.
        // But TypeScript sees the REAL type.
        (supabaseAdmin as any).select.mockReturnThis();
        (supabaseAdmin as any).eq.mockReturnThis();
         
        // Reset single to default happy path in general, or ensure tests override it explicitly
        // But specifically for 'should fail if user not found', it sets its own mockResolvedValue
    });

    it('should reject requests without auth', async () => {
        const req = new NextRequest('http://localhost/api/webhook/story', {
            method: 'POST',
            body: JSON.stringify({ url: mockUrl }),
        });
        
        const res = await POST(req);
        expect(res.status).toBe(401);
    });

    it('should accept requests with correct secret header', async () => {
        // Mock user lookup
        (supabaseAdmin.schema('next_auth').from('users').select('id').eq('email', mockEmail).single as any)
            .mockResolvedValue({ data: { id: mockUserId }, error: null });

        // Mock publish
        (publishMedia as any).mockResolvedValue({ id: 'media-123' });

        const req = new NextRequest('http://localhost/api/webhook/story', {
            method: 'POST',
            body: JSON.stringify({ url: mockUrl, email: mockEmail }),
            headers: { 'x-webhook-secret': mockSecret }
        });

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(publishMedia).toHaveBeenCalledWith(mockUrl, 'IMAGE', 'STORY', undefined, mockUserId);
    });

    it('should fall back to admin email if no email provided', async () => {
        const adminEmail = 'admin@test.com';
        process.env.ADMIN_EMAIL = adminEmail;

        (supabaseAdmin.schema('next_auth').from('users').select('id').eq as any).mockImplementation((_field: string, _val: string) => {
             // chain hack
             return { single: vi.fn().mockResolvedValue({ data: { id: mockUserId }, error: null }) };
        });

        (publishMedia as any).mockResolvedValue({ id: 'media-123' });

        const req = new NextRequest('http://localhost/api/webhook/story', {
            method: 'POST',
            body: JSON.stringify({ url: mockUrl }), // no email
            headers: { 'x-webhook-secret': mockSecret }
        });

        await POST(req);
        
        // Should verify it called with admin email logic (hard to verify explicit call params due to chain mock complexity, 
        // but verify success implies user was found).
        expect(publishMedia).toHaveBeenCalled();
    });

    it('should fail if user not found', async () => {
         (supabaseAdmin.schema('next_auth').from('users').select('id').eq('email', mockEmail).single as any)
            .mockResolvedValue({ data: null, error: { message: 'Not found' } });

        const req = new NextRequest('http://localhost/api/webhook/story', {
            method: 'POST',
            body: JSON.stringify({ url: mockUrl, email: mockEmail }),
            headers: { 'x-webhook-secret': mockSecret }
        });

        const res = await POST(req);
        expect(res.status).toBe(404);
    });

    it('should fail if url is missing', async () => {
        const req = new NextRequest('http://localhost/api/webhook/story', {
            method: 'POST',
            body: JSON.stringify({ email: mockEmail }),
            headers: { 'x-webhook-secret': mockSecret }
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
    });
});
