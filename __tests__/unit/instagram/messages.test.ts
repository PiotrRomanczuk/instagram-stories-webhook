/**
 * Unit tests for Instagram messages module (BMS-152)
 * Tests conversation fetching, message sending, error handling with MSW.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../setup';
import {
	getConversations,
	getConversationMessages,
	sendMessage,
	sendImageMessage,
	markConversationAsRead,
} from '@/lib/instagram/messages';

vi.mock('@/lib/database/linked-accounts', () => ({
	getFacebookAccessToken: vi.fn(),
	getInstagramUserId: vi.fn(),
}));

vi.mock('@/lib/utils/logger', () => ({
	Logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// Simplify retry for tests - no delays, single attempt
vi.mock('@/lib/utils/retry', async () => {
	const actual = await vi.importActual('@/lib/utils/retry');
	return {
		...actual,
		withRetry: async <T>(fn: () => Promise<T>, options?: Record<string, unknown>) => {
			try {
				return await fn();
			} catch (error) {
				const retryableErrors = options?.retryableErrors as ((e: unknown) => boolean) | undefined;
				if (retryableErrors && !retryableErrors(error)) throw error;
				throw error;
			}
		},
	};
});

import { getFacebookAccessToken, getInstagramUserId } from '@/lib/database/linked-accounts';

const GRAPH_API_BASE = 'https://graph.facebook.com/v24.0';

describe('instagram/messages', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getFacebookAccessToken).mockResolvedValue('test-access-token');
		vi.mocked(getInstagramUserId).mockResolvedValue('17841400000');
	});

	describe('getConversations', () => {
		it('should fetch conversations for a user', async () => {
			server.use(
				http.get(`${GRAPH_API_BASE}/17841400000/conversations`, () => {
					return HttpResponse.json({
						data: [{ id: 'conv-1', updated_time: '2026-02-01T00:00:00Z', participants: { data: [{ id: 'ig-1', username: 'user1' }] } }],
					});
				}),
			);
			const result = await getConversations('user-1');
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('conv-1');
		});

		it('should throw when no access token', async () => {
			vi.mocked(getFacebookAccessToken).mockResolvedValue(null);
			await expect(getConversations('user-1')).rejects.toThrow('No active Facebook connection found');
		});

		it('should throw when no Instagram account', async () => {
			vi.mocked(getInstagramUserId).mockResolvedValue(null);
			await expect(getConversations('user-1')).rejects.toThrow('No Instagram Business Account found');
		});

		it('should throw on API error', async () => {
			server.use(
				http.get(`${GRAPH_API_BASE}/17841400000/conversations`, () => {
					return HttpResponse.json({ error: { message: 'Invalid token', code: 190 } }, { status: 400 });
				}),
			);
			await expect(getConversations('user-1')).rejects.toThrow();
		});
	});

	describe('getConversationMessages', () => {
		it('should fetch messages for a conversation', async () => {
			server.use(
				http.get(`${GRAPH_API_BASE}/conv-1`, () => {
					return HttpResponse.json({
						messages: { data: [{ id: 'msg-1', created_time: '2026-02-01T00:00:00Z', from: { id: 'ig-1', username: 'user1' }, to: { data: [] }, message: 'Hello!' }] },
					});
				}),
			);
			const result = await getConversationMessages('conv-1', 'user-1');
			expect(result).toHaveLength(1);
			expect(result[0].message).toBe('Hello!');
		});

		it('should throw when no access token', async () => {
			vi.mocked(getFacebookAccessToken).mockResolvedValue(null);
			await expect(getConversationMessages('conv-1', 'user-1')).rejects.toThrow('No active Facebook connection found');
		});

		it('should return empty array when no messages data', async () => {
			server.use(
				http.get(`${GRAPH_API_BASE}/conv-1`, () => {
					return HttpResponse.json({ messages: undefined });
				}),
			);
			const result = await getConversationMessages('conv-1', 'user-1');
			expect(result).toEqual([]);
		});
	});

	describe('sendMessage', () => {
		it('should send a text message successfully', async () => {
			server.use(
				http.post(`${GRAPH_API_BASE}/17841400000/messages`, () => {
					return HttpResponse.json({ recipient_id: 'ig-recipient', message_id: 'mid-123' });
				}),
			);
			const result = await sendMessage('ig-recipient', 'Hello!', 'user-1');
			expect(result.message_id).toBe('mid-123');
		});

		it('should throw when no access token', async () => {
			vi.mocked(getFacebookAccessToken).mockResolvedValue(null);
			await expect(sendMessage('ig-recipient', 'Hello', 'user-1')).rejects.toThrow('No active Facebook connection found');
		});

		it('should throw when no Instagram account', async () => {
			vi.mocked(getInstagramUserId).mockResolvedValue(null);
			await expect(sendMessage('ig-recipient', 'Hello', 'user-1')).rejects.toThrow('No Instagram Business Account found');
		});

		it('should throw when message exceeds 1000 characters', async () => {
			await expect(sendMessage('ig-recipient', 'x'.repeat(1001), 'user-1')).rejects.toThrow('Message text cannot exceed 1000 characters');
		});

		it('should handle permission denied error (code 10)', async () => {
			server.use(
				http.post(`${GRAPH_API_BASE}/17841400000/messages`, () => {
					return HttpResponse.json({ error: { message: 'Permission denied', code: 10 } }, { status: 400 });
				}),
			);
			await expect(sendMessage('ig-recipient', 'Hello', 'user-1')).rejects.toThrow('Permission denied');
		});

		it('should handle rate limit error (code 368)', async () => {
			server.use(
				http.post(`${GRAPH_API_BASE}/17841400000/messages`, () => {
					return HttpResponse.json({ error: { message: 'Rate limited', code: 368 } }, { status: 400 });
				}),
			);
			await expect(sendMessage('ig-recipient', 'Hello', 'user-1')).rejects.toThrow('rate limit exceeded');
		});

		it('should handle ineligible user error (code 551)', async () => {
			server.use(
				http.post(`${GRAPH_API_BASE}/17841400000/messages`, () => {
					return HttpResponse.json({ error: { message: 'Not eligible', code: 551 } }, { status: 400 });
				}),
			);
			await expect(sendMessage('ig-recipient', 'Hello', 'user-1')).rejects.toThrow('not eligible to receive messages');
		});
	});

	describe('sendImageMessage', () => {
		it('should send an image message successfully', async () => {
			server.use(
				http.post(`${GRAPH_API_BASE}/17841400000/messages`, () => {
					return HttpResponse.json({ recipient_id: 'ig-recipient', message_id: 'mid-456' });
				}),
			);
			const result = await sendImageMessage('ig-recipient', 'https://example.com/photo.jpg', 'user-1');
			expect(result.message_id).toBe('mid-456');
		});

		it('should throw when no access token', async () => {
			vi.mocked(getFacebookAccessToken).mockResolvedValue(null);
			await expect(sendImageMessage('ig-recipient', 'https://example.com/img.jpg', 'user-1')).rejects.toThrow('No active Facebook connection found');
		});
	});

	describe('markConversationAsRead', () => {
		it('should mark conversation as read successfully', async () => {
			server.use(
				http.post(`${GRAPH_API_BASE}/conv-1`, () => {
					return HttpResponse.json({ success: true });
				}),
			);
			const result = await markConversationAsRead('conv-1', 'user-1');
			expect(result).toBe(true);
		});

		it('should throw when no access token', async () => {
			vi.mocked(getFacebookAccessToken).mockResolvedValue(null);
			await expect(markConversationAsRead('conv-1', 'user-1')).rejects.toThrow('No active Facebook connection found');
		});

		it('should return false on API error', async () => {
			server.use(
				http.post(`${GRAPH_API_BASE}/conv-1`, () => {
					return HttpResponse.json({ error: { message: 'Not found' } }, { status: 404 });
				}),
			);
			const result = await markConversationAsRead('conv-1', 'user-1');
			expect(result).toBe(false);
		});
	});
});
