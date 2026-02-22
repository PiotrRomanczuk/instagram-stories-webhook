'use client';

/**
 * Schedule Week Grid - 7-day week view calendar with hourly time blocks
 */

import { useDroppable } from '@dnd-kit/core';
import {
	format,
	isSameDay,
	isToday,
	startOfWeek,
	addDays,
	getHours,
	getMinutes,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { ContentItem } from '@/lib/types/posts';
import { ScheduleCalendarItem } from './schedule-calendar-item';
import { useEffect, useRef, useState } from 'react';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/app/components/ui/popover';

interface ScheduleWeekGridProps {
	currentDate: Date;
	scheduledItems: ContentItem[];
	onItemClick?: (item: ContentItem) => void;
	granularity?: number;
	onIncreaseGranularity?: () => void;
	onDecreaseGranularity?: () => void;
}

const TIME_SLOTS = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00–23:00
const BEST_TIME_HOURS = [9, 12, 18];
const BASE_HOUR_HEIGHT = 96;
const MIN_BLOCK_HEIGHT = 16;
const DND_STEP = 5; // Always allow 5-min DnD precision

interface WeekDayBlockProps {
	day: Date;
	hour: number;
	startMinute: number;
	granularity: number;
	blockHeight: number;
	items: ContentItem[];
	onItemClick?: (item: ContentItem) => void;
}

function WeekDropZone({ day, hour, minute, height }: {
	day: Date; hour: number; minute: number; height: number;
}) {
	const slotId = `week-${format(day, 'yyyy-MM-dd')}-${hour}-${minute}`;
	const { setNodeRef, isOver } = useDroppable({
		id: slotId,
		data: { day, hour, minute },
	});
	const timeLabel = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

	return (
		<div
			ref={setNodeRef}
			className={cn('relative transition-colors', isOver && 'bg-[#2b6cee]/10')}
			style={{ height: `${height}px` }}
		>
			{isOver && (
				<>
					<div className="absolute inset-x-0 top-0 z-20 h-0.5 bg-[#2b6cee] pointer-events-none" />
					<span className="absolute -top-2.5 left-1 z-30 rounded bg-[#2b6cee] px-1 py-0.5 text-[8px] font-bold text-white pointer-events-none">
						{timeLabel}
					</span>
				</>
			)}
		</div>
	);
}

function WeekDayBlock({
	day,
	hour,
	startMinute,
	granularity,
	blockHeight,
	items,
	onItemClick,
}: WeekDayBlockProps) {
	const endMinute = startMinute + granularity - 1;

	// Subdivide visual block into 5-min DnD zones
	const dndStep = Math.min(granularity, DND_STEP);
	const subZoneCount = granularity / dndStep;
	const subZoneHeight = blockHeight / subZoneCount;

	const blockItems = items.filter((item) => {
		if (!item.scheduledTime) return false;
		const d = new Date(item.scheduledTime);
		const m = getMinutes(d);
		return isSameDay(d, day) && getHours(d) === hour && m >= startMinute && m <= endMinute;
	});

	const displayItems = blockItems.slice(0, 1);
	const overflow = blockItems.slice(1);

	return (
		<div
			className={cn(
				'relative border-r border-gray-100',
				'hover:bg-gray-50/50'
			)}
			style={{ height: `${blockHeight}px` }}
		>
			{/* 5-min DnD sub-zones */}
			<div className="absolute inset-0 flex flex-col">
				{Array.from({ length: subZoneCount }, (_, i) => (
					<WeekDropZone
						key={i}
						day={day}
						hour={hour}
						minute={startMinute + i * dndStep}
						height={subZoneHeight}
					/>
				))}
			</div>

			{/* Visual content overlay */}
			{displayItems.length > 0 && (
				<div className="absolute inset-0 flex gap-0.5 p-0.5 z-10 pointer-events-auto">
					{displayItems.map((item) => (
						<div key={item.id} className="flex-1 min-w-0">
							<ScheduleCalendarItem
								item={item}
								variant="compact"
								showMinute
								showHoverPreview
								onClick={() => onItemClick?.(item)}
							/>
						</div>
					))}

					{overflow.length > 0 && (
						<Popover>
							<PopoverTrigger asChild>
								<button className="flex items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 px-1 text-[8px] font-bold text-gray-600 hover:border-[#2b6cee] hover:text-[#2b6cee] transition-colors">
									+{overflow.length}
								</button>
							</PopoverTrigger>
							<PopoverContent align="start" side="right" className="max-h-60 w-56 overflow-y-auto p-2">
								<div className="mb-2 text-xs font-semibold text-gray-600">
									{String(hour).padStart(2, '0')}:{String(startMinute).padStart(2, '0')} – {blockItems.length} items
								</div>
								<div className="flex flex-col gap-2">
									{blockItems.map((item) => (
										<ScheduleCalendarItem
											key={item.id}
											item={item}
											variant="compact"
											showMinute
											showHoverPreview
											isDraggable={false}
											onClick={() => onItemClick?.(item)}
										/>
									))}
								</div>
							</PopoverContent>
						</Popover>
					)}
				</div>
			)}
		</div>
	);
}

function WeekCurrentTimeIndicator({ hourHeight }: { hourHeight: number }) {
	const [now, setNow] = useState(new Date());

	useEffect(() => {
		const id = setInterval(() => setNow(new Date()), 60_000);
		return () => clearInterval(id);
	}, []);

	const h = getHours(now);
	const m = getMinutes(now);
	if (h < 6 || h > 23) return null;

	const top = (h - 6) * hourHeight + (m / 60) * hourHeight;

	return (
		<div
			className="absolute z-30 pointer-events-none flex items-center"
			style={{ top: `${top}px`, left: 0, right: 0 }}
		>
			<div className="w-10 flex-shrink-0 flex justify-end pr-1">
				<span className="rounded bg-[#2b6cee] px-1 py-0.5 text-[8px] font-bold text-white">
					{format(now, 'HH:mm')}
				</span>
			</div>
			<div className="relative flex-1 h-0.5 bg-[#2b6cee]">
				<div className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full bg-[#2b6cee]" />
			</div>
		</div>
	);
}

export function ScheduleWeekGrid({
	currentDate,
	scheduledItems,
	onItemClick,
	granularity = 60,
	onIncreaseGranularity,
	onDecreaseGranularity,
}: ScheduleWeekGridProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
	const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

	const blocksPerHour = 60 / granularity;
	const rawBlockHeight = BASE_HOUR_HEIGHT / blocksPerHour;
	const blockHeight = Math.max(rawBlockHeight, MIN_BLOCK_HEIGHT);
	const hourHeight = blockHeight * blocksPerHour;

	const tz = Intl.DateTimeFormat().resolvedOptions().timeZone.split('/')[1] || 'Local';

	// Scroll to current hour on mount
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		const h = Math.max(6, Math.min(23, getHours(new Date())));
		container.scrollTop = (h - 6 - 1) * hourHeight;
	// Only run on mount — intentionally omit hourHeight
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Ctrl+scroll for granularity
	useEffect(() => {
		const container = containerRef.current;
		if (!container || !onIncreaseGranularity || !onDecreaseGranularity) return;

		const handleWheel = (e: WheelEvent) => {
			if (e.ctrlKey || e.metaKey) {
				e.preventDefault();
				if (e.deltaY < 0) onIncreaseGranularity();
				else if (e.deltaY > 0) onDecreaseGranularity();
			}
		};

		container.addEventListener('wheel', handleWheel, { passive: false });
		return () => container.removeEventListener('wheel', handleWheel);
	}, [onIncreaseGranularity, onDecreaseGranularity]);

	return (
		<div ref={containerRef} className="flex-1 overflow-auto bg-gray-50 custom-scrollbar">
			<div className="min-w-[560px]">
				{/* Sticky header */}
				<div className="sticky top-0 z-30 flex border-b border-gray-200 bg-white/95 backdrop-blur">
					{/* TZ gutter */}
					<div className="flex w-10 flex-shrink-0 items-center justify-center border-r border-gray-200 text-[9px] font-bold text-gray-400">
						{tz}
					</div>
					{/* 7 day columns */}
					{days.map((day) => {
						const today = isToday(day);
						return (
							<div
								key={day.toISOString()}
								className={cn(
									'flex flex-1 flex-col items-center justify-center py-2 border-r border-gray-100 last:border-r-0',
									today && 'bg-[#2b6cee]/5'
								)}
							>
								<span className={cn(
									'text-[9px] font-bold uppercase tracking-wide',
									today ? 'text-[#2b6cee]' : 'text-gray-400'
								)}>
									{format(day, 'EEE')}
								</span>
								<span className={cn(
									'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold mt-0.5',
									today ? 'bg-[#2b6cee] text-white' : 'text-gray-900'
								)}>
									{format(day, 'd')}
								</span>
							</div>
						);
					})}
				</div>

				{/* Time grid */}
				<div className="relative">
					<WeekCurrentTimeIndicator hourHeight={hourHeight} />

					{TIME_SLOTS.map((hour) => {
						const isBestTime = BEST_TIME_HOURS.includes(hour);
						return (
							<div key={hour} className="flex" style={{ height: `${hourHeight}px` }}>
								{/* Time label gutter */}
								<div className="flex w-10 flex-shrink-0 items-start justify-center border-r border-gray-200 bg-white pt-1">
									<span className={cn(
										'text-[9px] font-medium',
										isBestTime ? 'text-amber-600 font-semibold' : 'text-gray-400'
									)}>
										{String(hour).padStart(2, '0')}:00
									</span>
								</div>

								{/* 7 day columns */}
								{days.map((day) => (
									<div
										key={day.toISOString()}
										className={cn(
											'flex-1 flex flex-col border-r border-gray-100 last:border-r-0',
											isToday(day) && 'bg-[#2b6cee]/[0.02]'
										)}
									>
										{Array.from({ length: blocksPerHour }, (_, blockIndex) => (
											<WeekDayBlock
												key={blockIndex}
												day={day}
												hour={hour}
												startMinute={blockIndex * granularity}
												granularity={granularity}
												blockHeight={blockHeight}
												items={scheduledItems}
												onItemClick={onItemClick}
											/>
										))}
									</div>
								))}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
