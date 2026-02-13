'use client';

/**
 * Content Hub Client Component
 * StoryFlow Kanban Content Queue Dashboard
 */

import { KanbanLayout } from '../../components/content-queue/kanban';
import { ContentQueueLayout } from '../../components/content-queue';

interface ContentPageClientProps {
	view?: string;
	tab?: 'review' | 'all';
}

export function ContentPageClient({ view, tab }: ContentPageClientProps) {
	if (view === 'list') {
		return (
			<main className="min-h-screen bg-gray-50">
				<ContentQueueLayout initialTab={tab === 'review' ? 'review' : 'all'} />
			</main>
		);
	}

	return <KanbanLayout />;
}
