'use client';

/**
 * Schedule Calendar Layout - Main layout for the redesigned schedule page
 * Uses the standard app navbar and integrates with the main layout
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { toast } from 'sonner';
import { setHours, setMinutes, format, isSameDay, getHours } from 'date-fns';

import { ScheduleHeader, ViewMode, ScheduleViewType } from './schedule-header';

// Granularity levels in minutes (from coarse to fine)
const GRANULARITY_LEVELS = [60, 30, 15, 5, 1] as const;
export type Granularity = (typeof GRANULARITY_LEVELS)[number];
import { ScheduleCalendarGrid } from './schedule-calendar-grid';
import { ScheduleListView } from './schedule-list-view';
import { WeekStrip } from './week-strip';
import { ReadyToScheduleSidebar } from './ready-to-schedule-sidebar';
import { ScheduleCalendarItem } from './schedule-calendar-item';
import { ContentPreviewModal } from '../content/content-preview-modal';
import { ContentEditModal } from '../content/content-edit-modal';
import { ContentItem } from '@/lib/types/posts';
import type { UserRole } from '@/lib/types/posts';
import { Layers, ChevronRight } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { TimelineLayout, groupPostsByTime } from '../schedule-mobile/timeline-layout';
import type { TimelineCardPost } from '../schedule-mobile/timeline-card';
import { MobileScheduleView } from '../schedule-mobile/mobile-schedule-view';
import { MobileReadyToPost } from '../schedule-mobile/mobile-ready-to-post';
import { FailedPostsBulkActions } from '../schedule/failed-posts-bulk-actions';
import { useMediaQuery } from '@/app/hooks/use-media-query';
import { usePageTour } from '@/app/hooks/use-page-tour';
import { adminScheduleTourSteps } from '@/lib/tour/admin-schedule-tour';
import { TourTriggerButton } from '@/app/components/tour/tour-trigger-button';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function ScheduleCalendarLayout() {
	const { data: session } = useSession();
	const router = useRouter();
	const searchParams = useSearchParams();
	const statusFilter = searchParams.get('filter');

	// Calendar state - day view only
	const [currentDate, setCurrentDate] = useState(new Date());
	const [searchQuery, setSearchQuery] = useState('');
	const [granularity, setGranularity] = useState<Granularity>(15);
	const [scheduleViewType, setScheduleViewType] = useState<ScheduleViewType>(
		statusFilter === 'failed' ? 'list' : 'calendar'
	);

	const increaseGranularity = useCallback(() => {
		const idx = GRANULARITY_LEVELS.indexOf(granularity);
		if (idx < GRANULARITY_LEVELS.length - 1) {
			setGranularity(GRANULARITY_LEVELS[idx + 1]);
		}
	}, [granularity]);

	const decreaseGranularity = useCallback(() => {
		const idx = GRANULARITY_LEVELS.indexOf(granularity);
		if (idx > 0) {
			setGranularity(GRANULARITY_LEVELS[idx - 1]);
		}
	}, [granularity]);

	// Mobile sidebar state
	const [showMobileSidebar, setShowMobileSidebar] = useState(false);

	// Drag state
	const [activeId, setActiveId] = useState<string | null>(null);
	const [activeItem, setActiveItem] = useState<ContentItem | null>(null);

	// Modal state
	const [previewItem, setPreviewItem] = useState<ContentItem | null>(null);
	const [editItem, setEditItem] = useState<ContentItem | null>(null);

	// Determine user role
	const userRole = (session?.user as { role?: UserRole })?.role;
	const isAdmin = userRole === 'admin' || userRole === 'developer';

	// Fetch all content items
	const { data, error, isLoading, mutate } = useSWR(
		`/api/content?limit=100&sortBy=newest`,
		fetcher,
		{
			revalidateOnFocus: false,
			dedupingInterval: 5000,
		}
	);

	const allItems: ContentItem[] = data?.items || [];

	// Filter scheduled items (items with scheduledTime)
	const scheduledItems = useMemo(() => {
		return allItems.filter(
			(item) =>
				item.scheduledTime &&
				(item.publishingStatus === 'scheduled' ||
					item.publishingStatus === 'processing' ||
					item.publishingStatus === 'published' ||
					item.publishingStatus === 'failed')
		);
	}, [allItems]);

	// Filter ready items (approved but not yet scheduled/published/archived)
	const readyItems = useMemo(() => {
		return allItems.filter((item) => {
			const isApproved =
				item.submissionStatus === 'approved' || item.source === 'direct';
			const notPublished = item.publishingStatus !== 'published';
			const notScheduled = !item.scheduledTime || item.publishingStatus === 'draft';
			const notArchived = !item.archivedAt;
			return isApproved && notPublished && notScheduled && notArchived;
		});
	}, [allItems]);

	// When filter=failed, show all failed items regardless of scheduledTime
	const displayItems = useMemo(() => {
		if (statusFilter === 'failed') {
			return allItems.filter((item) => item.publishingStatus === 'failed');
		}
		return scheduledItems;
	}, [statusFilter, allItems, scheduledItems]);

	// Convert ContentItems to TimelineCardPosts for timeline view
	const timelinePosts: TimelineCardPost[] = useMemo(() => {
		return scheduledItems
			.filter((item) => item.scheduledTime)
			.map((item) => ({
				id: item.id,
				url: item.mediaUrl || '',
				caption: item.caption || '',
				scheduledTime: item.scheduledTime!,
				publishingStatus: (item.publishingStatus || 'scheduled') as TimelineCardPost['publishingStatus'],
				mediaType: item.mediaType as 'IMAGE' | 'VIDEO' | undefined,
			}));
	}, [scheduledItems]);

	const timelineGroups = useMemo(() => groupPostsByTime(timelinePosts), [timelinePosts]);

	// Item counts per date for week strip
	const itemCountsByDate = useMemo(() => {
		const counts: Record<string, number> = {};
		for (const item of scheduledItems) {
			if (!item.scheduledTime) continue;
			const dateKey = format(new Date(item.scheduledTime), 'yyyy-MM-dd');
			counts[dateKey] = (counts[dateKey] || 0) + 1;
		}
		return counts;
	}, [scheduledItems]);

	const totalScheduled = scheduledItems.filter(
		(item) => item.publishingStatus === 'scheduled'
	).length;

	// Drag handlers
	const handleDragStart = useCallback(
		(event: DragStartEvent) => {
			const draggedId = String(event.active.id);
			setActiveId(draggedId);

			// Find the item being dragged
			const isFromReady = draggedId.startsWith('ready-');
			const itemId = isFromReady ? draggedId.replace('ready-', '') : draggedId;

			const item = allItems.find((i) => i.id === itemId);
			setActiveItem(item || null);
		},
		[allItems]
	);

	const handleDragEnd = useCallback(
		async (event: DragEndEvent) => {
			setActiveId(null);
			setActiveItem(null);

			const { active, over } = event;
			if (!over) return;

			const draggedId = String(active.id);
			const dropData = over.data.current as { day: Date; hour: number; minute?: number } | null;

			if (!dropData) return;

			const isFromReady = draggedId.startsWith('ready-');
			const itemId = isFromReady ? draggedId.replace('ready-', '') : draggedId;
			const item = allItems.find((i) => i.id === itemId);

			if (!item) return;

			// Create scheduled time from drop target (hour + minute)
			const minute = dropData.minute ?? 0;
			const scheduledTime = setMinutes(setHours(dropData.day, dropData.hour), minute);

			// If it's already published, don't allow rescheduling
			if (item.publishingStatus === 'published') {
				toast.error('Cannot reschedule a published item');
				return;
			}

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

				if (response.ok) {
					toast.success(
						isFromReady
							? `Scheduled for ${format(scheduledTime, 'MMM d, h:mm a')}`
							: `Rescheduled to ${format(scheduledTime, 'MMM d, h:mm a')}`
					);
					mutate();
				} else {
					const data = await response.json();
					toast.error(data.error || 'Failed to schedule');
				}
			} catch (err) {
				console.error('Failed to schedule:', err);
				toast.error('Failed to schedule item');
			}
		},
		[allItems, mutate]
	);

	const handleOpenPreview = useCallback((item: ContentItem) => {
		setPreviewItem(item);
	}, []);

	const handlePublishNow = useCallback(() => {
		router.push('/review');
	}, [router]);

	const handleNewSchedule = useCallback(() => {
		router.push('/content');
	}, [router]);

	const isMobile = useMediaQuery('(max-width: 1023px)');

	// Page tour for mobile schedule view
	const { startTour: startScheduleTour } = usePageTour({
		page: 'admin-schedule',
		steps: adminScheduleTourSteps,
		autoStart: isMobile,
	});

	// Mobile: show Stitch-based mobile schedule view
	if (isMobile) {
		return (
			<>
				<div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden text-gray-900 dark:text-slate-100">
					{/* Tour replay button - fixed position */}
					<div className="fixed top-3 right-3 z-30">
						<TourTriggerButton onStartTour={startScheduleTour} />
					</div>
					<MobileScheduleView
						scheduledItems={displayItems}
						currentDate={currentDate}
						onDateChange={setCurrentDate}
						onItemClick={handleOpenPreview}
						onRefresh={mutate}
						readyCount={readyItems.length}
						onReadyClick={() => setShowMobileSidebar(true)}
						statusFilter={statusFilter}
					/>
				</div>

				{/* Mobile Ready to Post - Full-screen Stitch view */}
				<AnimatePresence>
					{showMobileSidebar && (
						<MobileReadyToPost
							items={readyItems}
							scheduledItems={scheduledItems}
							onBack={() => setShowMobileSidebar(false)}
							onItemClick={(item) => {
								setShowMobileSidebar(false);
								handleOpenPreview(item);
							}}
							onRefresh={mutate}
						/>
					)}
				</AnimatePresence>

				{/* Preview Modal */}
				{previewItem && (
					<ContentPreviewModal
						item={previewItem}
						onClose={() => setPreviewItem(null)}
						onEdit={(item) => { setPreviewItem(null); setEditItem(item); }}
						onRefresh={mutate}
						isAdmin={isAdmin}
						items={displayItems}
						currentIndex={displayItems.findIndex((i) => i.id === previewItem.id)}
						onNavigate={(item) => setPreviewItem(item)}
					/>
				)}
				{editItem && (
					<ContentEditModal item={editItem} onClose={() => setEditItem(null)} onSave={mutate} />
				)}
			</>
		);
	}

	// Desktop: existing layout
	return (
		<DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
			<div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-gray-50 text-gray-900 dark:bg-[#101622] dark:text-slate-100">
				{/* Main Content Area */}
				<main className="flex flex-1 flex-col overflow-hidden">
					{/* Top Header */}
					<ScheduleHeader
						currentDate={currentDate}
						viewMode="day"
						onDateChange={setCurrentDate}
						onViewModeChange={() => {}}
						onPublishNow={handlePublishNow}
						onNewSchedule={handleNewSchedule}
						searchQuery={searchQuery}
						onSearchChange={setSearchQuery}
						granularity={granularity}
						onIncreaseGranularity={increaseGranularity}
						onDecreaseGranularity={decreaseGranularity}
						scheduleViewType={scheduleViewType}
						onScheduleViewTypeChange={setScheduleViewType}
					/>

					{/* Week strip for list view */}
					{scheduleViewType === 'list' && (
						<WeekStrip
							selectedDate={currentDate}
							onDateSelect={setCurrentDate}
							itemCounts={itemCountsByDate}
						/>
					)}

					{/* View content + Sidebar */}
					<div className="flex flex-1 overflow-hidden">
						{/* View content based on type */}
						{scheduleViewType === 'calendar' && (
							<ScheduleCalendarGrid
								currentDate={currentDate}
								scheduledItems={scheduledItems}
								onItemClick={handleOpenPreview}
								granularity={granularity}
								onIncreaseGranularity={increaseGranularity}
								onDecreaseGranularity={decreaseGranularity}
							/>
						)}

						{scheduleViewType === 'timeline' && (
							<div className="flex-1 overflow-auto bg-gray-50 p-4 dark:bg-[#070b13]">
								<TimelineLayout
									groups={timelineGroups}
									onPostClick={() => {}}
									enableSwipe
								/>
							</div>
						)}

						{scheduleViewType === 'list' && (
							<div className="flex flex-1 flex-col overflow-hidden">
								{statusFilter === 'failed' && (
									<FailedPostsBulkActions
										failedItems={displayItems.filter((i) => i.publishingStatus === 'failed')}
										onRefresh={mutate}
									/>
								)}
								<ScheduleListView
									currentDate={currentDate}
									scheduledItems={displayItems}
									onItemClick={handleOpenPreview}
									showAllDates={statusFilter === 'failed'}
								/>
							</div>
						)}

						{/* Ready to Schedule Sidebar - hidden on mobile, visible on lg+ */}
						<div className="hidden lg:flex">
							<ReadyToScheduleSidebar
								items={readyItems}
								onOpenPreview={handleOpenPreview}
								onRefresh={mutate}
							/>
						</div>
					</div>

					{/* Mobile Sidebar Toggle Button */}
					<button
						type="button"
						onClick={() => setShowMobileSidebar(true)}
						className="fixed bottom-6 right-4 z-40 flex items-center gap-2 rounded-full bg-[#2b6cee] px-4 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 lg:hidden"
					>
						<Layers className="h-4 w-4" />
						Ready
						{readyItems.length > 0 && (
							<span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/20 px-1.5 text-xs font-bold">
								{readyItems.length}
							</span>
						)}
						<ChevronRight className="h-4 w-4" />
					</button>

					{/* Mobile Sidebar Overlay */}
					{showMobileSidebar && (
						<div className="fixed inset-0 z-50 lg:hidden">
							<div
								className="absolute inset-0 bg-black/50"
								onClick={() => setShowMobileSidebar(false)}
							/>
							<div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white dark:bg-[#101622]">
								<ReadyToScheduleSidebar
									items={readyItems}
									onOpenPreview={(item) => {
										setShowMobileSidebar(false);
										handleOpenPreview(item);
									}}
									onRefresh={mutate}
									onClose={() => setShowMobileSidebar(false)}
								/>
							</div>
						</div>
					)}

					{/* Footer Legend */}
					<footer className="flex items-center justify-between border-t border-gray-200 bg-gray-100 px-3 py-2 text-[10px] text-gray-500 lg:px-6 dark:border-slate-800 dark:bg-[#0d1421] dark:text-slate-500">
						<div className="flex gap-3 lg:gap-6">
							<div className="flex items-center gap-1.5 lg:gap-2">
								<span className="h-2 w-2 rounded-full bg-[#2b6cee]" />
								<span>Scheduled</span>
							</div>
							<div className="flex items-center gap-1.5 lg:gap-2">
								<span className="h-2 w-2 rounded-full bg-emerald-500" />
								<span>Published</span>
							</div>
							<div className="flex items-center gap-1.5 lg:gap-2">
								<span className="h-2 w-2 rounded-full bg-red-500" />
								<span>Failed</span>
							</div>
							<div className="hidden items-center gap-2 lg:flex">
								<Layers className="h-3 w-3" />
								<span>Drag to reschedule</span>
							</div>
						</div>
						<div className="font-medium">
							Total Scheduled:{' '}
							<span className="text-gray-900 dark:text-white">{totalScheduled}</span>
						</div>
					</footer>
				</main>
			</div>

			{/* Drag Overlay */}
			<DragOverlay>
				{activeItem && (
					<div className="w-20 opacity-90">
						<ScheduleCalendarItem
							item={activeItem}
							isDraggable={false}
						/>
					</div>
				)}
			</DragOverlay>

			{/* Preview Modal */}
			{previewItem && (
				<ContentPreviewModal
					item={previewItem}
					onClose={() => setPreviewItem(null)}
					onEdit={(item) => {
						setPreviewItem(null);
						setEditItem(item);
					}}
					onRefresh={mutate}
					isAdmin={isAdmin}
					items={displayItems}
					currentIndex={displayItems.findIndex((i) => i.id === previewItem.id)}
					onNavigate={(item) => setPreviewItem(item)}
				/>
			)}

			{/* Edit Modal */}
			{editItem && (
				<ContentEditModal
					item={editItem}
					onClose={() => setEditItem(null)}
					onSave={mutate}
				/>
			)}
		</DndContext>
	);
}
