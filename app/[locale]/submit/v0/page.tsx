import { V0PageShell } from '@/app/components/v0/v0-page-shell';
import { V0SubmitForm } from '@/app/components/v0/submit-form';

// TODO(v1): wire upload → MediaStorage adapter (Drive in v1) → AI auto-tag → submission row
// inserted with status='pending'. Currently demonstrates the form layout only.
export default function V0SubmitPage() {
	return (
		<V0PageShell
			title="Submit for review"
			description="Upload an image or video. Pick categories from the locked taxonomy; keywords are free-form. Tags are AI-suggested in v1; for now you fill them in directly."
		>
			<V0SubmitForm />
		</V0PageShell>
	);
}
