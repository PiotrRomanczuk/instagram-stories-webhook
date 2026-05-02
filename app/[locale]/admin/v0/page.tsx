import { V0PageShell } from '@/app/components/v0/v0-page-shell';
import { V0AdminPanel } from '@/app/components/v0/admin-panel';

// TODO(v1): wire invite to email_whitelist insert + invite email; rate field to
// user_preferences.default_payout_rate_zl; CSV export to lib/payments/ledger.ts.
// Offboarding sets users.deleted_at + cancels pending submissions (status='withdrawn').
export default function V0AdminPage() {
	return (
		<V0PageShell
			title="Admin"
			description="Invite contributors, set the per-post rate, see who's on the team, export the monthly payout CSV for the accountant."
		>
			<V0AdminPanel />
		</V0PageShell>
	);
}
