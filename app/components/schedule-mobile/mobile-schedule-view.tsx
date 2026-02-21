'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { AlertCircle, Layers, ChevronRight } from 'lucide-react';
import { ContentItem } from '@/lib/types/posts';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { toast } from 'sonner';
import { ScheduleTimeSheet } from './schedule-time-sheet';
import { getNextAvailableSlot } from '@/lib/utils/schedule-time';
import { WeekStrip } from './mobile-schedule-view.week-strip';
import { StatusFilters } from './mobile-schedule-view.status-filters';
import { ActionSheet } from './mobile-schedule-view.action-sheet';
import { TimelineBody } from './mobile-schedule-view.timeline-body';
import { useScheduleData } from './mobile-schedule-view.use-schedule-data';

interface MobileScheduleViewProps {
	scheduledItems: ContentItem[];
	currentDate: Date;
	onDateChange: (date: Date) => void;
	onItemClick?: (item: ContentItem) => void;
	onRefresh?: () => void;
	readyCount?: number;
	onReadyClick?: () => void;
	statusFilter?: string | null;
}

export function MobileScheduleView({
	scheduledItems, currentDate, onDateChange, onItemClick, onRefresh,
	readyCount = 0, onReadyClick, statusFilter: urlStatusFilter,
}: MobileScheduleViewProps) {
	const [freqOpen, setFreqOpen] = useState(false);
	const [statusFilter, setStatusFilter] = useState<string>(urlStatusFilter || 'all');
	const [expandedSlots, setExpandedSlots] = useState<Set<string>>(new Set());
	const [menuOpen, setMenuOpen] = useState<string | null>(null);
	const [rescheduleItem, setRescheduleItem] = useState<ContentItem | null>(null);
	const [dayVisible, setDayVisible] = useState(true);
	const [displayDate, setDisplayDate] = useState(currentDate);
	const [isInitialLoad, setIsInitialLoad] = useState(true);

	const { dayItems, timeSlots, untimedItems, hourlyFreq, maxFreq, peakLabel, failedCount, overdueCount, itemsByDate } =
		useScheduleData(scheduledItems, currentDate, statusFilter, urlStatusFilter);

	useEffect(() => {
		const ms = scheduledItems.length > 0 || !isInitialLoad ? 300 : 2000;
		const timer = setTimeout(() => setIsInitialLoad(false), ms);
		return () => clearTimeout(timer);
	}, [scheduledItems.length, isInitialLoad]);

	useEffect(() => {
		if (isSameDay(displayDate, currentDate)) return;
		setDayVisible(false);
		const timer = setTimeout(() => { setDisplayDate(currentDate); setDayVisible(true); setExpandedSlots(new Set()); setMenuOpen(null); }, 150);
		return () => clearTimeout(timer);
	}, [currentDate, displayDate]);

	useEffect(() => {
		if (!menuOpen) return;
		const handler = () => setMenuOpen(null);
		document.addEventListener('click', handler);
		return () => document.removeEventListener('click', handler);
	}, [menuOpen]);

	const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
	const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

	const suggestedTime = useMemo(() =>
		new Date(getNextAvailableSlot(scheduledItems.filter(i => i.scheduledTime).map(i => i.scheduledTime!))),
		[scheduledItems]
	);

	const handleRescheduleConfirm = useCallback(async (item: ContentItem, scheduledTime: Date) => {
		setRescheduleItem(null);
		try {
			const response = await fetch(`/api/content/${item.id}`, {
				method: 'PATCH', headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ scheduledTime: scheduledTime.getTime(), publishingStatus: 'scheduled', version: item.version }),
			});
			if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Failed to reschedule'); }
			toast.success(`Rescheduled for ${format(scheduledTime, 'HH:mm')}`);
			onRefresh?.();
		} catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to reschedule'); }
	}, [onRefresh]);

	const toggleSlotExpanded = useCallback((slotKey: string) => {
		setExpandedSlots(prev => { const next = new Set(prev); if (next.has(slotKey)) next.delete(slotKey); else next.add(slotKey); return next; });
	}, []);

	return (
		<div className="flex flex-1 flex-col overflow-hidden bg-gray-100">
			<WeekStrip currentDate={currentDate} weekDays={weekDays} itemsByDate={itemsByDate} dayItems={dayItems} hourlyFreq={hourlyFreq} maxFreq={maxFreq} peakLabel={peakLabel} freqOpen={freqOpen} onFreqToggle={() => setFreqOpen(!freqOpen)} onDateChange={onDateChange} />
			<StatusFilters statusFilter={statusFilter} dayItems={dayItems} overdueCount={overdueCount} onFilterChange={setStatusFilter} />
			<main data-tour="schedule-timeline" className="flex-1 overflow-y-auto relative pb-28">
				<TimelineBody isInitialLoad={isInitialLoad} timeSlots={timeSlots} untimedItems={untimedItems} statusFilter={statusFilter} currentDate={currentDate} readyCount={readyCount} dayVisible={dayVisible} menuOpen={menuOpen} expandedSlots={expandedSlots} onItemClick={onItemClick} onRefresh={onRefresh} onMenuToggle={(id) => setMenuOpen(prev => prev === id ? null : id)} onToggleSlotExpanded={toggleSlotExpanded} onReadyClick={onReadyClick} />
			</main>
			<div data-tour="schedule-ready-button" className="fixed bottom-20 left-0 right-0 px-4 pb-[env(safe-area-inset-bottom)] flex justify-between items-end gap-3 pointer-events-none z-20 lg:hidden">
				{failedCount > 0 ? (
					<button className="pointer-events-auto shadow-lg shadow-red-500/20 bg-red-600 text-white rounded-full px-4 py-2.5 flex items-center gap-2 active:scale-95 transition min-h-[44px]">
						<AlertCircle className="h-4 w-4" />
						<span className="text-sm font-bold">{failedCount} Issue{failedCount !== 1 ? 's' : ''}</span>
					</button>
				) : <div />}
				{readyCount > 0 && onReadyClick ? (
					<button onClick={onReadyClick} className="pointer-events-auto shadow-lg shadow-blue-500/30 bg-blue-500 hover:bg-blue-600 text-white rounded-full pl-4 pr-3 py-2.5 flex items-center gap-2 active:scale-95 transition min-h-[44px]">
						<Layers className="h-5 w-5" />
						<span className="text-sm font-bold">Ready</span>
						<div className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">{readyCount}</div>
						<ChevronRight className="h-4 w-4" />
					</button>
				) : <div />}
			</div>
			<ActionSheet menuOpen={menuOpen} scheduledItems={scheduledItems} onClose={() => setMenuOpen(null)} onReschedule={setRescheduleItem} onItemClick={onItemClick} onRefresh={onRefresh} />
			{rescheduleItem && (
				<ScheduleTimeSheet item={rescheduleItem} initialDate={rescheduleItem.scheduledTime ? new Date(rescheduleItem.scheduledTime) : suggestedTime} onConfirm={handleRescheduleConfirm} onCancel={() => setRescheduleItem(null)} existingScheduledTimes={scheduledItems.filter(i => i.scheduledTime && i.id !== rescheduleItem.id).map(i => i.scheduledTime!)} />
			)}
		</div>
	);
}
