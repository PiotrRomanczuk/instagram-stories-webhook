import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getUserRole } from '@/lib/auth-helpers';
import { EngagementInsights } from '@/app/components/insights/engagement-insights';

// Full-bleed: the redesigned EngagementInsights owns its own header, status
// bar, and two-pane workshop layout, including its own paper-themed bg.
export default async function InsightsPage() {
	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		redirect('/auth/signin');
	}

	const role = getUserRole(session);
	if (role !== 'admin' && role !== 'developer') {
		redirect('/');
	}

	return <EngagementInsights />;
}
