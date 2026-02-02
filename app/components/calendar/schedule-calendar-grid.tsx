'use client';

/**
 * Schedule Calendar Grid - Weekly view calendar with time slots
 */

import { useDroppable } from '@dnd-kit/core';
import {
	format,
	addDays,
	startOfWeek,
	isSameDay,
	isToday,
	setHours,
	getHours,
	getMinutes,
	isSameHour,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { ContentItem } from '@/lib/types/posts';
import { ScheduleCalendarItem } from './schedule-calendar-item';
import { useEffect, useState } from 'react';

interface ScheduleCalendarGridProps {
	currentDate: Date;
	scheduledItems: ContentItem[];
	onItemClick?: (item: ContentItem) => void;
}

// Time slots from 6 AM to 11 PM
const TIME_SLOTS = Array.from({ length: 18 }, (_, i) => i + 6);
const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface TimeSlotProps {
	day: Date;
	hour: number;
	items: ContentItem[];
	onItemClick?: (item: ContentItem) => void;
}

function TimeSlot({ day, hour, items, onItemClick }: TimeSlotProps) {
	const slotId = `${format(day, 'yyyy-MM-dd')}-${hour}`;
	const { setNodeRef, isOver } = useDroppable({
		id: slotId,
		data: { day, hour },
	});

	const slotItems = items.filter((item) => {
		if (!item.scheduledTime) return false;
		const itemDate = new Date(item.scheduledTime);
		return isSameDay(itemDate, day) && getHours(itemDate) === hour;
	});

	return (
		<div
			ref={setNodeRef}
			className={cn(
				'relative h-24 border-b border-r border-slate-800/50 transition-colors',
				isOver && 'bg-[#2b6cee]/10 ring-2 ring-inset ring-[#2b6cee]/50',
				'hover:bg-slate-800/30'
			)}
		>
			{isOver && slotItems.length === 0 && (
				<div className="absolute inset-0 flex items-center justify-center">
					<span className="text-[10px] font-bold uppercase tracking-wider text-[#2b6cee]">
						Drop Here
					</span>
				</div>
			)}
			<div className="flex flex-wrap gap-1 p-1">
				{slotItems.map((item) => (
					<div key={item.id} className="w-full">
						<ScheduleCalendarItem
							item={item}
							onClick={() => onItemClick?.(item)}
						/>
					</div>
				))}
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

	// Calculate position: each hour slot is 96px (h-24), starting from 6 AM
	const topOffset = (hour - 6) * 96 + (minutes / 60) * 96;

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
}: ScheduleCalendarGridProps) {
	const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
	const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
	const todayIndex = days.findIndex((d) => isToday(d));

	return (
		<div className="flex-1 overflow-auto bg-[#070b13] custom-scrollbar">
			<div className="grid min-w-[900px]" style={{ gridTemplateColumns: '64px repeat(7, 1fr)' }}>
				{/* Header row - Timezone label */}
				<div className="sticky top-0 z-30 flex h-12 items-center justify-center border-b border-r border-slate-800 bg-[#101622]/95 backdrop-blur text-[10px] font-bold text-slate-400">
					{Intl.DateTimeFormat().resolvedOptions().timeZone.split('/')[1] || 'Local'}
				</div>

				{/* Header row - Days */}
				{days.map((day, index) => {
					const today = isToday(day);
					return (
						<div
							key={index}
							className={cn(
								'sticky top-0 z-30 flex h-12 flex-col items-center justify-center border-b border-r border-slate-800 backdrop-blur',
								today
									? 'bg-[#2b6cee]/5 border-b-2 border-b-[#2b6cee]'
									: 'bg-[#101622]/95'
							)}
						>
							<span
								className={cn(
									'text-[10px] font-bold uppercase',
									today ? 'text-[#2b6cee]' : 'text-slate-500'
								)}
							>
								{DAYS_OF_WEEK[index]}
							</span>
							<span
								className={cn(
									'text-sm font-bold',
									today ? 'text-[#2b6cee]' : 'text-white'
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
						<>
							{/* Time column */}
							<div
								key={`time-${hour}`}
								className="flex h-24 items-start justify-center border-b border-r border-slate-800 pt-2 text-[11px] font-medium text-slate-400"
							>
								{hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`}
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
						</>
					))}
				</div>
			</div>
		</div>
	);
}
