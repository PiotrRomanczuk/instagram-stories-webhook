import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getUserRole } from '@/lib/auth-helpers';
import { PageHeader } from '@/app/components/layout/page-header';
import { AdminMonitoringLayout } from '@/app/components/admin/admin-monitoring-layout';
import { Badge } from '@/app/components/ui/badge';
import { Shield } from 'lucide-react';

export default async function AdminPage() {
	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		redirect('/auth/signin');
	}

	const role = getUserRole(session);

	// Admins and developers can access this page
	if (role !== 'admin' && role !== 'developer') {
		redirect('/');
	}

	return (
		<main className="min-h-screen bg-gray-50">
			<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
				<div className="space-y-6">
					<PageHeader
						title="Admin Monitoring"
						description="System health, login history, and admin action audit trail."
						badge={
							<Badge variant="secondary" className="gap-1">
								<Shield className="h-3 w-3" />
								Admin
							</Badge>
						}
					/>
					<AdminMonitoringLayout />
				</div>
			</div>
		</main>
	);
}
