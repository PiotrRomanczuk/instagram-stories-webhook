'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContentItem } from '@/lib/types/posts';
import { format, isSameDay, addDays } from 'date-fns';
import { getDayDots } from './mobile-schedule-view.helpers';
import { PublishingToggle } from '@/app/components/schedule/publishing-toggle';

interface WeekStripProps {
	currentDate: Date;
	weekDays: Date[];
	itemsByDate: Map<string, ContentItem[]>;
	dayItems: ContentItem[];
	hourlyFreq: number[];
	maxFreq: number;
	peakLabel: string | null;
	freqOpen: boolean;
	onFreqToggle: () => void;
	onDateChange: (date: Date) => void;
}

/**
 * Week navigation strip with day dots, frequency chart, and date controls
 */
export function WeekStrip({
	currentDate,
	weekDays,
	itemsByDate,
	dayItems,
	hourlyFreq,
	maxFreq,
	peakLabel,
	freqOpen,
	onFreqToggle,
	onDateChange,
}: WeekStripProps) {
	return (
		<section className="flex flex-col shrink-0 bg-white shadow-sm z-10">
			{/* Month nav */}
			<div data-tour="schedule-date-nav" className="flex items-center justify-between px-4 py-2.5">
				<div className="flex items-center gap-1.5">
					<button onClick={() => onDateChange(addDays(currentDate, -1))} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 min-h-[44px] min-w-[44px] flex items-center justify-center">
						<ChevronLeft className="h-5 w-5" />
					</button>
					<h2 className="text-base font-bold text-gray-800">{format(currentDate, 'MMM yyyy')}</h2>
					<button onClick={() => onDateChange(addDays(currentDate, 1))} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 min-h-[44px] min-w-[44px] flex items-center justify-center">
						<ChevronRight className="h-5 w-5" />
					</button>
				</div>
				<div className="flex items-center gap-2">
					<PublishingToggle />
					{!isSameDay(currentDate, new Date()) && (
						<button onClick={() => onDateChange(new Date())} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full text-xs font-bold transition-all min-h-[44px]">
							Today
						</button>
					)}
				</div>
			</div>

			{/* Week strip with snap scrolling */}
			<div data-tour="schedule-week-strip" className="flex items-center px-1 pb-2">
				<button onClick={() => onDateChange(addDays(currentDate, -7))} className="p-1.5 shrink-0 rounded-full hover:bg-gray-100 text-gray-400 min-h-[44px] min-w-[44px] flex items-center justify-center">
					<ChevronLeft className="h-4 w-4" />
				</button>
				<div className="flex items-center justify-between flex-1 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
					{weekDays.map((day) => {
						const isSelected = isSameDay(day, currentDate);
						const isToday = isSameDay(day, new Date());
						const key = format(day, 'yyyy-MM-dd');
						const dots = getDayDots(itemsByDate.get(key) || []);
						const dayItemCount = (itemsByDate.get(key) || []).length;
						return (
							<button key={key} onClick={() => onDateChange(day)} className={cn('flex flex-col items-center gap-0.5 flex-1 snap-center transition min-w-[48px] min-h-[44px] py-1', isSelected ? 'scale-105' : 'opacity-60 hover:opacity-100')}>
								<span className={cn('text-[10px] uppercase leading-none', isSelected ? 'font-bold text-blue-500' : 'font-medium text-gray-400')}>
									{format(day, 'EEE')}
								</span>
								<div className={cn('w-9 h-9 flex items-center justify-center rounded-full font-semibold text-sm relative', isSelected ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 font-bold' : 'text-gray-700', isToday && !isSelected && 'ring-2 ring-blue-300')}>
									{format(day, 'd')}
									{dayItemCount > 0 && !isSelected && (
										<span className="absolute -top-0.5 -right-0.5 bg-blue-500 text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
											{dayItemCount > 9 ? '9+' : dayItemCount}
										</span>
									)}
								</div>
								<div className="flex gap-0.5 h-1.5">
									{dots.length > 0 ? dots.map((d, i) => (
										<div key={i} className={cn('h-1 w-1 rounded-full', d)} />
									)) : <div className="h-1 w-1 rounded-full bg-transparent" />}
								</div>
							</button>
						);
					})}
				</div>
				<button onClick={() => onDateChange(addDays(currentDate, 7))} className="p-1.5 shrink-0 rounded-full hover:bg-gray-100 text-gray-400 min-h-[44px] min-w-[44px] flex items-center justify-center">
					<ChevronRight className="h-4 w-4" />
				</button>
			</div>

			{/* Collapsible Daily Frequency chart */}
			{dayItems.length > 0 && (
				<div className="border-t border-gray-100">
					<button onClick={onFreqToggle} className="flex items-center justify-between w-full px-4 py-2 text-left">
						<span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Daily Frequency</span>
						<div className="flex items-center gap-2">
							{peakLabel && !freqOpen && (
								<span className="text-[10px] font-medium text-blue-500">Peak: {peakLabel}</span>
							)}
							{freqOpen ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
						</div>
					</button>
					{freqOpen && (
						<div className="px-4 pb-3">
							{peakLabel && (
								<div className="flex justify-end mb-2">
									<span className="text-[10px] font-medium text-blue-500">High Density: {peakLabel}</span>
								</div>
							)}
							<div className="flex items-end justify-between h-12 gap-[2px]">
								{hourlyFreq.map((freq, hour) => {
									const pct = maxFreq > 0 ? Math.max(5, (freq / maxFreq) * 100) : 5;
									const color = pct > 60 ? 'bg-blue-500' : pct > 30 ? 'bg-blue-400' : 'bg-blue-300';
									return (
										<div key={hour} className="w-full bg-gray-100 rounded-sm h-full flex items-end">
											<div className={cn('w-full rounded-sm', color)} style={{ height: `${pct}%` }} />
										</div>
									);
								})}
							</div>
							<div className="flex justify-between text-[9px] text-gray-400 mt-1 font-medium px-0.5">
								<span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>00:00</span>
							</div>
						</div>
					)}
				</div>
			)}
		</section>
	);
}
