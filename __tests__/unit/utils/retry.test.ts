/**
 * Unit tests for retry utility (BMS-151)
 * Tests exponential backoff, max retries, retryable error filtering.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { withRetry } from '@/lib/utils/retry';

describe('withRetry', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('should return result on first successful attempt', async () => {
		const fn = vi.fn().mockResolvedValue('success');
		const result = await withRetry(fn);
		expect(result).toBe('success');
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('should retry on failure and succeed eventually', async () => {
		vi.useFakeTimers();
		const fn = vi
			.fn()
			.mockRejectedValueOnce(new Error('fail-1'))
			.mockRejectedValueOnce(new Error('fail-2'))
			.mockResolvedValue('success');

		const promise = withRetry(fn, {
			maxAttempts: 3,
			initialDelayMs: 100,
			backoffFactor: 2,
		});

		await vi.advanceTimersByTimeAsync(100);
		await vi.advanceTimersByTimeAsync(200);

		const result = await promise;
		expect(result).toBe('success');
		expect(fn).toHaveBeenCalledTimes(3);
	});

	it('should throw last error after exhausting all attempts', async () => {
		vi.useFakeTimers();
		const fn = vi
			.fn()
			.mockRejectedValueOnce(new Error('fail-1'))
			.mockRejectedValueOnce(new Error('fail-2'))
			.mockRejectedValueOnce(new Error('fail-3'));

		const promise = withRetry(fn, {
			maxAttempts: 3,
			initialDelayMs: 100,
			backoffFactor: 2,
		});

		const resultPromise = promise.catch((e: Error) => e);

		await vi.advanceTimersByTimeAsync(100);
		await vi.advanceTimersByTimeAsync(200);

		const error = await resultPromise;
		expect(error).toBeInstanceOf(Error);
		expect((error as Error).message).toBe('fail-3');
		expect(fn).toHaveBeenCalledTimes(3);
	});

	it('should apply exponential backoff delays', async () => {
		vi.useFakeTimers();
		const fn = vi
			.fn()
			.mockRejectedValueOnce(new Error('fail-1'))
			.mockRejectedValueOnce(new Error('fail-2'))
			.mockRejectedValueOnce(new Error('fail-3'))
			.mockResolvedValue('success');

		const promise = withRetry(fn, {
			maxAttempts: 4,
			initialDelayMs: 100,
			backoffFactor: 3,
		});

		expect(fn).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(100);
		expect(fn).toHaveBeenCalledTimes(2);

		await vi.advanceTimersByTimeAsync(300);
		expect(fn).toHaveBeenCalledTimes(3);

		await vi.advanceTimersByTimeAsync(900);
		expect(fn).toHaveBeenCalledTimes(4);

		const result = await promise;
		expect(result).toBe('success');
	});

	it('should use default options when none provided', async () => {
		vi.useFakeTimers();
		const fn = vi
			.fn()
			.mockRejectedValueOnce(new Error('fail'))
			.mockResolvedValue('ok');

		const promise = withRetry(fn);
		await vi.advanceTimersByTimeAsync(1000);

		const result = await promise;
		expect(result).toBe('ok');
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it('should immediately throw non-retryable errors', async () => {
		const fn = vi.fn().mockRejectedValue(new Error('auth-failed'));

		const retryableErrors = (error: unknown) => {
			return error instanceof Error && error.message !== 'auth-failed';
		};

		await expect(
			withRetry(fn, {
				maxAttempts: 3,
				initialDelayMs: 100,
				backoffFactor: 2,
				retryableErrors,
			}),
		).rejects.toThrow('auth-failed');

		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('should retry retryable errors according to filter', async () => {
		vi.useFakeTimers();
		const fn = vi
			.fn()
			.mockRejectedValueOnce(new Error('timeout'))
			.mockResolvedValue('success');

		const retryableErrors = (error: unknown) => {
			return error instanceof Error && error.message === 'timeout';
		};

		const promise = withRetry(fn, {
			maxAttempts: 3,
			initialDelayMs: 50,
			backoffFactor: 1,
			retryableErrors,
		});

		await vi.advanceTimersByTimeAsync(50);

		const result = await promise;
		expect(result).toBe('success');
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it('should work with maxAttempts of 1 (no retries)', async () => {
		const fn = vi.fn().mockRejectedValue(new Error('fail'));

		await expect(
			withRetry(fn, { maxAttempts: 1, initialDelayMs: 100, backoffFactor: 2 }),
		).rejects.toThrow('fail');

		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('should log warnings for failed attempts', async () => {
		vi.useFakeTimers();
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const fn = vi
			.fn()
			.mockRejectedValueOnce(new Error('transient'))
			.mockResolvedValue('ok');

		const promise = withRetry(fn, {
			maxAttempts: 2,
			initialDelayMs: 50,
			backoffFactor: 1,
		});

		await vi.advanceTimersByTimeAsync(50);
		await promise;

		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('Attempt 1 failed'),
			'transient',
		);

		warnSpy.mockRestore();
	});
});
