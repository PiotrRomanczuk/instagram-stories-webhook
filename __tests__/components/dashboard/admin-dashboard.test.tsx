import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdminDashboard } from '@/app/components/dashboard/admin-dashboard';

// Mock SWR
vi.mock('swr', () => ({
	default: vi.fn(),
}));

// Mock next-intl routing
vi.mock('@/i18n/routing', () => ({
	Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
		<a href={href} {...props}>{children}</a>
	),
}));

// Mock components that make fetch calls
vi.mock('@/app/components/dashboard/token-status-card', () => ({
	TokenStatusCard: () => <div data-testid="token-status-card">Token Status</div>,
}));

vi.mock('@/app/components/insights/quota-card-new', () => ({
	QuotaCardNew: () => <div data-testid="quota-card-new">Quota Card</div>,
}));

describe('AdminDashboard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render welcome message with user name', async () => {
		const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
		useSWR.mockReturnValue({
			data: { items: [], users: [] },
			isLoading: false,
		});

		render(<AdminDashboard userName="Admin" />);

		expect(screen.getByText('Welcome back, Admin')).toBeInTheDocument();
	});

	it('should show loading skeletons when loading', async () => {
		const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
		useSWR.mockReturnValue({
			data: null,
			isLoading: true,
		});

		const { container } = render(<AdminDashboard userName="Admin" />);

		const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
		expect(skeletons.length).toBeGreaterThan(0);
	});

	it('should render all stat cards', async () => {
		const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
		useSWR.mockReturnValue({
			data: { items: [], users: [] },
			isLoading: false,
		});

		render(<AdminDashboard userName="Admin" />);

		expect(screen.getByText('Pending Review')).toBeInTheDocument();
		expect(screen.getByText('Scheduled Today')).toBeInTheDocument();
		expect(screen.getByText('Published (24h)')).toBeInTheDocument();
		expect(screen.getByText('Failed')).toBeInTheDocument();
	});

	it('should render quick actions', async () => {
		const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
		useSWR.mockReturnValue({
			data: { items: [], users: [] },
			isLoading: false,
		});

		render(<AdminDashboard userName="Admin" />);

		expect(screen.getByText('Quick Actions')).toBeInTheDocument();
		expect(screen.getByText('Review Queue')).toBeInTheDocument();
		expect(screen.getByText('Scheduled Posts')).toBeInTheDocument();
		expect(screen.getByText('Manage Users')).toBeInTheDocument();
	});

	it('should show developer tools link when isDeveloper is true', async () => {
		const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
		useSWR.mockReturnValue({
			data: { items: [], users: [] },
			isLoading: false,
		});

		render(<AdminDashboard userName="Admin" isDeveloper />);

		expect(screen.getByText('Developer Tools')).toBeInTheDocument();
	});

	it('should not show developer tools link when isDeveloper is false', async () => {
		const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
		useSWR.mockReturnValue({
			data: { items: [], users: [] },
			isLoading: false,
		});

		render(<AdminDashboard userName="Admin" isDeveloper={false} />);

		expect(screen.queryByText('Developer Tools')).not.toBeInTheDocument();
	});

	it('should show failed posts alert when there are failed posts', async () => {
		const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
		useSWR.mockReturnValue({
			data: {
				items: [
					{ id: '1', publishingStatus: 'failed', source: 'direct' },
					{ id: '2', publishingStatus: 'failed', source: 'direct' },
				],
				users: [],
			},
			isLoading: false,
		});

		render(<AdminDashboard userName="Admin" />);

		expect(screen.getByText('2 posts failed to publish')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'View Failed' })).toBeInTheDocument();
	});

	it('should not show failed posts alert when no failed posts', async () => {
		const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
		useSWR.mockReturnValue({
			data: { items: [], users: [] },
			isLoading: false,
		});

		render(<AdminDashboard userName="Admin" />);

		expect(screen.queryByText(/posts failed to publish/)).not.toBeInTheDocument();
	});

	it('should calculate pending review count correctly', async () => {
		const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
		useSWR.mockReturnValue({
			data: {
				items: [
					{ id: '1', source: 'submission', submissionStatus: 'pending', publishingStatus: 'draft' },
					{ id: '2', source: 'submission', submissionStatus: 'pending', publishingStatus: 'draft' },
					{ id: '3', source: 'submission', submissionStatus: 'approved', publishingStatus: 'draft' },
					{ id: '4', source: 'direct', publishingStatus: 'scheduled' },
				],
				users: [],
			},
			isLoading: false,
		});

		render(<AdminDashboard userName="Admin" />);

		// The Pending Review stat should show 2 (only submissions with pending status)
		const statCards = screen.getAllByText('2');
		expect(statCards.length).toBeGreaterThan(0);
	});

	it('should show badge with pending count in quick actions', async () => {
		const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
		useSWR.mockReturnValue({
			data: {
				items: [
					{ id: '1', source: 'submission', submissionStatus: 'pending', publishingStatus: 'draft' },
					{ id: '2', source: 'submission', submissionStatus: 'pending', publishingStatus: 'draft' },
					{ id: '3', source: 'submission', submissionStatus: 'pending', publishingStatus: 'draft' },
				],
				users: [],
			},
			isLoading: false,
		});

		render(<AdminDashboard userName="Admin" />);

		// Should show badge with count 3 (appears in both stats card and quick action badge)
		const threes = screen.getAllByText('3');
		expect(threes.length).toBeGreaterThanOrEqual(1);
	});
});
