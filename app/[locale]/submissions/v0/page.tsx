import { V0PageShell } from '@/app/components/v0/v0-page-shell';
import { V0ContributorQueueClient } from '@/app/components/v0/contributor-queue-client';
import { V0_ACTIVE_CONTRIBUTORS } from '@/lib/fixtures/v0';

// TODO(v1): scope to the signed-in contributor via session.user.id; current page surfaces a
// contributor switcher to walk through different fixture personas.
export default function V0ContributorQueuePage() {
	return (
		<V0PageShell
			title="Your queue"
			description="Submissions you've uploaded — track review status and current-month earnings."
		>
			<V0ContributorQueueClient contributors={V0_ACTIVE_CONTRIBUTORS} />
		</V0PageShell>
	);
}
