import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { AnalyticsLayout } from '@/app/components/analytics-v2/analytics-layout';

// Each test gets a fresh SWR cache so the module-level cache from a
// previous render doesn't return its stale "loading" state here.
function renderWithFreshSWR(node: React.ReactElement) {
	return render(
		<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
			{node}
		</SWRConfig>,
	);
}

const validResponse = {
	range: '30d',
	periodStart: '2026-04-08T00:00:00.000Z',
	kpis: {
		archived: { value: 74, change: 12 },
		drafted: { value: 3, change: -1 },
		publishRate: { value: 100, change: null },
		inboxToday: { used: 1, cap: 5 },
	},
	daily: [
		{ date: '2026-04-08', archived: 5, drafted: 0, published: 0 },
		{ date: '2026-04-09', archived: 7, drafted: 1, published: 1 },
		{ date: '2026-04-10', archived: 6, drafted: 1, published: 1 },
	],
};

describe('AnalyticsLayout', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		global.fetch = vi.fn();
	});

	it('shows the loading spinner while fetching', () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
			() => new Promise(() => {}),
		);
		renderWithFreshSWR(<AnalyticsLayout />);
		expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
	});

	it('renders KPI labels and values from the API', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(validResponse),
		});
		renderWithFreshSWR(<AnalyticsLayout />);

		await waitFor(() => {
			expect(screen.getByText('Stories archived')).toBeInTheDocument();
		});
		// "Drafted to TT" appears in both the KPI label and chart legend, so
		// we expect at least one match here rather than a unique one.
		expect(screen.getAllByText('Drafted to TT').length).toBeGreaterThan(0);
		expect(screen.getByText('Publish rate')).toBeInTheDocument();
		expect(screen.getByText('Inbox today')).toBeInTheDocument();
		expect(screen.getByText('74')).toBeInTheDocument();
		expect(screen.getByText('1 / 5')).toBeInTheDocument();
		expect(screen.getByText('100%')).toBeInTheDocument();
	});

	it('renders the page header and date range chips', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(validResponse),
		});
		renderWithFreshSWR(<AnalyticsLayout />);

		await waitFor(() => {
			expect(screen.getByText('Pipeline analytics')).toBeInTheDocument();
		});
		expect(screen.getByRole('button', { name: 'Last 7 days' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Last 30 days' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Last 90 days' })).toBeInTheDocument();
	});

	it('shows the error UI when the API returns non-ok', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: false,
			json: () => Promise.resolve({ error: 'boom' }),
		});
		renderWithFreshSWR(<AnalyticsLayout />);

		await waitFor(() => {
			expect(screen.getByText("Couldn't load analytics")).toBeInTheDocument();
		});
		expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
	});

	it('renders the chart with series legend labels', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(validResponse),
		});
		renderWithFreshSWR(<AnalyticsLayout />);

		await waitFor(() => {
			expect(screen.getByText('Pipeline throughput')).toBeInTheDocument();
		});
		expect(screen.getByText('Archived')).toBeInTheDocument();
		expect(screen.getByText('Published')).toBeInTheDocument();
	});
});
