import { PageHeader } from '@/app/components/layout/page-header';
import { OnboardingWizard } from '@/app/components/contributor/onboarding-wizard';
import { Badge } from '@/app/components/ui/badge';
import { Sparkles } from 'lucide-react';

// TODO(v1): wire to Supabase users table; gate meme_submissions.insert until users.onboarding_completed_at IS NOT NULL.
// TODO(v1): encrypt PESEL/IBAN/address with pgsodium; add admin reapproval surface for ZUS-risk contributors.
export default function ContributorOnboardingPage() {
	return (
		<main className="min-h-screen bg-gray-50">
			<div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
				<PageHeader
					title="Contributor onboarding"
					description="Complete this once. After submitting, you can upload work for review."
					badge={
						<Badge variant="secondary" className="gap-1">
							<Sparkles className="h-3 w-3" />
							v0 prototype
						</Badge>
					}
					backLink="/v0"
					backLinkText="Walkthrough hub"
				/>
				<OnboardingWizard />
			</div>
		</main>
	);
}
