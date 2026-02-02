'use client';

import { useDroppable } from '@dnd-kit/core';
import {
	format,
	addDays,
	startOfWeek,
	isSameDay,
	isToday,
	setHours,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarStoryItem, StoryAsset } from './calendar-story-item';
import { TrendingUp } from 'lucide-react';

interface ScheduledItem extends StoryAsset {
	scheduledTime: Date;
}

interface CalendarGridProps {
	currentDate: Date;
	scheduledItems: ScheduledItem[];
	optimalHours?: number[];
}

const TIME_SLOTS = [9, 10, 11, 12, 13, 14, 15, 16, 17];
const DAYS_OF_WEEK = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

interface TimeSlotProps {
	day: Date;
	hour: number;
	items: ScheduledItem[];
	isOptimal?: boolean;
}

function TimeSlot({ day, hour, items, isOptimal }: TimeSlotProps) {
	const slotId = `${format(day, 'yyyy-MM-dd')}-${hour}`;
	const { setNodeRef, isOver } = useDroppable({
		id: slotId,
		data: { day, hour },
	});

	const slotItems = items.filter((item) => {
		const itemDate = new Date(item.scheduledTime);
		return isSameDay(itemDate, day) && itemDate.getHours() === hour;
	});

	return (
		<div
			ref={setNodeRef}
			className={cn(
				'relative h-24 border-b border-r border-[#2a3649] transition-colors',
				isOver && 'bg-[#2b6cee]/10',
				isOptimal && 'bg-amber-500/5 border-l-2 border-l-amber-500/30'
			)}
		>
			{isOptimal && slotItems.length === 0 && (
				<div className="absolute left-2 top-2 flex items-center gap-1">
					<TrendingUp className="h-3 w-3 animate-pulse text-amber-500" />
					<span className="text-[9px] font-bold uppercase tracking-tighter text-amber-500">
						Optimal
					</span>
				</div>
			)}
			<div className="flex flex-wrap gap-1 p-1">
				{slotItems.map((item) => (
					<div key={item.id} className="w-14">
						<CalendarStoryItem story={item} isPlaced showTime />
					</div>
				))}
			</div>
		</div>
	);
}

export function CalendarGrid({
	currentDate,
	scheduledItems,
	optimalHours = [9, 10],
}: CalendarGridProps) {
	const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
	const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

	return (
		<div className="flex-1 overflow-auto bg-[#070b13]">
			<div className="grid min-w-[900px] grid-cols-[80px_repeat(7,1fr)]">
				{/* Header row */}
				<div className="sticky top-0 z-30 h-16 border-b border-r border-[#2a3649] bg-[#0d1421]" />
				{days.map((day, index) => {
					const today = isToday(day);
					return (
						<div
							key={index}
							className={cn(
								'sticky top-0 z-30 flex h-16 flex-col items-center justify-center border-b border-r border-[#2a3649]',
								today
									? 'border-b-2 border-b-[#2b6cee] bg-[#1a2332]'
									: 'bg-[#0d1421]'
							)}
						>
							<span
								className={cn(
									'text-[10px] font-bold',
									today ? 'text-[#2b6cee]' : 'text-[#92a4c9]'
								)}
							>
								{DAYS_OF_WEEK[index]}
							</span>
							<span className="text-sm font-bold text-white">
								{format(day, 'd')}
							</span>
						</div>
					);
				})}

				{/* Time slots */}
				{TIME_SLOTS.map((hour) => (
					<>
						<div
							key={`time-${hour}`}
							className="flex h-24 items-start justify-end border-b border-r border-[#2a3649] p-2 text-[10px] font-medium text-[#92a4c9]"
						>
							{hour <= 12 ? `${hour} AM` : `${hour - 12} PM`}
						</div>
						{days.map((day, dayIndex) => (
							<TimeSlot
								key={`${hour}-${dayIndex}`}
								day={setHours(day, hour)}
								hour={hour}
								items={scheduledItems}
								isOptimal={optimalHours.includes(hour)}
							/>
						))}
					</>
				))}
			</div>
		</div>
	);
}
