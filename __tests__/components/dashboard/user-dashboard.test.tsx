import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

describe('UserDashboard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render welcome message with user name', async () => {
		const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
		useSWR.mockReturnValue({
			data: { items: [] },
			isLoading: false,
		});

		render(<UserDashboard userName="John" />);

		expect(screen.getByText('Hello, John')).toBeInTheDocument();
	});

	it('should render submit new button', async () => {
		const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
		useSWR.mockReturnValue({
			data: { items: [] },
			isLoading: false,
		});

		render(<UserDashboard userName="John" />);

		expect(screen.getByRole('link', { name: /Submit New/i })).toBeInTheDocument();
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

	it('should render stats cards', async () => {
		const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
		useSWR.mockReturnValue({
			data: {
				items: [
					{ id: '1', submissionStatus: 'pending', publishingStatus: 'draft', source: 'submission', createdAt: '2024-01-15T10:00:00Z', updatedAt: '2024-01-15T10:00:00Z', userId: 'user1', userEmail: 'user@example.com', mediaType: 'IMAGE', mediaUrl: 'https://example.com/1.jpg', version: 1 },
					{ id: '2', submissionStatus: 'approved', publishingStatus: 'draft', source: 'submission', createdAt: '2024-01-14T10:00:00Z', updatedAt: '2024-01-14T10:00:00Z', userId: 'user1', userEmail: 'user@example.com', mediaType: 'IMAGE', mediaUrl: 'https://example.com/2.jpg', version: 1 },
					{ id: '3', submissionStatus: 'approved', publishingStatus: 'scheduled', source: 'submission', createdAt: '2024-01-13T10:00:00Z', updatedAt: '2024-01-13T10:00:00Z', userId: 'user1', userEmail: 'user@example.com', mediaType: 'IMAGE', mediaUrl: 'https://example.com/3.jpg', version: 1 },
					{ id: '4', submissionStatus: 'approved', publishingStatus: 'published', source: 'submission', createdAt: '2024-01-12T10:00:00Z', updatedAt: '2024-01-12T10:00:00Z', userId: 'user1', userEmail: 'user@example.com', mediaType: 'IMAGE', mediaUrl: 'https://example.com/4.jpg', version: 1 },
				],
			},
			isLoading: false,
		});

		render(<UserDashboard userName="John" />);

		expect(screen.getByText('Pending Review')).toBeInTheDocument();
		// Use getAllByText since "Approved" appears in both stats card and submission badges
		expect(screen.getAllByText('Approved').length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByText('Scheduled').length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByText('Published').length).toBeGreaterThanOrEqual(1);
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
	});

	it('should render recent submissions section', async () => {
		const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
		useSWR.mockReturnValue({
			data: { items: [] },
			isLoading: false,
		});

		render(<UserDashboard userName="John" />);

		expect(screen.getByText('Recent Submissions')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'View All' })).toBeInTheDocument();
	});

	it('should render submission cards for recent submissions', async () => {
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

		// Should render the submission card with image
		const images = screen.getAllByRole('img');
		expect(images.length).toBeGreaterThan(0);
	});
});
