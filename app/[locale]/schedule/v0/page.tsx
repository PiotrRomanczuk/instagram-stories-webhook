import { V0PageShell } from '@/app/components/v0/v0-page-shell';
import { V0ScheduleGrid } from '@/app/components/v0/schedule-grid';
import { V0_CADENCE } from '@/lib/fixtures/v0';

// TODO(v1): emit slots from lib/scheduler/cadence.ts (humanized FIFO + jitter + quiet hours).
// Pinned items come from scheduled_posts where schedule_mode='pinned'. Drag-from-approved-queue
// uses dnd-kit; backend creates scheduled_posts row with pinned_at = slot timestamp.
export default function V0SchedulePage() {
	return (
		<V0PageShell
			title="Schedule"
			description={`Humanized cadence: ${V0_CADENCE.dailyTarget}/day · active ${V0_CADENCE.activeWindowStart}–${V0_CADENCE.activeWindowEnd} · gap ${V0_CADENCE.minGapMinutes}–${V0_CADENCE.maxGapMinutes} min. Pinned items override the auto-FIFO and never move.`}
		>
			<V0ScheduleGrid />
		</V0PageShell>
	);
}
