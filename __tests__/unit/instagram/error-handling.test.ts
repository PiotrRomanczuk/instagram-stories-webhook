import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { publishMedia } from '@/lib/instagram/publish';
import axios from 'axios';

/**
 * Instagram API Error Handling Tests
 * Tests all error codes: 190 (token), 368 (rate limit), 100 (invalid param)
 * Priority: P0 (Critical) - Publishing reliability
 */

// Mock dependencies
vi.mock('axios');
vi.mock('@/lib/database/linked-accounts', () => ({
	getFacebookAccessToken: vi.fn().mockResolvedValue('fake_access_token'),
	getInstagramUserId: vi.fn().mockResolvedValue('fake_ig_user_id'),
}));
vi.mock('@/lib/instagram/container', () => ({
	waitForContainerReady: vi.fn().mockResolvedValue(true),
}));
vi.mock('@/lib/config/supabase-admin', () => ({
	supabaseAdmin: {
		from: vi.fn().mockReturnValue({
			insert: vi.fn().mockResolvedValue({ error: null }),
		}),
	},
}));

describe('Instagram API Error Handling', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	/**
	 * Error Code 190: Expired/Invalid Token
	 * Priority: P0 - Critical for auth flow
	 */
	describe('Error Code 190: Token Expired/Invalid', () => {
		it('should handle expired token error (code 190)', async () => {
			const errorResponse = {
				response: {
					status: 400,
					data: {
						error: {
							message: 'Invalid OAuth access token',
							type: 'OAuthException',
							code: 190,
							error_subcode: 463,
							fbtrace_id: 'test_trace_id',
						},
					},
				},
			};

			(axios.post as Mock).mockRejectedValue(errorResponse);
			(axios.isAxiosError as unknown as Mock).mockReturnValue(true);

			await expect(
				publishMedia(
					'https://example.com/image.jpg',
					'IMAGE',
					'STORY',
					undefined,
					'user_123',
				),
			).rejects.toThrow(/Invalid OAuth access token|token/i);
		});

		it('should handle token validation error (code 190, subcode 460)', async () => {
			const errorResponse = {
				response: {
					status: 400,
					data: {
						error: {
							message: 'Error validating access token',
							type: 'OAuthException',
							code: 190,
							error_subcode: 460,
						},
					},
				},
			};

			(axios.post as Mock).mockRejectedValue(errorResponse);
			(axios.isAxiosError as unknown as Mock).mockReturnValue(true);

			await expect(
				publishMedia(
					'https://example.com/image.jpg',
					'IMAGE',
					'STORY',
					undefined,
					'user_123',
				),
			).rejects.toThrow();
		});

		it('should handle password changed error (code 190, subcode 461)', async () => {
			const errorResponse = {
				response: {
					status: 400,
					data: {
						error: {
							message:
								'The session has been invalidated because the user changed their password',
							type: 'OAuthException',
							code: 190,
							error_subcode: 461,
						},
					},
				},
			};

			(axios.post as Mock).mockRejectedValue(errorResponse);
			(axios.isAxiosError as unknown as Mock).mockReturnValue(true);

			await expect(
				publishMedia(
					'https://example.com/image.jpg',
					'IMAGE',
					'STORY',
					undefined,
					'user_123',
				),
			).rejects.toThrow();
		});
	});

	/**
	 * Error Code 368: Rate Limit / Content Policy
	 * Priority: P0 - Critical for publishing flow
	 */
	describe('Error Code 368: Rate Limit / Content Policy', () => {
		it('should handle rate limit error (code 368)', async () => {
			const errorResponse = {
				response: {
					status: 400,
					data: {
						error: {
							message: 'Action blocked by Instagram',
							type: 'IGApiException',
							code: 368,
							fbtrace_id: 'test_trace_id',
						},
					},
				},
			};

			(axios.post as Mock).mockRejectedValue(errorResponse);
			(axios.isAxiosError as unknown as Mock).mockReturnValue(true);

			await expect(
				publishMedia(
					'https://example.com/image.jpg',
					'IMAGE',
					'STORY',
					undefined,
					'user_123',
				),
			).rejects.toThrow(/Action blocked by Instagram|rate limit/i);
		});

		it('should handle temporary block error (code 368)', async () => {
			const errorResponse = {
				response: {
					status: 400,
					data: {
						error: {
							message: 'Temporary block. Try again later',
							type: 'IGApiException',
							code: 368,
						},
					},
				},
			};

			(axios.post as Mock).mockRejectedValue(errorResponse);
			(axios.isAxiosError as unknown as Mock).mockReturnValue(true);

			await expect(
				publishMedia(
					'https://example.com/image.jpg',
					'IMAGE',
					'STORY',
					undefined,
					'user_123',
				),
			).rejects.toThrow();
		});
	});

	/**
	 * Error Code 100: Invalid Parameter
	 * Priority: P1 - High for validation
	 */
	describe('Error Code 100: Invalid Parameter', () => {
		it('should handle invalid parameter error (code 100)', async () => {
			const errorResponse = {
				response: {
					status: 400,
					data: {
						error: {
							message: 'Invalid parameter',
							type: 'OAuthException',
							code: 100,
							error_subcode: 33,
							fbtrace_id: 'test_trace_id',
						},
					},
				},
			};

			(axios.post as Mock).mockRejectedValue(errorResponse);
			(axios.isAxiosError as unknown as Mock).mockReturnValue(true);

			await expect(
				publishMedia('invalid-url', 'IMAGE', 'STORY', undefined, 'user_123'),
			).rejects.toThrow();
		});

		it('should handle missing required parameter (code 100)', async () => {
			const errorResponse = {
				response: {
					status: 400,
					data: {
						error: {
							message: '(#100) Missing required parameter: image_url',
							type: 'OAuthException',
							code: 100,
						},
					},
				},
			};

			(axios.post as Mock).mockRejectedValue(errorResponse);
			(axios.isAxiosError as unknown as Mock).mockReturnValue(true);

			await expect(
				publishMedia('', 'IMAGE', 'STORY', undefined, 'user_123'),
			).rejects.toThrow();
		});
	});

	/**
	 * Network Errors
	 * Priority: P1 - High for reliability
	 */
	describe('Network Errors', () => {
		it('should handle network timeout', async () => {
			const errorResponse = {
				code: 'ECONNABORTED',
				message: 'timeout of 10000ms exceeded',
			};

			(axios.post as Mock).mockRejectedValue(errorResponse);
			(axios.isAxiosError as unknown as Mock).mockReturnValue(true);

			await expect(
				publishMedia(
					'https://example.com/image.jpg',
					'IMAGE',
					'STORY',
					undefined,
					'user_123',
				),
			).rejects.toThrow();
		});

		it('should handle DNS resolution failure', async () => {
			const errorResponse = {
				code: 'ENOTFOUND',
				message: 'getaddrinfo ENOTFOUND graph.instagram.com',
			};

			(axios.post as Mock).mockRejectedValue(errorResponse);
			(axios.isAxiosError as unknown as Mock).mockReturnValue(true);

			await expect(
				publishMedia(
					'https://example.com/image.jpg',
					'IMAGE',
					'STORY',
					undefined,
					'user_123',
				),
			).rejects.toThrow();
		});

		it('should handle connection refused', async () => {
			const errorResponse = {
				code: 'ECONNREFUSED',
				message: 'connect ECONNREFUSED 127.0.0.1:443',
			};

			(axios.post as Mock).mockRejectedValue(errorResponse);
			(axios.isAxiosError as unknown as Mock).mockReturnValue(true);

			await expect(
				publishMedia(
					'https://example.com/image.jpg',
					'IMAGE',
					'STORY',
					undefined,
					'user_123',
				),
			).rejects.toThrow();
		});
	});

	/**
	 * HTTP Status Codes
	 * Priority: P1 - High for error handling
	 */
	describe('HTTP Status Codes', () => {
		it('should handle 500 Internal Server Error', async () => {
			const errorResponse = {
				response: {
					status: 500,
					data: {
						error: {
							message: 'Internal Server Error',
							type: 'IGApiException',
							code: 2,
						},
					},
				},
			};

			(axios.post as Mock).mockRejectedValue(errorResponse);
			(axios.isAxiosError as unknown as Mock).mockReturnValue(true);

			await expect(
				publishMedia(
					'https://example.com/image.jpg',
					'IMAGE',
					'STORY',
					undefined,
					'user_123',
				),
			).rejects.toThrow();
		});

		it('should handle 503 Service Unavailable', async () => {
			const errorResponse = {
				response: {
					status: 503,
					data: {
						error: {
							message: 'Service temporarily unavailable',
							type: 'IGApiException',
						},
					},
				},
			};

			(axios.post as Mock).mockRejectedValue(errorResponse);
			(axios.isAxiosError as unknown as Mock).mockReturnValue(true);

			await expect(
				publishMedia(
					'https://example.com/image.jpg',
					'IMAGE',
					'STORY',
					undefined,
					'user_123',
				),
			).rejects.toThrow();
		});

		it('should handle 429 Too Many Requests', async () => {
			const errorResponse = {
				response: {
					status: 429,
					data: {
						error: {
							message: 'Application request limit reached',
							type: 'OAuthException',
							code: 4,
						},
					},
				},
			};

			(axios.post as Mock).mockRejectedValue(errorResponse);
			(axios.isAxiosError as unknown as Mock).mockReturnValue(true);

			await expect(
				publishMedia(
					'https://example.com/image.jpg',
					'IMAGE',
					'STORY',
					undefined,
					'user_123',
				),
			).rejects.toThrow();
		});
	});

	/**
	 * Edge Cases
	 * Priority: P2 - Medium for robustness
	 */
	describe('Edge Cases', () => {
		it('should handle malformed error response', async () => {
			const errorResponse = {
				response: {
					status: 400,
					data: 'Invalid JSON response',
				},
			};

			(axios.post as Mock).mockRejectedValue(errorResponse);
			(axios.isAxiosError as unknown as Mock).mockReturnValue(true);

			await expect(
				publishMedia(
					'https://example.com/image.jpg',
					'IMAGE',
					'STORY',
					undefined,
					'user_123',
				),
			).rejects.toThrow();
		});

		it('should handle empty error response', async () => {
			const errorResponse = {
				response: {
					status: 400,
					data: {},
				},
			};

			(axios.post as Mock).mockRejectedValue(errorResponse);
			(axios.isAxiosError as unknown as Mock).mockReturnValue(true);

			await expect(
				publishMedia(
					'https://example.com/image.jpg',
					'IMAGE',
					'STORY',
					undefined,
					'user_123',
				),
			).rejects.toThrow();
		});

		it('should handle unknown error code', async () => {
			const errorResponse = {
				response: {
					status: 400,
					data: {
						error: {
							message: 'Unknown error occurred',
							type: 'IGApiException',
							code: 9999,
						},
					},
				},
			};

			(axios.post as Mock).mockRejectedValue(errorResponse);
			(axios.isAxiosError as unknown as Mock).mockReturnValue(true);

			await expect(
				publishMedia(
					'https://example.com/image.jpg',
					'IMAGE',
					'STORY',
					undefined,
					'user_123',
				),
			).rejects.toThrow();
		});
	});
});
