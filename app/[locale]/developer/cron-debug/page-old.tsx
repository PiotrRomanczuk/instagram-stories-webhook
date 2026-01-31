import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { requireDeveloper } from '@/lib/auth-helpers';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { HealthMetrics } from '@/app/components/developer/cron-debug/health-metrics';
import { CronStatusPanel } from '@/app/components/developer/cron-debug/cron-status-panel';
import { StuckLocksPanel } from '@/app/components/developer/cron-debug/stuck-locks-panel';
import { FailedPostsPanel } from '@/app/components/developer/cron-debug/failed-posts-panel';
import { PendingPostsPanel } from '@/app/components/developer/cron-debug/pending-posts-panel';
import { ManualControls } from '@/app/components/developer/cron-debug/manual-controls';
import { LogsViewer } from '@/app/components/developer/cron-debug/logs-viewer';

export default async function CronDebugPage() {
	const session = await getServerSession(authOptions);
	try {
		requireDeveloper(session);
	} catch (_) {
		redirect('/');
	}

	return (
		<div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 lg:p-12">
			{/* Header */}
			<Link
				href="/developer"
				className="inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-widest mb-6 group"
			>
				<ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
				Back to Developer
			</Link>

			<header className="mb-12">
				<h1 className="text-4xl font-black text-slate-900">
					Cron Job{' '}
					<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
						Debugger
					</span>
				</h1>
				<p className="text-slate-600 mt-2 text-lg">
					Real-time monitoring and debugging for scheduled tasks
				</p>
			</header>

			{/* Health Metrics */}
			<div className="mb-12">
				<HealthMetrics />
			</div>

			{/* Status and Stuck Locks Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
				<CronStatusPanel />
				<StuckLocksPanel />
			</div>

			{/* Failed Posts */}
			<div className="mb-12">
				<FailedPostsPanel />
			</div>

			{/* Pending Overdue Posts */}
			<div className="mb-12">
				<PendingPostsPanel />
			</div>

			{/* Manual Controls */}
			<div className="mb-12">
				<ManualControls />
			</div>

			{/* Logs Viewer */}
			<div className="mb-12">
				<LogsViewer />
			</div>
		</div>
	);
}
