'use client';

/**
 * Kanban Column Component
 * A single column in the kanban board (Draft, Scheduled, Processing, Published, Failed)
 */

import { ContentItem, PublishingStatus } from '@/lib/types/posts';
import { KanbanCard } from './kanban-card';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
	title: string;
	status: PublishingStatus;
	items: ContentItem[];
	onPreview: (item: ContentItem) => void;
	onEdit: (item: ContentItem) => void;
	onAddNew?: () => void;
	showAddButton?: boolean;
}

/**
 * Get count badge styling based on status
 */
function getCountBadgeStyle(status: PublishingStatus): string {
	switch (status) {
		case 'published':
			return 'bg-emerald-500/20 text-emerald-500';
		case 'failed':
			return 'bg-red-500/20 text-red-500';
		default:
			return 'bg-gray-100 dark:bg-[#1a2234] text-gray-500 dark:text-[#92a4c9]';
	}
}

export function KanbanColumn({
	title,
	status,
	items,
	onPreview,
	onEdit,
	onAddNew,
	showAddButton = false,
}: KanbanColumnProps) {
	return (
		<div className="kanban-column flex flex-col gap-4 min-w-[280px] max-w-[320px]">
			{/* Column Header */}
			<div className="flex items-center justify-between px-1">
				<div className="flex items-center gap-2">
					<h3 className="text-gray-900 dark:text-white text-sm font-bold uppercase tracking-wider">
						{title}
					</h3>
					<span
						className={cn(
							'h-5 w-5 flex items-center justify-center rounded-full text-[10px] font-bold',
							getCountBadgeStyle(status)
						)}
					>
						{items.length}
					</span>
				</div>
				{showAddButton && onAddNew && (
					<button
						onClick={onAddNew}
						className="text-gray-400 dark:text-[#92a4c9] hover:text-gray-900 dark:hover:text-white transition-colors"
					>
						<Plus className="h-5 w-5" />
					</button>
				)}
			</div>

			{/* Column Content */}
			<div className="flex flex-col gap-3 overflow-y-auto pr-1 flex-1">
				{items.length > 0 ? (
					items.map((item) => (
						<KanbanCard
							key={item.id}
							item={item}
							onPreview={onPreview}
							onEdit={onEdit}
							status={status}
						/>
					))
				) : (
					/* Empty state placeholder */
					<div className="border-2 border-dashed border-gray-200 dark:border-[#2d3a54] rounded-xl p-6 flex flex-col items-center justify-center text-center min-h-[200px] opacity-50">
						<span className="text-gray-400 dark:text-[#92a4c9] text-xs">
							No {title.toLowerCase()} items
						</span>
					</div>
				)}

				{/* Drop zone placeholder for drag-and-drop */}
				{items.length > 0 && (
					<div className="border-2 border-dashed border-gray-200/30 dark:border-[#2d3a54]/30 rounded-xl p-4 opacity-0 hover:opacity-100 transition-opacity">
						<span className="text-gray-400 dark:text-[#92a4c9] text-xs text-center block">
							Drop here
						</span>
					</div>
				)}
			</div>
		</div>
	);
}
