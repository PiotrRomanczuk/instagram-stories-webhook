/**
 * Integration tests for POST /api/content/[id]/review
 * Covers the admin approve/reject step of the happy path:
 *   user submits → admin approves → admin schedules → publish
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/content/[id]/review/route';

vi.mock('next-auth/next', () => ({
	getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ authOptions: {} }));

vi.mock('@/lib/auth-helpers', () => ({
	getUserId: vi.fn().mockReturnValue('admin-1'),
	getUserRole: vi.fn().mockReturnValue('admin'),
}));

vi.mock('@/lib/content-db', () => ({
	getContentItemById: vi.fn(),
	updateSubmissionStatus: vi.fn(),
}));

vi.mock('@/lib/middleware/rate-limit', () => ({
	rateLimiter: vi.fn().mockReturnValue({ isRateLimited: false }),
}));

vi.mock('@/lib/utils/logger', () => ({
	Logger: { info: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('@/lib/utils/audit-log', () => ({
	recordAuditEvent: vi.fn().mockResolvedValue(undefined),
	getRequestContext: vi
		.fn()
		.mockReturnValue({ ipAddress: '127.0.0.1', userAgent: 'test' }),
}));

const buildPendingSubmission = (id = 'sub-1') => ({
	id,
	userId: 'user-1',
	userEmail: 'submitter@example.com',
	mediaUrl: 'https://example.com/i.jpg',
	mediaType: 'IMAGE',
	source: 'submission',
	submissionStatus: 'pending',
	publishingStatus: 'draft',
	version: 1,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
});

const buildRequest = (id: string, body: unknown) =>
	new NextRequest(`http://localhost/api/content/${id}/review`, {
		method: 'POST',
		body: JSON.stringify(body),
		headers: { 'Content-Type': 'application/json' },
	});

const callRoute = (id: string, body: unknown) =>
	POST(buildRequest(id, body), { params: Promise.resolve({ id }) });

describe('POST /api/content/[id]/review', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('approves a pending submission as admin and records audit event', async () => {
		const { getServerSession } = await import('next-auth/next');
		const { getContentItemById, updateSubmissionStatus } = await import(
			'@/lib/content-db'
		);
		const { recordAuditEvent } = await import('@/lib/utils/audit-log');

		vi.mocked(getServerSession).mockResolvedValue({
			user: { email: 'admin@example.com' },
		} as never);
		vi.mocked(getContentItemById).mockResolvedValue(
			buildPendingSubmission() as never,
		);
		vi.mocked(updateSubmissionStatus).mockResolvedValue({
			...buildPendingSubmission(),
			submissionStatus: 'approved',
			reviewedBy: 'admin-1',
			reviewedAt: new Date().toISOString(),
		} as never);

		const res = await callRoute('sub-1', { action: 'approve' });
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json.data.submissionStatus).toBe('approved');
		expect(updateSubmissionStatus).toHaveBeenCalledWith(
			'sub-1',
			'approved',
			undefined,
			'admin-1',
		);
		expect(recordAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				action: 'content.approve',
				targetType: 'content_item',
				targetId: 'sub-1',
				newValue: expect.objectContaining({ submissionStatus: 'approved' }),
			}),
		);
	});

	it('returns 403 when caller is not admin/developer/demo', async () => {
		const { getServerSession } = await import('next-auth/next');
		const { getUserRole } = await import('@/lib/auth-helpers');

		vi.mocked(getServerSession).mockResolvedValue({
			user: { email: 'user@example.com' },
		} as never);
		vi.mocked(getUserRole).mockReturnValue('user');

		const res = await callRoute('sub-1', { action: 'approve' });
		expect(res.status).toBe(403);
	});

	it('returns 401 when unauthenticated', async () => {
		const { getServerSession } = await import('next-auth/next');
		vi.mocked(getServerSession).mockResolvedValue(null);

		const res = await callRoute('sub-1', { action: 'approve' });
		expect(res.status).toBe(401);
	});

	it('returns 404 when the content item is missing', async () => {
		const { getServerSession } = await import('next-auth/next');
		const { getUserRole } = await import('@/lib/auth-helpers');
		const { getContentItemById } = await import('@/lib/content-db');

		vi.mocked(getServerSession).mockResolvedValue({
			user: { email: 'admin@example.com' },
		} as never);
		vi.mocked(getUserRole).mockReturnValue('admin');
		vi.mocked(getContentItemById).mockResolvedValue(null);

		const res = await callRoute('missing', { action: 'approve' });
		expect(res.status).toBe(404);
	});

	it('returns 400 when action is not approve or reject', async () => {
		const { getServerSession } = await import('next-auth/next');
		const { getUserRole } = await import('@/lib/auth-helpers');
		const { getContentItemById } = await import('@/lib/content-db');

		vi.mocked(getServerSession).mockResolvedValue({
			user: { email: 'admin@example.com' },
		} as never);
		vi.mocked(getUserRole).mockReturnValue('admin');
		vi.mocked(getContentItemById).mockResolvedValue(
			buildPendingSubmission() as never,
		);

		const res = await callRoute('sub-1', { action: 'maybe' });
		expect(res.status).toBe(400);
	});
});
