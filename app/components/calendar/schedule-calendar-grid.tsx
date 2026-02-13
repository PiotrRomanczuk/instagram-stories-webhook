'use client';

/**
 * Schedule Calendar Grid - Day view calendar with 15-minute time blocks
 */

import { useDroppable } from '@dnd-kit/core';
import {
	format,
	isSameDay,
	isToday,
	setHours,
	getHours,
	getMinutes,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { ContentItem } from '@/lib/types/posts';
import { ScheduleCalendarItem } from './schedule-calendar-item';
import { useEffect, useState, useRef, useCallback } from 'react';
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
	granularity?: number; // minutes per block (60, 30, 15, 5, or 1)
	onIncreaseGranularity?: () => void;
	onDecreaseGranularity?: () => void;
}

// Time slots from 6 AM to 11 PM
const TIME_SLOTS = Array.from({ length: 18 }, (_, i) => i + 6);

// Base height of each hour slot in pixels
const BASE_HOUR_HEIGHT = 96;
// Minimum block height to ensure clickable/droppable targets
const MIN_BLOCK_HEIGHT = 16;

interface TimeBlockProps {
	day: Date;
	hour: number;
	blockIndex: number;
	startMinute: number;
	granularity: number;
	blockHeight: number;
	items: ContentItem[];
	onItemClick?: (item: ContentItem) => void;
}

function TimeBlock({ day, hour, blockIndex, startMinute, granularity, blockHeight, items, onItemClick }: TimeBlockProps) {
	const slotRef = useRef<HTMLDivElement>(null);
	const endMinute = startMinute + granularity - 1;

	// Use minute directly in slot ID for clarity
	const slotId = `${format(day, 'yyyy-MM-dd')}-${hour}-${startMinute}`;
	const { setNodeRef, isOver } = useDroppable({
		id: slotId,
		data: { day, hour, minute: startMinute },
	});

	// Get items for this 15-minute block
	const blockItems = items.filter((item) => {
		if (!item.scheduledTime) return false;
		const itemDate = new Date(item.scheduledTime);
		if (!isSameDay(itemDate, day) || getHours(itemDate) !== hour) return false;
		const minute = getMinutes(itemDate);
		return minute >= startMinute && minute <= endMinute;
	});

	// Sort by minute
	const sortedItems = [...blockItems].sort((a, b) => {
		const minuteA = getMinutes(new Date(a.scheduledTime!));
		const minuteB = getMinutes(new Date(b.scheduledTime!));
		return minuteA - minuteB;
	});

	// Display up to 2 items side by side, overflow for rest
	const displayItems = sortedItems.slice(0, 2);
	const overflowItems = sortedItems.slice(2);
	const hasOverflow = overflowItems.length > 0;

	const combinedRef = useCallback((node: HTMLDivElement | null) => {
		setNodeRef(node);
		(slotRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
	}, [setNodeRef]);

	const formatTimeLabel = () => {
		const h = hour === 12 ? 12 : hour < 12 ? hour : hour - 12;
		const ampm = hour < 12 ? 'AM' : 'PM';
		return `${h}:${String(startMinute).padStart(2, '0')} ${ampm}`;
	};

	return (
		<div
			ref={combinedRef}
			data-droppable-id={slotId}
			className={cn(
				'relative transition-colors',
				isOver && 'bg-[#2b6cee]/10 ring-1 ring-inset ring-[#2b6cee]/50',
				'hover:bg-gray-50/50'
			)}
			style={{ height: `${blockHeight}px` }}
		>
			{/* Drop indicator */}
			{isOver && (
				<div className="absolute inset-x-0 top-0 z-20 flex items-center pointer-events-none">
					<div className="h-0.5 flex-1 bg-[#2b6cee]" />
					<span className="ml-1 rounded bg-[#2b6cee] px-1.5 py-0.5 text-[9px] font-bold text-white whitespace-nowrap">
						{formatTimeLabel()}
					</span>
				</div>
			)}

			{/* Items - side by side if multiple */}
			{displayItems.length > 0 && (
				<div className="absolute inset-0 flex gap-0.5 p-0.5">
					{displayItems.map((item) => (
						<div
							key={item.id}
							className="flex-1 min-w-0"
							style={{ maxWidth: displayItems.length > 1 ? '50%' : '100%' }}
						>
							<ScheduleCalendarItem
								item={item}
								variant="compact"
								showMinute
								onClick={() => onItemClick?.(item)}
							/>
						</div>
					))}

					{/* Overflow indicator */}
					{hasOverflow && (
						<Popover>
							<PopoverTrigger asChild>
								<button
									className={cn(
										'flex items-center justify-center rounded border border-dashed px-1',
										'border-gray-300 bg-gray-50 text-gray-600 hover:border-[#2b6cee] hover:text-[#2b6cee]',
										'',
										'text-[9px] font-bold transition-colors'
									)}
								>
									+{overflowItems.length}
								</button>
							</PopoverTrigger>
							<PopoverContent
								align="start"
								side="right"
								className="max-h-60 w-56 overflow-y-auto p-2"
							>
								<div className="mb-2 text-xs font-semibold text-gray-600">
									{formatTimeLabel()} - {sortedItems.length} items
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
					)}
				</div>
			)}
		</div>
	);
}

interface HourRowProps {
	day: Date;
	hour: number;
	items: ContentItem[];
	onItemClick?: (item: ContentItem) => void;
	granularity: number;
	blocksPerHour: number;
	blockHeight: number;
	hourHeight: number;
}

function HourRow({ day, hour, items, onItemClick, granularity, blocksPerHour, blockHeight, hourHeight }: HourRowProps) {
	return (
		<div className="flex" style={{ height: `${hourHeight}px` }}>
			{/* Time label */}
			<div className="flex w-12 sm:w-16 flex-shrink-0 flex-col items-center justify-start border-r border-gray-200 bg-white pt-1">
				<span className="text-[11px] font-medium text-gray-500">
					{hour === 12 ? '12' : hour < 12 ? hour : hour - 12}
				</span>
				<span className="text-[8px] text-gray-400">
					{hour < 12 ? 'AM' : 'PM'}
				</span>
			</div>

			{/* Time blocks based on granularity */}
			<div className="flex flex-1 flex-col border-r border-gray-200/50">
				{Array.from({ length: blocksPerHour }, (_, blockIndex) => {
					const startMinute = blockIndex * granularity;
					return (
						<TimeBlock
							key={blockIndex}
							day={day}
							hour={hour}
							blockIndex={blockIndex}
							startMinute={startMinute}
							granularity={granularity}
							blockHeight={blockHeight}
							items={items}
							onItemClick={onItemClick}
						/>
					);
				})}
			</div>
		</div>
	);
}

function CurrentTimeIndicator({ hourHeight }: { hourHeight: number }) {
	const [now, setNow] = useState(new Date());

	useEffect(() => {
		const interval = setInterval(() => {
			setNow(new Date());
		}, 60000);
		return () => clearInterval(interval);
	}, []);

	const hour = getHours(now);
	const minutes = getMinutes(now);

	if (hour < 6 || hour > 23) return null;

	const topOffset = (hour - 6) * hourHeight + (minutes / 60) * hourHeight;

	return (
		<div
			className="absolute left-0 right-0 z-30 pointer-events-none"
			style={{ top: `${topOffset}px` }}
		>
			<div className="flex items-center">
				<div className="w-12 sm:w-16 flex justify-end pr-2">
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
	granularity = 15,
	onIncreaseGranularity,
	onDecreaseGranularity,
}: ScheduleCalendarGridProps) {
	const today = isToday(currentDate);
	const containerRef = useRef<HTMLDivElement>(null);

	// Calculate block dimensions based on granularity
	const blocksPerHour = 60 / granularity;
	const rawBlockHeight = BASE_HOUR_HEIGHT / blocksPerHour;
	const blockHeight = Math.max(rawBlockHeight, MIN_BLOCK_HEIGHT);
	const hourHeight = blockHeight * blocksPerHour;

	// Handle Ctrl+scroll for granularity changes
	useEffect(() => {
		const container = containerRef.current;
		if (!container || !onIncreaseGranularity || !onDecreaseGranularity) return;

		const handleWheel = (e: WheelEvent) => {
			if (e.ctrlKey || e.metaKey) {
				e.preventDefault();
				if (e.deltaY < 0) {
					// Scroll up = zoom in = finer granularity
					onIncreaseGranularity();
				} else if (e.deltaY > 0) {
					// Scroll down = zoom out = coarser granularity
					onDecreaseGranularity();
				}
			}
		};

		container.addEventListener('wheel', handleWheel, { passive: false });
		return () => container.removeEventListener('wheel', handleWheel);
	}, [onIncreaseGranularity, onDecreaseGranularity]);

	return (
		<div
			ref={containerRef}
			className="flex-1 overflow-auto bg-gray-50 custom-scrollbar"
		>
			<div className="min-w-0">
				{/* Header */}
				<div className="sticky top-0 z-30 flex h-12 border-b border-gray-200 bg-white/95 backdrop-blur">
					{/* Timezone */}
					<div className="flex w-12 sm:w-16 flex-shrink-0 items-center justify-center border-r border-gray-200 text-[10px] font-bold text-gray-500">
						{Intl.DateTimeFormat().resolvedOptions().timeZone.split('/')[1] || 'Local'}
					</div>

					{/* Day header */}
					<div
						className={cn(
							'flex flex-1 flex-col items-center justify-center',
							today && 'bg-[#2b6cee]/5'
						)}
					>
						<span
							className={cn(
								'text-[10px] font-bold uppercase',
								today ? 'text-[#2b6cee]' : 'text-gray-500'
							)}
						>
							{format(currentDate, 'EEEE')}
						</span>
						<span
							className={cn(
								'text-sm font-bold',
								today ? 'text-[#2b6cee]' : 'text-gray-900'
							)}
						>
							{format(currentDate, 'd')}
						</span>
					</div>
				</div>

				{/* Time grid */}
				<div className="relative">
					{today && <CurrentTimeIndicator hourHeight={hourHeight} />}

					{TIME_SLOTS.map((hour) => (
						<HourRow
							key={hour}
							day={currentDate}
							hour={hour}
							items={scheduledItems}
							onItemClick={onItemClick}
							granularity={granularity}
							blocksPerHour={blocksPerHour}
							blockHeight={blockHeight}
							hourHeight={hourHeight}
						/>
					))}
				</div>
			</div>
		</div>
	);
}
