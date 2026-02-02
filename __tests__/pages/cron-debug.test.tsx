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

// Mock PageHeader component
vi.mock('@/app/components/layout/page-header', () => ({
	PageHeader: ({
		title,
		description,
		backLink,
		backLinkText,
	}: {
		title: string;
		description: string;
		backLink?: string;
		backLinkText?: string;
	}) => (
		<div data-testid="page-header">
			<h1>{title}</h1>
			<p>{description}</p>
			{backLink && <a href={backLink}>{backLinkText}</a>}
		</div>
	),
}));

// Mock HealthMetricsNew component
vi.mock('@/app/components/developer/health-metrics-new', () => ({
	HealthMetricsNew: () => <div data-testid="health-metrics">Health Metrics Component</div>,
}));

// Mock CronStatusPanel component
vi.mock('@/app/components/developer/cron-debug/cron-status-panel', () => ({
	CronStatusPanel: () => <div data-testid="cron-status-panel">Cron Status Panel</div>,
}));

// Mock StuckLocksPanel component
vi.mock('@/app/components/developer/cron-debug/stuck-locks-panel', () => ({
	StuckLocksPanel: () => <div data-testid="stuck-locks-panel">Stuck Locks Panel</div>,
}));

// Mock FailedPostsPanel component
vi.mock('@/app/components/developer/cron-debug/failed-posts-panel', () => ({
	FailedPostsPanel: () => <div data-testid="failed-posts-panel">Failed Posts Panel</div>,
}));

// Mock PendingPostsPanel component
vi.mock('@/app/components/developer/cron-debug/pending-posts-panel', () => ({
	PendingPostsPanel: () => <div data-testid="pending-posts-panel">Pending Posts Panel</div>,
}));

// Mock ManualControls component
vi.mock('@/app/components/developer/cron-debug/manual-controls', () => ({
	ManualControls: () => <div data-testid="manual-controls">Manual Controls</div>,
}));

// Mock LogsViewer component
vi.mock('@/app/components/developer/cron-debug/logs-viewer', () => ({
	LogsViewer: () => <div data-testid="logs-viewer">Logs Viewer</div>,
}));

// Test helper to render async server component
async function renderCronDebugPage() {
	const { getServerSession } = await import('next-auth/next');
	const { getUserRole } = await import('@/lib/auth-helpers');

	// Setup mocks for successful render
	vi.mocked(getServerSession).mockResolvedValue({
		user: { id: 'user-123', email: 'dev@example.com' },
	} as never);
	vi.mocked(getUserRole).mockReturnValue('developer');

	const CronDebugPage = (await import('@/app/[locale]/developer/cron-debug/page')).default;
	const page = await CronDebugPage();
	render(page);
}

describe('Cron Debug Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('rendering', () => {
		it('renders without crashing', async () => {
			await renderCronDebugPage();
			expect(screen.getByTestId('page-header')).toBeInTheDocument();
		});

		it('displays Cron Job Debugger title', async () => {
			await renderCronDebugPage();
			expect(screen.getByText('Cron Job Debugger')).toBeInTheDocument();
		});

		it('displays page description', async () => {
			await renderCronDebugPage();
			expect(
				screen.getByText('Real-time monitoring and debugging for scheduled tasks')
			).toBeInTheDocument();
		});

		it('has back link to developer page', async () => {
			await renderCronDebugPage();
			const backLink = screen.getByText('Back to Developer');
			expect(backLink).toBeInTheDocument();
			expect(backLink.closest('a')).toHaveAttribute('href', '/developer');
		});
	});

	describe('panels', () => {
		it('renders Health Metrics component', async () => {
			await renderCronDebugPage();
			expect(screen.getByTestId('health-metrics')).toBeInTheDocument();
		});

		it('renders Cron Status Panel', async () => {
			await renderCronDebugPage();
			expect(screen.getByTestId('cron-status-panel')).toBeInTheDocument();
		});

		it('renders Stuck Locks Panel', async () => {
			await renderCronDebugPage();
			expect(screen.getByTestId('stuck-locks-panel')).toBeInTheDocument();
		});

		it('renders Failed Posts Panel', async () => {
			await renderCronDebugPage();
			expect(screen.getByTestId('failed-posts-panel')).toBeInTheDocument();
		});

		it('renders Pending Posts Panel', async () => {
			await renderCronDebugPage();
			expect(screen.getByTestId('pending-posts-panel')).toBeInTheDocument();
		});

		it('renders Manual Controls', async () => {
			await renderCronDebugPage();
			expect(screen.getByTestId('manual-controls')).toBeInTheDocument();
		});

		it('renders Logs Viewer', async () => {
			await renderCronDebugPage();
			expect(screen.getByTestId('logs-viewer')).toBeInTheDocument();
		});
	});

	describe('access control', () => {
		it('redirects to signin if no session', async () => {
			const { getServerSession } = await import('next-auth/next');
			const { redirect } = await import('next/navigation');

			vi.mocked(getServerSession).mockResolvedValue(null);

			const CronDebugPage = (await import('@/app/[locale]/developer/cron-debug/page')).default;
			await CronDebugPage();

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

			const CronDebugPage = (await import('@/app/[locale]/developer/cron-debug/page')).default;
			await CronDebugPage();

			expect(redirect).toHaveBeenCalledWith('/');
		});

		it('redirects to home if user is admin but not developer', async () => {
			const { getServerSession } = await import('next-auth/next');
			const { getUserRole } = await import('@/lib/auth-helpers');
			const { redirect } = await import('next/navigation');

			vi.mocked(getServerSession).mockResolvedValue({
				user: { id: 'user-123', email: 'admin@example.com' },
			} as never);
			vi.mocked(getUserRole).mockReturnValue('admin');

			const CronDebugPage = (await import('@/app/[locale]/developer/cron-debug/page')).default;
			await CronDebugPage();

			expect(redirect).toHaveBeenCalledWith('/');
		});

		it('allows developer role to access', async () => {
			const { getServerSession } = await import('next-auth/next');
			const { getUserRole } = await import('@/lib/auth-helpers');
			const { redirect } = await import('next/navigation');

			vi.mocked(getServerSession).mockResolvedValue({
				user: { id: 'user-123', email: 'dev@example.com' },
			} as never);
			vi.mocked(getUserRole).mockReturnValue('developer');

			const CronDebugPage = (await import('@/app/[locale]/developer/cron-debug/page')).default;
			const page = await CronDebugPage();

			// Should not redirect
			expect(redirect).not.toHaveBeenCalled();
			// Page should be returned (not null or undefined)
			expect(page).toBeDefined();
		});
	});
});
