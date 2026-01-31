import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuotaCardNew } from '@/app/components/insights/quota-card-new';

describe('QuotaCardNew', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		global.fetch = vi.fn();
	});

	it('should show loading state initially', () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
			() => new Promise(() => {})
		);

		render(<QuotaCardNew />);

		expect(document.querySelector('.animate-spin')).toBeInTheDocument();
	});

	it('should display quota data when loaded', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: () =>
				Promise.resolve({
					limit: {
						config: {
							quota_duration: 24,
							quota_total: 25,
						},
						quota_usage: 10,
					},
				}),
		});

		render(<QuotaCardNew />);

		await waitFor(() => {
			expect(screen.getByText('10')).toBeInTheDocument();
			expect(screen.getByText('/ 25')).toBeInTheDocument();
		});
	});

	it('should not render when error occurs', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: false,
			status: 500,
			json: () => Promise.resolve({ error: 'Server error' }),
		});

		const { container } = render(<QuotaCardNew />);

		// Wait for loading to complete
		await waitFor(() => {
			expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
		});

		// Component returns null on error, so container should be empty
		// But we need to wait a bit for it to finish
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(container.children.length).toBe(0);
	});

	it('should have refresh button', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: () =>
				Promise.resolve({
					limit: {
						config: { quota_total: 25 },
						quota_usage: 10,
					},
				}),
		});

		render(<QuotaCardNew />);

		await waitFor(() => {
			expect(screen.getByRole('button')).toBeInTheDocument();
		});
	});

	it('should refresh data when refresh button is clicked', async () => {
		const user = userEvent.setup();
		(global.fetch as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						limit: { config: { quota_total: 25 }, quota_usage: 10 },
					}),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						limit: { config: { quota_total: 25 }, quota_usage: 15 },
					}),
			});

		render(<QuotaCardNew />);

		await waitFor(() => {
			expect(screen.getByText('10')).toBeInTheDocument();
		});

		await user.click(screen.getByRole('button'));

		await waitFor(() => {
			expect(screen.getByText('15')).toBeInTheDocument();
		});
	});

	it('should display rolling window info', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: () =>
				Promise.resolve({
					limit: { config: { quota_total: 25 }, quota_usage: 10 },
				}),
		});

		render(<QuotaCardNew />);

		await waitFor(() => {
			expect(screen.getByText(/Rolling 24-hour window/i)).toBeInTheDocument();
		});
	});
});
