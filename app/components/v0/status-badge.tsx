import { Badge } from '@/app/components/ui/badge';
import type { V0SubmissionStatus } from '@/lib/fixtures/v0';

const STATUS_STYLES: Record<V0SubmissionStatus, string> = {
	pending: 'bg-amber-100 text-amber-900 border-amber-300',
	approved: 'bg-emerald-100 text-emerald-900 border-emerald-300',
	scheduled: 'bg-sky-100 text-sky-900 border-sky-300',
	published: 'bg-violet-100 text-violet-900 border-violet-300',
	rejected: 'bg-rose-100 text-rose-900 border-rose-300',
	withdrawn: 'bg-slate-200 text-slate-700 border-slate-300',
};

const STATUS_LABEL: Record<V0SubmissionStatus, string> = {
	pending: 'Pending review',
	approved: 'Approved',
	scheduled: 'Scheduled',
	published: 'Published',
	rejected: 'Rejected',
	withdrawn: 'Withdrawn',
};

export function V0StatusBadge({ status }: { status: V0SubmissionStatus }) {
	return (
		<Badge variant="outline" className={STATUS_STYLES[status]}>
			{STATUS_LABEL[status]}
		</Badge>
	);
}
