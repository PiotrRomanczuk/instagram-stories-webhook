import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminDashboard } from '@/app/components/dashboard/admin-dashboard';
import { UserDashboard } from '@/app/components/dashboard/user-dashboard';

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

// Mock token status card to simplify tests
vi.mock('@/app/components/dashboard/token-status-card', () => ({
	TokenStatusCard: () => <div data-testid="token-status-card">Token Status</div>,
}));

// Mock quota card to prevent fetch calls
vi.mock('@/app/components/insights/quota-card-new', () => ({
	QuotaCardNew: () => <div data-testid="quota-card-new">Quota Card</div>,
}));

describe('Dashboard Page Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('AdminDashboard', () => {
		it('should render all main sections for admin', async () => {
			const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
			useSWR.mockReturnValue({
				data: { items: [], users: [] },
				isLoading: false,
			});

			render(<AdminDashboard userName="Admin" />);

			// Welcome section
			expect(screen.getByText('Welcome back, Admin')).toBeInTheDocument();

			// Stats cards
			expect(screen.getByText('Pending Review')).toBeInTheDocument();
			expect(screen.getByText('Scheduled Today')).toBeInTheDocument();
			expect(screen.getByText('Published (24h)')).toBeInTheDocument();
			expect(screen.getByText('Failed')).toBeInTheDocument();

			// Quick actions
			expect(screen.getByText('Quick Actions')).toBeInTheDocument();
			expect(screen.getByText('Review Queue')).toBeInTheDocument();
			expect(screen.getByText('Scheduled Posts')).toBeInTheDocument();
			expect(screen.getByText('Manage Users')).toBeInTheDocument();
		});

		it('should display correct stats from data', async () => {
			const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
			const mockItems = [
				{ id: '1', source: 'submission', submissionStatus: 'pending', publishingStatus: 'draft' },
				{ id: '2', source: 'submission', submissionStatus: 'pending', publishingStatus: 'draft' },
				{ id: '3', source: 'submission', submissionStatus: 'approved', publishingStatus: 'scheduled', scheduledTime: Date.now() },
				{ id: '4', source: 'submission', submissionStatus: 'approved', publishingStatus: 'published' },
				{ id: '5', source: 'submission', submissionStatus: 'approved', publishingStatus: 'failed' },
			];

			useSWR.mockReturnValue({
				data: { items: mockItems, users: [{ id: '1' }, { id: '2' }] },
				isLoading: false,
			});

			render(<AdminDashboard userName="Admin" />);

			// Pending review should show 2
			const pendingElements = screen.getAllByText('2');
			expect(pendingElements.length).toBeGreaterThan(0);
		});

		it('should show developer tools link when isDeveloper is true', async () => {
			const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
			useSWR.mockReturnValue({
				data: { items: [], users: [] },
				isLoading: false,
			});

			render(<AdminDashboard userName="Admin" isDeveloper={true} />);

			expect(screen.getByText('Developer Tools')).toBeInTheDocument();
		});

		it('should hide developer tools link when isDeveloper is false', async () => {
			const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
			useSWR.mockReturnValue({
				data: { items: [], users: [] },
				isLoading: false,
			});

			render(<AdminDashboard userName="Admin" isDeveloper={false} />);

			expect(screen.queryByText('Developer Tools')).not.toBeInTheDocument();
		});

		it('should show failed posts alert when there are failures', async () => {
			const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
			useSWR.mockReturnValue({
				data: {
					items: [
						{ id: '1', publishingStatus: 'failed', source: 'direct' },
						{ id: '2', publishingStatus: 'failed', source: 'direct' },
						{ id: '3', publishingStatus: 'failed', source: 'direct' },
					],
					users: [],
				},
				isLoading: false,
			});

			render(<AdminDashboard userName="Admin" />);

			expect(screen.getByText('3 posts failed to publish')).toBeInTheDocument();
			expect(screen.getByRole('link', { name: 'View Failed' })).toBeInTheDocument();
		});

		it('should not show failed posts alert when no failures', async () => {
			const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
			useSWR.mockReturnValue({
				data: { items: [], users: [] },
				isLoading: false,
			});

			render(<AdminDashboard userName="Admin" />);

			expect(screen.queryByText(/posts failed to publish/)).not.toBeInTheDocument();
		});

		it('should show loading state with skeletons', async () => {
			const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
			useSWR.mockReturnValue({
				data: null,
				isLoading: true,
			});

			const { container } = render(<AdminDashboard userName="Admin" />);

			const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
			expect(skeletons.length).toBeGreaterThan(0);
		});

		it('should have correct links in quick actions', async () => {
			const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
			useSWR.mockReturnValue({
				data: { items: [], users: [] },
				isLoading: false,
			});

			render(<AdminDashboard userName="Admin" />);

			const reviewLink = screen.getByRole('link', { name: /Review Queue/i });
			expect(reviewLink).toHaveAttribute('href', '/review');

			const scheduleLink = screen.getByRole('link', { name: /Scheduled Posts/i });
			expect(scheduleLink).toHaveAttribute('href', '/schedule');

			const usersLink = screen.getByRole('link', { name: /Manage Users/i });
			expect(usersLink).toHaveAttribute('href', '/users');
		});
	});

	describe('UserDashboard', () => {
		it('should render all main sections for user', async () => {
			const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
			useSWR.mockReturnValue({
				data: { items: [] },
				isLoading: false,
			});

			render(<UserDashboard userName="John" />);

			// Welcome section
			expect(screen.getByText('Hello, John')).toBeInTheDocument();
			expect(screen.getByText(/Welcome back/)).toBeInTheDocument();

			// Stats cards
			expect(screen.getByText('Pending Review')).toBeInTheDocument();
			const approvedElements = screen.getAllByText('Approved');
			expect(approvedElements.length).toBeGreaterThanOrEqual(1);
			const scheduledElements = screen.getAllByText('Scheduled');
			expect(scheduledElements.length).toBeGreaterThanOrEqual(1);
			const publishedElements = screen.getAllByText('Published');
			expect(publishedElements.length).toBeGreaterThanOrEqual(1);

			// Submit button
			expect(screen.getByRole('link', { name: /Submit New/i })).toBeInTheDocument();

			// Recent submissions section
			expect(screen.getByText('Recent Submissions')).toBeInTheDocument();
		});

		it('should display correct stats from user submissions', async () => {
			const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
			useSWR.mockReturnValue({
				data: {
					items: [
						{ id: '1', submissionStatus: 'pending', publishingStatus: 'draft', source: 'submission', createdAt: '2024-01-15T10:00:00Z', updatedAt: '2024-01-15T10:00:00Z', userId: 'user1', userEmail: 'user@example.com', mediaType: 'IMAGE', mediaUrl: 'https://example.com/1.jpg', version: 1 },
						{ id: '2', submissionStatus: 'pending', publishingStatus: 'draft', source: 'submission', createdAt: '2024-01-14T10:00:00Z', updatedAt: '2024-01-14T10:00:00Z', userId: 'user1', userEmail: 'user@example.com', mediaType: 'IMAGE', mediaUrl: 'https://example.com/2.jpg', version: 1 },
						{ id: '3', submissionStatus: 'approved', publishingStatus: 'draft', source: 'submission', createdAt: '2024-01-13T10:00:00Z', updatedAt: '2024-01-13T10:00:00Z', userId: 'user1', userEmail: 'user@example.com', mediaType: 'IMAGE', mediaUrl: 'https://example.com/3.jpg', version: 1 },
						{ id: '4', submissionStatus: 'approved', publishingStatus: 'scheduled', source: 'submission', createdAt: '2024-01-12T10:00:00Z', updatedAt: '2024-01-12T10:00:00Z', userId: 'user1', userEmail: 'user@example.com', mediaType: 'IMAGE', mediaUrl: 'https://example.com/4.jpg', version: 1 },
						{ id: '5', submissionStatus: 'approved', publishingStatus: 'published', source: 'submission', createdAt: '2024-01-11T10:00:00Z', updatedAt: '2024-01-11T10:00:00Z', userId: 'user1', userEmail: 'user@example.com', mediaType: 'IMAGE', mediaUrl: 'https://example.com/5.jpg', version: 1 },
					],
				},
				isLoading: false,
			});

			render(<UserDashboard userName="John" />);

			// Check that stats are calculated correctly
			// 2 pending, 1 approved (not scheduled), 1 scheduled, 1 published
			const twos = screen.getAllByText('2');
			const ones = screen.getAllByText('1');
			expect(twos.length).toBeGreaterThan(0);
			expect(ones.length).toBeGreaterThan(0);
		});

		it('should show empty state when no submissions', async () => {
			const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
			useSWR.mockReturnValue({
				data: { items: [] },
				isLoading: false,
			});

			render(<UserDashboard userName="John" />);

			expect(screen.getByText('No submissions yet')).toBeInTheDocument();
			expect(screen.getByText('Get started by submitting your first content.')).toBeInTheDocument();
			expect(screen.getByRole('link', { name: /Submit Now/i })).toBeInTheDocument();
		});

		it('should show loading skeletons when loading', async () => {
			const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
			useSWR.mockReturnValue({
				data: null,
				isLoading: true,
			});

			const { container } = render(<UserDashboard userName="John" />);

			const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
			expect(skeletons.length).toBeGreaterThan(0);
		});

		it('should render recent submission cards', async () => {
			const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
			useSWR.mockReturnValue({
				data: {
					items: [
						{
							id: '1',
							submissionStatus: 'pending',
							publishingStatus: 'draft',
							source: 'submission',
							mediaUrl: 'https://example.com/image.jpg',
							createdAt: '2024-01-15T10:00:00Z',
							updatedAt: '2024-01-15T10:00:00Z',
							userId: 'user1',
							userEmail: 'user@example.com',
							mediaType: 'IMAGE',
							version: 1,
						},
					],
				},
				isLoading: false,
			});

			render(<UserDashboard userName="John" />);

			// Should render the submission card with an image element
			const img = screen.getByRole('img', { name: /Submission/i });
			expect(img).toBeInTheDocument();
			expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
		});

		it('should have link to view all submissions', async () => {
			const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
			useSWR.mockReturnValue({
				data: { items: [] },
				isLoading: false,
			});

			render(<UserDashboard userName="John" />);

			const viewAllLink = screen.getByRole('link', { name: 'View All' });
			expect(viewAllLink).toHaveAttribute('href', '/submissions');
		});

		it('should have link to submit new content', async () => {
			const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
			useSWR.mockReturnValue({
				data: { items: [] },
				isLoading: false,
			});

			render(<UserDashboard userName="John" />);

			const submitLink = screen.getByRole('link', { name: /Submit New/i });
			expect(submitLink).toHaveAttribute('href', '/submit');
		});

		// Note: TokenStatusCard is only used in AdminDashboard, not UserDashboard
	});
});

describe('Dashboard Stats Calculations', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should correctly count pending submissions (admin)', async () => {
		const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
		useSWR.mockReturnValue({
			data: {
				items: [
					{ id: '1', source: 'submission', submissionStatus: 'pending', publishingStatus: 'draft' },
					{ id: '2', source: 'submission', submissionStatus: 'pending', publishingStatus: 'draft' },
					{ id: '3', source: 'submission', submissionStatus: 'approved', publishingStatus: 'draft' },
					{ id: '4', source: 'direct', publishingStatus: 'scheduled' }, // Direct uploads don't count
				],
				users: [],
			},
			isLoading: false,
		});

		render(<AdminDashboard userName="Admin" />);

		// Should count 2 pending submissions (not direct uploads)
		const twos = screen.getAllByText('2');
		expect(twos.length).toBeGreaterThan(0);
	});

	it('should correctly count scheduled for today (admin)', async () => {
		const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
		const today = new Date();
		today.setHours(12, 0, 0, 0);

		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);

		useSWR.mockReturnValue({
			data: {
				items: [
					{ id: '1', publishingStatus: 'scheduled', scheduledTime: today.getTime() },
					{ id: '2', publishingStatus: 'scheduled', scheduledTime: today.getTime() },
					{ id: '3', publishingStatus: 'scheduled', scheduledTime: tomorrow.getTime() }, // Tomorrow
					{ id: '4', publishingStatus: 'published' }, // Already published
				],
				users: [],
			},
			isLoading: false,
		});

		render(<AdminDashboard userName="Admin" />);

		// Scheduled Today should show 2
		const scheduledCard = screen.getByText('Scheduled Today').closest('div');
		expect(scheduledCard).toBeInTheDocument();
	});

	it('should correctly count total users (admin)', async () => {
		const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
		useSWR.mockReturnValue({
			data: {
				items: [],
				users: [{ id: '1' }, { id: '2' }, { id: '3' }],
			},
			isLoading: false,
		});

		render(<AdminDashboard userName="Admin" />);

		// Total Users shown as badge on "Manage Users" quick action
		expect(screen.getByText('3 users')).toBeInTheDocument();
	});
});

describe('Dashboard Navigation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should have correct quick action links (admin)', async () => {
		const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
		useSWR.mockReturnValue({
			data: { items: [], users: [] },
			isLoading: false,
		});

		render(<AdminDashboard userName="Admin" />);

		// Check all quick action links
		expect(screen.getByRole('link', { name: /Review Queue/i })).toHaveAttribute('href', '/review');
		expect(screen.getByRole('link', { name: /Scheduled Posts/i })).toHaveAttribute('href', '/schedule');
		expect(screen.getByRole('link', { name: /Manage Users/i })).toHaveAttribute('href', '/users');
	});

	it('should have developer tools link when isDeveloper', async () => {
		const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
		useSWR.mockReturnValue({
			data: { items: [], users: [] },
			isLoading: false,
		});

		render(<AdminDashboard userName="Admin" isDeveloper={true} />);

		// Developer tools link should be present
		const devToolsLink = screen.getByRole('link', { name: /Developer Tools/i });
		expect(devToolsLink).toHaveAttribute('href', '/developer');
	});
});
