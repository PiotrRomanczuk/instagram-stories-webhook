/**
 * RBAC Bypass Tests (INS-66)
 *
 * Verifies that protected route handlers reject requests from users with
 * insufficient roles and return the correct HTTP status codes.
 *
 * Tests route-level enforcement, not DB/RLS layer.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { requireAdmin, requireDeveloper } from '@/lib/auth-helpers';

// Users routes
import { GET as usersGet, POST as usersPost } from '@/app/api/users/route';
import {
  GET as userDetailGet,
  PATCH as userDetailPatch,
  DELETE as userDetailDelete,
} from '@/app/api/users/[email]/route';

// Developer route (representative endpoint)
import { GET as cronDebugLogsGet } from '@/app/api/developer/cron-debug/logs/route';

// Schedule route
import { GET as scheduleGet, DELETE as scheduleDelete } from '@/app/api/schedule/route';
import { getScheduledPosts } from '@/lib/database/scheduled-posts';

vi.mock('next-auth/next');
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/auth-helpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth-helpers')>();
  return { ...actual, requireAdmin: vi.fn(), requireDeveloper: vi.fn() };
});

// Users route DB deps
vi.mock('@/lib/memes-db', () => ({
  getAllowedUsers: vi.fn().mockResolvedValue([]),
  addAllowedUser: vi.fn().mockResolvedValue({ email: 'new@example.com', role: 'user' }),
  removeAllowedUser: vi.fn().mockResolvedValue(true),
  updateUserRole: vi.fn().mockResolvedValue(true),
  getAllowedUserByEmail: vi.fn().mockResolvedValue({ email: 'target@example.com', role: 'user' }),
  getUserStatsByEmail: vi.fn().mockResolvedValue({ lastUserId: null }),
  getPostStatsByEmail: vi.fn().mockResolvedValue({}),
  getNextAuthUserIdByEmail: vi.fn().mockResolvedValue(null),
  UserRole: {},
}));
vi.mock('@/lib/database/linked-accounts', () => ({
  getLinkedFacebookAccount: vi.fn().mockResolvedValue(null),
}));
vi.mock('@/lib/validations/user.schema', () => ({
  addUserSchema: {},
  updateUserRoleSchema: {},
  validateUserInput: vi.fn().mockResolvedValue({
    success: true,
    data: { email: 'new@example.com', role: 'user', display_name: 'New User' },
  }),
}));

// Developer route DB deps
vi.mock('@/lib/config/supabase-admin', () => ({
  supabaseAdmin: { from: vi.fn() },
}));

// Schedule route DB deps
vi.mock('@/lib/database/scheduled-posts');
vi.mock('@/lib/database/schedule-conflict', () => ({
  checkScheduleConflict: vi.fn().mockResolvedValue({ hasConflict: false }),
}));

// ─── Session fixtures ──────────────────────────────────────────────────────────

const SESSION_USER = {
  user: { id: 'user-1', email: 'user@example.com', role: 'user' },
  expires: '2027-01-01',
};
const SESSION_ADMIN = {
  user: { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
  expires: '2027-01-01',
};
const SESSION_DEVELOPER = {
  user: { id: 'dev-1', email: 'dev@example.com', role: 'developer' },
  expires: '2027-01-01',
};

const USER_ROUTE_PARAMS = { params: Promise.resolve({ email: 'target%40example.com' }) };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RBAC bypass tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── /api/users (admin-only) ──────────────────────────────────────────────────

  describe('GET /api/users — admin only', () => {
    it('returns 403 for regular user', async () => {
      vi.mocked(getServerSession).mockResolvedValue(SESSION_USER);
      vi.mocked(requireAdmin).mockImplementation(() => {
        throw new Error('Admin access required');
      });

      const res = await usersGet();
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe('Admin access required');
    });

    it('returns 200 for admin', async () => {
      vi.mocked(getServerSession).mockResolvedValue(SESSION_ADMIN);
      vi.mocked(requireAdmin).mockImplementation(() => {});

      const res = await usersGet();
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/users — admin only, no privilege escalation', () => {
    it('returns 403 for regular user', async () => {
      vi.mocked(getServerSession).mockResolvedValue(SESSION_USER);
      vi.mocked(requireAdmin).mockImplementation(() => {
        throw new Error('Admin access required');
      });

      const req = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({ email: 'new@example.com', role: 'user' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const res = await usersPost(req);
      expect(res.status).toBe(403);
    });

    it('returns 403 when admin tries to create a developer account', async () => {
      vi.mocked(getServerSession).mockResolvedValue(SESSION_ADMIN);
      vi.mocked(requireAdmin).mockImplementation(() => {});
      // isDeveloper(SESSION_ADMIN) → false → route returns 403
      const { validateUserInput } = await import('@/lib/validations/user.schema');
      vi.mocked(validateUserInput).mockResolvedValueOnce({
        success: true,
        data: { email: 'new-dev@example.com', role: 'developer', display_name: undefined },
      });

      const req = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({ email: 'new-dev@example.com', role: 'developer' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const res = await usersPost(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('developer');
    });
  });

  // ── /api/users/[email] (admin/developer split) ───────────────────────────────

  describe('GET /api/users/[email] — admin only', () => {
    it('returns 403 for regular user', async () => {
      vi.mocked(getServerSession).mockResolvedValue(SESSION_USER);
      vi.mocked(requireAdmin).mockImplementation(() => {
        throw new Error('Admin access required');
      });

      const req = new NextRequest('http://localhost/api/users/target%40example.com');
      const res = await userDetailGet(req, USER_ROUTE_PARAMS);
      expect(res.status).toBe(403);
    });

    it('returns 200 for admin', async () => {
      vi.mocked(getServerSession).mockResolvedValue(SESSION_ADMIN);
      vi.mocked(requireAdmin).mockImplementation(() => {});

      const req = new NextRequest('http://localhost/api/users/target%40example.com');
      const res = await userDetailGet(req, USER_ROUTE_PARAMS);
      expect(res.status).toBe(200);
    });
  });

  describe('PATCH /api/users/[email] — developer only', () => {
    it('returns 403 for regular user', async () => {
      vi.mocked(getServerSession).mockResolvedValue(SESSION_USER);
      vi.mocked(requireDeveloper).mockImplementation(() => {
        throw new Error('Developer access required');
      });

      const req = new NextRequest('http://localhost/api/users/target%40example.com', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'admin' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const res = await userDetailPatch(req, USER_ROUTE_PARAMS);
      expect(res.status).toBe(403);
    });

    it('returns 403 for admin (not developer)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(SESSION_ADMIN);
      vi.mocked(requireDeveloper).mockImplementation(() => {
        throw new Error('Developer access required');
      });

      const req = new NextRequest('http://localhost/api/users/target%40example.com', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'user' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const res = await userDetailPatch(req, USER_ROUTE_PARAMS);
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/users/[email] — admin only', () => {
    it('returns 403 for regular user', async () => {
      vi.mocked(getServerSession).mockResolvedValue(SESSION_USER);
      vi.mocked(requireAdmin).mockImplementation(() => {
        throw new Error('Admin access required');
      });

      const req = new NextRequest('http://localhost/api/users/target%40example.com', {
        method: 'DELETE',
      });

      const res = await userDetailDelete(req, USER_ROUTE_PARAMS);
      expect(res.status).toBe(403);
    });
  });

  // ── /api/developer/* (developer only) ───────────────────────────────────────

  describe('GET /api/developer/cron-debug/logs — developer only', () => {
    it('returns non-200 for regular user', async () => {
      vi.mocked(getServerSession).mockResolvedValue(SESSION_USER);
      vi.mocked(requireDeveloper).mockImplementation(() => {
        throw new Error('Developer access required');
      });

      const req = new NextRequest(
        'http://localhost/api/developer/cron-debug/logs?type=system',
      );

      const res = await cronDebugLogsGet(req);
      // Route catch-all returns 500 for thrown errors
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('returns non-200 for admin (not developer)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(SESSION_ADMIN);
      vi.mocked(requireDeveloper).mockImplementation(() => {
        throw new Error('Developer access required');
      });

      const req = new NextRequest(
        'http://localhost/api/developer/cron-debug/logs?type=system',
      );

      const res = await cronDebugLogsGet(req);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ── /api/schedule — data isolation ──────────────────────────────────────────

  describe('GET /api/schedule — data isolation', () => {
    it('only returns the authenticated user\'s own posts', async () => {
      vi.mocked(getServerSession).mockResolvedValue(SESSION_USER);
      vi.mocked(getScheduledPosts).mockResolvedValue([
        { id: 'my-post', url: 'https://example.com/img.jpg', type: 'IMAGE', scheduledTime: Date.now() + 60000, status: 'pending', createdAt: Date.now() },
      ]);

      const req = new NextRequest('http://localhost/api/schedule');
      const res = await scheduleGet(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      // DB is called with the session user's id, not someone else's
      expect(getScheduledPosts).toHaveBeenCalledWith('user-1');
      expect(getScheduledPosts).not.toHaveBeenCalledWith('other-user');
      expect(json.posts).toHaveLength(1);
    });

    it('returns 401 for unauthenticated request', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const req = new NextRequest('http://localhost/api/schedule');
      const res = await scheduleGet(req);
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/schedule — ownership enforcement', () => {
    it('returns 404 when user tries to delete another user\'s post', async () => {
      vi.mocked(getServerSession).mockResolvedValue(SESSION_USER);
      // User's own posts list does NOT include the target post ID
      vi.mocked(getScheduledPosts).mockResolvedValue([
        { id: 'my-post', url: 'https://example.com/img.jpg', type: 'IMAGE', scheduledTime: Date.now() + 60000, status: 'pending', createdAt: Date.now() },
      ]);

      const req = new NextRequest(
        'http://localhost/api/schedule?id=other-users-post-id',
        { method: 'DELETE' },
      );

      const res = await scheduleDelete(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toContain('unauthorized');
    });
  });
});
