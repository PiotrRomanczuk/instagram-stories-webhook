import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/profile/onboarding/route';

vi.mock('next-auth/next', () => ({
    getServerSession: vi.fn(),
}));

vi.mock('@/lib/database/user-profile', () => ({
    completeUserOnboarding: vi.fn(),
    getUserProfileByEmail: vi.fn(),
}));

vi.mock('@/lib/preview-guard', () => ({
    preventWriteForDemo: vi.fn().mockReturnValue(null),
}));

const validBody = {
    displayName: 'Jane Doe',
    handle: 'jane.doe',
    contactEmail: 'jane@example.com',
    acknowledgedGuidelines: true,
};

function buildRequest(body: unknown): NextRequest {
    return new NextRequest('http://localhost:3000/api/profile/onboarding', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
    });
}

describe('POST /api/profile/onboarding', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('rejects unauthenticated requests', async () => {
        const { getServerSession } = await import('next-auth/next');
        vi.mocked(getServerSession).mockResolvedValue(null);

        const res = await POST(buildRequest(validBody));
        expect(res.status).toBe(401);
    });

    it('rejects an invalid handle', async () => {
        const { getServerSession } = await import('next-auth/next');
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: 'u1', email: 'jane@example.com' },
        } as never);

        const res = await POST(buildRequest({ ...validBody, handle: 'has spaces!' }));
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toMatch(/handle/i);
    });

    it('rejects when guidelines not acknowledged', async () => {
        const { getServerSession } = await import('next-auth/next');
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: 'u1', email: 'jane@example.com' },
        } as never);

        const res = await POST(buildRequest({ ...validBody, acknowledgedGuidelines: false }));
        expect(res.status).toBe(400);
    });

    it('persists the profile and returns onboarded:true', async () => {
        const { getServerSession } = await import('next-auth/next');
        const { completeUserOnboarding } = await import('@/lib/database/user-profile');
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: 'u1', email: 'jane@example.com' },
        } as never);
        vi.mocked(completeUserOnboarding).mockResolvedValue({
            id: 'u1',
            email: 'jane@example.com',
            name: null,
            display_name: 'Jane Doe',
            handle: 'jane.doe',
            contact_email: 'jane@example.com',
            onboarded_at: new Date().toISOString(),
            guidelines_acknowledged_at: new Date().toISOString(),
        });

        const res = await POST(buildRequest(validBody));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.onboarded).toBe(true);
        expect(body.profile.handle).toBe('jane.doe');
        expect(completeUserOnboarding).toHaveBeenCalledWith('u1', {
            displayName: 'Jane Doe',
            handle: 'jane.doe',
            contactEmail: 'jane@example.com',
        });
    });
});

describe('GET /api/profile/onboarding', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns onboarded:false when no profile row exists', async () => {
        const { getServerSession } = await import('next-auth/next');
        const { getUserProfileByEmail } = await import('@/lib/database/user-profile');
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: 'u1', email: 'jane@example.com' },
        } as never);
        vi.mocked(getUserProfileByEmail).mockResolvedValue(null);

        const res = await GET();
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.onboarded).toBe(false);
    });
});
