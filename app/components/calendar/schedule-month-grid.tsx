'use client';

/**
 * Schedule Month Grid - Monthly calendar overview
 */

import {
	format,
	startOfMonth,
	endOfMonth,
	startOfWeek,
	endOfWeek,
	addDays,
	isSameMonth,
	isToday,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { ContentItem } from '@/lib/types/posts';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/app/components/ui/popover';

interface ScheduleMonthGridProps {
	currentDate: Date;
	scheduledItems: ContentItem[];
	onItemClick?: (item: ContentItem) => void;
	onDayClick?: (date: Date) => void;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getStatusDotClass(status: string | undefined) {
	if (status === 'published') return 'bg-emerald-500';
	if (status === 'failed') return 'bg-red-500';
	if (status === 'processing') return 'bg-yellow-500';
	return 'bg-[#2b6cee]';
}

interface MonthDayCellProps {
	date: Date;
	items: ContentItem[];
	inMonth: boolean;
	onItemClick?: (item: ContentItem) => void;
	onDayClick?: (date: Date) => void;
}

function MonthDayCell({ date, items, inMonth, onItemClick, onDayClick }: MonthDayCellProps) {
	const today = isToday(date);
	const displayItems = items.slice(0, 3);
	const overflow = items.slice(3);

	return (
		<div
			className={cn(
				'min-h-[120px] border-r border-b border-gray-100 p-1.5 cursor-pointer transition-colors hover:bg-gray-50 last:border-r-0',
				!inMonth && 'bg-gray-50/60'
			)}
			onClick={() => onDayClick?.(date)}
		>
			{/* Day number */}
			<div className="flex items-center justify-end mb-1">
				<span className={cn(
					'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
					today
						? 'bg-[#2b6cee] text-white font-bold'
						: inMonth
						? 'text-gray-900 hover:bg-gray-100'
						: 'text-gray-400'
				)}>
					{format(date, 'd')}
				</span>
			</div>

			{/* Post chips */}
			<div className="flex flex-col gap-0.5">
				{displayItems.map((item) => (
					<button
						key={item.id}
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onItemClick?.(item);
						}}
						className="flex items-center gap-1 w-full text-left rounded hover:bg-gray-100 px-0.5 py-0.5 group"
					>
						<span className={cn(
							'h-1.5 w-1.5 flex-shrink-0 rounded-full',
							getStatusDotClass(item.publishingStatus)
						)} />
						<span className={cn(
							'text-[10px] truncate',
							inMonth ? 'text-gray-700 group-hover:text-gray-900' : 'text-gray-400'
						)}>
							{item.scheduledTime && format(new Date(item.scheduledTime), 'HH:mm')}{' '}
							{item.caption?.slice(0, 20) || 'Untitled'}
						</span>
					</button>
				))}

				{overflow.length > 0 && (
					<Popover>
						<PopoverTrigger asChild>
							<button
								type="button"
								onClick={(e) => e.stopPropagation()}
								className="text-[10px] text-[#2b6cee] font-medium hover:underline text-left px-0.5 py-0.5"
							>
								+{overflow.length} more
							</button>
						</PopoverTrigger>
						<PopoverContent align="start" side="right" className="max-h-72 w-60 overflow-y-auto p-2">
							<div className="mb-2 text-xs font-semibold text-gray-600">
								{format(date, 'EEEE, MMMM d')} – {items.length} posts
							</div>
							<div className="flex flex-col gap-1">
								{items.map((item) => (
									<button
										key={item.id}
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											onItemClick?.(item);
										}}
										className="flex items-center gap-2 w-full text-left rounded hover:bg-gray-50 px-1.5 py-1"
									>
										<span className={cn(
											'h-2 w-2 flex-shrink-0 rounded-full',
											getStatusDotClass(item.publishingStatus)
										)} />
										<span className="text-xs text-gray-700 truncate">
											{item.scheduledTime && format(new Date(item.scheduledTime), 'HH:mm')}{' '}
											{item.caption?.slice(0, 28) || 'Untitled'}
										</span>
									</button>
								))}
							</div>
						</PopoverContent>
					</Popover>
				)}
			</div>
		</div>
	);
}

export function ScheduleMonthGrid({
	currentDate,
	scheduledItems,
	onItemClick,
	onDayClick,
}: ScheduleMonthGridProps) {
	const monthStart = startOfMonth(currentDate);
	const monthEnd = endOfMonth(currentDate);
	const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
	const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

	// Build calendar day grid
	const allDays: Date[] = [];
	let cursor = calStart;
	while (cursor <= calEnd) {
		allDays.push(cursor);
		cursor = addDays(cursor, 1);
	}

	const weeks: Date[][] = [];
	for (let i = 0; i < allDays.length; i += 7) {
		weeks.push(allDays.slice(i, i + 7));
	}

	// Index items by date key
	const itemsByDate = scheduledItems.reduce<Record<string, ContentItem[]>>((acc, item) => {
		if (!item.scheduledTime) return acc;
		const key = format(new Date(item.scheduledTime), 'yyyy-MM-dd');
		if (!acc[key]) acc[key] = [];
		acc[key].push(item);
		return acc;
	}, {});

	return (
		<div className="flex-1 overflow-auto bg-white custom-scrollbar">
			<div className="min-w-[500px]">
				{/* Day name header row */}
				<div className="sticky top-0 z-10 grid grid-cols-7 border-b border-gray-200 bg-white shadow-sm">
					{DAY_NAMES.map((name) => (
						<div
							key={name}
							className="border-r border-gray-100 py-2.5 text-center text-xs font-semibold text-gray-500 last:border-r-0"
						>
							{name}
						</div>
					))}
				</div>

				{/* Week rows */}
				{weeks.map((week, weekIndex) => (
					<div key={weekIndex} className="grid grid-cols-7 border-t border-gray-100 first:border-t-0">
						{week.map((date) => {
							const key = format(date, 'yyyy-MM-dd');
							const dayItems = itemsByDate[key] ?? [];
							const sortedItems = [...dayItems].sort((a, b) => {
								const at = a.scheduledTime ? new Date(a.scheduledTime).getTime() : 0;
								const bt = b.scheduledTime ? new Date(b.scheduledTime).getTime() : 0;
								return at - bt;
							});
							return (
								<MonthDayCell
									key={key}
									date={date}
									items={sortedItems}
									inMonth={isSameMonth(date, currentDate)}
									onItemClick={onItemClick}
									onDayClick={onDayClick}
								/>
							);
						})}
					</div>
				))}
			</div>
		</div>
	);
}
