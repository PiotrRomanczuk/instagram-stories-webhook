'use client';

/**
 * Ready to Schedule Sidebar - Right panel showing approved content ready to be scheduled
 */

import { useState, useRef, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { ContentItem } from '@/lib/types/posts';
import { cn, formatRelativeTime } from '@/lib/utils';
import { CheckCircle, Clock, Grid2X2, List, MoreVertical, Eye, X, Play } from 'lucide-react';
import { QuickSchedulePopover } from './quick-schedule-popover';

interface ReadyToScheduleSidebarProps {
	items: ContentItem[];
	onOpenPreview?: (item: ContentItem) => void;
	onRefresh?: () => void;
	className?: string;
	onClose?: () => void;
}

type FilterTab = 'all' | 'recent' | 'approved';
type ViewDensity = 'comfortable' | 'compact';

interface ReadyAssetCardProps {
	item: ContentItem;
	isScheduled?: boolean;
	isPopoverOpen: boolean;
	onOpenPopover: () => void;
	onClosePopover: () => void;
	onOpenPreview: () => void;
	onScheduleComplete: () => void;
}

function ReadyAssetCard({
	item,
	isScheduled,
	isPopoverOpen,
	onOpenPopover,
	onClosePopover,
	onOpenPreview,
	onScheduleComplete,
}: ReadyAssetCardProps) {
	const [imageError, setImageError] = useState(false);
	const [showMenu, setShowMenu] = useState(false);
	const isVideo = item.mediaType === 'VIDEO';
	const thumbnailSrc = isVideo && item.thumbnailUrl ? item.thumbnailUrl : item.mediaUrl;
	const menuRef = useRef<HTMLDivElement>(null);

	const { attributes, listeners, setNodeRef, transform, isDragging } =
		useDraggable({
			id: `ready-${item.id}`,
			data: { ...item, fromReadySidebar: true },
			disabled: isScheduled,
		});

	// Close popover when dragging starts
	useEffect(() => {
		if (isDragging && isPopoverOpen) {
			onClosePopover();
		}
	}, [isDragging, isPopoverOpen, onClosePopover]);

	// Close menu on outside click
	useEffect(() => {
		if (!showMenu) return;

		const handleClickOutside = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setShowMenu(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [showMenu]);

	const style = transform
		? {
				transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
			}
		: undefined;

	const title = item.title || item.caption?.slice(0, 30) || 'Untitled';
	const isApproved = item.submissionStatus === 'approved';

	const handleCardClick = (e: React.MouseEvent) => {
		// Don't open popover if clicking on menu button
		if ((e.target as HTMLElement).closest('[data-menu-trigger]')) {
			return;
		}
		if (!isScheduled) {
			onOpenPopover();
		}
	};

	const handleMenuClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		setShowMenu(!showMenu);
	};

	const handleViewDetails = (e: React.MouseEvent) => {
		e.stopPropagation();
		setShowMenu(false);
		onOpenPreview();
	};

	return (
		<QuickSchedulePopover
			item={item}
			isOpen={isPopoverOpen}
			onOpenChange={(open) => {
				if (open) onOpenPopover();
				else onClosePopover();
			}}
			onScheduleComplete={onScheduleComplete}
		>
			<div
				ref={setNodeRef}
				style={style}
				{...(!isScheduled ? listeners : {})}
				{...(!isScheduled ? attributes : {})}
				onClick={handleCardClick}
				data-draggable-id={`ready-${item.id}`}
				className={cn(
					'group relative aspect-[9/16] w-full overflow-hidden rounded-xl shadow-md transition-all',
					isDragging && 'z-50 opacity-80 shadow-2xl',
					isScheduled
						? 'cursor-not-allowed opacity-50'
						: 'cursor-grab hover:ring-2 ring-[#2b6cee] active:cursor-grabbing',
					isPopoverOpen && 'ring-2 ring-[#2b6cee]'
				)}
			>
				{/* Background */}
				{!imageError ? (
					<div className="absolute inset-0 flex items-center justify-center bg-black">
						<img
							src={thumbnailSrc}
							alt={title}
							className="h-full w-full object-contain"
							onError={() => setImageError(true)}
						/>
						{isVideo && (
							<div className="absolute inset-0 flex items-center justify-center">
								<div className="rounded-full bg-black/50 p-2 backdrop-blur-sm">
									<Play className="h-5 w-5 text-white" fill="white" />
								</div>
							</div>
						)}
					</div>
				) : (
					<div className="absolute inset-0 flex items-center justify-center bg-gray-200">
						<span className="text-xs text-gray-500">
							No preview
						</span>
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

				{/* Three-dot menu */}
				{!isScheduled && (
					<div className="absolute right-2 top-2" ref={menuRef}>
						<button
							type="button"
							data-menu-trigger
							onClick={handleMenuClick}
							className="rounded-full bg-black/50 p-1 opacity-0 transition hover:bg-black/70 group-hover:opacity-100"
						>
							<MoreVertical className="h-4 w-4 text-white" />
						</button>

						{/* Dropdown menu */}
						{showMenu && (
							<div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
								<button
									type="button"
									onClick={handleViewDetails}
									className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 transition hover:bg-gray-100"
								>
									<Eye className="h-3.5 w-3.5" />
									View Full Details
								</button>
							</div>
						)}
					</div>
				)}

				{/* Gradient and info */}
				{!isScheduled && (
					<div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 to-transparent p-3">
						<p className="truncate text-xs font-bold text-white">{title}</p>
						<p className="text-[10px] text-white/70">
							{formatRelativeTime(item.createdAt)}
						</p>
					</div>
				)}
			</div>
		</QuickSchedulePopover>
	);
}

export function ReadyToScheduleSidebar({
	items,
	onOpenPreview,
	onRefresh,
	className,
	onClose,
}: ReadyToScheduleSidebarProps) {
	const [activeTab, setActiveTab] = useState<FilterTab>('all');
	const [viewDensity, setViewDensity] = useState<ViewDensity>('comfortable');
	const [activePopoverId, setActivePopoverId] = useState<string | null>(null);

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
			.filter(
				(item) => item.scheduledTime && item.publishingStatus === 'scheduled'
			)
			.map((item) => item.id)
	);

	// Capture current time once to avoid Date.now() in render
	const [filterNow] = useState(() => Date.now());

	// Capture current time once to avoid Date.now() in render

	// Apply tab filter
	const filteredItems = readyItems.filter((item) => {
		switch (activeTab) {
			case 'recent':
				// Items from last 24 hours
				const dayAgo = filterNow - 24 * 60 * 60 * 1000;
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

	const handleScheduleComplete = () => {
		setActivePopoverId(null);
		onRefresh?.();
	};

	return (
		<aside className={cn(
			'flex h-full w-full lg:w-80 flex-col border-l border-gray-200 bg-white',
			className
		)}>
			{/* Header */}
			<div className="border-b border-gray-200 p-4">
				<h3 className="flex items-center justify-between text-sm font-bold text-gray-900">
					<span className="flex items-center gap-2">
						Ready to Schedule
						{onClose && (
							<button
								type="button"
								onClick={onClose}
								className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 lg:hidden"
								aria-label="Close sidebar"
							>
								<X className="h-4 w-4" />
							</button>
						)}
					</span>
					<span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
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
									: 'border-transparent text-gray-500 hover:text-gray-700'
							)}
						>
							{tab.label}
						</button>
					))}
				</div>
			</div>

			{/* Content */}
			<div className="custom-scrollbar flex-1 overflow-y-auto p-4">
				{filteredItems.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<Clock className="mb-3 h-10 w-10 text-gray-400" />
						<p className="text-sm font-medium text-gray-500">
							No content ready
						</p>
						<p className="mt-1 text-xs text-gray-400">
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
								isPopoverOpen={activePopoverId === item.id}
								onOpenPopover={() => setActivePopoverId(item.id)}
								onClosePopover={() => setActivePopoverId(null)}
								onOpenPreview={() => onOpenPreview?.(item)}
								onScheduleComplete={handleScheduleComplete}
							/>
						))}
					</div>
				)}
			</div>

			{/* Footer - Density controls */}
			<div className="border-t border-gray-200 bg-gray-50 p-4">
				<div className="flex items-center justify-between">
					<span className="text-[10px] font-bold uppercase text-gray-500">
						View Density
					</span>
					<div className="flex gap-2">
						<button
							onClick={() => setViewDensity('comfortable')}
							className={cn(
								'rounded-md p-1.5 transition-colors',
								viewDensity === 'comfortable'
									? 'bg-gray-200 text-[#2b6cee]'
									: 'text-gray-400 hover:bg-gray-200'
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
									? 'bg-gray-200 text-[#2b6cee]'
									: 'text-gray-400 hover:bg-gray-200'
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
