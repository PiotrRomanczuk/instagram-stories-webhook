'use client';

/**
 * Ready to Schedule Sidebar - Right panel showing approved content ready to be scheduled
 */

import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { ContentItem } from '@/lib/types/posts';
import { cn, formatRelativeTime } from '@/lib/utils';
import { CheckCircle, Clock, Grid2X2, List } from 'lucide-react';

interface ReadyToScheduleSidebarProps {
	items: ContentItem[];
	onItemClick?: (item: ContentItem) => void;
}

type FilterTab = 'all' | 'recent' | 'approved';
type ViewDensity = 'comfortable' | 'compact';

interface ReadyAssetCardProps {
	item: ContentItem;
	isScheduled?: boolean;
	onClick?: () => void;
}

function ReadyAssetCard({ item, isScheduled, onClick }: ReadyAssetCardProps) {
	const [imageError, setImageError] = useState(false);

	const { attributes, listeners, setNodeRef, transform, isDragging } =
		useDraggable({
			id: `ready-${item.id}`,
			data: { ...item, fromReadySidebar: true },
			disabled: isScheduled,
		});

	const style = transform
		? {
				transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
			}
		: undefined;

	const title = item.title || item.caption?.slice(0, 30) || 'Untitled';
	const isApproved = item.submissionStatus === 'approved';

	return (
		<div
			ref={setNodeRef}
			style={style}
			{...(!isScheduled ? listeners : {})}
			{...(!isScheduled ? attributes : {})}
			onClick={onClick}
			className={cn(
				'group relative aspect-[9/16] w-full overflow-hidden rounded-xl shadow-md transition-all',
				isDragging && 'z-50 opacity-80 shadow-2xl',
				isScheduled
					? 'opacity-50 cursor-not-allowed'
					: 'cursor-grab active:cursor-grabbing hover:ring-2 ring-[#2b6cee]'
			)}
		>
			{/* Background */}
			{!imageError ? (
				<div
					className="absolute inset-0 bg-cover bg-center bg-slate-800"
					style={{ backgroundImage: `url(${item.mediaUrl})` }}
				>
					<img
						src={item.mediaUrl}
						alt=""
						className="sr-only"
						onError={() => setImageError(true)}
					/>
				</div>
			) : (
				<div className="absolute inset-0 flex items-center justify-center bg-slate-800">
					<span className="text-xs text-slate-500">No preview</span>
				</div>
			)}

			{/* Scheduled overlay */}
			{isScheduled && (
				<div className="absolute inset-0 flex items-center justify-center bg-black/60">
					<span className="text-[10px] font-bold uppercase tracking-tight text-white">
						Already Scheduled
					</span>
				</div>
			)}

			{/* Status badge */}
			{!isScheduled && isApproved && (
				<div className="absolute left-2 top-2 flex gap-1">
					<span className="flex items-center gap-1 rounded bg-emerald-500/90 px-1.5 py-0.5 text-[8px] font-bold uppercase text-white">
						<CheckCircle className="h-2.5 w-2.5" />
						Approved
					</span>
				</div>
			)}

			{/* Gradient and info */}
			{!isScheduled && (
				<div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent p-3 flex flex-col justify-end">
					<p className="truncate text-xs font-bold text-white">{title}</p>
					<p className="text-[10px] text-white/70">
						{formatRelativeTime(item.createdAt)}
					</p>
				</div>
			)}
		</div>
	);
}

export function ReadyToScheduleSidebar({
	items,
	onItemClick,
}: ReadyToScheduleSidebarProps) {
	const [activeTab, setActiveTab] = useState<FilterTab>('all');
	const [viewDensity, setViewDensity] = useState<ViewDensity>('comfortable');

	// Filter items: only approved items that are not yet scheduled or published
	const readyItems = items.filter((item) => {
		const isApprovedOrDirect =
			item.submissionStatus === 'approved' || item.source === 'direct';
		const notPublished = item.publishingStatus !== 'published';
		const notScheduled =
			!item.scheduledTime || item.publishingStatus === 'draft';

		return isApprovedOrDirect && notPublished && notScheduled;
	});

	// Items that are already scheduled
	const scheduledIds = new Set(
		items
			.filter((item) => item.scheduledTime && item.publishingStatus === 'scheduled')
			.map((item) => item.id)
	);

	// Apply tab filter
	const filteredItems = readyItems.filter((item) => {
		switch (activeTab) {
			case 'recent':
				// Items from last 24 hours
				const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
				return new Date(item.createdAt).getTime() > dayAgo;
			case 'approved':
				return item.submissionStatus === 'approved';
			default:
				return true;
		}
	});

	const tabs: { key: FilterTab; label: string }[] = [
		{ key: 'all', label: 'All' },
		{ key: 'recent', label: 'Recent' },
		{ key: 'approved', label: 'Approved' },
	];

	return (
		<aside className="flex h-full w-80 flex-col border-l border-slate-800 bg-[#101622]">
			{/* Header */}
			<div className="border-b border-slate-800 p-4">
				<h3 className="flex items-center justify-between text-sm font-bold text-white">
					Ready to Schedule
					<span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
						{readyItems.length} assets
					</span>
				</h3>

				{/* Tabs */}
				<div className="mt-3 flex gap-2">
					{tabs.map((tab) => (
						<button
							key={tab.key}
							onClick={() => setActiveTab(tab.key)}
							className={cn(
								'flex-1 border-b-2 py-1.5 text-[10px] font-bold transition-colors',
								activeTab === tab.key
									? 'border-[#2b6cee] text-[#2b6cee]'
									: 'border-transparent text-slate-500 hover:text-slate-300'
							)}
						>
							{tab.label}
						</button>
					))}
				</div>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
				{filteredItems.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<Clock className="h-10 w-10 text-slate-600 mb-3" />
						<p className="text-sm font-medium text-slate-400">
							No content ready
						</p>
						<p className="mt-1 text-xs text-slate-500">
							Approved submissions will appear here
						</p>
					</div>
				) : (
					<div
						className={cn(
							'space-y-4',
							viewDensity === 'compact' && 'grid grid-cols-2 gap-2 space-y-0'
						)}
					>
						{filteredItems.map((item) => (
							<ReadyAssetCard
								key={item.id}
								item={item}
								isScheduled={scheduledIds.has(item.id)}
								onClick={() => onItemClick?.(item)}
							/>
						))}
					</div>
				)}
			</div>

			{/* Footer - Density controls */}
			<div className="border-t border-slate-800 bg-[#0d1421] p-4">
				<div className="flex items-center justify-between">
					<span className="text-[10px] font-bold uppercase text-slate-500">
						View Density
					</span>
					<div className="flex gap-2">
						<button
							onClick={() => setViewDensity('comfortable')}
							className={cn(
								'rounded-md p-1.5 transition-colors',
								viewDensity === 'comfortable'
									? 'bg-slate-800 text-[#2b6cee]'
									: 'text-slate-400 hover:bg-slate-800'
							)}
							title="Comfortable view"
						>
							<Grid2X2 className="h-4 w-4" />
						</button>
						<button
							onClick={() => setViewDensity('compact')}
							className={cn(
								'rounded-md p-1.5 transition-colors',
								viewDensity === 'compact'
									? 'bg-slate-800 text-[#2b6cee]'
									: 'text-slate-400 hover:bg-slate-800'
							)}
							title="Compact view"
						>
							<List className="h-4 w-4" />
						</button>
					</div>
				</div>
			</div>
		</aside>
	);
}
