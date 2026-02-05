import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock next-auth
vi.mock('next-auth/next', () => ({
	getServerSession: vi.fn(),
}));

// Mock auth helpers
vi.mock('@/lib/auth-helpers', () => ({
	getUserRole: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
	redirect: vi.fn(),
}));

// Mock the Link component from i18n routing
vi.mock('@/i18n/routing', () => ({
	Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

// Mock the DebugPublisherNew component
vi.mock('@/app/components/developer/debug-publisher-new', () => ({
	DebugPublisherNew: () => <div data-testid="debug-publisher">Debug Publisher Component</div>,
}));

// Mock PageHeader component
vi.mock('@/app/components/layout/page-header', () => ({
	PageHeader: ({ title, description, badge }: { title: string; description: string; badge?: React.ReactNode }) => (
		<div data-testid="page-header">
			<h1>{title}</h1>
			<p>{description}</p>
			{badge}
		</div>
	),
}));

// Mock UI components
vi.mock('@/app/components/ui/badge', () => ({
	Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

vi.mock('@/app/components/ui/card', () => ({
	Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
	CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

vi.mock('@/app/components/ui/button', () => ({
	Button: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
		asChild ? <>{children}</> : <button>{children}</button>,
}));

// Test helper to render async server component
async function renderDeveloperPage() {
	const { getServerSession } = await import('next-auth/next');
	const { getUserRole } = await import('@/lib/auth-helpers');

	// Setup mocks for successful render
	vi.mocked(getServerSession).mockResolvedValue({
		user: { id: 'user-123', email: 'dev@example.com' },
	} as never);
	vi.mocked(getUserRole).mockReturnValue('developer');

	const DeveloperPage = (await import('@/app/[locale]/developer/page')).default;
	const page = await DeveloperPage();
	render(page);
}

describe('Developer Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Set environment variable for webhook URL
		process.env.NEXTAUTH_URL = 'http://localhost:3000';
	});

	describe('rendering', () => {
		it('renders without crashing', async () => {
			await renderDeveloperPage();
			expect(screen.getByTestId('page-header')).toBeInTheDocument();
		});

		it('displays Developer Tools title', async () => {
			await renderDeveloperPage();
			expect(screen.getByText('Developer Tools')).toBeInTheDocument();
		});

		it('displays page description', async () => {
			await renderDeveloperPage();
			expect(
				screen.getByText('Test webhooks, verify API integrations, and debug connection issues.')
			).toBeInTheDocument();
		});

		it('displays Dev Mode badge', async () => {
			await renderDeveloperPage();
			expect(screen.getByText('Dev Mode')).toBeInTheDocument();
		});
	});

	describe('webhook URL section', () => {
		it('displays API Configuration card', async () => {
			await renderDeveloperPage();
			expect(screen.getByText('API Configuration')).toBeInTheDocument();
		});

		it('displays webhook endpoint description', async () => {
			await renderDeveloperPage();
			expect(screen.getByText('Webhook endpoint for Instagram story events')).toBeInTheDocument();
		});

		it('shows the webhook URL', async () => {
			await renderDeveloperPage();
			expect(screen.getByText('Webhook URL')).toBeInTheDocument();
			expect(screen.getByText('http://localhost:3000/api/webhook/story')).toBeInTheDocument();
		});

		it('displays configuration instruction', async () => {
			await renderDeveloperPage();
			expect(
				screen.getByText('Configure this URL in your Meta App Dashboard to receive story events.')
			).toBeInTheDocument();
		});
	});

	describe('cron debug link', () => {
		it('displays Cron Job Debugger card', async () => {
			await renderDeveloperPage();
			expect(screen.getByText('Cron Job Debugger')).toBeInTheDocument();
		});

		it('displays cron debugger description', async () => {
			await renderDeveloperPage();
			expect(
				screen.getByText('Monitor scheduled tasks and debug processing issues')
			).toBeInTheDocument();
		});

		it('has link to cron debug page', async () => {
			await renderDeveloperPage();
			const cronLink = screen.getByText('Open Cron Debugger');
			expect(cronLink).toBeInTheDocument();
			expect(cronLink.closest('a')).toHaveAttribute('href', '/developer/cron-debug');
		});
	});

	describe('debug publisher component', () => {
		it('renders the DebugPublisherNew component', async () => {
			await renderDeveloperPage();
			expect(screen.getByTestId('debug-publisher')).toBeInTheDocument();
		});
	});

	describe('settings link', () => {
		it('displays Application Settings section', async () => {
			await renderDeveloperPage();
			expect(screen.getByText('Application Settings')).toBeInTheDocument();
		});

		it('displays settings description', async () => {
			await renderDeveloperPage();
			expect(
				screen.getByText('Configure API keys, credentials, and security tokens')
			).toBeInTheDocument();
		});

		it('has link to settings page', async () => {
			await renderDeveloperPage();
			const settingsLink = screen.getByText('Open Settings');
			expect(settingsLink).toBeInTheDocument();
			expect(settingsLink.closest('a')).toHaveAttribute('href', '/settings');
		});
	});

	describe('access control', () => {
		it('redirects to signin if no session', async () => {
			const { getServerSession } = await import('next-auth/next');
			const { redirect } = await import('next/navigation');

			vi.mocked(getServerSession).mockResolvedValue(null);

			const DeveloperPage = (await import('@/app/[locale]/developer/page')).default;
			await DeveloperPage();

			expect(redirect).toHaveBeenCalledWith('/auth/signin');
		});

		it('redirects to home if user is not a developer', async () => {
			const { getServerSession } = await import('next-auth/next');
			const { getUserRole } = await import('@/lib/auth-helpers');
			const { redirect } = await import('next/navigation');

			vi.mocked(getServerSession).mockResolvedValue({
				user: { id: 'user-123', email: 'user@example.com' },
			} as never);
			vi.mocked(getUserRole).mockReturnValue('user');

			const DeveloperPage = (await import('@/app/[locale]/developer/page')).default;
			await DeveloperPage();

			expect(redirect).toHaveBeenCalledWith('/');
		});

		it('allows admin users to access developer page', async () => {
			const { getServerSession } = await import('next-auth/next');
			const { getUserRole } = await import('@/lib/auth-helpers');
			const { redirect } = await import('next/navigation');

			vi.mocked(getServerSession).mockResolvedValue({
				user: { id: 'user-123', email: 'admin@example.com' },
			} as never);
			vi.mocked(getUserRole).mockReturnValue('admin');

			const DeveloperPage = (await import('@/app/[locale]/developer/page')).default;
			await DeveloperPage();

			// Admin users should NOT be redirected - they have access
			expect(redirect).not.toHaveBeenCalled();
		});
	});
});
