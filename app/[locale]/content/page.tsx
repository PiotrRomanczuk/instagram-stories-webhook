'use client';

/**
 * Content Hub Page
 * StoryFlow Kanban Content Queue Dashboard
 *
 * Features:
 * - Dark theme kanban board with columns: DRAFT, SCHEDULED, PROCESSING, PUBLISHED, FAILED
 * - Left sidebar with views (Kanban, List, Timeline), quick schedule calendar, settings
 * - Top bar with search, nav links, "Create Story" button
 * - Cards show thumbnail, title, creator, status, scheduled time
 */

import { useSearchParams } from 'next/navigation';
import { KanbanLayout } from '../../components/content-queue/kanban';
import { ContentQueueLayout } from '../../components/content-queue';

export default function ContentPage() {
	const searchParams = useSearchParams();
	const view = searchParams.get('view');
	const tab = searchParams.get('tab') as 'review' | 'all' | null;

	// If list view is requested, use the original ContentQueueLayout
	if (view === 'list') {
		return (
			<main className="min-h-screen bg-[#101622]">
				<ContentQueueLayout initialTab={tab === 'review' ? 'review' : 'all'} />
			</main>
		);
	}

	// Default to Kanban view
	return <KanbanLayout />;
}
