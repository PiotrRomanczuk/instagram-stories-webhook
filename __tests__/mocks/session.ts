import type { Session } from 'next-auth';

/**
 * Create a mock NextAuth session
 */
export const createMockSession = (overrides?: Partial<Session>): Session => ({
    user: {
        id: 'user_test_123',
        email: 'test@example.com',
        name: 'Test User',
        image: null,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
});

/**
 * Create a mock admin session
 */
export const createMockAdminSession = (): Session => createMockSession({
    user: {
        id: 'admin_123',
        email: 'admin@example.com',
        name: 'Admin User',
        image: null,
    },
});
