import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserMenu } from '@/app/components/layout/user-menu';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
	signOut: vi.fn(),
}));

// Mock next-intl routing
vi.mock('@/i18n/routing', () => ({
	Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
		<a href={href} {...props}>{children}</a>
	),
}));

describe('UserMenu', () => {
	const mockUser = {
		name: 'John Doe',
		email: 'john@example.com',
		image: 'https://example.com/avatar.jpg',
		role: 'user' as const,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render user avatar button', () => {
		render(<UserMenu user={mockUser} />);
		expect(screen.getByRole('button', { name: 'User menu' })).toBeInTheDocument();
	});

	it('should show initials when no image', () => {
		render(<UserMenu user={{ ...mockUser, image: null }} />);
		expect(screen.getByText('JD')).toBeInTheDocument();
	});

	it('should show first letter of email when no name', () => {
		render(<UserMenu user={{ email: 'test@example.com', image: null }} />);
		expect(screen.getByText('T')).toBeInTheDocument();
	});

	it('should open dropdown on click', async () => {
		const user = userEvent.setup();
		render(<UserMenu user={mockUser} />);

		const trigger = screen.getByRole('button', { name: 'User menu' });
		await user.click(trigger);

		await waitFor(() => {
			expect(screen.getByText('John Doe')).toBeInTheDocument();
			expect(screen.getByText('john@example.com')).toBeInTheDocument();
		});
	});

	it('should display role badge', async () => {
		const user = userEvent.setup();
		render(<UserMenu user={mockUser} />);

		const trigger = screen.getByRole('button', { name: 'User menu' });
		await user.click(trigger);

		await waitFor(() => {
			expect(screen.getByText('user')).toBeInTheDocument();
		});
	});

	it('should show Instagram account for admin', async () => {
		const user = userEvent.setup();
		const adminUser = {
			...mockUser,
			role: 'admin' as const,
			instagramAccount: { id: '123', username: 'testaccount' },
		};

		render(<UserMenu user={adminUser} />);

		const trigger = screen.getByRole('button', { name: 'User menu' });
		await user.click(trigger);

		await waitFor(() => {
			expect(screen.getByText('@testaccount')).toBeInTheDocument();
		});
	});

	it('should not show Instagram account for regular user', async () => {
		const user = userEvent.setup();
		const regularUser = {
			...mockUser,
			role: 'user' as const,
			instagramAccount: { id: '123', username: 'testaccount' },
		};

		render(<UserMenu user={regularUser} />);

		const trigger = screen.getByRole('button', { name: 'User menu' });
		await user.click(trigger);

		await waitFor(() => {
			expect(screen.queryByText('@testaccount')).not.toBeInTheDocument();
		});
	});

	it('should not show Settings link in MVP mode', async () => {
		const user = userEvent.setup();
		const devUser = {
			...mockUser,
			role: 'developer' as const,
		};

		render(<UserMenu user={devUser} />);

		const trigger = screen.getByRole('button', { name: 'User menu' });
		await user.click(trigger);

		await waitFor(() => {
			expect(screen.queryByText('Settings')).not.toBeInTheDocument();
		});
	});

	it('should show sign out option', async () => {
		const user = userEvent.setup();
		render(<UserMenu user={mockUser} />);

		const trigger = screen.getByRole('button', { name: 'User menu' });
		await user.click(trigger);

		await waitFor(() => {
			expect(screen.getByText('Sign out')).toBeInTheDocument();
		});
	});

	it('should call signOut when clicking sign out', async () => {
		const user = userEvent.setup();
		const { signOut } = await import('next-auth/react');

		render(<UserMenu user={mockUser} />);

		const trigger = screen.getByRole('button', { name: 'User menu' });
		await user.click(trigger);

		await waitFor(() => {
			expect(screen.getByText('Sign out')).toBeInTheDocument();
		});

		const signOutButton = screen.getByText('Sign out');
		await user.click(signOutButton);

		expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/auth/signin' });
	});
});
