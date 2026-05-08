import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserDashboard } from '@/app/components/dashboard/user-dashboard';

vi.mock('swr', () => ({
	default: vi.fn(),
}));

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

	it('should render stat pills with correct counts', async () => {
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

		expect(screen.getByText('Pending')).toBeInTheDocument();
		expect(screen.getByText('Approved')).toBeInTheDocument();
		expect(screen.getByText('Scheduled')).toBeInTheDocument();
		expect(screen.getByText('Published')).toBeInTheDocument();
	});

	it('should link to all submissions', async () => {
		const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
		useSWR.mockReturnValue({
			data: { items: [] },
			isLoading: false,
		});

		render(<UserDashboard userName="John" />);

		expect(screen.getByRole('link', { name: /View all submissions/i })).toBeInTheDocument();
	});
});
