'use client';

import { useState, useMemo, useCallback } from 'react';
import {
	ArrowLeft, ArrowRight, Check, Filter, Calendar, Archive,
	Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContentItem } from '@/lib/types/posts';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { SwipeableReadyCard } from './swipeable-ready-card';
import { useSwipeManager } from '@/app/hooks/use-swipe-manager';
import { ContentEditModal } from '../content/content-edit-modal';
import { ScheduleTimeSheet } from './schedule-time-sheet';
import { getNextAvailableSlot } from '@/lib/utils/schedule-time';
import type { SwipeDirection } from '@/app/hooks/use-swipe-manager';

interface MobileReadyToPostProps {
	items: ContentItem[];
	scheduledItems?: ContentItem[];
	onBack: () => void;
	onItemClick?: (item: ContentItem) => void;
	onRefresh?: () => void;
}

export function MobileReadyToPost({ items, scheduledItems = [], onBack, onItemClick, onRefresh }: MobileReadyToPostProps) {
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [selectMode, setSelectMode] = useState(false);
	const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
	const [isScheduling, setIsScheduling] = useState(false);
	const [dismissingCards, setDismissingCards] = useState<Set<string>>(new Set());
	const [editItem, setEditItem] = useState<ContentItem | null>(null);
	const [pendingScheduleItem, setPendingScheduleItem] = useState<ContentItem | null>(null);
	const [sortMode, setSortMode] = useState<'newest' | 'oldest' | 'type'>('newest');
	const [showSortMenu, setShowSortMenu] = useState(false);

	const swipeManager = useSwipeManager();

	// Filter to only ready-to-post items (approved/direct, not yet scheduled/published)
	const readyItems = useMemo(() => {
		const filtered = items.filter((item) => {
			if (dismissingCards.has(item.id)) return true; // Keep for exit animation
			const isApprovedOrDirect =
				item.submissionStatus === 'approved' || item.source === 'direct';
			const notPublished = item.publishingStatus !== 'published';
			const notScheduled = !item.scheduledTime || item.publishingStatus === 'draft';
			const notArchived = !item.archivedAt;
			return isApprovedOrDirect && notPublished && notScheduled && notArchived;
		});

		const getTime = (item: ContentItem) =>
			new Date(item.reviewedAt || item.updatedAt || item.createdAt).getTime();

		if (sortMode === 'oldest') {
			filtered.sort((a, b) => getTime(a) - getTime(b));
		} else if (sortMode === 'type') {
			filtered.sort((a, b) => {
				if (a.mediaType === 'VIDEO' && b.mediaType !== 'VIDEO') return -1;
				if (a.mediaType !== 'VIDEO' && b.mediaType === 'VIDEO') return 1;
				return getTime(b) - getTime(a);
			});
		} else {
			// newest (default)
			filtered.sort((a, b) => getTime(b) - getTime(a));
		}

		return filtered;
	}, [items, dismissingCards, sortMode]);

	const toggleSelect = useCallback((id: string) => {
		setSelectedIds(prev => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

	const clearSelection = useCallback(() => {
		setSelectedIds(new Set());
		setSelectMode(false);
	}, []);

	const handleSelectMode = useCallback(() => {
		if (selectMode) {
			clearSelection();
		} else {
			setSelectMode(true);
			swipeManager.closeCard();
		}
	}, [selectMode, clearSelection, swipeManager]);

	const handleCardClick = useCallback((item: ContentItem) => {
		if (selectMode) {
			toggleSelect(item.id);
		} else {
			onItemClick?.(item);
		}
	}, [selectMode, toggleSelect, onItemClick]);

	// Swipe-to-schedule handler: opens time picker instead of auto-scheduling
	const handleSwipeSchedule = useCallback((item: ContentItem) => {
		swipeManager.closeCard();
		setPendingScheduleItem(item);
	}, [swipeManager]);

	// Suggested initial time for the picker
	const suggestedTime = useMemo(() => {
		const existingTimes = scheduledItems
			.filter(i => i.scheduledTime)
			.map(i => i.scheduledTime!);
		return new Date(getNextAvailableSlot(existingTimes));
	}, [scheduledItems]);

	// Confirm schedule after user picks a time
	const handleConfirmSchedule = useCallback(async (item: ContentItem, scheduledTime: Date) => {
		setPendingScheduleItem(null);
		setDismissingCards(prev => new Set(prev).add(item.id));

		try {
			const response = await fetch(`/api/content/${item.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					scheduledTime: scheduledTime.getTime(),
					publishingStatus: 'scheduled',
					version: item.version,
				}),
			});

			if (!response.ok) {
				const responseData = await response.json();
				throw new Error(responseData.error || 'Failed to schedule');
			}

			toast.success(`Scheduled for ${format(scheduledTime, 'h:mm a')}`);

			setTimeout(() => {
				setDismissingCards(prev => {
					const next = new Set(prev);
					next.delete(item.id);
					return next;
				});
				onRefresh?.();
			}, 350);
		} catch (err) {
			setDismissingCards(prev => {
				const next = new Set(prev);
				next.delete(item.id);
				return next;
			});
			toast.error(err instanceof Error ? err.message : 'Failed to schedule');
		}
	}, [onRefresh]);

	// Swipe-to-archive handler
	const handleSwipeArchive = useCallback(async (item: ContentItem) => {
		setDismissingCards(prev => new Set(prev).add(item.id));

		try {
			const response = await fetch(`/api/content/${item.id}/archive`, {
				method: 'POST',
			});

			if (!response.ok) {
				const responseData = await response.json();
				throw new Error(responseData.error || 'Failed to archive');
			}

			toast.success('Content archived');

			setTimeout(() => {
				setDismissingCards(prev => {
					const next = new Set(prev);
					next.delete(item.id);
					return next;
				});
				onRefresh?.();
			}, 350);
		} catch (err) {
			setDismissingCards(prev => {
				const next = new Set(prev);
				next.delete(item.id);
				return next;
			});
			toast.error(err instanceof Error ? err.message : 'Failed to archive');
		}
	}, [onRefresh]);

	// Edit handler from swipe
	const handleSwipeEdit = useCallback((item: ContentItem) => {
		swipeManager.closeCard();
		setEditItem(item);
	}, [swipeManager]);

	const handleScheduleAll = useCallback(async () => {
		if (selectedIds.size === 0) return;
		setIsScheduling(true);
		try {
			const now = Date.now();
			const ids = Array.from(selectedIds);
			let offset = 0;

			for (const id of ids) {
				const item = readyItems.find(i => i.id === id);
				if (!item) continue;
				const scheduledTime = now + offset;
				const response = await fetch(`/api/content/${id}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						scheduledTime,
						publishingStatus: 'scheduled',
						version: item.version,
					}),
				});
				if (!response.ok) {
					const responseData = await response.json();
					throw new Error(responseData.error || 'Failed to schedule item');
				}
				offset += 30 * 60 * 1000;
			}

			toast.success(`Scheduled ${ids.length} post${ids.length !== 1 ? 's' : ''}`);
			clearSelection();
			onRefresh?.();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to schedule');
		} finally {
			setIsScheduling(false);
		}
	}, [selectedIds, readyItems, clearSelection, onRefresh]);

	return (
		<motion.div
			initial={{ x: '100%' }}
			animate={{ x: 0 }}
			exit={{ x: '100%' }}
			transition={{ type: 'spring', damping: 26, stiffness: 200 }}
			className="fixed inset-0 z-50 flex flex-col bg-gray-100 dark:bg-[#0f1115] text-gray-900 dark:text-gray-100"
		>
			{/* Header */}
			<header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white/90 px-4 backdrop-blur-xl dark:border-gray-800 dark:bg-[#181b21]/90">
				<div className="flex items-center gap-3">
					<button
						onClick={onBack}
						className="-ml-2 rounded-full p-2 text-gray-500 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
					>
						<ArrowLeft className="h-6 w-6" />
					</button>
					<div>
						<h1 className="text-lg font-bold leading-tight text-gray-900 dark:text-white">Ready to Post</h1>
						<p className="text-xs text-gray-500 dark:text-gray-400">{readyItems.filter(i => !dismissingCards.has(i.id)).length} items approved</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<button
						onClick={handleSelectMode}
						className={cn(
							'rounded-lg px-2 py-2 text-sm font-semibold transition',
							selectMode
								? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
								: 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
						)}
					>
						{selectMode ? 'Cancel' : 'Select'}
					</button>
					{selectMode && (() => {
						const activeItems = readyItems.filter(i => !dismissingCards.has(i.id));
						const allSelected = activeItems.length > 0 && selectedIds.size === activeItems.length;
						return (
							<button
								onClick={() => {
									if (allSelected) {
										setSelectedIds(new Set());
									} else {
										setSelectedIds(new Set(activeItems.map(i => i.id)));
									}
								}}
								className="rounded-lg px-2 py-2 text-sm font-semibold text-blue-500 transition hover:bg-blue-50 dark:hover:bg-blue-900/20"
							>
								{allSelected ? 'Deselect All' : 'Select All'}
							</button>
						);
					})()}
					<div className="relative">
						<button
							onClick={() => setShowSortMenu(prev => !prev)}
							className={cn(
								'rounded-full p-2 transition',
								showSortMenu
									? 'bg-blue-50 text-blue-500 dark:bg-blue-900/20'
									: 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
							)}
						>
							<Filter className="h-6 w-6" />
						</button>
						{showSortMenu && (
							<div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-[#1f2229]">
								{([
									['newest', 'Newest First'],
									['oldest', 'Oldest First'],
									['type', 'By Media Type'],
								] as const).map(([value, label]) => (
									<button
										key={value}
										onClick={() => { setSortMode(value); setShowSortMenu(false); }}
										className={cn(
											'flex w-full items-center px-4 py-2.5 text-sm transition',
											sortMode === value
												? 'font-semibold text-blue-500 bg-blue-50 dark:bg-blue-900/20'
												: 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
										)}
									>
										{label}
										{sortMode === value && <Check className="ml-auto h-4 w-4" />}
									</button>
								))}
							</div>
						)}
					</div>
				</div>
			</header>

			{/* Swipe Hint */}
			{!selectMode && readyItems.length > 0 && (
				<div className="flex items-center justify-center gap-4 px-4 py-2 text-xs font-medium text-gray-400 dark:text-gray-500">
					<span className="flex items-center gap-1"><ArrowLeft className="h-3 w-3" /> Archive</span>
					<span className="text-gray-300 dark:text-gray-600">|</span>
					<span className="flex items-center gap-1">Schedule <ArrowRight className="h-3 w-3" /></span>
				</div>
			)}

			{/* Card List */}
			<main className="flex-1 overflow-y-auto pb-32 pt-1">
				{readyItems.length === 0 ? (
					<div className="flex flex-col items-center justify-center px-8 py-20 text-center">
						<Clock className="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
						<h3 className="mb-1 text-lg font-bold text-gray-700 dark:text-gray-300">No content ready</h3>
						<p className="text-sm text-gray-400 dark:text-gray-500">
							Approved submissions will appear here
						</p>
					</div>
				) : (
					<AnimatePresence mode="popLayout">
						{readyItems.map((item, index) => {
							const isSelected = selectedIds.has(item.id);
							return (
								<SwipeableReadyCard
									key={item.id}
									item={item}
									isSelected={isSelected}
									selectMode={selectMode}
									imageError={imageErrors.has(item.id)}
									onImageError={() => setImageErrors(prev => new Set(prev).add(item.id))}
									onClick={() => handleCardClick(item)}
									onSchedule={handleSwipeSchedule}
									onEdit={handleSwipeEdit}
									onArchive={handleSwipeArchive}
									isOpen={swipeManager.isCardOpen(item.id)}
									openDirection={swipeManager.getCardDirection(item.id)}
									onOpenChange={(isOpen: boolean, direction: SwipeDirection | null) => {
										swipeManager.toggleCard(item.id, isOpen, direction ?? undefined);
									}}
									isDismissing={dismissingCards.has(item.id)}
									isFirst={index === 0}
								/>
							);
						})}
					</AnimatePresence>
				)}
			</main>

			{/* Selection Action Bar */}
			{selectedIds.size > 0 && (
				<div className="fixed bottom-24 left-4 right-4 z-40">
					<div className="flex flex-col gap-3 rounded-2xl bg-gray-900 p-4 shadow-xl shadow-black/20 dark:bg-white">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
									{selectedIds.size}
								</div>
								<div className="flex flex-col">
									<span className="text-sm font-bold text-white dark:text-gray-900">
										Post{selectedIds.size !== 1 ? 's' : ''} Selected
									</span>
									<span className="text-xs text-gray-400 dark:text-gray-500">
										{(() => {
											const now = new Date();
											const times = Array.from({ length: selectedIds.size }, (_, i) =>
												new Date(now.getTime() + i * 30 * 60 * 1000)
											);
											const shown = times.slice(0, 3).map(t => format(t, 'h:mm'));
											const lastTime = times[Math.min(2, times.length - 1)];
											const ampm = format(lastTime, 'a');
											const remaining = times.length - 3;
											return `→ ${shown.join(', ')} ${ampm}${remaining > 0 ? ` + ${remaining} more` : ''}`;
										})()}
									</span>
								</div>
							</div>
							<button
								onClick={clearSelection}
								className="text-xs font-medium text-gray-400 transition hover:text-white dark:hover:text-black"
							>
								Clear
							</button>
						</div>
						<div className="flex gap-2">
							<button
								onClick={handleScheduleAll}
								disabled={isScheduling}
								className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-600 active:scale-95 disabled:opacity-50"
							>
								<Calendar className="h-[18px] w-[18px]" />
								{isScheduling ? 'Scheduling...' : 'Schedule All'}
							</button>
							<button className="flex w-12 items-center justify-center rounded-xl bg-gray-700 transition hover:bg-gray-600 active:scale-95 dark:bg-gray-200 dark:hover:bg-gray-300">
								<Archive className="h-5 w-5 text-white dark:text-gray-900" />
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Schedule Time Picker */}
			{pendingScheduleItem && (
				<ScheduleTimeSheet
					item={pendingScheduleItem}
					initialDate={suggestedTime}
					onConfirm={handleConfirmSchedule}
					onCancel={() => setPendingScheduleItem(null)}
				/>
			)}

			{/* Edit Modal */}
			{editItem && (
				<ContentEditModal
					item={editItem}
					onClose={() => setEditItem(null)}
					onSave={() => {
						setEditItem(null);
						onRefresh?.();
					}}
				/>
			)}
		</motion.div>
	);
}
