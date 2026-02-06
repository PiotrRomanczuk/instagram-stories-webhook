'use client';

import { format, addDays, startOfWeek, isSameDay, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

interface WeekStripProps {
	selectedDate: Date;
	onDateSelect: (date: Date) => void;
	/** Number of scheduled items per date (key: 'yyyy-MM-dd') */
	itemCounts?: Record<string, number>;
}

export function WeekStrip({ selectedDate, onDateSelect, itemCounts = {} }: WeekStripProps) {
	const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
	const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

	return (
		<div className="flex items-center gap-1 border-b border-gray-100 bg-white px-2 py-2 dark:border-slate-800 dark:bg-[#101622]">
			{days.map((day) => {
				const selected = isSameDay(day, selectedDate);
				const today = isToday(day);
				const dateKey = format(day, 'yyyy-MM-dd');
				const count = itemCounts[dateKey] || 0;

				return (
					<button
						key={dateKey}
						type="button"
						onClick={() => onDateSelect(day)}
						className={cn(
							'flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 transition-all',
							selected
								? 'bg-[#2b6cee] text-white shadow-sm'
								: today
									? 'bg-[#2b6cee]/10 text-[#2b6cee] dark:bg-[#2b6cee]/20'
									: 'text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800'
						)}
					>
						<span className="text-[10px] font-medium uppercase">
							{format(day, 'EEE')}
						</span>
						<span
							className={cn(
								'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
								selected && 'bg-white/20'
							)}
						>
							{format(day, 'd')}
						</span>
						{/* Dot indicator for items on this day */}
						{count > 0 && (
							<div className="flex gap-0.5">
								{Array.from({ length: Math.min(count, 3) }, (_, i) => (
									<div
										key={i}
										className={cn(
											'h-1 w-1 rounded-full',
											selected ? 'bg-white/60' : 'bg-[#2b6cee]'
										)}
									/>
								))}
							</div>
						)}
					</button>
				);
			})}
		</div>
	);
}
