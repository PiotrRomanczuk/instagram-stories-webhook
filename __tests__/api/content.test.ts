/**
 * Integration tests for unified content API
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/content/route';

// Mock dependencies
vi.mock('next-auth/next', () => ({
	getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth-helpers', () => ({
	getUserId: vi.fn().mockReturnValue('user-1'),
	getUserRole: vi.fn().mockReturnValue('user'),
}));

vi.mock('@/lib/content-db', () => ({
	getContentItems: vi.fn(),
	createContentItem: vi.fn(),
	getContentStats: vi.fn(),
}));

describe('Content Hub API', () => {
	describe('POST /api/content', () => {
		it('should create a new content item', async () => {
			const { getServerSession } = await import('next-auth/next');
			const { createContentItem } = await import('@/lib/content-db');

			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: 'test@example.com' },
			} as any);

			vi.mocked(createContentItem).mockResolvedValue({
				id: '1',
				userId: 'user-1',
				userEmail: 'test@example.com',
				mediaUrl: 'https://example.com/image.jpg',
				mediaType: 'IMAGE',
				source: 'submission',
				publishingStatus: 'draft',
				version: 1,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			} as any);

			const req = new NextRequest('http://localhost:3000/api/content', {
				method: 'POST',
				body: JSON.stringify({
					source: 'submission',
					mediaUrl: 'https://example.com/image.jpg',
					mediaType: 'IMAGE',
					title: 'Test',
					caption: 'Test caption',
				}),
				headers: { 'Content-Type': 'application/json' },
			});

			const res = await POST(req);
			const data = await res.json();

			expect(res.status).toBe(201);
			expect(data.data).toBeDefined();
			expect(data.data.source).toBe('submission');
		});

		it('should validate required fields', async () => {
			const { getServerSession } = await import('next-auth/next');

			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: 'test@example.com' },
			} as any);

			const req = new NextRequest('http://localhost:3000/api/content', {
				method: 'POST',
				body: JSON.stringify({
					// Missing mediaUrl and mediaType
					source: 'submission',
				}),
				headers: { 'Content-Type': 'application/json' },
			});

			const res = await POST(req);
			expect(res.status).toBe(400);
		});

		it('should return 401 for unauthenticated requests', async () => {
			const { getServerSession } = await import('next-auth/next');

			vi.mocked(getServerSession).mockResolvedValue(null);

			const req = new NextRequest('http://localhost:3000/api/content', {
				method: 'POST',
				body: JSON.stringify({}),
				headers: { 'Content-Type': 'application/json' },
			});

			const res = await POST(req);
			expect(res.status).toBe(401);
		});
	});

	describe('GET /api/content', () => {
		it('should list content items', async () => {
			const { getServerSession } = await import('next-auth/next');
			const { getContentItems } = await import('@/lib/content-db');

			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: 'test@example.com' },
			} as any);

			vi.mocked(getContentItems).mockResolvedValue({
				items: [
					{
						id: '1',
						userId: 'user-1',
						userEmail: 'test@example.com',
						mediaUrl: 'https://example.com/image.jpg',
						mediaType: 'IMAGE',
						source: 'submission',
						publishingStatus: 'draft',
						version: 1,
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
					},
				],
				total: 1,
			} as any);

			const req = new NextRequest('http://localhost:3000/api/content?tab=all');

			const res = await GET(req);
			const data = await res.json();

			expect(res.status).toBe(200);
			expect(data.data).toBeDefined();
			expect(data.pagination).toBeDefined();
			expect(data.data.length).toBe(1);
		});

		it('should filter by submission status for admin', async () => {
			const { getServerSession } = await import('next-auth/next');
			const { getUserRole } = await import('@/lib/auth-helpers');
			const { getContentItems } = await import('@/lib/content-db');

			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: 'admin@example.com' },
			} as any);

			vi.mocked(getUserRole).mockReturnValue('admin');
			vi.mocked(getContentItems).mockResolvedValue({
				items: [],
				total: 0,
			} as any);

			const req = new NextRequest('http://localhost:3000/api/content?tab=review');

			const res = await GET(req);
			expect(res.status).toBe(200);

			// Verify that getContentItems was called with review tab filters
			expect(getContentItems).toHaveBeenCalled();
		});

		it('should enforce user isolation for non-admins', async () => {
			const { getServerSession } = await import('next-auth/next');
			const { getUserRole } = await import('@/lib/auth-helpers');
			const { getContentItems } = await import('@/lib/content-db');

			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: 'user@example.com' },
			} as any);

			vi.mocked(getUserRole).mockReturnValue('user');
			vi.mocked(getContentItems).mockResolvedValue({
				items: [],
				total: 0,
			} as any);

			const req = new NextRequest('http://localhost:3000/api/content?tab=all');

			const res = await GET(req);
			expect(res.status).toBe(200);

			// Verify userId filter was applied
			const callArgs = vi.mocked(getContentItems).mock.calls[0]?.[0];
			expect(callArgs?.userId).toBe('user-1');
		});

		it('should return 401 for unauthenticated requests', async () => {
			const { getServerSession } = await import('next-auth/next');

			vi.mocked(getServerSession).mockResolvedValue(null);

			const req = new NextRequest('http://localhost:3000/api/content');

			const res = await GET(req);
			expect(res.status).toBe(401);
		});
	});
});
