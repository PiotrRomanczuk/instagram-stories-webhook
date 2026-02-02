'use client';

import { useState, useCallback } from 'react';
import { DndContext, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { setHours, parseISO } from 'date-fns';
import { CalendarHeader } from './calendar-header';
import { CalendarSidebar } from './calendar-sidebar';
import { CalendarGrid } from './calendar-grid';
import { CalendarStoryItem, StoryAsset } from './calendar-story-item';
import { ConflictWarning } from './conflict-warning';
import { Link as LinkIcon, Layers } from 'lucide-react';

interface ScheduledItem extends StoryAsset {
	scheduledTime: Date;
}

interface CalendarLayoutProps {
	initialAssets?: StoryAsset[];
	initialScheduled?: ScheduledItem[];
	onScheduleChange?: (items: ScheduledItem[]) => void;
}

// Demo data for development
const DEMO_ASSETS: StoryAsset[] = [
	{
		id: '1',
		title: 'Summer Collection',
		thumbnailUrl: '/placeholder-story-1.jpg',
		hasLink: true,
	},
	{
		id: '2',
		title: 'Product Launch',
		thumbnailUrl: '/placeholder-story-2.jpg',
		isSponsored: true,
	},
	{
		id: '3',
		title: 'Behind the Scenes',
		thumbnailUrl: '/placeholder-story-3.jpg',
	},
	{
		id: '4',
		title: 'Customer Review',
		thumbnailUrl: '/placeholder-story-4.jpg',
		hasLink: true,
	},
];

export function CalendarLayout({
	initialAssets = DEMO_ASSETS,
	initialScheduled = [],
	onScheduleChange,
}: CalendarLayoutProps) {
	const [currentDate, setCurrentDate] = useState(new Date());
	const [viewMode, setViewMode] = useState<'weekly' | 'daily'>('weekly');
	const [assets, setAssets] = useState<StoryAsset[]>(initialAssets);
	const [scheduledItems, setScheduledItems] =
		useState<ScheduledItem[]>(initialScheduled);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [conflict, setConflict] = useState<string | null>(null);

	const activeAsset =
		assets.find((a) => a.id === activeId) ||
		scheduledItems.find((s) => s.id === activeId);

	const handleDragStart = (event: { active: { id: string | number } }) => {
		setActiveId(String(event.active.id));
	};

	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			setActiveId(null);
			const { active, over } = event;

			if (!over) return;

			const draggedId = String(active.id);
			const dropData = over.data.current as { day: Date; hour: number } | null;

			if (!dropData) return;

			const scheduledTime = setHours(dropData.day, dropData.hour);

			// Check for conflicts (same time slot)
			const existingAtTime = scheduledItems.find(
				(item) =>
					item.id !== draggedId &&
					item.scheduledTime.getTime() === scheduledTime.getTime()
			);

			if (existingAtTime) {
				setConflict(
					`Time slot already has "${existingAtTime.title}" scheduled. Stories may overlap.`
				);
			}

			// Check if it's from assets or already scheduled
			const fromAssets = assets.find((a) => a.id === draggedId);
			const fromScheduled = scheduledItems.find((s) => s.id === draggedId);

			if (fromAssets) {
				// Move from sidebar to calendar
				setAssets((prev) => prev.filter((a) => a.id !== draggedId));
				const newScheduledItem: ScheduledItem = {
					...fromAssets,
					scheduledTime,
				};
				setScheduledItems((prev) => [...prev, newScheduledItem]);
				onScheduleChange?.([...scheduledItems, newScheduledItem]);
			} else if (fromScheduled) {
				// Reschedule existing item
				setScheduledItems((prev) =>
					prev.map((item) =>
						item.id === draggedId ? { ...item, scheduledTime } : item
					)
				);
				onScheduleChange?.(
					scheduledItems.map((item) =>
						item.id === draggedId ? { ...item, scheduledTime } : item
					)
				);
			}
		},
		[assets, scheduledItems, onScheduleChange]
	);

	const handleAutoSchedule = () => {
		// Auto-schedule all remaining assets to optimal times
		const optimalHours = [9, 10, 11, 14, 15, 16];
		let hourIndex = 0;
		let dayOffset = 0;

		const newScheduled: ScheduledItem[] = assets.map((asset) => {
			const scheduledTime = setHours(
				new Date(
					currentDate.getTime() + dayOffset * 24 * 60 * 60 * 1000
				),
				optimalHours[hourIndex]
			);

			hourIndex++;
			if (hourIndex >= optimalHours.length) {
				hourIndex = 0;
				dayOffset++;
			}

			return { ...asset, scheduledTime };
		});

		setScheduledItems((prev) => [...prev, ...newScheduled]);
		setAssets([]);
		onScheduleChange?.([...scheduledItems, ...newScheduled]);
	};

	return (
		<DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
			<div className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-xl border border-[#2a3649] bg-[#101622]">
				<CalendarHeader
					currentDate={currentDate}
					viewMode={viewMode}
					onDateChange={setCurrentDate}
					onViewModeChange={setViewMode}
					onAutoSchedule={assets.length > 0 ? handleAutoSchedule : undefined}
				/>

				{conflict && (
					<div className="px-6 pt-4">
						<ConflictWarning
							message={conflict}
							onDismiss={() => setConflict(null)}
						/>
					</div>
				)}

				<div className="flex flex-1 overflow-hidden">
					<CalendarSidebar assets={assets} />
					<CalendarGrid
						currentDate={currentDate}
						scheduledItems={scheduledItems}
						optimalHours={[9, 10]}
					/>
				</div>

				{/* Footer legend */}
				<footer className="flex items-center justify-between border-t border-[#2a3649] bg-[#0d1421] px-6 py-2 text-[10px] text-[#92a4c9]">
					<div className="flex gap-6">
						<div className="flex items-center gap-2">
							<span className="h-2 w-2 rounded-full bg-amber-500" />
							<span>Peak Viewer Activity</span>
						</div>
						<div className="flex items-center gap-2">
							<Layers className="h-3 w-3" />
							<span>Story Sequence (Group)</span>
						</div>
						<div className="flex items-center gap-2">
							<LinkIcon className="h-3 w-3" />
							<span>Link in Bio included</span>
						</div>
					</div>
					<div className="font-medium">
						Total Scheduled Stories:{' '}
						<span className="text-white">{scheduledItems.length}</span>
					</div>
				</footer>
			</div>

			<DragOverlay>
				{activeAsset && (
					<div className="w-20 opacity-90">
						<CalendarStoryItem story={activeAsset} />
					</div>
				)}
			</DragOverlay>
		</DndContext>
	);
}
