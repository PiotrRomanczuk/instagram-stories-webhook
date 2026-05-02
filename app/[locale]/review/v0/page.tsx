import { V0PageShell } from '@/app/components/v0/v0-page-shell';
import { V0SwipeReview } from '@/app/components/v0/swipe-review';

// TODO(v1): wire to real submissions where status='pending'. Right swipe transitions to
// 'approved' and locks final tags (source='curator'); left swipe to 'rejected' with reason.
// Reuses existing app/components/storyflow/review-card-swipeable.tsx for the gesture layer.
export default function V0ReviewPage() {
	return (
		<V0PageShell
			title="Review queue"
			description="Tinder-style swipe. Right approves with the current tags locked in. Left rejects (optional reason). Keyboard: ← reject, → approve."
		>
			<V0SwipeReview />
		</V0PageShell>
	);
}
