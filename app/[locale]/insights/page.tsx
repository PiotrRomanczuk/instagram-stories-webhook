import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getUserRole } from '@/lib/auth-helpers';
import { PageHeader } from '@/app/components/layout/page-header';
import { Badge } from '@/app/components/ui/badge';
import { EngagementInsights } from '@/app/components/insights/engagement-insights';

export default async function InsightsPage() {
	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		redirect('/auth/signin');
	}

	const role = getUserRole(session);
	if (role !== 'admin' && role !== 'developer') {
		redirect('/');
	}

	return (
		<main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
			<div className="space-y-5">
				<PageHeader
					title="Story Engagement"
					description="Per-story performance metrics. Pick the top performers to compose into your next TikTok video."
					badge={<Badge variant="secondary">Insights · 24h window</Badge>}
				/>

				<EngagementInsights />

				<footer className="pt-6 text-center text-xs text-muted-foreground">
					Metrics are provided directly by the Instagram Graph API. Story
					insights are only available within the 24-hour story lifetime.
				</footer>
			</div>
		</main>
	);
}
