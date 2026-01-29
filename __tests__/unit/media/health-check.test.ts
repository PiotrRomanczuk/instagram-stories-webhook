import {
	describe,
	it,
	expect,
	vi,
	beforeEach,
	afterAll,
	beforeAll,
} from 'vitest';
import {
	checkMediaHealth,
	batchCheckMediaHealth,
} from '@/lib/media/health-check';

describe('Media Health Check', () => {
	beforeAll(() => {
		// Properly stub the global fetch
		vi.stubGlobal('fetch', vi.fn());
	});

	afterAll(() => {
		vi.unstubAllGlobals();
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('checkMediaHealth', () => {
		it('should return healthy for accessible URL', async () => {
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				status: 200,
			});

			const result = await checkMediaHealth('https://example.com/image.jpg');

			expect(result.healthy).toBe(true);
			expect(result.statusCode).toBe(200);
			expect(result.checkedAt).toBeGreaterThan(0);
		});

		it('should return unhealthy for 404 response', async () => {
			(global.fetch as any).mockResolvedValueOnce({
				ok: false,
				status: 404,
			});

			const result = await checkMediaHealth('https://example.com/missing.jpg');

			expect(result.healthy).toBe(false);
			expect(result.statusCode).toBe(404);
		});

		it('should handle network errors', async () => {
			(global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

			const result = await checkMediaHealth('https://example.com/error.jpg');

			expect(result.healthy).toBe(false);
			expect(result.error).toBe('Network error');
		});

		it('should timeout after 5 seconds', async () => {
			(global.fetch as any).mockImplementationOnce(
				(url: string, options: any) =>
					new Promise((resolve, reject) => {
						const timeoutId = setTimeout(() => {
							resolve({ ok: true, status: 200 });
						}, 10000);

						if (options?.signal) {
							options.signal.addEventListener('abort', () => {
								clearTimeout(timeoutId);
								reject(new Error('The operation was aborted'));
							});
						}
					}),
			);

			const result = await checkMediaHealth(
				'https://slow.example.com/image.jpg',
			);

			expect(result.healthy).toBe(false);
			expect(result.error).toBeDefined();
		}, 10000);
	});

	describe('batchCheckMediaHealth', () => {
		it('should check multiple URLs in parallel', async () => {
			(global.fetch as any)
				.mockResolvedValueOnce({ ok: true, status: 200 })
				.mockResolvedValueOnce({ ok: false, status: 404 })
				.mockResolvedValueOnce({ ok: true, status: 200 });

			const urls = [
				'https://example.com/1.jpg',
				'https://example.com/2.jpg',
				'https://example.com/3.jpg',
			];

			const results = await batchCheckMediaHealth(urls);

			expect(results.size).toBe(3);
			expect(results.get(urls[0])?.healthy).toBe(true);
			expect(results.get(urls[1])?.healthy).toBe(false);
			expect(results.get(urls[2])?.healthy).toBe(true);
		});

		it('should handle empty array', async () => {
			const results = await batchCheckMediaHealth([]);

			expect(results.size).toBe(0);
		});
	});
});
