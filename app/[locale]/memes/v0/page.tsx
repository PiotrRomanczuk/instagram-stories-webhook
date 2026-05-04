import { V0PageShell } from '@/app/components/v0/v0-page-shell';
import { V0ArchiveBrowser } from '@/app/components/v0/archive-browser';

// TODO(v1): query the entire submissions corpus joined to submission_categories /
// submission_keywords. "Pin to upcoming holiday slot" creates a scheduled_posts row with
// schedule_mode='pinned' at the chosen timestamp; surfaces on /schedule.
export default function V0ArchivePage() {
	return (
		<V0PageShell
			title="Archive (feature 4)"
			description="Every tagged asset, ever. Filter by holiday, theme, event, or keyword. Pin a piece directly into an upcoming schedule slot for the right occasion."
		>
			<V0ArchiveBrowser />
		</V0PageShell>
	);
}
