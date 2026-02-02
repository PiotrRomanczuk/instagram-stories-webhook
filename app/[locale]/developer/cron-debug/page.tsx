import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getUserRole } from '@/lib/auth-helpers';
import { PageHeader } from '@/app/components/layout/page-header';
import { HealthMetricsNew } from '@/app/components/developer/health-metrics-new';
import { CronStatusPanel } from '@/app/components/developer/cron-debug/cron-status-panel';
import { StuckLocksPanel } from '@/app/components/developer/cron-debug/stuck-locks-panel';
import { FailedPostsPanel } from '@/app/components/developer/cron-debug/failed-posts-panel';
import { PendingPostsPanel } from '@/app/components/developer/cron-debug/pending-posts-panel';
import { ManualControls } from '@/app/components/developer/cron-debug/manual-controls';
import { LogsViewer } from '@/app/components/developer/cron-debug/logs-viewer';

export default async function CronDebugPage() {
	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		redirect('/auth/signin');
	}

	const role = getUserRole(session);

	// Only developers can access this page
	if (role !== 'developer') {
		redirect('/');
	}

	return (
		<main className="min-h-screen bg-gray-50 dark:bg-[#101622] mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
			<div className="space-y-6">
				<PageHeader
					title="Cron Job Debugger"
					description="Real-time monitoring and debugging for scheduled tasks"
					backLink="/developer"
					backLinkText="Back to Developer"
				/>

				<HealthMetricsNew />

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<CronStatusPanel />
					<StuckLocksPanel />
				</div>

				<FailedPostsPanel />

				<PendingPostsPanel />

				<ManualControls />

				<LogsViewer />
			</div>
		</main>
	);
}
