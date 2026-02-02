'use client';

/**
 * Content Queue Grid Component
 * Responsive grid of story cards
 */

import { ContentItem } from '@/lib/types/posts';
import { ContentQueueCard } from './content-queue-card';
import { Inbox, ChevronDown, Loader2 } from 'lucide-react';

interface ContentQueueGridProps {
	items: ContentItem[];
	selectedIds: Set<string>;
	onSelect: (id: string) => void;
	onPreview: (item: ContentItem) => void;
	onEdit: (item: ContentItem) => void;
	onApprove?: (item: ContentItem) => void;
	isAdmin: boolean;
	isLoading?: boolean;
	hasMore?: boolean;
	onLoadMore?: () => void;
	isLoadingMore?: boolean;
}

function GridSkeleton() {
	return (
		<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
			{Array.from({ length: 6 }).map((_, i) => (
				<div
					key={i}
					className="flex flex-col overflow-hidden rounded-xl border border-[#2a3649] bg-[#1a2332] animate-pulse"
				>
					<div className="aspect-[9/16] bg-[#232f48]" />
					<div className="p-3 space-y-3">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<div className="h-6 w-6 rounded-full bg-[#2a3649]" />
								<div className="h-3 w-16 bg-[#2a3649] rounded" />
							</div>
							<div className="h-3 w-10 bg-[#2a3649] rounded" />
						</div>
						<div className="h-7 bg-[#2a3649] rounded" />
					</div>
				</div>
			))}
		</div>
	);
}

function EmptyState() {
	return (
		<div className="flex flex-col items-center justify-center py-20 px-4 text-center">
			<div className="p-6 bg-[#1a2332] rounded-full mb-6 border border-[#2a3649]">
				<Inbox className="h-12 w-12 text-[#92a4c9]" />
			</div>
			<h3 className="text-xl font-bold text-white mb-2">No content found</h3>
			<p className="text-[#92a4c9] max-w-sm">
				No stories match your current filters. Try adjusting them or upload new content.
			</p>
		</div>
	);
}

export function ContentQueueGrid({
	items,
	selectedIds,
	onSelect,
	onPreview,
	onEdit,
	onApprove,
	isAdmin,
	isLoading,
	hasMore,
	onLoadMore,
	isLoadingMore,
}: ContentQueueGridProps) {
	if (isLoading) {
		return <GridSkeleton />;
	}

	if (items.length === 0) {
		return <EmptyState />;
	}

	return (
		<div className="space-y-8">
			<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
				{items.map((item) => (
					<ContentQueueCard
						key={item.id}
						item={item}
						isSelected={selectedIds.has(item.id)}
						onSelect={onSelect}
						onPreview={onPreview}
						onEdit={onEdit}
						onApprove={onApprove}
						isAdmin={isAdmin}
					/>
				))}
			</div>

			{/* Load More Button */}
			{hasMore && onLoadMore && (
				<div className="flex justify-center pb-8">
					<button
						onClick={onLoadMore}
						disabled={isLoadingMore}
						className="flex items-center gap-2 rounded-lg border border-[#2a3649] bg-[#232f48] px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#2f3e5c] transition-colors disabled:opacity-50"
					>
						{isLoadingMore ? (
							<>
								<Loader2 className="h-5 w-5 animate-spin" />
								Loading...
							</>
						) : (
							<>
								Load More
								<ChevronDown className="h-5 w-5" />
							</>
						)}
					</button>
				</div>
			)}
		</div>
	);
}
