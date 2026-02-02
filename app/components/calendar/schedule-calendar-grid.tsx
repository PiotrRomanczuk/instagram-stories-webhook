'use client';

/**
 * Schedule Calendar Grid - Weekly view calendar with minute-level time slots
 */

import { useDroppable } from '@dnd-kit/core';
import {
	format,
	addDays,
	startOfWeek,
	isSameDay,
	isToday,
	setHours,
	setMinutes,
	getHours,
	getMinutes,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { ContentItem } from '@/lib/types/posts';
import { ScheduleCalendarItem } from './schedule-calendar-item';
import { useEffect, useState, useRef, useCallback } from 'react';
import type { ViewMode } from './schedule-header';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/app/components/ui/popover';
import { ChevronDown } from 'lucide-react';

interface ScheduleCalendarGridProps {
	currentDate: Date;
	scheduledItems: ContentItem[];
	onItemClick?: (item: ContentItem) => void;
	viewMode?: ViewMode;
}

// Time slots from 6 AM to 11 PM
const TIME_SLOTS = Array.from({ length: 18 }, (_, i) => i + 6);
const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Height of each hour slot in pixels
const HOUR_HEIGHT = 96;
// Height of each minute in pixels
const MINUTE_HEIGHT = HOUR_HEIGHT / 60;

interface TimeSlotProps {
	day: Date;
	hour: number;
	items: ContentItem[];
	onItemClick?: (item: ContentItem) => void;
}

function TimeSlot({ day, hour, items, onItemClick }: TimeSlotProps) {
	const slotRef = useRef<HTMLDivElement>(null);
	const [dropMinute, setDropMinute] = useState<number | null>(null);

	const slotId = `${format(day, 'yyyy-MM-dd')}-${hour}`;
	const { setNodeRef, isOver, active } = useDroppable({
		id: slotId,
		data: { day, hour, minute: dropMinute ?? 0 },
	});

	// Update minute based on mouse position
	const handleMouseMove = useCallback((e: React.MouseEvent) => {
		if (!isOver || !slotRef.current) return;

		const rect = slotRef.current.getBoundingClientRect();
		const relativeY = e.clientY - rect.top;
		const minute = Math.max(0, Math.min(59, Math.floor((relativeY / HOUR_HEIGHT) * 60)));
		setDropMinute(minute);
	}, [isOver]);

	// Reset minute when not hovering
	useEffect(() => {
		if (!isOver) {
			setDropMinute(null);
		}
	}, [isOver]);

	// Get items for this hour slot
	const slotItems = items.filter((item) => {
		if (!item.scheduledTime) return false;
		const itemDate = new Date(item.scheduledTime);
		return isSameDay(itemDate, day) && getHours(itemDate) === hour;
	});

	// Sort items by minute
	const sortedItems = [...slotItems].sort((a, b) => {
		const minuteA = getMinutes(new Date(a.scheduledTime!));
		const minuteB = getMinutes(new Date(b.scheduledTime!));
		return minuteA - minuteB;
	});

	// Show first 2 items, rest go into overflow popover
	const displayItems = sortedItems.slice(0, 2);
	const overflowItems = sortedItems.slice(2);
	const overflowCount = overflowItems.length;

	// Combine refs
	const combinedRef = useCallback((node: HTMLDivElement | null) => {
		setNodeRef(node);
		(slotRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
	}, [setNodeRef]);

	return (
		<div
			ref={combinedRef}
			data-droppable-id={slotId}
			onMouseMove={handleMouseMove}
			className={cn(
				'relative border-b border-r border-gray-200/50 transition-colors dark:border-slate-800/50',
				isOver && 'bg-[#2b6cee]/10',
				'hover:bg-gray-100/50 dark:hover:bg-slate-800/30'
			)}
			style={{ height: `${HOUR_HEIGHT}px` }}
		>
			{/* Minute markers */}
			<div className="absolute inset-0 pointer-events-none">
				{[15, 30, 45].map((minute) => (
					<div
						key={minute}
						className="absolute left-0 right-0 border-t border-dashed border-gray-200/30 dark:border-slate-700/30"
						style={{ top: `${(minute / 60) * 100}%` }}
					/>
				))}
			</div>

			{/* Drop indicator with minute */}
			{isOver && dropMinute !== null && (
				<div
					className="absolute left-0 right-0 z-20 pointer-events-none"
					style={{ top: `${(dropMinute / 60) * 100}%` }}
				>
					<div className="flex items-center">
						<div className="h-0.5 flex-1 bg-[#2b6cee]" />
						<span className="ml-1 rounded bg-[#2b6cee] px-1.5 py-0.5 text-[9px] font-bold text-white">
							{hour === 12 ? '12' : hour < 12 ? hour : hour - 12}:{String(dropMinute).padStart(2, '0')} {hour < 12 ? 'AM' : 'PM'}
						</span>
					</div>
				</div>
			)}

			{/* Drop here text when empty */}
			{isOver && slotItems.length === 0 && !dropMinute && (
				<div className="absolute inset-0 flex items-center justify-center">
					<span className="text-[10px] font-bold uppercase tracking-wider text-[#2b6cee]">
						Drop Here
					</span>
				</div>
			)}

			{/* Items positioned by minute - overflow allowed */}
			<div className="absolute inset-0 p-0.5">
				{displayItems.map((item) => {
					const minute = getMinutes(new Date(item.scheduledTime!));
					const topPercent = (minute / 60) * 100;

					return (
						<div
							key={item.id}
							className="absolute left-0.5 right-0.5 z-10"
							style={{
								top: `${topPercent}%`,
								minHeight: '72px' // Fixed height for cards
							}}
						>
							<ScheduleCalendarItem
								item={item}
								variant="compact"
								showMinute
								onClick={() => onItemClick?.(item)}
							/>
						</div>
					);
				})}

				{overflowCount > 0 && (
					<div className="absolute bottom-1 left-0.5 right-0.5 z-10">
						<Popover>
							<PopoverTrigger asChild>
								<button
									className={cn(
										'flex w-full items-center justify-center gap-1 rounded-md border border-dashed px-2 py-0.5',
										'border-gray-300 bg-gray-50 text-gray-600 hover:border-[#2b6cee] hover:bg-[#2b6cee]/5 hover:text-[#2b6cee]',
										'dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:border-[#2b6cee] dark:hover:text-[#2b6cee]',
										'text-[9px] font-semibold transition-colors'
									)}
								>
									+{overflowCount} more
									<ChevronDown className="h-2.5 w-2.5" />
								</button>
							</PopoverTrigger>
							<PopoverContent
								align="start"
								side="bottom"
								className="max-h-80 w-64 overflow-y-auto p-2"
							>
								<div className="mb-2 text-xs font-semibold text-gray-600 dark:text-slate-400">
									{format(day, 'EEE, MMM d')} - {hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`}
								</div>
								<div className="flex flex-col gap-2">
									{sortedItems.map((item) => (
										<ScheduleCalendarItem
											key={item.id}
											item={item}
											variant="compact"
											showMinute
											isDraggable={false}
											onClick={() => onItemClick?.(item)}
										/>
									))}
								</div>
							</PopoverContent>
						</Popover>
					</div>
				)}
			</div>
		</div>
	);
}

function CurrentTimeIndicator() {
	const [now, setNow] = useState(new Date());

	useEffect(() => {
		const interval = setInterval(() => {
			setNow(new Date());
		}, 60000); // Update every minute

		return () => clearInterval(interval);
	}, []);

	const hour = getHours(now);
	const minutes = getMinutes(now);

	// Only show if within our time range (6 AM - 11 PM)
	if (hour < 6 || hour > 23) return null;

	// Calculate position: each hour slot is HOUR_HEIGHT px, starting from 6 AM
	const topOffset = (hour - 6) * HOUR_HEIGHT + (minutes / 60) * HOUR_HEIGHT;

	return (
		<div
			className="absolute left-0 right-0 z-20 pointer-events-none"
			style={{ top: `${topOffset}px` }}
		>
			<div className="flex items-center">
				<div className="w-16 flex justify-end pr-2">
					<span className="rounded bg-[#2b6cee] px-1.5 py-0.5 text-[10px] font-bold text-white">
						{format(now, 'h:mm a')}
					</span>
				</div>
				<div className="relative flex-1 h-0.5 bg-[#2b6cee]">
					<div className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full bg-[#2b6cee]" />
				</div>
			</div>
		</div>
	);
}

export function ScheduleCalendarGrid({
	currentDate,
	scheduledItems,
	onItemClick,
	viewMode = 'week',
}: ScheduleCalendarGridProps) {
	// Calculate days based on view mode
	const days = (() => {
		if (viewMode === 'day') {
			return [currentDate];
		}
		// Week view: 7 days starting from Monday of the current week
		const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
		return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
	})();

	const todayIndex = days.findIndex((d) => isToday(d));
	const isDayView = viewMode === 'day';

	return (
		<div className="flex-1 overflow-auto bg-gray-50 custom-scrollbar dark:bg-[#070b13]" data-view-mode={viewMode}>
			<div className="grid" style={{
				gridTemplateColumns: `64px repeat(${days.length}, 1fr)`,
				minWidth: isDayView ? '300px' : '900px'
			}}>
				{/* Header row - Timezone label */}
				<div className="sticky top-0 z-30 flex h-12 items-center justify-center border-b border-r border-gray-200 bg-white/95 backdrop-blur text-[10px] font-bold text-gray-500 dark:border-slate-800 dark:bg-[#101622]/95 dark:text-slate-400">
					{Intl.DateTimeFormat().resolvedOptions().timeZone.split('/')[1] || 'Local'}
				</div>

				{/* Header row - Days */}
				{days.map((day, index) => {
					const today = isToday(day);
					// Get day of week (0 = Sunday, 1 = Monday, etc.)
					const dayOfWeek = day.getDay();
					// Convert to Monday-first index (Mon=0, Tue=1, ..., Sun=6)
					const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
					return (
						<div
							key={index}
							data-day-column={format(day, 'yyyy-MM-dd')}
							className={cn(
								'sticky top-0 z-30 flex h-12 flex-col items-center justify-center border-b border-r border-gray-200 backdrop-blur dark:border-slate-800',
								today
									? 'bg-[#2b6cee]/5 border-b-2 border-b-[#2b6cee]'
									: 'bg-white/95 dark:bg-[#101622]/95'
							)}
						>
							<span
								className={cn(
									'text-[10px] font-bold uppercase',
									today ? 'text-[#2b6cee]' : 'text-gray-500 dark:text-slate-500'
								)}
							>
								{isDayView ? format(day, 'EEEE') : DAYS_OF_WEEK[dayIndex]}
							</span>
							<span
								className={cn(
									'text-sm font-bold',
									today ? 'text-[#2b6cee]' : 'text-gray-900 dark:text-white'
								)}
							>
								{format(day, 'd')}
							</span>
						</div>
					);
				})}

				{/* Time slots grid */}
				<div className="contents relative">
					{/* Current time indicator - positioned based on today's column */}
					{todayIndex >= 0 && (
						<div
							className="absolute z-20 pointer-events-none"
							style={{
								gridColumn: `${todayIndex + 2}`,
								gridRow: '1 / -1'
							}}
						>
							<CurrentTimeIndicator />
						</div>
					)}

					{TIME_SLOTS.map((hour) => (
						<div key={`hour-row-${hour}`} className="contents">
							{/* Time column */}
							<div
								className="flex items-start justify-center border-b border-r border-gray-200 bg-white pt-1 text-[10px] font-medium text-gray-500 dark:border-slate-800 dark:bg-transparent dark:text-slate-400"
								style={{ height: `${HOUR_HEIGHT}px` }}
							>
								<div className="flex flex-col items-center">
									<span>{hour === 12 ? '12' : hour < 12 ? hour : hour - 12}</span>
									<span className="text-[8px]">{hour < 12 ? 'AM' : 'PM'}</span>
								</div>
							</div>

							{/* Day columns */}
							{days.map((day, dayIndex) => (
								<TimeSlot
									key={`${hour}-${dayIndex}`}
									day={setHours(day, hour)}
									hour={hour}
									items={scheduledItems}
									onItemClick={onItemClick}
								/>
							))}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
