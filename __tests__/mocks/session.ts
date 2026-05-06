import type { Session } from 'next-auth';
import type { UserRole } from '@/lib/types';

/**
 * Test-only role mapping. Used to be hardcoded in `lib/auth.ts`
 * but was removed for security reasons. Tests that need
 * deterministic roles for known emails should reference this.
 */
export const TEST_USER_ROLES: Record<string, UserRole> = {
    'user@test.com': 'user',
    'admin@test.com': 'admin',
    'user2@test.com': 'user',
    'p.romanczuk@gmail.com': 'admin',
};

/**
 * Create a mock NextAuth session
 */
export const createMockSession = (overrides?: Partial<Session>): Session => ({
    user: {
        id: 'user_test_123',
        email: 'test@example.com',
        name: 'Test User',
        image: null,
        role: 'user',
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
        role: 'admin',
    },
});
