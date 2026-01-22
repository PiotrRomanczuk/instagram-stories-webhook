import { vi } from 'vitest';

/**
 * Mock Supabase client with chainable query builder
 */
export const createMockSupabaseClient = () => {
    const mockData = { data: null, error: null };

    const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockData),
        maybeSingle: vi.fn().mockResolvedValue(mockData),
        then: vi.fn((resolve) => resolve(mockData)),
    };

    return {
        from: vi.fn(() => queryBuilder),
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
            signInWithOAuth: vi.fn().mockResolvedValue({ data: null, error: null }),
            signOut: vi.fn().mockResolvedValue({ error: null }),
        },
        storage: {
            from: vi.fn(() => ({
                upload: vi.fn().mockResolvedValue({ data: null, error: null }),
                getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/image.jpg' } })),
            })),
        },
    };
};

/**
 * Set mock data for next query
 */
export const setMockSupabaseData = (client: ReturnType<typeof createMockSupabaseClient>, data: unknown, error: unknown = null) => {
    const queryBuilder = client.from('test');
    queryBuilder.single = vi.fn().mockResolvedValue({ data, error });
    queryBuilder.then = vi.fn((resolve) => resolve({ data, error }));
};
