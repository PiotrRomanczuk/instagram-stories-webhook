'use client';

import React, { useCallback } from 'react';
import { Calendar, Layers } from 'lucide-react';
import { ContentItem } from '@/lib/types/posts';
import { format } from 'date-fns';
import { TimelineCard } from './mobile-schedule-view.timeline-card';
import { TimeSlot } from './mobile-schedule-view.helpers';

interface TimelineBodyProps {
	isInitialLoad: boolean;
	timeSlots: TimeSlot[];
	untimedItems: ContentItem[];
	statusFilter: string;
	currentDate: Date;
	readyCount: number;
	dayVisible: boolean;
	menuOpen: string | null;
	expandedSlots: Set<string>;
	onItemClick?: (item: ContentItem) => void;
	onRefresh?: () => void;
	onMenuToggle: (id: string) => void;
	onToggleSlotExpanded: (slotKey: string) => void;
	onReadyClick?: () => void;
}

/**
 * Timeline main content area: skeleton, empty state, or time slots
 */
export function TimelineBody({
	isInitialLoad, timeSlots, untimedItems, statusFilter, currentDate, readyCount,
	dayVisible, menuOpen, expandedSlots, onItemClick, onRefresh, onMenuToggle,
	onToggleSlotExpanded, onReadyClick,
}: TimelineBodyProps) {
	const renderCard = useCallback((item: ContentItem) => (
		<TimelineCard
			key={item.id}
			item={item}
			onClick={() => onItemClick?.(item)}
			onRefresh={onRefresh}
			menuOpen={menuOpen === item.id}
			onMenuToggle={onMenuToggle}
			onItemClick={onItemClick}
		/>
	), [onItemClick, onRefresh, menuOpen, onMenuToggle]);

	return (
		<div className={`flex flex-col py-3 gap-0 transition-opacity duration-150 ${dayVisible ? 'opacity-100' : 'opacity-0'}`}>
			{isInitialLoad ? (
				<div className="flex flex-col gap-2 px-4 py-2">
					{[1, 2, 3].map((i) => (
						<div key={i} className="flex gap-3 animate-pulse">
							<div className="w-14 text-right pr-2 pt-2 shrink-0"><div className="h-4 w-10 bg-gray-200 rounded ml-auto" /></div>
							<div className="flex-1 rounded-xl border border-gray-100 bg-white p-2.5 flex items-center gap-3">
								<div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded-lg shrink-0" />
								<div className="flex-1 space-y-2">
									<div className="flex gap-2"><div className="h-5 w-16 bg-gray-200 rounded-md" /><div className="h-5 w-20 bg-gray-200 rounded-md" /></div>
									<div className="h-3 w-full bg-gray-100 rounded" />
									<div className="h-3 w-2/3 bg-gray-100 rounded" />
								</div>
							</div>
						</div>
					))}
				</div>
			) : timeSlots.length === 0 && untimedItems.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-12 px-6 text-center">
					<div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
						<Calendar className="h-7 w-7 text-gray-300" />
					</div>
					<h3 className="text-base font-bold text-gray-700 mb-1">
						{statusFilter !== 'all' ? `No ${statusFilter} posts` : 'No posts scheduled'}
					</h3>
					{readyCount > 0 && onReadyClick ? (
						<>
							<p className="text-xs text-gray-400 mb-3">{readyCount} item{readyCount !== 1 ? 's' : ''} ready for {format(currentDate, 'MMM d')}</p>
							<button onClick={onReadyClick} className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full font-bold text-sm shadow-lg shadow-blue-500/20 active:scale-95 transition min-h-[44px]">
								<Layers className="h-4 w-4" />
								Schedule from Ready
							</button>
						</>
					) : (
						<p className="text-xs text-gray-400">
							{statusFilter !== 'all' ? `No ${statusFilter} posts for ${format(currentDate, 'MMM d')}` : `Tap Ready to add content`}
						</p>
					)}
				</div>
			) : (
				timeSlots.map((slot: TimeSlot) => {
					const slotKey = `${slot.hour}:${slot.halfHour ? '30' : '00'}`;
					const isExpanded = expandedSlots.has(slotKey);
					const maxVisible = 3;
					const hasMore = slot.items.length > maxVisible;
					const visibleItems = hasMore && !isExpanded ? slot.items.slice(0, maxVisible) : slot.items;
					return (
						<div key={slotKey} className="flex group min-h-[80px] mb-1.5">
							<div className="w-14 text-right pr-2 pt-2 text-[11px] font-medium text-gray-400 shrink-0">
								<div className="font-bold text-gray-700">{slot.label}</div>
							</div>
							<div className="flex-1 min-w-0 pr-4 pb-2 border-l-2 border-transparent border-dashed pl-4 relative">
								<div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200 ml-[-1px]" />
								<div className="flex flex-col gap-2">
									{visibleItems.map(renderCard)}
									{hasMore && !isExpanded && <button onClick={() => onToggleSlotExpanded(slotKey)} className="text-xs font-medium text-blue-500 hover:text-blue-600 py-1 text-left">+{slot.items.length - maxVisible} more</button>}
									{hasMore && isExpanded && <button onClick={() => onToggleSlotExpanded(slotKey)} className="text-xs font-medium text-blue-500 hover:text-blue-600 py-1 text-left">Show less</button>}
								</div>
							</div>
						</div>
					);
				})
			)}

			{untimedItems.length > 0 && (
				<div className="px-4 mt-2">
					{timeSlots.length > 0 && <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">No scheduled time</div>}
					<div className="flex flex-col gap-2">{untimedItems.map(renderCard)}</div>
				</div>
			)}
			<div className="h-20" />
		</div>
	);
}
