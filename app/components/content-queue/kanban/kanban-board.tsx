'use client';

/**
 * Kanban Board Component
 * Main kanban board with columns: DRAFT, SCHEDULED, PROCESSING, PUBLISHED, FAILED
 */

import { useMemo } from 'react';
import { ContentItem, PublishingStatus } from '@/lib/types/posts';
import { KanbanColumn } from './kanban-column';
import { Loader2 } from 'lucide-react';

interface KanbanBoardProps {
	items: ContentItem[];
	onPreview: (item: ContentItem) => void;
	onEdit: (item: ContentItem) => void;
	onAddNew?: () => void;
	isLoading?: boolean;
}

/**
 * Column configuration
 */
const COLUMNS: { status: PublishingStatus; title: string; showAdd: boolean }[] = [
	{ status: 'draft', title: 'Draft', showAdd: true },
	{ status: 'scheduled', title: 'Scheduled', showAdd: false },
	{ status: 'processing', title: 'Processing', showAdd: false },
	{ status: 'published', title: 'Published', showAdd: false },
	{ status: 'failed', title: 'Failed', showAdd: false },
];

function KanbanSkeleton() {
	return (
		<div className="flex gap-6 p-6 overflow-x-auto">
			{COLUMNS.map((col) => (
				<div key={col.status} className="kanban-column flex flex-col gap-4 min-w-[280px] max-w-[320px]">
					{/* Header skeleton */}
					<div className="flex items-center gap-2 px-1">
						<div className="h-4 w-20 bg-gray-200 dark:bg-[#2d3a54] rounded animate-pulse" />
						<div className="h-5 w-5 bg-gray-200 dark:bg-[#2d3a54] rounded-full animate-pulse" />
					</div>
					{/* Card skeletons */}
					<div className="flex flex-col gap-3">
						{[1, 2].map((i) => (
							<div
								key={i}
								className="bg-white dark:bg-[#1a2234] border border-gray-200 dark:border-[#2d3a54] rounded-xl p-3 animate-pulse"
							>
								<div className="aspect-[9/16] w-full rounded-lg bg-gray-200 dark:bg-[#2d3a54] mb-3" />
								<div className="h-4 w-3/4 bg-gray-200 dark:bg-[#2d3a54] rounded mb-2" />
								<div className="h-3 w-1/2 bg-gray-200 dark:bg-[#2d3a54] rounded" />
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	);
}

export function KanbanBoard({
	items,
	onPreview,
	onEdit,
	onAddNew,
	isLoading,
}: KanbanBoardProps) {
	// Group items by publishing status
	const groupedItems = useMemo(() => {
		const groups: Record<PublishingStatus, ContentItem[]> = {
			draft: [],
			scheduled: [],
			processing: [],
			published: [],
			failed: [],
		};

		items.forEach((item) => {
			const status = item.publishingStatus || 'draft';
			if (groups[status]) {
				groups[status].push(item);
			} else {
				groups.draft.push(item);
			}
		});

		// Sort each group
		// Draft: by updated time (most recent first)
		groups.draft.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

		// Scheduled: by scheduled time (soonest first)
		groups.scheduled.sort((a, b) => (a.scheduledTime || 0) - (b.scheduledTime || 0));

		// Processing: by processing start time
		groups.processing.sort((a, b) => {
			const timeA = a.processingStartedAt ? new Date(a.processingStartedAt).getTime() : 0;
			const timeB = b.processingStartedAt ? new Date(b.processingStartedAt).getTime() : 0;
			return timeA - timeB;
		});

		// Published: by published time (most recent first)
		groups.published.sort((a, b) => {
			const timeA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
			const timeB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
			return timeB - timeA;
		});

		// Failed: by updated time (most recent first)
		groups.failed.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

		return groups;
	}, [items]);

	if (isLoading) {
		return <KanbanSkeleton />;
	}

	if (items.length === 0) {
		return (
			<div className="flex-1 flex items-center justify-center p-6">
				<div className="text-center">
					<div className="p-6 bg-gray-100 dark:bg-[#1a2234] rounded-full mb-6 border border-gray-200 dark:border-[#2d3a54] inline-flex">
						<Loader2 className="h-12 w-12 text-gray-400 dark:text-[#92a4c9]" />
					</div>
					<h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No content yet</h3>
					<p className="text-gray-500 dark:text-[#92a4c9] max-w-sm">
						Create your first story to get started with the content queue.
					</p>
					{onAddNew && (
						<button
							onClick={onAddNew}
							className="mt-6 px-6 py-3 bg-[#2b6cee] hover:bg-[#2b6cee]/90 text-white text-sm font-bold rounded-lg transition-all"
						>
							Create Story
						</button>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="flex-1 overflow-x-auto p-6 flex gap-6">
			{COLUMNS.map((column) => (
				<KanbanColumn
					key={column.status}
					title={column.title}
					status={column.status}
					items={groupedItems[column.status]}
					onPreview={onPreview}
					onEdit={onEdit}
					onAddNew={onAddNew}
					showAddButton={column.showAdd}
				/>
			))}
		</div>
	);
}
