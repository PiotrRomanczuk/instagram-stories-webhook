'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
	ChevronLeft, ChevronRight, Clock, CheckCircle2,
	AlertTriangle, RotateCcw, MoreHorizontal, AlertCircle,
	Video, ImageIcon, Layers, X, ChevronDown, ChevronUp,
	Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContentItem } from '@/lib/types/posts';
import {
	format, startOfWeek, addDays, isSameDay, getHours, getMinutes,
} from 'date-fns';

interface MobileScheduleViewProps {
	scheduledItems: ContentItem[];
	currentDate: Date;
	onDateChange: (date: Date) => void;
	onItemClick?: (item: ContentItem) => void;
	onRefresh?: () => void;
	readyCount?: number;
	onReadyClick?: () => void;
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

// C3: Map raw API errors to friendly labels
function friendlyError(raw: string): string {
	const lower = raw.toLowerCase();
	if (lower.includes('facebook connection') || lower.includes('link your account')) {
		return 'Connection lost \u2014 reconnect account';
	}
	if (lower.includes('token')) {
		return 'Token expired \u2014 re-authenticate';
	}
	if (lower.includes('rate limit') || lower.includes('368')) {
		return 'Rate limited \u2014 try later';
	}
	if (lower.includes('timeout')) {
		return 'Timed out \u2014 retry';
	}
	if (raw.length > 60) {
		return raw.slice(0, 57) + '...';
	}
	return raw;
}

const STATUS_FILTERS = [
	{ key: 'all', label: 'All' },
	{ key: 'scheduled', label: 'Scheduled' },
	{ key: 'published', label: 'Published' },
	{ key: 'failed', label: 'Failed' },
] as const;

export function MobileScheduleView({
	scheduledItems, currentDate, onDateChange, onItemClick, onRefresh,
	readyCount = 0, onReadyClick,
}: MobileScheduleViewProps) {
	// L1: Collapsible frequency chart (default collapsed)
	const [freqOpen, setFreqOpen] = useState(false);
	// L3: Status filter
	const [statusFilter, setStatusFilter] = useState<string>('all');
	// L5: Expanded time slots (for +N more)
	const [expandedSlots, setExpandedSlots] = useState<Set<string>>(new Set());
	// C6: Dropdown menu state
	const [menuOpen, setMenuOpen] = useState<string | null>(null);
	// V3: Day-switch animation
	const [dayVisible, setDayVisible] = useState(true);
	const [displayDate, setDisplayDate] = useState(currentDate);

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

	// Items for selected day
	const dayItems = useMemo(() =>
		scheduledItems.filter(item => item.scheduledTime && isSameDay(new Date(item.scheduledTime), currentDate)),
		[scheduledItems, currentDate]
	);

	// L3: Filtered items
	const filteredDayItems = useMemo(() => {
		if (statusFilter === 'all') return dayItems;
		return dayItems.filter(item => item.publishingStatus === statusFilter);
	}, [dayItems, statusFilter]);

	const timeSlots = useMemo(() => groupByTimeSlots(filteredDayItems), [filteredDayItems]);

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
				<div className="flex items-center justify-between px-4 py-3">
					<div className="flex items-center gap-2">
						<button onClick={() => onDateChange(addDays(currentDate, -1))} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400">
							<ChevronLeft className="h-5 w-5" />
						</button>
						<h2 className="text-lg font-bold text-gray-800 dark:text-white">
							{format(currentDate, 'MMM yyyy')}
						</h2>
						<button onClick={() => onDateChange(addDays(currentDate, 1))} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400">
							<ChevronRight className="h-5 w-5" />
						</button>
					</div>
					<button className="group flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-500 dark:text-blue-400 rounded-full text-xs font-bold border border-blue-100 dark:border-blue-500/20 transition-all">
						<Clock className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
						<span>Time Shift</span>
					</button>
				</div>

				{/* V4: Week strip with adjacent week navigation */}
				<div className="flex items-center px-1 pb-2">
					<button
						onClick={() => onDateChange(addDays(currentDate, -7))}
						className="p-1 shrink-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500"
					>
						<ChevronLeft className="h-4 w-4" />
					</button>
					<div className="flex items-center justify-between flex-1">
						{weekDays.map((day) => {
							const isSelected = isSameDay(day, currentDate);
							const key = format(day, 'yyyy-MM-dd');
							const dots = getDayDots(itemsByDate.get(key) || []);
							return (
								<button key={key} onClick={() => onDateChange(day)} className={cn(
									'flex flex-col items-center gap-1 flex-1 transition',
									isSelected ? 'scale-105' : 'opacity-50 hover:opacity-100'
								)}>
									<span className={cn('text-xs uppercase', isSelected ? 'font-bold text-blue-500 dark:text-blue-400' : 'font-medium text-gray-400 dark:text-gray-500')}>
										{format(day, 'EEE')}
									</span>
									<div className={cn(
										'w-10 h-10 flex items-center justify-center rounded-full font-semibold',
										isSelected ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 font-bold' : 'text-gray-700 dark:text-gray-300'
									)}>
										{format(day, 'd')}
									</div>
									<div className="flex gap-0.5 mt-0.5 h-1.5">
										{dots.length > 0 ? dots.map((d, i) => (
											<div key={i} className={cn('h-1.5 w-1.5 rounded-full', d)} />
										)) : <div className="h-1.5 w-1.5 rounded-full bg-transparent" />}
									</div>
								</button>
							);
						})}
					</div>
					<button
						onClick={() => onDateChange(addDays(currentDate, 7))}
						className="p-1 shrink-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500"
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

			{/* L3: Status filter chips */}
			<div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1a1f2e] border-t border-gray-100 dark:border-gray-800">
				{STATUS_FILTERS.map(({ key, label }) => {
					const isActive = statusFilter === key;
					const count = key === 'all' ? dayItems.length : dayItems.filter(i => i.publishingStatus === key).length;
					return (
						<button
							key={key}
							onClick={() => setStatusFilter(key)}
							className={cn(
								'px-3 py-1 rounded-full text-xs font-medium transition',
								isActive
									? 'bg-blue-500 text-white'
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
						'flex flex-col py-4 gap-0 transition-opacity duration-150',
						dayVisible ? 'opacity-100' : 'opacity-0'
					)}
				>
					{timeSlots.length === 0 ? (
						/* L2: Improved empty state */
						<div className="flex flex-col items-center justify-center py-20 px-8 text-center">
							<Calendar className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
							<h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-1">
								{statusFilter !== 'all'
									? `No ${statusFilter} posts`
									: 'No posts scheduled'}
							</h3>
							{readyCount > 0 && onReadyClick ? (
								<>
									<p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
										You have content ready to schedule for {format(currentDate, 'MMM d')}
									</p>
									<button
										onClick={onReadyClick}
										className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-full font-bold text-sm shadow-lg shadow-blue-500/20 active:scale-95 transition"
									>
										<Layers className="h-4 w-4" />
										Schedule from Ready ({readyCount} item{readyCount !== 1 ? 's' : ''})
									</button>
								</>
							) : (
								<p className="text-sm text-gray-400 dark:text-gray-500">
									{statusFilter !== 'all'
										? `No ${statusFilter} posts for ${format(currentDate, 'MMM d')}`
										: `No posts scheduled for ${format(currentDate, 'MMM d')}`}
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
								<div key={slotKey} className="flex group min-h-[100px] mb-2">
									{/* Time label - B3: consistent 12h format already in slot.label */}
									<div className="w-16 text-right pr-3 pt-2 text-xs font-medium text-gray-400 dark:text-gray-500 shrink-0">
										<div className="font-bold text-gray-800 dark:text-gray-300">{slot.label}</div>
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
					<div className="h-20" />
				</div>
			</main>

			{/* L4: Floating buttons - fixed positioning with gap */}
			<div className="fixed bottom-24 left-0 right-0 px-4 flex justify-between items-end gap-3 pointer-events-none z-20 lg:hidden">
				{failedCount > 0 ? (
					<button className="pointer-events-auto shadow-lg shadow-red-500/20 bg-red-600 text-white rounded-full px-4 py-2 flex items-center gap-2 active:scale-95 transition">
						<AlertCircle className="h-4 w-4" />
						<span className="text-sm font-bold">{failedCount} Issue{failedCount !== 1 ? 's' : ''}</span>
						<X className="h-3.5 w-3.5 opacity-70 ml-1" />
					</button>
				) : (
					<div />
				)}
				{readyCount > 0 && onReadyClick ? (
					<button onClick={onReadyClick} className="pointer-events-auto shadow-lg shadow-blue-500/30 bg-blue-500 hover:bg-blue-600 text-white rounded-full pl-5 pr-4 py-2.5 flex items-center gap-2 active:scale-95 transition">
						<Layers className="h-5 w-5" />
						<span className="text-sm font-bold">Ready</span>
						<div className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">{readyCount}</div>
						<ChevronRight className="h-4 w-4 ml-1" />
					</button>
				) : (
					<div />
				)}
			</div>
		</div>
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

	const isFailed = item.publishingStatus === 'failed';
	const isPublished = item.publishingStatus === 'published';
	// B3: Consistent 12h time format
	const time = item.scheduledTime ? format(new Date(item.scheduledTime), 'h:mm a') : '';

	// C4: Fallback title
	const displayTitle = item.caption || item.title
		|| `${item.mediaType === 'VIDEO' ? 'Video' : 'Image'} \u00b7 ${time}`;

	return (
		<div
			onClick={onClick}
			className={cn(
				// B1: max-w-full + overflow-hidden for horizontal containment
				'max-w-full rounded-xl shadow-sm border p-2 flex items-center gap-3 overflow-hidden cursor-pointer transition active:scale-[0.98] relative',
				// V2: Failed cards get red background
				isFailed
					? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30'
					: 'bg-white dark:bg-[#1f2229] border-gray-100 dark:border-gray-800'
			)}
		>
			{/* Red left stripe for failed */}
			{isFailed && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l-xl" />}

			{/* C1: Larger thumbnail (w-20 h-20 = 80px) */}
			<div className={cn(
				'w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden shrink-0 relative',
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
				<div className="flex items-baseline gap-2 mb-0.5 min-w-0">
					<span className={cn(
						'text-xs font-mono font-medium px-1.5 py-0.5 rounded shrink-0',
						isFailed
							? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
							: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
					)}>
						{time}
					</span>
					{/* C5: line-clamp-2 instead of truncate */}
					<h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 min-w-0">
						{displayTitle}
					</h3>
				</div>
				{/* B1: Error text properly truncated with max-w-full */}
				<p className={cn(
					'text-xs truncate max-w-full',
					isFailed ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
				)}>
					{isFailed ? friendlyError(item.error || 'Publishing failed') : 'Scheduled via Instagram'}
				</p>
			</div>

			{/* Right action */}
			<div className="shrink-0 relative">
				{isPublished && <CheckCircle2 className="h-5 w-5 text-green-500" />}
				{isFailed && (
					<button
						onClick={(e) => { e.stopPropagation(); onRefresh?.(); }}
						className="text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 px-2"
					>
						<RotateCcw className="h-5 w-5" />
					</button>
				)}
				{/* C6: MoreHorizontal button with dropdown */}
				{!isPublished && !isFailed && (
					<>
						<button
							onClick={(e) => {
								e.stopPropagation();
								onMenuToggle(item.id);
							}}
							className="text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300"
						>
							<MoreHorizontal className="h-5 w-5" />
						</button>
						{menuOpen && (
							<div
								className="absolute right-0 top-8 z-30 bg-white dark:bg-[#1f2229] border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]"
								onClick={(e) => e.stopPropagation()}
							>
								<button
									onClick={() => {
										onMenuToggle(item.id);
										onItemClick?.(item);
									}}
									className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
								>
									Reschedule
								</button>
								<button
									onClick={() => {
										onMenuToggle(item.id);
										onRefresh?.();
									}}
									className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800"
								>
									Cancel
								</button>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
}
