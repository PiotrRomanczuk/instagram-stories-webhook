/**
 * API tests for /api/media/processing-status/[id]
 * Tests Railway processing status polling endpoint (INS-58)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/media/processing-status/[id]/route';
import { NextResponse } from 'next/server';

// Mock dependencies
vi.mock('next-auth', () => ({
	getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
	authOptions: {},
}));

vi.mock('@/lib/config/supabase-admin', () => ({
	supabaseAdmin: {
		from: vi.fn(),
	},
}));

vi.mock('@/lib/utils/logger', () => ({
	Logger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	},
}));

import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';

describe('GET /api/media/processing-status/[id]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return 401 if user is not authenticated', async () => {
		vi.mocked(getServerSession).mockResolvedValue(null);

		const request = new Request('http://localhost/api/media/processing-status/test-id');
		const context = { params: Promise.resolve({ id: 'test-id' }) };

		const response = await GET(request, context);
		const data = await response.json();

		expect(response.status).toBe(401);
		expect(data.error).toBe('Unauthorized');
	});

	it('should return 400 if content ID is missing', async () => {
		vi.mocked(getServerSession).mockResolvedValue({
			user: { id: 'user-1', email: 'test@example.com' },
			expires: '2026-12-31',
		});

		const request = new Request('http://localhost/api/media/processing-status/');
		const context = { params: Promise.resolve({ id: '' }) };

		const response = await GET(request, context);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toBe('Content ID is required');
	});

	it('should return 404 if content item is not found', async () => {
		vi.mocked(getServerSession).mockResolvedValue({
			user: { id: 'user-1', email: 'test@example.com' },
			expires: '2026-12-31',
		});

		vi.mocked(supabaseAdmin.from).mockReturnValue({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: null,
						error: { message: 'Not found' },
					}),
				}),
			}),
		} as any);

		const request = new Request('http://localhost/api/media/processing-status/nonexistent');
		const context = { params: Promise.resolve({ id: 'nonexistent' }) };

		const response = await GET(request, context);
		const data = await response.json();

		expect(response.status).toBe(404);
		expect(data.error).toBe('Content item not found');
	});

	it('should return processing status for pending video', async () => {
		vi.mocked(getServerSession).mockResolvedValue({
			user: { id: 'user-1', email: 'test@example.com' },
			expires: '2026-12-31',
		});

		const mockItem = {
			id: 'video-1',
			processing_status: 'pending',
			processing_backend: null,
			processing_started_at: null,
			processing_completed_at: null,
			processing_error: null,
			processing_applied: [],
			story_ready: false,
		};

		vi.mocked(supabaseAdmin.from).mockReturnValue({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: mockItem,
						error: null,
					}),
				}),
			}),
		} as any);

		const request = new Request('http://localhost/api/media/processing-status/video-1');
		const context = { params: Promise.resolve({ id: 'video-1' }) };

		const response = await GET(request, context);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data).toMatchObject({
			id: 'video-1',
			status: 'pending',
			storyReady: false,
			processingApplied: [],
		});
	});

	it('should return processing status with elapsed time for processing video', async () => {
		vi.mocked(getServerSession).mockResolvedValue({
			user: { id: 'user-1', email: 'test@example.com' },
			expires: '2026-12-31',
		});

		const startTime = new Date(Date.now() - 5000); // 5 seconds ago
		const mockItem = {
			id: 'video-2',
			processing_status: 'processing',
			processing_backend: 'railway',
			processing_started_at: startTime.toISOString(),
			processing_completed_at: null,
			processing_error: null,
			processing_applied: ['h264-encoding'],
			story_ready: false,
		};

		vi.mocked(supabaseAdmin.from).mockReturnValue({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: mockItem,
						error: null,
					}),
				}),
			}),
		} as any);

		const request = new Request('http://localhost/api/media/processing-status/video-2');
		const context = { params: Promise.resolve({ id: 'video-2' }) };

		const response = await GET(request, context);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.status).toBe('processing');
		expect(data.backend).toBe('railway');
		expect(data.elapsedMs).toBeGreaterThan(4000); // At least 4 seconds
		expect(data.elapsedMs).toBeLessThan(10000); // Less than 10 seconds
		expect(data.processingApplied).toContain('h264-encoding');
	});

	it('should return completed status with story_ready=true', async () => {
		vi.mocked(getServerSession).mockResolvedValue({
			user: { id: 'user-1', email: 'test@example.com' },
			expires: '2026-12-31',
		});

		const startTime = new Date(Date.now() - 10000); // 10 seconds ago
		const endTime = new Date(Date.now() - 1000); // 1 second ago
		const mockItem = {
			id: 'video-3',
			processing_status: 'completed',
			processing_backend: 'railway',
			processing_started_at: startTime.toISOString(),
			processing_completed_at: endTime.toISOString(),
			processing_error: null,
			processing_applied: ['h264-encoding', 'resize', 'thumbnail-extraction'],
			story_ready: true,
		};

		vi.mocked(supabaseAdmin.from).mockReturnValue({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: mockItem,
						error: null,
					}),
				}),
			}),
		} as any);

		const request = new Request('http://localhost/api/media/processing-status/video-3');
		const context = { params: Promise.resolve({ id: 'video-3' }) };

		const response = await GET(request, context);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data).toMatchObject({
			id: 'video-3',
			status: 'completed',
			backend: 'railway',
			storyReady: true,
			processingApplied: ['h264-encoding', 'resize', 'thumbnail-extraction'],
		});
		expect(data.elapsedMs).toBeGreaterThan(8000); // ~9 seconds
		expect(data.elapsedMs).toBeLessThan(10000);
	});

	it('should return failed status with error message', async () => {
		vi.mocked(getServerSession).mockResolvedValue({
			user: { id: 'user-1', email: 'test@example.com' },
			expires: '2026-12-31',
		});

		const mockItem = {
			id: 'video-4',
			processing_status: 'failed',
			processing_backend: 'railway',
			processing_started_at: new Date(Date.now() - 5000).toISOString(),
			processing_completed_at: new Date().toISOString(),
			processing_error: 'Railway API timeout',
			processing_applied: [],
			story_ready: false,
		};

		vi.mocked(supabaseAdmin.from).mockReturnValue({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: mockItem,
						error: null,
					}),
				}),
			}),
		} as any);

		const request = new Request('http://localhost/api/media/processing-status/video-4');
		const context = { params: Promise.resolve({ id: 'video-4' }) };

		const response = await GET(request, context);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data).toMatchObject({
			id: 'video-4',
			status: 'failed',
			error: 'Railway API timeout',
			storyReady: false,
		});
	});

	it('should handle database errors gracefully', async () => {
		vi.mocked(getServerSession).mockResolvedValue({
			user: { id: 'user-1', email: 'test@example.com' },
			expires: '2026-12-31',
		});

		vi.mocked(supabaseAdmin.from).mockReturnValue({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					single: vi.fn().mockRejectedValue(new Error('Database connection failed')),
				}),
			}),
		} as any);

		const request = new Request('http://localhost/api/media/processing-status/video-5');
		const context = { params: Promise.resolve({ id: 'video-5' }) };

		const response = await GET(request, context);
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data.error).toBe('Database connection failed');
		expect(Logger.error).toHaveBeenCalledWith(
			'api/processing-status',
			'Error fetching processing status',
			expect.any(Error)
		);
	});
});
