import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AnalyticsDashboard } from '@/app/components/analytics/analytics-dashboard';

const mockAnalyticsData = {
	totalSubmissions: 150,
	approvalRate: 85.5,
	rejectionRate: 14.5,
	scheduledCount: 25,
	publishedCount: 100,
	pendingCount: 20,
	topContributor: { email: 'top@example.com', count: 45 },
	recentActivity: [
		{
			action: 'Post published',
			timestamp: '2024-01-15T10:00:00Z',
			user: 'user@example.com',
		},
		{
			action: 'Submission approved',
			timestamp: '2024-01-14T09:00:00Z',
			user: 'admin@example.com',
		},
	],
};

describe('AnalyticsDashboard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		global.fetch = vi.fn();
	});

	it('should show loading state initially', () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
			() => new Promise(() => {})
		);

		render(<AnalyticsDashboard />);

		expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
	});

	it('should display analytics data when loaded', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(mockAnalyticsData),
		});

		render(<AnalyticsDashboard />);

		await waitFor(() => {
			// Check for total submissions - unique value
			expect(screen.getByText('150')).toBeInTheDocument();
			// Check for approval rate - unique value
			expect(screen.getByText('85.5%')).toBeInTheDocument();
			// For values that appear multiple times, use getAllByText
			const scheduledElements = screen.getAllByText('25');
			expect(scheduledElements.length).toBeGreaterThan(0);
			const publishedElements = screen.getAllByText('100');
			expect(publishedElements.length).toBeGreaterThan(0);
		});
	});

	it('should display stat cards with correct labels', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(mockAnalyticsData),
		});

		render(<AnalyticsDashboard />);

		await waitFor(() => {
			expect(screen.getByText('Total Submissions')).toBeInTheDocument();
			expect(screen.getByText('Approval Rate')).toBeInTheDocument();
			// 'Scheduled' appears in status breakdown too
			expect(screen.getByText('Scheduled Posts')).toBeInTheDocument();
			// 'Published' appears in status breakdown too
			const publishedElements = screen.getAllByText('Published');
			expect(publishedElements.length).toBeGreaterThan(0);
		});
	});

	it('should display status breakdown section', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(mockAnalyticsData),
		});

		render(<AnalyticsDashboard />);

		await waitFor(() => {
			expect(screen.getByText('Status Breakdown')).toBeInTheDocument();
			expect(screen.getByText('Pending Review')).toBeInTheDocument();
			expect(screen.getByText('Scheduled')).toBeInTheDocument();
		});
	});

	it('should display top contributor when available', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(mockAnalyticsData),
		});

		render(<AnalyticsDashboard />);

		await waitFor(() => {
			expect(screen.getByText('Top Contributor')).toBeInTheDocument();
			expect(screen.getByText('top@example.com')).toBeInTheDocument();
			expect(screen.getByText('45 submissions')).toBeInTheDocument();
		});
	});

	it('should show no submissions message when no top contributor', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: () =>
				Promise.resolve({
					...mockAnalyticsData,
					topContributor: null,
				}),
		});

		render(<AnalyticsDashboard />);

		await waitFor(() => {
			expect(screen.getByText('No submissions yet')).toBeInTheDocument();
		});
	});

	it('should display recent activity section', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(mockAnalyticsData),
		});

		render(<AnalyticsDashboard />);

		await waitFor(() => {
			expect(screen.getByText('Recent Activity')).toBeInTheDocument();
			expect(screen.getByText('Post published')).toBeInTheDocument();
			expect(screen.getByText('Submission approved')).toBeInTheDocument();
		});
	});

	it('should show no activity message when no recent activity', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: () =>
				Promise.resolve({
					...mockAnalyticsData,
					recentActivity: [],
				}),
		});

		render(<AnalyticsDashboard />);

		await waitFor(() => {
			expect(screen.getByText('No recent activity')).toBeInTheDocument();
		});
	});
});
