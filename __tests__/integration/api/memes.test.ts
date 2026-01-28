import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as GET_LIST, POST as POST_SUBMIT } from '@/app/api/memes/route';
import {
	GET as GET_SINGLE,
	PATCH as PATCH_REVIEW,
	DELETE as DELETE_MEME,
} from '@/app/api/memes/[id]/route';
import { PATCH as PATCH_EDIT } from '@/app/api/memes/[id]/edit/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import {
	getMemeSubmissions,
	createMemeSubmission,
	getMemeSubmission,
	reviewMemeSubmission,
	deleteMemeSubmission,
} from '@/lib/memes-db';

// Mock DB and Auth
vi.mock('@/lib/memes-db');
vi.mock('next-auth/next');
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/media/server-validator', () => ({
	validateMediaUrl: vi.fn().mockResolvedValue({ valid: true }),
}));

import { Mock } from 'vitest';

const createRequest = (method: string, url: string, body?: unknown) => {
	return new NextRequest(new URL(url, 'http://localhost'), {
		method,
		body: body ? JSON.stringify(body) : undefined,
	});
};

describe('Memes API Routes', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('/api/memes (List/Submit)', () => {
		const userSession = {
			user: { id: 'u1', email: 'u1@test.com', role: 'user' },
		};
		const adminSession = {
			user: { id: 'a1', email: 'a1@test.com', role: 'admin' },
		};

		describe('GET', () => {
			it('should return 401 if not logged in', async () => {
				(getServerSession as Mock).mockResolvedValue(null);
				const req = createRequest('GET', '/api/memes');
				const res = await GET_LIST(req);
				expect(res.status).toBe(401);
			});

			it('should filter by own userId for regular users', async () => {
				(getServerSession as Mock).mockResolvedValue(userSession);
				(getMemeSubmissions as Mock).mockResolvedValue([]);

				const req = createRequest('GET', '/api/memes');
				await GET_LIST(req);

				expect(getMemeSubmissions).toHaveBeenCalledWith(
					expect.objectContaining({ userId: 'u1' }),
				);
			});

			it('should not filter by userId for admins', async () => {
				(getServerSession as Mock).mockResolvedValue(adminSession);
				(getMemeSubmissions as Mock).mockResolvedValue([]);

				const req = createRequest('GET', '/api/memes');
				await GET_LIST(req);

				expect(getMemeSubmissions).toHaveBeenCalledWith(
					expect.not.objectContaining({ userId: 'a1' }),
				);
			});
		});

		describe('POST', () => {
			it('should create a submission', async () => {
				(getServerSession as Mock).mockResolvedValue(userSession);
				(createMemeSubmission as Mock).mockResolvedValue({ id: 'm1' });

				const body = { mediaUrl: 'https://meme.com/1.jpg', title: 'Funny' };
				const req = createRequest('POST', '/api/memes', body);
				const res = await POST_SUBMIT(req);
				const data = await res.json();

				expect(res.status).toBe(200);
				expect(data.meme).toBeDefined();
				expect(data.meme.id).toBe('m1');
				expect(createMemeSubmission).toHaveBeenCalledWith(
					expect.objectContaining({
						user_id: 'u1',
						media_url: 'https://meme.com/1.jpg',
					}),
				);
			});

			it('should return 400 for invalid data', async () => {
				(getServerSession as Mock).mockResolvedValue(userSession);
				const req = createRequest('POST', '/api/memes', {
					media_url: 'invalid',
				});
				const res = await POST_SUBMIT(req);
				expect(res.status).toBe(400);
			});
		});
	});

	describe('/api/memes/[id] (Single/Review/Delete)', () => {
		const userSession = { user: { id: 'u1', role: 'user' } };
		const adminSession = { user: { id: 'a1', role: 'admin' } };
		const mockMeme = { id: 'm1', user_id: 'u1', status: 'pending' };

		describe('GET', () => {
			it('should return meme if owner', async () => {
				(getServerSession as Mock).mockResolvedValue(userSession);
				(getMemeSubmission as Mock).mockResolvedValue(mockMeme);

				const res = await GET_SINGLE(createRequest('GET', '/api/memes/m1'), {
					params: Promise.resolve({ id: 'm1' }),
				});
				expect(res.status).toBe(200);
			});

			it('should return 403 if not owner', async () => {
				(getServerSession as Mock).mockResolvedValue({
					user: { id: 'u2', role: 'user' },
				});
				(getMemeSubmission as Mock).mockResolvedValue(mockMeme);

				const res = await GET_SINGLE(createRequest('GET', '/api/memes/m1'), {
					params: Promise.resolve({ id: 'm1' }),
				});
				expect(res.status).toBe(403);
			});
		});

		describe('PATCH (Review)', () => {
			it('should allow admin to review', async () => {
				(getServerSession as Mock).mockResolvedValue(adminSession);
				(reviewMemeSubmission as Mock).mockResolvedValue({
					...mockMeme,
					status: 'approved',
				});

				const body = { action: 'approve' };
				const res = await PATCH_REVIEW(
					createRequest('PATCH', '/api/memes/m1', body),
					{ params: Promise.resolve({ id: 'm1' }) },
				);

				expect(res.status).toBe(200);
				expect(reviewMemeSubmission).toHaveBeenCalledWith(
					'm1',
					'a1',
					'approve',
					undefined,
				);
			});

			it('should block non-admin from review', async () => {
				(getServerSession as Mock).mockResolvedValue(userSession);
				const res = await PATCH_REVIEW(
					createRequest('PATCH', '/api/memes/m1', { action: 'approve' }),
					{ params: Promise.resolve({ id: 'm1' }) },
				);
				expect(res.status).toBe(403);
			});
		});

		describe('DELETE', () => {
			it('should allow owner to delete pending meme', async () => {
				(getServerSession as Mock).mockResolvedValue(userSession);
				(getMemeSubmission as Mock).mockResolvedValue(mockMeme);
				(deleteMemeSubmission as Mock).mockResolvedValue(true);

				const res = await DELETE_MEME(
					createRequest('DELETE', '/api/memes/m1'),
					{ params: Promise.resolve({ id: 'm1' }) },
				);
				expect(res.status).toBe(200);
			});

			it('should block owner from deleting approved meme', async () => {
				(getServerSession as Mock).mockResolvedValue(userSession);
				(getMemeSubmission as Mock).mockResolvedValue({
					...mockMeme,
					status: 'approved',
				});

				const res = await DELETE_MEME(
					createRequest('DELETE', '/api/memes/m1'),
					{ params: Promise.resolve({ id: 'm1' }) },
				);
				expect(res.status).toBe(403);
			});

			it('should allow admin to delete any meme', async () => {
				(getServerSession as Mock).mockResolvedValue(adminSession);
				(getMemeSubmission as Mock).mockResolvedValue({
					...mockMeme,
					status: 'approved',
				});
				(deleteMemeSubmission as Mock).mockResolvedValue(true);

				const res = await DELETE_MEME(
					createRequest('DELETE', '/api/memes/m1'),
					{ params: Promise.resolve({ id: 'm1' }) },
				);
				expect(res.status).toBe(200);
			});
		});
	});

	describe('/api/memes/[id]/edit (User Edit)', () => {
		const userSession = { user: { id: 'u1', role: 'user' } };
		const mockPendingMeme = {
			id: 'm1',
			user_id: 'u1',
			status: 'pending',
			title: 'Original',
			caption: 'Original caption',
		};

		describe('PATCH', () => {
			it('should return 401 if not authenticated', async () => {
				(getServerSession as Mock).mockResolvedValue(null);

				const body = { title: 'Updated Title' };
				const res = await PATCH_EDIT(
					createRequest('PATCH', '/api/memes/m1/edit', body),
					{ params: Promise.resolve({ id: 'm1' }) },
				);

				expect(res.status).toBe(401);
			});

			it('should return 403 if not owner', async () => {
				(getServerSession as Mock).mockResolvedValue({
					user: { id: 'u2', role: 'user' },
				});
				(getMemeSubmission as Mock).mockResolvedValue(mockPendingMeme);

				const body = { title: 'Updated Title' };
				const res = await PATCH_EDIT(
					createRequest('PATCH', '/api/memes/m1/edit', body),
					{ params: Promise.resolve({ id: 'm1' }) },
				);

				expect(res.status).toBe(403);
			});

			it('should return 404 if meme not found', async () => {
				(getServerSession as Mock).mockResolvedValue(userSession);
				(getMemeSubmission as Mock).mockResolvedValue(null);

				const body = { title: 'Updated Title' };
				const res = await PATCH_EDIT(
					createRequest('PATCH', '/api/memes/m1/edit', body),
					{ params: Promise.resolve({ id: 'm1' }) },
				);

				expect(res.status).toBe(404);
			});

			it('should return 400 if meme is not pending', async () => {
				(getServerSession as Mock).mockResolvedValue(userSession);
				(getMemeSubmission as Mock).mockResolvedValue({
					...mockPendingMeme,
					status: 'approved',
				});

				const body = { title: 'Updated Title' };
				const res = await PATCH_EDIT(
					createRequest('PATCH', '/api/memes/m1/edit', body),
					{ params: Promise.resolve({ id: 'm1' }) },
				);

				expect(res.status).toBe(400);
			});

			it('should return 400 if no fields provided', async () => {
				(getServerSession as Mock).mockResolvedValue(userSession);
				(getMemeSubmission as Mock).mockResolvedValue(mockPendingMeme);

				const body = {};
				const res = await PATCH_EDIT(
					createRequest('PATCH', '/api/memes/m1/edit', body),
					{ params: Promise.resolve({ id: 'm1' }) },
				);

				expect(res.status).toBe(400);
			});
		});
	});
});
