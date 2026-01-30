import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Create mock functions that we can manipulate
const mockUseSession = vi.fn();
const mockUsePathname = vi.fn();
const mockReplace = vi.fn();

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
	useSession: () => mockUseSession(),
	signOut: vi.fn(),
}));

// Mock next-intl
vi.mock('next-intl', () => ({
	useTranslations: () => (key: string) => {
		const translations: Record<string, string> = {
			dashboard: 'Dashboard',
			submit: 'Submit',
			submissions: 'My Submissions',
			review: 'Review',
			schedule: 'Schedule',
			inbox: 'Inbox',
			insights: 'Insights',
			analytics: 'Analytics',
			users: 'Users',
			devTools: 'Dev Tools',
			signIn: 'Sign In',
		};
		return translations[key] || key;
	},
	useLocale: () => 'en',
}));

// Mock i18n routing
vi.mock('@/i18n/routing', () => ({
	Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
		<a href={href} {...props}>{children}</a>
	),
	usePathname: () => mockUsePathname(),
	useRouter: () => ({
		replace: mockReplace,
	}),
}));

// Mock notification bell
vi.mock('@/app/components/layout/notification-bell', () => ({
	NotificationBell: () => <div data-testid="notification-bell">Notifications</div>,
}));

// Mock user menu
vi.mock('@/app/components/layout/user-menu', () => ({
	UserMenu: ({ user }: { user: { name?: string } }) => (
		<button data-testid="user-menu">{user.name}</button>
	),
}));

// Import Navbar after mocks are set up
import { Navbar } from '@/app/components/layout/navbar';

describe('Navbar', () => {
	const defaultSession = {
		data: {
			user: {
				name: 'Test User',
				email: 'test@example.com',
				role: 'user',
			},
			expires: '',
		},
		status: 'authenticated',
		update: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		// Reset to default values before each test
		mockUseSession.mockReturnValue(defaultSession);
		mockUsePathname.mockReturnValue('/');
	});

	it('should render logo', () => {
		render(<Navbar />);
		expect(screen.getByText('MARSZAL')).toBeInTheDocument();
		expect(screen.getByText('ARTS')).toBeInTheDocument();
	});

	it('should show user navigation items for regular user', () => {
		render(<Navbar />);
		expect(screen.getByText('Dashboard')).toBeInTheDocument();
		expect(screen.getByText('Submit')).toBeInTheDocument();
		expect(screen.getByText('My Submissions')).toBeInTheDocument();
	});

	it('should not show admin items for regular user', () => {
		render(<Navbar />);
		// Review and Schedule should not be visible for regular user
		const reviewLinks = screen.queryAllByText('Review');
		const scheduleLinks = screen.queryAllByText('Schedule');
		expect(reviewLinks.length).toBe(0);
		expect(scheduleLinks.length).toBe(0);
	});

	it('should show admin items for admin user', async () => {
		mockUseSession.mockReturnValue({
			data: {
				user: { name: 'Admin', email: 'admin@example.com', role: 'admin' },
				expires: '',
			},
			status: 'authenticated',
			update: vi.fn(),
		});

		const user = userEvent.setup();
		render(<Navbar />);

		// Primary nav items (first 5 visible)
		expect(screen.getByText('Review')).toBeInTheDocument();
		expect(screen.getByText('Schedule')).toBeInTheDocument();

		// Users is in the "More" dropdown
		const moreButton = screen.getByRole('button', { name: /More/i });
		await user.click(moreButton);

		await waitFor(() => {
			expect(screen.getByText('Users')).toBeInTheDocument();
		});
	});

	it('should show developer items for developer user', async () => {
		mockUseSession.mockReturnValue({
			data: {
				user: { name: 'Dev', email: 'dev@example.com', role: 'developer' },
				expires: '',
			},
			status: 'authenticated',
			update: vi.fn(),
		});

		const user = userEvent.setup();
		render(<Navbar />);

		// Developer nav items that are in the primary nav (first 5)
		// For developer: Dashboard, Submit, My Submissions, Review, Schedule are in primary
		expect(screen.getByText('Review')).toBeInTheDocument();
		expect(screen.getByText('Schedule')).toBeInTheDocument();

		// The rest are in "More" dropdown - find and click it
		const moreButton = screen.getByRole('button', { name: /More/i });
		await user.click(moreButton);

		// Dev Tools should be in the dropdown
		await waitFor(() => {
			expect(screen.getByText('Dev Tools')).toBeInTheDocument();
		});
	});

	it('should show notification bell when authenticated', () => {
		render(<Navbar />);
		expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
	});

	it('should show user menu when authenticated', () => {
		render(<Navbar />);
		expect(screen.getByTestId('user-menu')).toBeInTheDocument();
	});

	it('should show sign in button when not authenticated', () => {
		mockUseSession.mockReturnValue({
			data: null,
			status: 'unauthenticated',
			update: vi.fn(),
		});

		render(<Navbar />);
		expect(screen.getByText('Sign In')).toBeInTheDocument();
	});

	it('should show loading state', () => {
		mockUseSession.mockReturnValue({
			data: null,
			status: 'loading',
			update: vi.fn(),
		});

		render(<Navbar />);
		// Should show skeleton loader
		const skeleton = document.querySelector('.animate-pulse');
		expect(skeleton).toBeInTheDocument();
	});

	it('should not render on signin page', () => {
		mockUsePathname.mockReturnValue('/auth/signin');

		const { container } = render(<Navbar />);
		expect(container.querySelector('nav')).not.toBeInTheDocument();
	});

	it('should toggle mobile menu', async () => {
		const user = userEvent.setup();
		render(<Navbar />);

		// Find mobile menu button
		const menuButtons = screen.getAllByRole('button', { name: 'Toggle menu' });
		expect(menuButtons.length).toBeGreaterThan(0);
		await user.click(menuButtons[0]);

		// Mobile menu should be visible
		await waitFor(() => {
			const mobileNav = document.querySelector('.border-t.bg-background');
			expect(mobileNav).toBeInTheDocument();
		});
	});

	it('should have language toggle button', () => {
		render(<Navbar />);
		expect(screen.getByRole('button', { name: 'Toggle language' })).toBeInTheDocument();
	});
});
