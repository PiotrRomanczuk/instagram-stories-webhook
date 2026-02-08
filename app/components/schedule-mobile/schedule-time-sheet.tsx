'use client';

/**
 * ScheduleTimeSheet - Bottom sheet time picker for swipe-to-schedule
 *
 * Uses shadcn Select for date and native <input type="time"> for time selection.
 * Mobile-friendly bottom sheet that appears when swiping to schedule a post.
 */

import { useState, useMemo } from 'react';
import { Calendar, X, Sparkles, Clock } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ContentItem } from '@/lib/types/posts';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
import { Label } from '../ui/label';

interface ScheduleTimeSheetProps {
	item: ContentItem;
	initialDate: Date;
	onConfirm: (item: ContentItem, scheduledTime: Date) => void;
	onCancel: () => void;
}

const BEST_TIMES = [
	{ label: '9:00 AM', hours: 9, minutes: 0 },
	{ label: '12:00 PM', hours: 12, minutes: 0 },
	{ label: '6:30 PM', hours: 18, minutes: 30 },
];

export function ScheduleTimeSheet({
	item,
	initialDate,
	onConfirm,
	onCancel,
}: ScheduleTimeSheetProps) {
	const [selectedDate, setSelectedDate] = useState<Date>(initialDate);

	// Generate day options (next 30 days)
	const dayOptions = useMemo(() => {
		const options: { value: string; label: string; date: Date }[] = [];
		const now = new Date();
		for (let i = 0; i < 30; i++) {
			const d = new Date(now);
			d.setDate(d.getDate() + i);
			d.setHours(0, 0, 0, 0);
			const label =
				i === 0
					? 'Today'
					: i === 1
						? 'Tomorrow'
						: d.toLocaleDateString([], {
								weekday: 'short',
								month: 'short',
								day: 'numeric',
							});
			options.push({ value: String(i), label, date: d });
		}
		return options;
	}, []);

	// Find selected day index
	const selectedDayValue = useMemo(() => {
		const valueDate = new Date(selectedDate);
		valueDate.setHours(0, 0, 0, 0);
		const idx = dayOptions.findIndex((opt) => {
			return opt.date.getTime() === valueDate.getTime();
		});
		return String(idx >= 0 ? idx : 0);
	}, [selectedDate, dayOptions]);

	// Format time for input type="time" (HH:MM)
	const timeValue = useMemo(() => {
		const h = String(selectedDate.getHours()).padStart(2, '0');
		const m = String(selectedDate.getMinutes()).padStart(2, '0');
		return `${h}:${m}`;
	}, [selectedDate]);

	const handleDayChange = (value: string) => {
		const idx = parseInt(value, 10);
		const opt = dayOptions[idx];
		if (!opt) return;
		const newDate = new Date(opt.date);
		newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
		setSelectedDate(newDate);
	};

	const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const [hours, minutes] = e.target.value.split(':').map(Number);
		if (isNaN(hours) || isNaN(minutes)) return;
		const newDate = new Date(selectedDate);
		newDate.setHours(hours, minutes, 0, 0);
		setSelectedDate(newDate);
	};

	const handleBestTime = (hours: number, minutes: number) => {
		const newDate = new Date(selectedDate);
		newDate.setHours(hours, minutes, 0, 0);
		setSelectedDate(newDate);
	};

	const displayTitle =
		item.caption || item.title || (item.mediaType === 'VIDEO' ? 'Video' : 'Image');

	// Format the selected time for display
	const formattedTime = selectedDate.toLocaleTimeString([], {
		hour: 'numeric',
		minute: '2-digit',
	});

	const formattedDay = dayOptions[parseInt(selectedDayValue, 10)]?.label || 'Today';

	return (
		<div className="fixed inset-0 z-[100]">
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-black/60 backdrop-blur-sm"
				onClick={onCancel}
			/>

			{/* Bottom sheet */}
			<div className="absolute bottom-0 left-0 right-0 max-w-lg mx-auto rounded-t-2xl bg-white shadow-2xl dark:bg-[#1a1f2e] animate-in slide-in-from-bottom duration-300">
				{/* Handle */}
				<div className="flex justify-center pt-3 pb-1">
					<div className="h-1 w-10 rounded-full bg-gray-300 dark:bg-slate-600" />
				</div>

				{/* Header with item preview */}
				<div className="flex items-center gap-3 px-5 pb-3">
					{/* Thumbnail */}
					<div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
						{item.mediaUrl ? (
							<Image
								src={item.mediaUrl}
								alt={displayTitle}
								fill
								className="object-cover"
								unoptimized
							/>
						) : (
							<div className="flex h-full w-full items-center justify-center">
								<Calendar className="h-5 w-5 text-gray-400" />
							</div>
						)}
					</div>
					<div className="min-w-0 flex-1">
						<h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
							Schedule Post
						</h3>
						<p className="text-xs text-gray-500 dark:text-gray-400 truncate">
							{displayTitle}
						</p>
					</div>
					<button
						onClick={onCancel}
						className="rounded-full p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Best Times - quick picks */}
				<div className="px-5 pb-3">
					<div className="mb-2 flex items-center gap-1.5">
						<Sparkles className="h-3 w-3 text-blue-500" />
						<span className="text-[11px] font-semibold text-gray-500 dark:text-slate-400">
							Best Times
						</span>
					</div>
					<div className="flex gap-2">
						{BEST_TIMES.map((time) => (
							<button
								key={time.label}
								type="button"
								onClick={() => handleBestTime(time.hours, time.minutes)}
								className={cn(
									'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all',
									selectedDate.getHours() === time.hours &&
										selectedDate.getMinutes() === time.minutes
										? 'bg-blue-500 text-white shadow-sm shadow-blue-500/25'
										: 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
								)}
							>
								{time.label}
							</button>
						))}
					</div>
				</div>

				{/* Date & Time pickers */}
				<div className="px-5 py-3 space-y-3">
					{/* Date Select */}
					<div className="space-y-1.5">
						<Label className="text-xs text-gray-500 dark:text-slate-400 pl-0.5">
							<Calendar className="h-3.5 w-3.5" />
							Date
						</Label>
						<Select value={selectedDayValue} onValueChange={handleDayChange}>
							<SelectTrigger className="w-full h-11 rounded-xl bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-sm font-medium">
								<SelectValue />
							</SelectTrigger>
							<SelectContent className="z-[110]">
								{dayOptions.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Time Input */}
					<div className="space-y-1.5">
						<Label className="text-xs text-gray-500 dark:text-slate-400 pl-0.5">
							<Clock className="h-3.5 w-3.5" />
							Time
						</Label>
						<input
							type="time"
							value={timeValue}
							onChange={handleTimeChange}
							className="w-full h-11 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-3 text-sm font-medium text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
						/>
					</div>
				</div>

				{/* Summary line */}
				<div className="px-5 py-2">
					<p className="text-xs text-center text-gray-400 dark:text-slate-500">
						Posting {formattedDay} at {formattedTime}
					</p>
				</div>

				{/* Action buttons - pb-24 clears the bottom nav bar */}
				<div className="flex gap-3 px-5 pt-2 pb-24">
					<button
						type="button"
						onClick={onCancel}
						className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={() => onConfirm(item, selectedDate)}
						className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-colors hover:bg-emerald-600 active:scale-[0.98]"
					>
						<Calendar className="h-4 w-4" />
						Schedule
					</button>
				</div>
			</div>
		</div>
	);
}
