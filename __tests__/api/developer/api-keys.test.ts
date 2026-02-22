/**
 * API Key Lifecycle Tests (INS-65)
 *
 * Tests for generate, list, revoke, and update routes under /api/developer/api-keys.
 * Uses MSW-style mocking via vi.mock for all DB and auth dependencies.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as generatePost } from '@/app/api/developer/api-keys/generate/route';
import { GET as listGet } from '@/app/api/developer/api-keys/route';
import { DELETE, PATCH } from '@/app/api/developer/api-keys/[keyId]/route';
import { getServerSession } from 'next-auth/next';
import { requireDeveloper } from '@/lib/auth-helpers';
import { generateApiKey } from '@/lib/auth/api-keys';
import {
  createApiKey,
  listUserApiKeys,
  getApiKeyById,
  revokeApiKey,
  updateApiKey,
} from '@/lib/database/api-keys';

vi.mock('next-auth/next');
vi.mock('@/lib/auth');
vi.mock('@/lib/auth-helpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth-helpers')>();
  return { ...actual, requireDeveloper: vi.fn() };
});
vi.mock('@/lib/auth/api-keys', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/api-keys')>();
  return { ...actual, generateApiKey: vi.fn() };
});
vi.mock('@/lib/database/api-keys');

const DEVELOPER_SESSION = {
  user: { id: 'dev-user-1', email: 'dev@example.com', role: 'developer' },
  expires: '2027-01-01',
};

const MOCK_API_KEY = {
  id: 'key-123',
  userId: 'dev-user-1',
  keyHash: '$2b$10$hashedvalue',
  keyPrefix: 'sk_live_abc1',
  name: 'Test Key',
  scopes: ['cron:read', 'logs:read'],
  createdAt: '2026-01-01T00:00:00Z',
  revokedAt: undefined,
  expiresAt: undefined,
  lastUsedAt: undefined,
};

describe('/api/developer/api-keys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /generate', () => {
    it('should generate and return a new API key for a developer', async () => {
      vi.mocked(getServerSession).mockResolvedValue(DEVELOPER_SESSION);
      vi.mocked(requireDeveloper).mockImplementation(() => {});
      vi.mocked(generateApiKey).mockResolvedValue({
        key: 'sk_live_fullkey123456789',
        hash: '$2b$10$hashedvalue',
        prefix: 'sk_live_fullk',
      });
      vi.mocked(createApiKey).mockResolvedValue(MOCK_API_KEY);

      const req = new NextRequest('http://localhost:3000/api/developer/api-keys/generate', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Key' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await generatePost(req);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.key).toBe('sk_live_fullkey123456789');
      expect(json.apiKey.id).toBe('key-123');
      expect(json.apiKey).not.toHaveProperty('keyHash');
    });

    it('should return 500 for non-developer users', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-1', email: 'user@example.com', role: 'user' },
        expires: '2027-01-01',
      });
      vi.mocked(requireDeveloper).mockImplementation(() => {
        throw new Error('Developer access required');
      });

      const req = new NextRequest('http://localhost:3000/api/developer/api-keys/generate', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await generatePost(req);
      expect(response.status).toBe(500);
    });

    it('should return 400 for invalid expiresAt format', async () => {
      vi.mocked(getServerSession).mockResolvedValue(DEVELOPER_SESSION);
      vi.mocked(requireDeveloper).mockImplementation(() => {});

      const req = new NextRequest('http://localhost:3000/api/developer/api-keys/generate', {
        method: 'POST',
        body: JSON.stringify({ expiresAt: 'not-a-valid-datetime' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await generatePost(req);
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.error).toBe('Invalid request body');
    });

    it('should return 500 if database key creation fails', async () => {
      vi.mocked(getServerSession).mockResolvedValue(DEVELOPER_SESSION);
      vi.mocked(requireDeveloper).mockImplementation(() => {});
      vi.mocked(generateApiKey).mockResolvedValue({
        key: 'sk_live_fullkey123456789',
        hash: '$2b$10$hashedvalue',
        prefix: 'sk_live_fullk',
      });
      vi.mocked(createApiKey).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/developer/api-keys/generate', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await generatePost(req);
      expect(response.status).toBe(500);
    });

    it('should use default scopes when none are provided', async () => {
      vi.mocked(getServerSession).mockResolvedValue(DEVELOPER_SESSION);
      vi.mocked(requireDeveloper).mockImplementation(() => {});
      vi.mocked(generateApiKey).mockResolvedValue({
        key: 'sk_live_fullkey123456789',
        hash: '$2b$10$hashedvalue',
        prefix: 'sk_live_fullk',
      });
      vi.mocked(createApiKey).mockResolvedValue(MOCK_API_KEY);

      const req = new NextRequest('http://localhost:3000/api/developer/api-keys/generate', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });

      await generatePost(req);

      expect(createApiKey).toHaveBeenCalledWith(
        expect.objectContaining({ scopes: ['cron:read', 'logs:read'] })
      );
    });
  });

  describe('GET / (list keys)', () => {
    it('should return all active keys for a developer', async () => {
      vi.mocked(getServerSession).mockResolvedValue(DEVELOPER_SESSION);
      vi.mocked(requireDeveloper).mockImplementation(() => {});
      vi.mocked(listUserApiKeys).mockResolvedValue([MOCK_API_KEY]);

      const req = new NextRequest('http://localhost:3000/api/developer/api-keys');

      const response = await listGet(req);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.apiKeys).toHaveLength(1);
      expect(json.apiKeys[0].id).toBe('key-123');
      expect(json.apiKeys[0]).not.toHaveProperty('keyHash');
    });

    it('should return empty array when user has no keys', async () => {
      vi.mocked(getServerSession).mockResolvedValue(DEVELOPER_SESSION);
      vi.mocked(requireDeveloper).mockImplementation(() => {});
      vi.mocked(listUserApiKeys).mockResolvedValue([]);

      const req = new NextRequest('http://localhost:3000/api/developer/api-keys');

      const response = await listGet(req);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.apiKeys).toEqual([]);
    });

    it('should return 500 for non-developer users', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-1', email: 'user@example.com' },
        expires: '2027-01-01',
      });
      vi.mocked(requireDeveloper).mockImplementation(() => {
        throw new Error('Developer access required');
      });

      const req = new NextRequest('http://localhost:3000/api/developer/api-keys');

      const response = await listGet(req);
      expect(response.status).toBe(500);
    });
  });

  describe('DELETE /[keyId] (revoke)', () => {
    it('should revoke an existing key owned by the developer', async () => {
      vi.mocked(getServerSession).mockResolvedValue(DEVELOPER_SESSION);
      vi.mocked(requireDeveloper).mockImplementation(() => {});
      vi.mocked(getApiKeyById).mockResolvedValue(MOCK_API_KEY);
      vi.mocked(revokeApiKey).mockResolvedValue(true);

      const req = new NextRequest('http://localhost:3000/api/developer/api-keys/key-123', {
        method: 'DELETE',
      });

      const response = await DELETE(req, { params: Promise.resolve({ keyId: 'key-123' }) });
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
    });

    it('should return 404 for a non-existent key', async () => {
      vi.mocked(getServerSession).mockResolvedValue(DEVELOPER_SESSION);
      vi.mocked(requireDeveloper).mockImplementation(() => {});
      vi.mocked(getApiKeyById).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/developer/api-keys/nonexistent', {
        method: 'DELETE',
      });

      const response = await DELETE(req, { params: Promise.resolve({ keyId: 'nonexistent' }) });
      expect(response.status).toBe(404);
    });

    it("should return 403 when revoking another user's key", async () => {
      vi.mocked(getServerSession).mockResolvedValue(DEVELOPER_SESSION);
      vi.mocked(requireDeveloper).mockImplementation(() => {});
      vi.mocked(getApiKeyById).mockResolvedValue({ ...MOCK_API_KEY, userId: 'other-user-id' });

      const req = new NextRequest('http://localhost:3000/api/developer/api-keys/key-123', {
        method: 'DELETE',
      });

      const response = await DELETE(req, { params: Promise.resolve({ keyId: 'key-123' }) });
      expect(response.status).toBe(403);
    });

    it('should return 500 if revocation fails at the database level', async () => {
      vi.mocked(getServerSession).mockResolvedValue(DEVELOPER_SESSION);
      vi.mocked(requireDeveloper).mockImplementation(() => {});
      vi.mocked(getApiKeyById).mockResolvedValue(MOCK_API_KEY);
      vi.mocked(revokeApiKey).mockResolvedValue(false);

      const req = new NextRequest('http://localhost:3000/api/developer/api-keys/key-123', {
        method: 'DELETE',
      });

      const response = await DELETE(req, { params: Promise.resolve({ keyId: 'key-123' }) });
      expect(response.status).toBe(500);
    });
  });

  describe('PATCH /[keyId] (update metadata)', () => {
    it('should update key name for the owning developer', async () => {
      const updatedKey = { ...MOCK_API_KEY, name: 'Updated Key Name' };
      vi.mocked(getServerSession).mockResolvedValue(DEVELOPER_SESSION);
      vi.mocked(requireDeveloper).mockImplementation(() => {});
      vi.mocked(getApiKeyById)
        .mockResolvedValueOnce(MOCK_API_KEY)
        .mockResolvedValueOnce(updatedKey);
      vi.mocked(updateApiKey).mockResolvedValue(true);

      const req = new NextRequest('http://localhost:3000/api/developer/api-keys/key-123', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Key Name' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PATCH(req, { params: Promise.resolve({ keyId: 'key-123' }) });
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.apiKey.name).toBe('Updated Key Name');
    });

    it('should return 404 when key does not exist', async () => {
      vi.mocked(getServerSession).mockResolvedValue(DEVELOPER_SESSION);
      vi.mocked(requireDeveloper).mockImplementation(() => {});
      vi.mocked(getApiKeyById).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/developer/api-keys/nonexistent', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Test' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PATCH(req, { params: Promise.resolve({ keyId: 'nonexistent' }) });
      expect(response.status).toBe(404);
    });

    it("should return 403 when updating another user's key", async () => {
      vi.mocked(getServerSession).mockResolvedValue(DEVELOPER_SESSION);
      vi.mocked(requireDeveloper).mockImplementation(() => {});
      vi.mocked(getApiKeyById).mockResolvedValue({ ...MOCK_API_KEY, userId: 'other-user-id' });

      const req = new NextRequest('http://localhost:3000/api/developer/api-keys/key-123', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Test' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PATCH(req, { params: Promise.resolve({ keyId: 'key-123' }) });
      expect(response.status).toBe(403);
    });

    it('should return 400 for invalid request body (scopes must be array)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(DEVELOPER_SESSION);
      vi.mocked(requireDeveloper).mockImplementation(() => {});
      vi.mocked(getApiKeyById).mockResolvedValue(MOCK_API_KEY);

      const req = new NextRequest('http://localhost:3000/api/developer/api-keys/key-123', {
        method: 'PATCH',
        body: JSON.stringify({ scopes: 'not-an-array' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PATCH(req, { params: Promise.resolve({ keyId: 'key-123' }) });
      expect(response.status).toBe(400);
    });
  });
});
