'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
	ChevronLeft, ChevronRight, Clock, CheckCircle2,
	AlertTriangle, RotateCcw, MoreHorizontal, AlertCircle,
	Video, ImageIcon, Layers, ChevronDown, ChevronUp,
	Calendar, Trash2, Loader2, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContentItem } from '@/lib/types/posts';
import {
	format, startOfWeek, addDays, isSameDay, getHours, getMinutes,
} from 'date-fns';
import { getFriendlyError } from '@/lib/utils/friendly-error';
import { toast } from 'sonner';

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

// Group items into 30-min slots
interface TimeSlot {
	hour: number;
	halfHour: boolean;
	label: string;
	items: ContentItem[];
}

function groupByTimeSlots(items: ContentItem[]): TimeSlot[] {
	const slots = new Map<string, TimeSlot>();
	for (const item of items) {
		if (!item.scheduledTime) continue;
		const d = new Date(item.scheduledTime);
		const h = getHours(d);
		const half = getMinutes(d) >= 30;
		const key = `${h}:${half ? '30' : '00'}`;
		if (!slots.has(key)) {
			const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
			slots.set(key, {
				hour: h, halfHour: half,
				label: `${dh}:${half ? '30' : '00'} ${h < 12 ? 'AM' : 'PM'}`,
				items: [],
			});
		}
		slots.get(key)!.items.push(item);
	}
	return Array.from(slots.values()).sort((a, b) => a.hour !== b.hour ? a.hour - b.hour : (a.halfHour ? 1 : 0) - (b.halfHour ? 1 : 0));
}

function getDayDots(items: ContentItem[]): string[] {
	const dots: string[] = [];
	if (items.some(i => i.publishingStatus === 'scheduled')) dots.push('bg-blue-500');
	if (items.some(i => i.publishingStatus === 'published')) dots.push('bg-green-500');
	if (items.some(i => i.publishingStatus === 'failed')) dots.push('bg-red-500');
	if (items.some(i => i.publishingStatus === 'processing')) dots.push('bg-gray-300 dark:bg-gray-600');
	return dots.slice(0, 3);
}

// C3: Map raw API errors to friendly labels (uses shared utility)
function friendlyError(raw: string): string {
	return getFriendlyError(raw).message;
}

const STATUS_FILTERS = [
	{ key: 'all', label: 'All' },
	{ key: 'scheduled', label: 'Scheduled' },
	{ key: 'published', label: 'Published' },
	{ key: 'failed', label: 'Failed' },
] as const;

export function MobileScheduleView({
	scheduledItems, currentDate, onDateChange, onItemClick, onRefresh,
	readyCount = 0, onReadyClick, statusFilter: urlStatusFilter,
}: MobileScheduleViewProps) {
	// L1: Collapsible frequency chart (default collapsed)
	const [freqOpen, setFreqOpen] = useState(false);
	// L3: Status filter - initialize from URL param if present
	const [statusFilter, setStatusFilter] = useState<string>(urlStatusFilter || 'all');
	// L5: Expanded time slots (for +N more)
	const [expandedSlots, setExpandedSlots] = useState<Set<string>>(new Set());
	// C6: Dropdown menu state
	const [menuOpen, setMenuOpen] = useState<string | null>(null);
	// V3: Day-switch animation
	const [dayVisible, setDayVisible] = useState(true);
	const [displayDate, setDisplayDate] = useState(currentDate);
	// Loading state for skeleton
	const [isInitialLoad, setIsInitialLoad] = useState(true);

	// Clear initial load after first render with data
	useEffect(() => {
		if (scheduledItems.length > 0 || !isInitialLoad) {
			const timer = setTimeout(() => setIsInitialLoad(false), 300);
			return () => clearTimeout(timer);
		}
		// Auto-dismiss skeleton after 2s even if empty
		const timer = setTimeout(() => setIsInitialLoad(false), 2000);
		return () => clearTimeout(timer);
	}, [scheduledItems.length, isInitialLoad]);

	// V4: Week navigation
	const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
	const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

	// V3: Fade transition on day change
	useEffect(() => {
		if (!isSameDay(displayDate, currentDate)) {
			setDayVisible(false);
			const timer = setTimeout(() => {
				setDisplayDate(currentDate);
				setDayVisible(true);
				// Reset expanded slots and menu on day change
				setExpandedSlots(new Set());
				setMenuOpen(null);
			}, 150);
			return () => clearTimeout(timer);
		}
	}, [currentDate, displayDate]);

	// Items for selected day - when URL filter is 'failed', show all failed items across all dates
	const showAllDates = urlStatusFilter === 'failed';
	const dayItems = useMemo(() => {
		if (showAllDates) return scheduledItems;
		return scheduledItems.filter(item => item.scheduledTime && isSameDay(new Date(item.scheduledTime), currentDate));
	}, [scheduledItems, currentDate, showAllDates]);

	// L3: Filtered items
	const filteredDayItems = useMemo(() => {
		if (statusFilter === 'all') return dayItems;
		return dayItems.filter(item => item.publishingStatus === statusFilter);
	}, [dayItems, statusFilter]);

	const timeSlots = useMemo(() => groupByTimeSlots(filteredDayItems), [filteredDayItems]);

	// Items without scheduledTime (e.g. failed posts that were never scheduled)
	const untimedItems = useMemo(() =>
		filteredDayItems.filter(item => !item.scheduledTime),
		[filteredDayItems]
	);

	// Hourly frequency (always based on all dayItems, not filtered)
	const hourlyFreq = useMemo(() => {
		const f = new Array(24).fill(0);
		dayItems.forEach(item => { if (item.scheduledTime) f[getHours(new Date(item.scheduledTime))]++; });
		return f;
	}, [dayItems]);
	const maxFreq = Math.max(...hourlyFreq, 1);

	// B2: Peak hours label with guard for empty days
	const peakLabel = useMemo(() => {
		if (maxFreq <= 0) return null;
		const peak = hourlyFreq.indexOf(maxFreq);
		if (peak < 0) return null;
		const fmt = (h: number) => `${h === 0 ? 12 : h > 12 ? h - 12 : h}${h < 12 ? 'am' : 'pm'}`;
		let end = peak;
		for (let i = peak + 1; i < 24 && hourlyFreq[i] >= maxFreq * 0.5; i++) end = i;
		return `${fmt(peak)} - ${fmt(end + 1)}`;
	}, [hourlyFreq, maxFreq]);

	const failedCount = dayItems.filter(i => i.publishingStatus === 'failed').length;

	// Items by date for week dots
	const itemsByDate = useMemo(() => {
		const m = new Map<string, ContentItem[]>();
		scheduledItems.forEach(item => {
			if (!item.scheduledTime) return;
			const k = format(new Date(item.scheduledTime), 'yyyy-MM-dd');
			if (!m.has(k)) m.set(k, []);
			m.get(k)!.push(item);
		});
		return m;
	}, [scheduledItems]);

	// L5: Toggle slot expansion
	const toggleSlotExpanded = useCallback((slotKey: string) => {
		setExpandedSlots(prev => {
			const next = new Set(prev);
			if (next.has(slotKey)) next.delete(slotKey);
			else next.add(slotKey);
			return next;
		});
	}, []);

	// Close menu when clicking outside
	useEffect(() => {
		if (!menuOpen) return;
		const handler = () => setMenuOpen(null);
		document.addEventListener('click', handler);
		return () => document.removeEventListener('click', handler);
	}, [menuOpen]);

	return (
		<div className="flex flex-1 flex-col overflow-hidden bg-gray-100 dark:bg-[#101622]">
			{/* Week Strip Header */}
			<section className="flex flex-col shrink-0 bg-white shadow-sm z-10 dark:bg-[#1a1f2e]">
				{/* Month nav */}
				<div className="flex items-center justify-between px-4 py-2.5">
					<div className="flex items-center gap-1.5">
						<button onClick={() => onDateChange(addDays(currentDate, -1))} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 min-h-[44px] min-w-[44px] flex items-center justify-center">
							<ChevronLeft className="h-5 w-5" />
						</button>
						<h2 className="text-base font-bold text-gray-800 dark:text-white">
							{format(currentDate, 'MMM yyyy')}
						</h2>
						<button onClick={() => onDateChange(addDays(currentDate, 1))} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 min-h-[44px] min-w-[44px] flex items-center justify-center">
							<ChevronRight className="h-5 w-5" />
						</button>
					</div>
					<div className="flex items-center gap-2">
						{!isSameDay(currentDate, new Date()) && (
							<button
								onClick={() => onDateChange(new Date())}
								className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs font-bold transition-all min-h-[36px]"
							>
								Today
							</button>
						)}
					</div>
				</div>

				{/* V4: Week strip with snap scrolling and adjacent week navigation */}
				<div className="flex items-center px-1 pb-2">
					<button
						onClick={() => onDateChange(addDays(currentDate, -7))}
						className="p-1.5 shrink-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
					>
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
								<button key={key} onClick={() => onDateChange(day)} className={cn(
									'flex flex-col items-center gap-0.5 flex-1 snap-center transition min-w-[48px] min-h-[44px] py-1',
									isSelected ? 'scale-105' : 'opacity-60 hover:opacity-100'
								)}>
									<span className={cn('text-[10px] uppercase leading-none', isSelected ? 'font-bold text-blue-500 dark:text-blue-400' : 'font-medium text-gray-400 dark:text-gray-500')}>
										{format(day, 'EEE')}
									</span>
									<div className={cn(
										'w-9 h-9 flex items-center justify-center rounded-full font-semibold text-sm relative',
										isSelected ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 font-bold' : 'text-gray-700 dark:text-gray-300',
										isToday && !isSelected && 'ring-2 ring-blue-300 dark:ring-blue-600'
									)}>
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
					<button
						onClick={() => onDateChange(addDays(currentDate, 7))}
						className="p-1.5 shrink-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
					>
						<ChevronRight className="h-4 w-4" />
					</button>
				</div>

				{/* L1: Collapsible Daily Frequency chart - hidden when no items */}
				{dayItems.length > 0 && (
					<div className="border-t border-gray-100 dark:border-gray-800">
						<button
							onClick={() => setFreqOpen(!freqOpen)}
							className="flex items-center justify-between w-full px-4 py-2 text-left"
						>
							<span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
								Daily Frequency
							</span>
							<div className="flex items-center gap-2">
								{peakLabel && !freqOpen && (
									<span className="text-[10px] font-medium text-blue-500">Peak: {peakLabel}</span>
								)}
								{freqOpen ? (
									<ChevronUp className="h-3.5 w-3.5 text-gray-400" />
								) : (
									<ChevronDown className="h-3.5 w-3.5 text-gray-400" />
								)}
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
										const color = pct > 60 ? 'bg-blue-500' : pct > 30 ? 'bg-blue-400 dark:bg-blue-600' : 'bg-blue-300 dark:bg-blue-700';
										return (
											<div key={hour} className="w-full bg-gray-100 dark:bg-gray-800 rounded-sm h-full flex items-end">
												<div className={cn('w-full rounded-sm', color)} style={{ height: `${pct}%` }} />
											</div>
										);
									})}
								</div>
								<div className="flex justify-between text-[9px] text-gray-400 mt-1 font-medium px-0.5">
									<span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>12 AM</span>
								</div>
							</div>
						)}
					</div>
				)}
			</section>

			{/* L3: Status filter chips - horizontally scrollable */}
			<div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1a1f2e] border-t border-gray-100 dark:border-gray-800 overflow-x-auto scrollbar-hide">
				{STATUS_FILTERS.map(({ key, label }) => {
					const isActive = statusFilter === key;
					const count = key === 'all' ? dayItems.length : dayItems.filter(i => i.publishingStatus === key).length;
					return (
						<button
							key={key}
							onClick={() => setStatusFilter(key)}
							className={cn(
								'shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition min-h-[32px]',
								isActive
									? 'bg-blue-500 text-white shadow-sm'
									: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
							)}
						>
							{label}{count > 0 && ` (${count})`}
						</button>
					);
				})}
			</div>

			{/* Timeline with V3 day-switch animation */}
			<main className="flex-1 overflow-y-auto relative pb-28">
				<div
					className={cn(
						'flex flex-col py-3 gap-0 transition-opacity duration-150',
						dayVisible ? 'opacity-100' : 'opacity-0'
					)}
				>
					{/* Skeleton loading state */}
					{isInitialLoad ? (
						<div className="flex flex-col gap-2 px-4 py-2">
							{[1, 2, 3].map((i) => (
								<div key={i} className="flex gap-3 animate-pulse">
									<div className="w-14 text-right pr-2 pt-2 shrink-0">
										<div className="h-4 w-10 bg-gray-200 dark:bg-gray-700 rounded ml-auto" />
									</div>
									<div className="flex-1 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1f2229] p-2.5 flex items-center gap-3">
										<div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 dark:bg-gray-700 rounded-lg shrink-0" />
										<div className="flex-1 space-y-2">
											<div className="flex gap-2">
												<div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-md" />
												<div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded-md" />
											</div>
											<div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded" />
											<div className="h-3 w-2/3 bg-gray-100 dark:bg-gray-800 rounded" />
										</div>
									</div>
								</div>
							))}
						</div>
					) : timeSlots.length === 0 && untimedItems.length === 0 ? (
						/* L2: Compact empty state */
						<div className="flex flex-col items-center justify-center py-12 px-6 text-center">
							<div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
								<Calendar className="h-7 w-7 text-gray-300 dark:text-gray-600" />
							</div>
							<h3 className="text-base font-bold text-gray-700 dark:text-gray-300 mb-1">
								{statusFilter !== 'all'
									? `No ${statusFilter} posts`
									: 'No posts scheduled'}
							</h3>
							{readyCount > 0 && onReadyClick ? (
								<>
									<p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
										{readyCount} item{readyCount !== 1 ? 's' : ''} ready for {format(currentDate, 'MMM d')}
									</p>
									<button
										onClick={onReadyClick}
										className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full font-bold text-sm shadow-lg shadow-blue-500/20 active:scale-95 transition min-h-[44px]"
									>
										<Layers className="h-4 w-4" />
										Schedule from Ready
									</button>
								</>
							) : (
								<p className="text-xs text-gray-400 dark:text-gray-500">
									{statusFilter !== 'all'
										? `No ${statusFilter} posts for ${format(currentDate, 'MMM d')}`
										: `Tap Ready to add content`}
								</p>
							)}
						</div>
					) : (
						timeSlots.map((slot) => {
							const slotKey = `${slot.hour}:${slot.halfHour ? '30' : '00'}`;
							const isExpanded = expandedSlots.has(slotKey);
							const maxVisible = 3;
							const hasMore = slot.items.length > maxVisible;
							const visibleItems = hasMore && !isExpanded
								? slot.items.slice(0, maxVisible)
								: slot.items;

							return (
								<div key={slotKey} className="flex group min-h-[80px] mb-1.5">
									{/* Time label */}
									<div className="w-14 text-right pr-2 pt-2 text-[11px] font-medium text-gray-400 dark:text-gray-500 shrink-0">
										<div className="font-bold text-gray-700 dark:text-gray-300">{slot.label}</div>
									</div>
									{/* Cards */}
									<div className="flex-1 min-w-0 pr-4 pb-2 border-l-2 border-transparent border-dashed pl-4 relative">
										<div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-800 ml-[-1px]" />
										<div className="flex flex-col gap-2">
											{visibleItems.map((item) => (
												<TimelineCard
													key={item.id}
													item={item}
													onClick={() => onItemClick?.(item)}
													onRefresh={onRefresh}
													menuOpen={menuOpen === item.id}
													onMenuToggle={(id) => setMenuOpen(prev => prev === id ? null : id)}
													onItemClick={onItemClick}
												/>
											))}
											{/* L5: +N more button */}
											{hasMore && !isExpanded && (
												<button
													onClick={() => toggleSlotExpanded(slotKey)}
													className="text-xs font-medium text-blue-500 hover:text-blue-600 py-1 text-left"
												>
													+{slot.items.length - maxVisible} more
												</button>
											)}
											{hasMore && isExpanded && (
												<button
													onClick={() => toggleSlotExpanded(slotKey)}
													className="text-xs font-medium text-blue-500 hover:text-blue-600 py-1 text-left"
												>
													Show less
												</button>
											)}
										</div>
									</div>
								</div>
							);
						})
					)}

					{/* Untimed items (failed posts without scheduledTime) */}
					{untimedItems.length > 0 && (
						<div className="px-4 mt-2">
							{timeSlots.length > 0 && (
								<div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
									No scheduled time
								</div>
							)}
							<div className="flex flex-col gap-2">
								{untimedItems.map((item) => (
									<TimelineCard
										key={item.id}
										item={item}
										onClick={() => onItemClick?.(item)}
										onRefresh={onRefresh}
										menuOpen={menuOpen === item.id}
										onMenuToggle={(id) => setMenuOpen(prev => prev === id ? null : id)}
										onItemClick={onItemClick}
									/>
								))}
							</div>
						</div>
					)}

					<div className="h-20" />
				</div>
			</main>

			{/* L4: Floating buttons - safe-area aware positioning */}
			<div className="fixed bottom-20 left-0 right-0 px-4 pb-[env(safe-area-inset-bottom)] flex justify-between items-end gap-3 pointer-events-none z-20 lg:hidden">
				{failedCount > 0 ? (
					<button className="pointer-events-auto shadow-lg shadow-red-500/20 bg-red-600 text-white rounded-full px-4 py-2.5 flex items-center gap-2 active:scale-95 transition min-h-[44px]">
						<AlertCircle className="h-4 w-4" />
						<span className="text-sm font-bold">{failedCount} Issue{failedCount !== 1 ? 's' : ''}</span>
					</button>
				) : (
					<div />
				)}
				{readyCount > 0 && onReadyClick ? (
					<button onClick={onReadyClick} className="pointer-events-auto shadow-lg shadow-blue-500/30 bg-blue-500 hover:bg-blue-600 text-white rounded-full pl-4 pr-3 py-2.5 flex items-center gap-2 active:scale-95 transition min-h-[44px]">
						<Layers className="h-5 w-5" />
						<span className="text-sm font-bold">Ready</span>
						<div className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">{readyCount}</div>
						<ChevronRight className="h-4 w-4" />
					</button>
				) : (
					<div />
				)}
			</div>

			{/* C6: Action sheet for card menu - rendered at top level to avoid overflow clipping */}
			{menuOpen && (() => {
				const menuItem = scheduledItems.find(i => i.id === menuOpen);
				if (!menuItem) return null;
				const menuTime = menuItem.scheduledTime ? format(new Date(menuItem.scheduledTime), 'h:mm a') : '';
				const menuTitle = menuItem.caption || menuItem.title
					|| `${menuItem.mediaType === 'VIDEO' ? 'Video' : 'Image'} \u00b7 ${menuTime}`;
				return (
					<div
						className="fixed inset-0 z-[60]"
						onClick={() => setMenuOpen(null)}
					>
						<div className="absolute inset-0 bg-black/40" />
						<div
							className="absolute bottom-0 left-0 right-0 max-w-lg mx-auto rounded-t-2xl bg-white dark:bg-[#1a1f2e] shadow-2xl animate-in slide-in-from-bottom duration-200"
							onClick={(e) => e.stopPropagation()}
						>
							{/* Handle */}
							<div className="flex justify-center pt-3 pb-1">
								<div className="h-1 w-10 rounded-full bg-gray-300 dark:bg-slate-600" />
							</div>
							{/* Item preview */}
							<div className="flex items-center gap-3 px-5 pb-3">
								<div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
									{menuItem.mediaUrl ? (
										<Image
											src={menuItem.mediaUrl}
											alt={menuTitle}
											fill
											className="object-cover"
											unoptimized
										/>
									) : (
										<div className="flex h-full w-full items-center justify-center">
											{menuItem.mediaType === 'VIDEO'
												? <Video className="h-5 w-5 text-gray-400" />
												: <ImageIcon className="h-5 w-5 text-gray-400" />}
										</div>
									)}
								</div>
								<div className="min-w-0 flex-1">
									<p className="text-sm font-bold text-gray-900 dark:text-white truncate">{menuTitle}</p>
									<p className="text-xs text-gray-500 dark:text-gray-400">{menuTime}</p>
								</div>
							</div>
							{/* Actions - context-aware for failed vs scheduled */}
							<div className="px-5 pb-3 flex flex-col gap-2">
								{menuItem.publishingStatus === 'failed' ? (
									<>
										<ActionSheetRetryButton
											itemId={menuItem.id}
											onDone={() => { setMenuOpen(null); onRefresh?.(); }}
										/>
										<button
											onClick={() => { setMenuOpen(null); onItemClick?.(menuItem); }}
											className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition active:scale-[0.98] min-h-[48px]"
										>
											<Clock className="h-5 w-5 text-blue-500" />
											View Details
										</button>
										<ActionSheetDeleteButton
											itemId={menuItem.id}
											onDone={() => { setMenuOpen(null); onRefresh?.(); }}
										/>
									</>
								) : (
									<>
										<button
											onClick={() => { setMenuOpen(null); onItemClick?.(menuItem); }}
											className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition active:scale-[0.98] min-h-[48px]"
										>
											<Clock className="h-5 w-5 text-blue-500" />
											Reschedule
										</button>
										<ActionSheetDeleteButton
											itemId={menuItem.id}
											onDone={() => { setMenuOpen(null); onRefresh?.(); }}
										/>
									</>
								)}
							</div>
							{/* Dismiss button */}
							<div className="px-5 pt-1 pb-24">
								<button
									onClick={() => setMenuOpen(null)}
									className="w-full py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition active:scale-[0.98] min-h-[48px]"
								>
									Close
								</button>
							</div>
						</div>
					</div>
				);
			})()}
		</div>
	);
}

/* ── Action sheet helpers ── */

function ActionSheetRetryButton({ itemId, onDone }: { itemId: string; onDone: () => void }) {
	const [loading, setLoading] = useState(false);
	const handleRetry = async () => {
		setLoading(true);
		try {
			const res = await fetch(`/api/content/${itemId}/retry`, { method: 'POST' });
			if (res.ok) {
				toast.success('Post queued for retry');
				onDone();
			} else {
				const data = await res.json();
				toast.error(data.error || 'Failed to retry');
			}
		} catch {
			toast.error('Failed to retry');
		} finally {
			setLoading(false);
		}
	};
	return (
		<button
			onClick={handleRetry}
			disabled={loading}
			className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-50 dark:bg-orange-900/10 text-sm font-semibold text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/20 transition active:scale-[0.98] min-h-[48px] disabled:opacity-50"
		>
			{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
			Retry Post
		</button>
	);
}

function ActionSheetDeleteButton({ itemId, onDone }: { itemId: string; onDone: () => void }) {
	const [loading, setLoading] = useState(false);
	const handleDelete = async () => {
		setLoading(true);
		try {
			const res = await fetch(`/api/content/${itemId}`, { method: 'DELETE' });
			if (res.ok) {
				toast.success('Post deleted');
				onDone();
			} else {
				const data = await res.json();
				toast.error(data.error || 'Failed to delete');
			}
		} catch {
			toast.error('Failed to delete');
		} finally {
			setLoading(false);
		}
	};
	return (
		<button
			onClick={handleDelete}
			disabled={loading}
			className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition active:scale-[0.98] min-h-[48px] disabled:opacity-50"
		>
			{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
			Delete Post
		</button>
	);
}

/* ── Individual timeline card ── */

function TimelineCard({ item, onClick, onRefresh, menuOpen, onMenuToggle, onItemClick }: {
	item: ContentItem;
	onClick: () => void;
	onRefresh?: () => void;
	menuOpen: boolean;
	onMenuToggle: (id: string) => void;
	onItemClick?: (item: ContentItem) => void;
}) {
	// P2: Per-card image error state
	const [imgError, setImgError] = useState(false);
	const [isRetrying, setIsRetrying] = useState(false);

	const isFailed = item.publishingStatus === 'failed';
	const isPublished = item.publishingStatus === 'published';
	// B3: Consistent 12h time format
	const time = item.scheduledTime ? format(new Date(item.scheduledTime), 'h:mm a') : '';

	// C4: Fallback title
	const displayTitle = item.caption || item.title
		|| `${item.mediaType === 'VIDEO' ? 'Video' : 'Image'} \u00b7 ${time}`;

	const handleRetry = async (e: React.MouseEvent) => {
		e.stopPropagation();
		try {
			setIsRetrying(true);
			const response = await fetch(`/api/content/${item.id}/retry`, { method: 'POST' });
			if (response.ok) {
				toast.success('Post queued for retry');
				onRefresh?.();
			} else {
				const data = await response.json();
				toast.error(data.error || 'Failed to retry');
			}
		} catch {
			toast.error('Failed to retry post');
		} finally {
			setIsRetrying(false);
		}
	};

	return (
		<div
			onClick={onClick}
			className={cn(
				// B1: max-w-full + overflow-hidden for horizontal containment
				'max-w-full rounded-xl shadow-sm border p-2 flex items-center gap-2.5 overflow-hidden cursor-pointer transition active:scale-[0.98] relative',
				// V2: Failed cards get red background
				isFailed
					? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30'
					: 'bg-white dark:bg-[#1f2229] border-gray-100 dark:border-gray-800'
			)}
		>
			{/* Red left stripe for failed */}
			{isFailed && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l-xl" />}

			{/* Responsive thumbnail: 64px on small, 80px on sm+ */}
			<div className={cn(
				'w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden shrink-0 relative',
				isFailed && 'ml-1'
			)}>
				{item.mediaUrl && !imgError ? (
					<Image
						src={item.mediaUrl}
						alt={item.caption || 'Story preview'}
						fill
						className={cn('object-cover', isFailed && 'grayscale opacity-70')}
						unoptimized
						onError={() => setImgError(true)}
					/>
				) : (
					<div className="flex h-full w-full items-center justify-center">
						{item.mediaType === 'VIDEO'
							? <Video className="h-6 w-6 text-gray-400" />
							: <ImageIcon className="h-6 w-6 text-gray-400" />}
					</div>
				)}
				{/* C2: Only show "Video" badge, no badge for images */}
				{item.mediaType === 'VIDEO' && (
					<div className="absolute bottom-0 left-0 w-full bg-black/50 text-[9px] text-white text-center py-0.5">
						Video
					</div>
				)}
				{/* Warning overlay for failed */}
				{isFailed && (
					<div className="absolute inset-0 flex items-center justify-center bg-black/20">
						<AlertTriangle className="h-5 w-5 text-white" />
					</div>
				)}
			</div>

			{/* Content - B1: min-w-0 to constrain flex child */}
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-1.5 mb-0.5 min-w-0 flex-wrap">
					{time && (
						<span className={cn(
							'text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded shrink-0',
							isFailed
								? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
								: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
						)}>
							{time}
						</span>
					)}
					{/* Compact status pill */}
					<span className={cn(
						'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide shrink-0',
						item.publishingStatus === 'published' && 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
						item.publishingStatus === 'failed' && 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
						item.publishingStatus === 'processing' && 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
						item.publishingStatus === 'scheduled' && 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
					)}>
						<span className={cn(
							'w-1.5 h-1.5 rounded-full',
							item.publishingStatus === 'published' && 'bg-emerald-500',
							item.publishingStatus === 'failed' && 'bg-red-500',
							item.publishingStatus === 'processing' && 'bg-amber-500 animate-pulse',
							item.publishingStatus === 'scheduled' && 'bg-blue-500',
						)} />
						{item.publishingStatus}
						{isFailed && item.retryCount !== undefined && item.retryCount > 0 && (
							<span className="text-red-400 dark:text-red-500">
								\u00b7 {item.retryCount}x
							</span>
						)}
					</span>
				</div>
				{/* C5: line-clamp-2 title */}
				<h3 className="text-[13px] font-semibold text-gray-900 dark:text-white line-clamp-2 min-w-0 leading-snug mb-0.5">
					{displayTitle}
				</h3>
				{/* B1: Error text or subtitle */}
				<p className={cn(
					'text-[11px] truncate max-w-full',
					isFailed ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'
				)}>
					{isFailed ? friendlyError(item.error || 'Publishing failed') : (item.mediaType === 'VIDEO' ? 'Video story' : 'Image story')}
				</p>
			</div>

			{/* Right action */}
			<div className="shrink-0">
				{isPublished && <CheckCircle2 className="h-5 w-5 text-green-500" />}
				{isFailed && (
					<button
						onClick={handleRetry}
						disabled={isRetrying}
						className="text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-50"
						title="Retry"
					>
						{isRetrying ? (
							<Loader2 className="h-5 w-5 animate-spin" />
						) : (
							<RefreshCw className="h-5 w-5" />
						)}
					</button>
				)}
				{/* C6: MoreHorizontal button - show for scheduled AND failed */}
				{!isPublished && (
					<button
						onClick={(e) => {
							e.stopPropagation();
							onMenuToggle(item.id);
						}}
						className="text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
					>
						<MoreHorizontal className="h-5 w-5" />
					</button>
				)}
			</div>
		</div>
	);
}
