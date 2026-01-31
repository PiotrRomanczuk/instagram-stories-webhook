import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InsightsDashboardNew } from '@/app/components/insights/insights-dashboard-new';

const mockPublishedPosts = [
	{
		id: '1',
		url: 'https://example.com/image1.jpg',
		type: 'IMAGE',
		caption: 'Test post 1',
		postType: 'STORY',
		status: 'published',
		publishedAt: Date.now() - 86400000,
		igMediaId: 'ig_123',
	},
	{
		id: '2',
		url: 'https://example.com/image2.jpg',
		type: 'IMAGE',
		caption: 'Test post 2',
		postType: 'STORY',
		status: 'published',
		publishedAt: Date.now() - 172800000,
		igMediaId: null,
	},
];

describe('InsightsDashboardNew', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		global.fetch = vi.fn();
	});

	it('should show loading state initially', () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
			() => new Promise(() => {})
		);

		render(<InsightsDashboardNew />);

		expect(document.querySelector('.animate-spin')).toBeInTheDocument();
	});

	it('should display empty state when no published posts', async () => {
		(global.fetch as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({}),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ posts: [] }),
			});

		render(<InsightsDashboardNew />);

		await waitFor(() => {
			expect(screen.getByText('No published content yet')).toBeInTheDocument();
		});
	});

	it('should display published posts', async () => {
		(global.fetch as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({}),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ posts: mockPublishedPosts }),
			});

		render(<InsightsDashboardNew />);

		await waitFor(() => {
			expect(screen.getByText('Test post 1')).toBeInTheDocument();
			expect(screen.getByText('Test post 2')).toBeInTheDocument();
		});
	});

	it('should show View Insights badge for each post', async () => {
		(global.fetch as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({}),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ posts: mockPublishedPosts }),
			});

		render(<InsightsDashboardNew />);

		await waitFor(() => {
			const viewInsightsBadges = screen.getAllByText('View Insights');
			expect(viewInsightsBadges.length).toBe(2);
		});
	});

	it('should show unavailable badge for posts without igMediaId', async () => {
		(global.fetch as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({}),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ posts: mockPublishedPosts }),
			});

		render(<InsightsDashboardNew />);

		await waitFor(() => {
			expect(
				screen.getByText('No ID - Insights Unavailable')
			).toBeInTheDocument();
		});
	});

	it('should have refresh button', async () => {
		(global.fetch as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({}),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ posts: [] }),
			});

		render(<InsightsDashboardNew />);

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
		});
	});

	it('should open insights dialog when post is clicked', async () => {
		const user = userEvent.setup();
		(global.fetch as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({}),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ posts: mockPublishedPosts }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						insights: { impressions: 100, reach: 80 },
					}),
			});

		render(<InsightsDashboardNew />);

		await waitFor(() => {
			expect(screen.getByText('Test post 1')).toBeInTheDocument();
		});

		await user.click(screen.getByText('Test post 1'));

		await waitFor(() => {
			expect(screen.getByText('Post Insights')).toBeInTheDocument();
		});
	});
});
