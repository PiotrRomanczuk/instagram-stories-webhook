import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { PageHeader } from '@/app/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { DebugPublisherNew } from '@/app/components/developer/debug-publisher-new';
import { InstagramConnectionStatus } from '@/app/components/developer/instagram-connection-status';

export default async function DebugPage() {
	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		redirect('/auth/signin');
	}

	return (
		<main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
			<div className="space-y-6">
				<PageHeader
					title="Publish Debug"
					description="Directly test Instagram publishing. This bypasses the scheduler and database completely to isolate API issues."
				/>

				<InstagramConnectionStatus />

				<DebugPublisherNew />

				<Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
					<AlertTriangle className="h-4 w-4 text-amber-600" />
					<AlertTitle className="text-amber-800 dark:text-amber-100">
						Security Warning
					</AlertTitle>
					<AlertDescription className="text-amber-700 dark:text-amber-300">
						This is a manual debug tool. Use it only to verify that your Instagram
						connection is working. Posts made here will NOT be tracked in your
						schedule history.
					</AlertDescription>
				</Alert>
			</div>
		</main>
	);
}
