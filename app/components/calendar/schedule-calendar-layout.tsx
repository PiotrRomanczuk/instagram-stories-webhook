'use client';

/**
 * Schedule Calendar Layout - Main layout for the redesigned schedule page
 * Uses the standard app navbar and integrates with the main layout
 */

import { useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { toast } from 'sonner';
import { setHours, setMinutes, format } from 'date-fns';

import { ScheduleHeader, ViewMode } from './schedule-header';
import { ScheduleCalendarGrid } from './schedule-calendar-grid';
import { ReadyToScheduleSidebar } from './ready-to-schedule-sidebar';
import { ScheduleCalendarItem } from './schedule-calendar-item';
import { ContentPreviewModal } from '../content/content-preview-modal';
import { ContentEditModal } from '../content/content-edit-modal';
import { ContentItem } from '@/lib/types/posts';
import type { UserRole } from '@/lib/types/posts';
import { Layers } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function ScheduleCalendarLayout() {
	const { data: session } = useSession();
	const router = useRouter();

	// Calendar state - day view only
	const [currentDate, setCurrentDate] = useState(new Date());
	const [searchQuery, setSearchQuery] = useState('');

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

	// Filter ready items (approved but not scheduled)
	const readyItems = useMemo(() => {
		return allItems.filter((item) => {
			const isApproved =
				item.submissionStatus === 'approved' || item.source === 'direct';
			return isApproved;
		});
	}, [allItems]);

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
					/>

					{/* Calendar + Sidebar */}
					<div className="flex flex-1 overflow-hidden">
						{/* Calendar Grid */}
						<ScheduleCalendarGrid
							currentDate={currentDate}
							scheduledItems={scheduledItems}
							onItemClick={handleOpenPreview}
						/>

						{/* Ready to Schedule Sidebar */}
						<ReadyToScheduleSidebar
							items={readyItems}
							onOpenPreview={handleOpenPreview}
							onRefresh={mutate}
						/>
					</div>

					{/* Footer Legend */}
					<footer className="flex items-center justify-between border-t border-gray-200 bg-gray-100 px-6 py-2 text-[10px] text-gray-500 dark:border-slate-800 dark:bg-[#0d1421] dark:text-slate-500">
						<div className="flex gap-6">
							<div className="flex items-center gap-2">
								<span className="h-2 w-2 rounded-full bg-[#2b6cee]" />
								<span>Scheduled</span>
							</div>
							<div className="flex items-center gap-2">
								<span className="h-2 w-2 rounded-full bg-emerald-500" />
								<span>Published</span>
							</div>
							<div className="flex items-center gap-2">
								<span className="h-2 w-2 rounded-full bg-red-500" />
								<span>Failed</span>
							</div>
							<div className="flex items-center gap-2">
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
					items={allItems}
					currentIndex={allItems.findIndex((i) => i.id === previewItem.id)}
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
