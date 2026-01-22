import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import {
    generateContentHash,
    checkForRecentPublish,
    generateIdempotencyKey
} from '@/lib/utils/duplicate-detection';
import { supabaseAdmin } from '@/lib/config/supabase-admin';

// Inline mock to avoid hoisting issues
vi.mock('@/lib/config/supabase-admin', () => {
    const mockData = { data: null, error: null };
    const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(), // Needed for Logger
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve(mockData)),
    };

    return {
        supabaseAdmin: {
            from: vi.fn(() => queryBuilder),
        },
    };
});

// Mock fetch globally
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

describe('generateContentHash', () => {
    beforeEach(() => {
        fetchMock.mockReset();
    });

    it('should generate consistent hash for same content', async () => {
        fetchMock.mockResolvedValue(new Response('test string content'));

        const hash1 = await generateContentHash('https://example.com/1.jpg');

        // Reset fetch for second call
        fetchMock.mockResolvedValue(new Response('test string content'));

        const hash2 = await generateContentHash('https://example.com/2.jpg');

        expect(hash1).toBe(hash2);
        expect(hash1).toHaveLength(64); // SHA-256 hex length
    });

    it('should generate different hash for different content', async () => {
        fetchMock.mockResolvedValueOnce(new Response('content A'));
        const hashA = await generateContentHash('https://example.com/a.jpg');

        fetchMock.mockResolvedValueOnce(new Response('content B'));
        const hashB = await generateContentHash('https://example.com/b.jpg');

        expect(hashA).not.toBe(hashB);
    });

    it('should throw error on fetch failure', async () => {
        fetchMock.mockResolvedValue(new Response(null, { status: 404, statusText: 'Not Found' }));

        await expect(generateContentHash('https://example.com/fail.jpg'))
            .rejects.toThrow('Failed to fetch file');
    });
});

describe('checkForRecentPublish', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return isDuplicate: true if recent post found', async () => {
        const recentPost = {
            id: 'post_1',
            published_at: Date.now() - 1000 * 60 * 60, // 1 hour ago
        };

        // Mock Supabase response via the mocked module
        const queryBuilder = (supabaseAdmin.from as Mock)('scheduled_posts');
        queryBuilder.then = vi.fn((resolve) => resolve({ data: [recentPost], error: null }));
        queryBuilder.limit = vi.fn().mockReturnValue({
            then: vi.fn((resolve) => resolve({ data: [recentPost], error: null }))
        });

        // We need to re-mock the return of limit() specifically because the chain ends there in the implementation
        // Actually, the implementation awaits the chain. 
        // My inline mock sets up a generic chain. The issue is verifying specifically what limit() returns.
        // Let's rely on the mock setup in vi.mock mostly, but here we can customize the result.

        // Need to be careful: the inline mock creates a FRESH object on each 'from' call? 
        // No, 'from' is a jest fn returning 'queryBuilder' which is a singleton in the mock closure above.
        // So I can modify queryBuilder on the fly? No, I can't access it easily from here.
        // I will re-implement the mock to allow control.
    });
});

// Since I cannot access the closure variables of vi.mock, I'll rely on the fact that I mocked the method to return 'this'.
// And the final promise resolution is mocked.
// To change the data per test, I need to spy on the mocked method or use a more sophisticated mock.
// Re-writing the mock to be controllable:

// Better approach:
// Define the mock behavior in each test or setup block if I can access the mocked object.
// Since supabaseAdmin is imported, and it is a mock, I can interact with it.

describe('checkForRecentPublish Implementation', () => {
    it('should return isDuplicate: true if recent post found', async () => {
        const recentPost = {
            id: 'post_1',
            published_at: Date.now() - 1000 * 60 * 60,
        };

        // Access the mocked function
        const fromMock = supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>;
        const queryBuilderMock = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) => resolve({ data: [recentPost], error: null })),
        };
        fromMock.mockReturnValue(queryBuilderMock);

        const result = await checkForRecentPublish('hash', 'user');
        expect(result.isDuplicate).toBe(true);
    });

    it('should return isDuplicate: false if no recent post found', async () => {
        const fromMock = supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>;
        const queryBuilderMock = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) => resolve({ data: [], error: null })),
        };
        fromMock.mockReturnValue(queryBuilderMock);

        const result = await checkForRecentPublish('hash', 'user');
        expect(result.isDuplicate).toBe(false);
    });
});

describe('generateIdempotencyKey', () => {
    it('should generate same key for same inputs', () => {
        const key1 = generateIdempotencyKey('u', 'url', 100);
        const key2 = generateIdempotencyKey('u', 'url', 100);
        expect(key1).toBe(key2);
    });
});
