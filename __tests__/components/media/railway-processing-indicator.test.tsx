/**
 * Component tests for RailwayProcessingIndicator (INS-58)
 * Tests real-time processing status display and polling behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { RailwayProcessingIndicator } from '@/app/components/media/RailwayProcessingIndicator';

describe('RailwayProcessingIndicator', () => {
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		fetchSpy = vi.spyOn(global, 'fetch');
	});

	afterEach(() => {
		vi.useRealTimers();
		fetchSpy.mockRestore();
	});

	it('should show loading state initially', async () => {
		fetchSpy.mockResolvedValue({
			ok: true,
			json: async () => ({
				id: 'test-id',
				status: 'pending',
				storyReady: false,
			}),
		} as Response);

		render(<RailwayProcessingIndicator contentId="test-id" />);

		expect(screen.getByText('Loading status...')).toBeInTheDocument();

		// Wait for initial fetch
		await waitFor(() => {
			expect(fetch).toHaveBeenCalledWith('/api/media/processing-status/test-id');
		});
	});

	it('should display pending status', async () => {
		fetchSpy.mockResolvedValue({
			ok: true,
			json: async () => ({
				id: 'test-id',
				status: 'pending',
				storyReady: false,
			}),
		} as Response);

		render(<RailwayProcessingIndicator contentId="test-id" />);

		await waitFor(() => {
			expect(screen.getByText('Waiting to process...')).toBeInTheDocument();
		});
	});

	it('should display processing status with Railway backend', async () => {
		fetchSpy.mockResolvedValue({
			ok: true,
			json: async () => ({
				id: 'test-id',
				status: 'processing',
				backend: 'railway',
				elapsedMs: 5000,
				storyReady: false,
			}),
		} as Response);

		render(<RailwayProcessingIndicator contentId="test-id" />);

		await waitFor(() => {
			expect(screen.getByText('Processing with railway...')).toBeInTheDocument();
		});

		// Verify elapsed time is shown
		await waitFor(() => {
			expect(screen.getByText('0:05')).toBeInTheDocument(); // 5 seconds = 0:05
		});
	});

	it('should display completed status with transformations', async () => {
		fetchSpy.mockResolvedValue({
			ok: true,
			json: async () => ({
				id: 'test-id',
				status: 'completed',
				backend: 'railway',
				elapsedMs: 12000,
				processingApplied: ['h264-encoding', 'resize', 'thumbnail-extraction'],
				storyReady: true,
			}),
		} as Response);

		render(<RailwayProcessingIndicator contentId="test-id" />);

		await waitFor(() => {
			expect(screen.getByText('Processing complete')).toBeInTheDocument();
		});

		// Verify transformations are shown
		await waitFor(() => {
			expect(screen.getByText(/h264-encoding, resize, thumbnail-extraction/)).toBeInTheDocument();
		});

		// Verify "Ready for Instagram Stories" badge is shown
		await waitFor(() => {
			expect(screen.getByText('Ready for Instagram Stories')).toBeInTheDocument();
		});
	});

	it('should display failed status with error message', async () => {
		fetchSpy.mockResolvedValue({
			ok: true,
			json: async () => ({
				id: 'test-id',
				status: 'failed',
				error: 'Railway API timeout',
				storyReady: false,
			}),
		} as Response);

		render(<RailwayProcessingIndicator contentId="test-id" />);

		await waitFor(() => {
			expect(screen.getByText('Processing failed')).toBeInTheDocument();
		});

		await waitFor(() => {
			expect(screen.getByText(/Railway API timeout/)).toBeInTheDocument();
		});
	});

	it('should poll every 2 seconds when processing', async () => {
		let callCount = 0;
		fetchSpy.mockImplementation(async () => {
			callCount++;
			return {
				ok: true,
				json: async () => ({
					id: 'test-id',
					status: 'processing',
					backend: 'railway',
					elapsedMs: callCount * 2000,
					storyReady: false,
				}),
			} as Response;
		});

		render(
			<RailwayProcessingIndicator
				contentId="test-id"
				initialStatus="processing"
				pollInterval={2000}
			/>
		);

		// Initial fetch
		await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

		// Advance time by 2 seconds
		await act(async () => {
			vi.advanceTimersByTime(2000);
		});

		// Should have polled again
		await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

		// Advance time by another 2 seconds
		await act(async () => {
			vi.advanceTimersByTime(2000);
		});

		// Should have polled again
		await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
	});

	it('should stop polling when status becomes completed', async () => {
		let callCount = 0;
		fetchSpy.mockImplementation(async () => {
			callCount++;
			const status = callCount < 3 ? 'processing' : 'completed';
			return {
				ok: true,
				json: async () => ({
					id: 'test-id',
					status,
					storyReady: status === 'completed',
				}),
			} as Response;
		});

		render(
			<RailwayProcessingIndicator
				contentId="test-id"
				initialStatus="processing"
				pollInterval={2000}
			/>
		);

		// Initial fetch
		await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

		// Advance time by 2 seconds - should poll
		await act(async () => {
			vi.advanceTimersByTime(2000);
		});
		await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

		// Advance time by 2 seconds - should poll and get 'completed'
		await act(async () => {
			vi.advanceTimersByTime(2000);
		});
		await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));

		// Advance time by more intervals - should NOT poll anymore
		await act(async () => {
			vi.advanceTimersByTime(6000);
		});

		// Should still be 3 calls (no more polling)
		expect(fetch).toHaveBeenCalledTimes(3);
	});

	it('should call onComplete callback when processing finishes', async () => {
		const onComplete = vi.fn();

		fetchSpy.mockResolvedValue({
			ok: true,
			json: async () => ({
				id: 'test-id',
				status: 'completed',
				storyReady: true,
			}),
		} as Response);

		render(
			<RailwayProcessingIndicator
				contentId="test-id"
				onComplete={onComplete}
			/>
		);

		await waitFor(() => {
			expect(onComplete).toHaveBeenCalledWith('completed');
		});
	});

	it('should call onComplete with failed status', async () => {
		const onComplete = vi.fn();

		fetchSpy.mockResolvedValue({
			ok: true,
			json: async () => ({
				id: 'test-id',
				status: 'failed',
				error: 'Processing failed',
				storyReady: false,
			}),
		} as Response);

		render(
			<RailwayProcessingIndicator
				contentId="test-id"
				onComplete={onComplete}
			/>
		);

		await waitFor(() => {
			expect(onComplete).toHaveBeenCalledWith('failed');
		});
	});

	it('should format elapsed time correctly', async () => {
		const testCases = [
			{ elapsedMs: 5000, expected: '0:05' }, // 5 seconds
			{ elapsedMs: 65000, expected: '1:05' }, // 1 minute 5 seconds
			{ elapsedMs: 125000, expected: '2:05' }, // 2 minutes 5 seconds
			{ elapsedMs: 600000, expected: '10:00' }, // 10 minutes
		];

		for (const { elapsedMs, expected } of testCases) {
			vi.clearAllMocks();

			fetchSpy.mockResolvedValue({
				ok: true,
				json: async () => ({
					id: 'test-id',
					status: 'processing',
					elapsedMs,
					storyReady: false,
				}),
			} as Response);

			const { unmount } = render(<RailwayProcessingIndicator contentId="test-id" />);

			await waitFor(() => {
				expect(screen.getByText(expected)).toBeInTheDocument();
			});

			unmount();
		}
	});

	it('should handle fetch errors gracefully', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

		fetchSpy.mockRejectedValue(new Error('Network error'));

		render(<RailwayProcessingIndicator contentId="test-id" />);

		await waitFor(() => {
			expect(consoleError).toHaveBeenCalledWith(
				'Error fetching processing status:',
				expect.any(Error)
			);
		});

		consoleError.mockRestore();
	});

	it('should use custom poll interval', async () => {
		let callCount = 0;
		fetchSpy.mockImplementation(async () => {
			callCount++;
			return {
				ok: true,
				json: async () => ({
					id: 'test-id',
					status: 'processing',
					storyReady: false,
				}),
			} as Response;
		});

		const customInterval = 5000; // 5 seconds

		render(
			<RailwayProcessingIndicator
				contentId="test-id"
				initialStatus="processing"
				pollInterval={customInterval}
			/>
		);

		// Initial fetch
		await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

		// Advance time by custom interval
		await act(async () => {
			vi.advanceTimersByTime(customInterval);
		});

		// Should have polled again
		await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
	});
});
