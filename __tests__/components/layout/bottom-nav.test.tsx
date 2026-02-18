import { render, screen } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { usePathname } from '@/i18n/routing';
import { BottomNav } from '@/app/components/layout/bottom-nav';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('next-auth/react');
vi.mock('@/i18n/routing', () => ({
	usePathname: vi.fn(),
	Link: ({ href, children, ...props }: any) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

describe('BottomNav', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(usePathname as any).mockReturnValue('/');
	});

	describe('RBAC - Role-based access control', () => {
		it('should show only Home, New, and Profile tabs for regular users', () => {
			(useSession as any).mockReturnValue({
				data: {
					user: {
						id: '1',
						email: 'user@example.com',
						role: 'user',
					},
				},
			});

			render(<BottomNav />);

			// Regular user should see these tabs
			expect(screen.getByText('Home')).toBeInTheDocument();
			expect(screen.getByText('New')).toBeInTheDocument();
			expect(screen.getByText('Profile')).toBeInTheDocument();

			// Regular user should NOT see admin/dev tabs
			expect(screen.queryByText('Schedule')).not.toBeInTheDocument();
			expect(screen.queryByText('Review')).not.toBeInTheDocument();
		});

		it('should show all tabs including Schedule and Review for admin users', () => {
			(useSession as any).mockReturnValue({
				data: {
					user: {
						id: '1',
						email: 'admin@example.com',
						role: 'admin',
					},
				},
			});

			render(<BottomNav />);

			// Admin should see all tabs
			expect(screen.getByText('Home')).toBeInTheDocument();
			expect(screen.getByText('Schedule')).toBeInTheDocument();
			expect(screen.getByText('New')).toBeInTheDocument();
			expect(screen.getByText('Review')).toBeInTheDocument();
			expect(screen.getByText('Profile')).toBeInTheDocument();
		});

		it('should show all tabs including Schedule and Review for developer users', () => {
			(useSession as any).mockReturnValue({
				data: {
					user: {
						id: '1',
						email: 'dev@example.com',
						role: 'developer',
					},
				},
			});

			render(<BottomNav />);

			// Developer should see all tabs
			expect(screen.getByText('Home')).toBeInTheDocument();
			expect(screen.getByText('Schedule')).toBeInTheDocument();
			expect(screen.getByText('New')).toBeInTheDocument();
			expect(screen.getByText('Review')).toBeInTheDocument();
			expect(screen.getByText('Profile')).toBeInTheDocument();
		});

		it('should show limited tabs when user role is undefined', () => {
			(useSession as any).mockReturnValue({
				data: {
					user: {
						id: '1',
						email: 'user@example.com',
						// No role property
					},
				},
			});

			render(<BottomNav />);

			// Should only show tabs without role restrictions
			expect(screen.getByText('Home')).toBeInTheDocument();
			expect(screen.getByText('New')).toBeInTheDocument();
			expect(screen.getByText('Profile')).toBeInTheDocument();

			// Should NOT see restricted tabs
			expect(screen.queryByText('Schedule')).not.toBeInTheDocument();
			expect(screen.queryByText('Review')).not.toBeInTheDocument();
		});
	});

	describe('Visibility', () => {
		it('should not render on signin page', () => {
			(usePathname as any).mockReturnValue('/auth/signin');
			(useSession as any).mockReturnValue({
				data: {
					user: {
						id: '1',
						email: 'user@example.com',
						role: 'user',
					},
				},
			});

			const { container } = render(<BottomNav />);
			expect(container.firstChild).toBeNull();
		});

		it('should render on home page', () => {
			(usePathname as any).mockReturnValue('/');
			(useSession as any).mockReturnValue({
				data: {
					user: {
						id: '1',
						email: 'user@example.com',
						role: 'user',
					},
				},
			});

			render(<BottomNav />);
			expect(screen.getByText('Home')).toBeInTheDocument();
		});
	});

	describe('Tab count', () => {
		it('should show 3 tabs for regular users (Home, New, Profile)', () => {
			(useSession as any).mockReturnValue({
				data: {
					user: {
						id: '1',
						email: 'user@example.com',
						role: 'user',
					},
				},
			});

			const { container } = render(<BottomNav />);
			const links = container.querySelectorAll('a');
			expect(links).toHaveLength(3);
		});

		it('should show 5 tabs for admin users (Home, Schedule, New, Review, Profile)', () => {
			(useSession as any).mockReturnValue({
				data: {
					user: {
						id: '1',
						email: 'admin@example.com',
						role: 'admin',
					},
				},
			});

			const { container } = render(<BottomNav />);
			const links = container.querySelectorAll('a');
			expect(links).toHaveLength(5);
		});
	});
});
