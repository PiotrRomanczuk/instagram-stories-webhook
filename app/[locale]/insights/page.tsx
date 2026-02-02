import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getUserRole } from '@/lib/auth-helpers';
import { PageHeader } from '@/app/components/layout/page-header';
import { Badge } from '@/app/components/ui/badge';
import { InsightsDashboardNew } from '@/app/components/insights/insights-dashboard-new';

export default async function InsightsPage() {
	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		redirect('/auth/signin');
	}

	const role = getUserRole(session);

	// Only admins and developers can access insights
	if (role !== 'admin' && role !== 'developer') {
		redirect('/');
	}

	return (
		<main className="min-h-screen bg-gray-50 dark:bg-[#101622]">
			<div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
				<div className="space-y-6">
					<PageHeader
						title="Performance Insights"
						description="Analyze the performance of your published Instagram content."
						badge={<Badge variant="secondary">Live Connect</Badge>}
					/>

					<InsightsDashboardNew />

					<footer className="pt-8 border-t border-gray-200 dark:border-[#232f48] text-center">
						<p className="text-sm text-gray-500 dark:text-[#92a4c9]">
							Metrics are provided directly by the Instagram Graph API
						</p>
					</footer>
				</div>
			</div>
		</main>
	);
}
