import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getUserRole } from '@/lib/auth-helpers';
import { PageHeader } from '@/app/components/layout/page-header';
import { Badge } from '@/app/components/ui/badge';
import { InboxManagerNew } from '@/app/components/inbox/inbox-manager-new';

export default async function InboxPage() {
	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		redirect('/auth/signin');
	}

	const role = getUserRole(session);

	// Only admins and developers can access inbox
	if (role !== 'admin' && role !== 'developer') {
		redirect('/');
	}

	return (
		<main className="min-h-screen bg-gray-50 dark:bg-[#101622]">
			<div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
				<div className="space-y-6">
					<PageHeader
						title="Instagram Inbox"
						description="View and respond to Instagram direct messages from your customers."
						badge={<Badge variant="secondary">Live Messages</Badge>}
					/>

					<InboxManagerNew />

					<footer className="pt-8 border-t border-gray-200 dark:border-[#232f48] text-center">
						<p className="text-sm text-gray-500 dark:text-[#92a4c9]">
							Rate Limit: 200 messages/hour &middot; Instagram Messaging API v21.0
						</p>
					</footer>
				</div>
			</div>
		</main>
	);
}
