'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, X, Sparkles, Eye, Check } from 'lucide-react';
import { useMediaQuery } from '@/app/hooks/use-media-query';
import { cn } from '@/lib/utils';
import { Calendar } from './calendar';
import { TimePicker } from './time-picker';
import { DailyLoadChart } from './daily-load-chart';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from './select';
import { Label } from './label';
import { BEST_TIMES, generateDayOptions, getTimezoneDisplay } from '@/lib/utils/date-time';

interface DateTimePickerProps {
	value: Date;
	onChange: (date: Date) => void;
	minDate?: Date;
	hideQuickPicks?: boolean;
	/** Hourly load data for the daily chart (hour -> count) */
	hourlyLoad?: Record<number, number>;
	/** Callback when user confirms on mobile */
	onConfirm?: () => void;
	/** Callback for story preview */
	onPreview?: () => void;
}

export function DateTimePicker({
	value,
	onChange,
	minDate,
	hideQuickPicks,
	hourlyLoad,
	onConfirm,
	onPreview,
}: DateTimePickerProps) {
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const isMobile = useMediaQuery('(max-width: 768px)');

	// Generate day items for mobile select (next 30 days)
	const dayItems = useMemo(() => {
		return generateDayOptions(30);
	}, []);

	const selectedDayValue = useMemo(() => {
		const valueDate = new Date(value);
		valueDate.setHours(0, 0, 0, 0);
		const idx = dayItems.findIndex((item) => {
			const itemDate = new Date(item.date);
			itemDate.setHours(0, 0, 0, 0);
			return itemDate.getTime() === valueDate.getTime();
		});
		return String(idx >= 0 ? idx : 0);
	}, [value, dayItems]);

	const handleDayChange = (dayValue: string) => {
		const idx = parseInt(dayValue, 10);
		const newDate = new Date(dayItems[idx].date);
		newDate.setHours(value.getHours(), value.getMinutes(), 0, 0);
		onChange(newDate);
	};

	const handleBestTimeClick = (hours: number, minutes: number) => {
		const newDate = new Date(value);
		newDate.setHours(hours, minutes, 0, 0);
		onChange(newDate);
	};

	const handleCalendarSelect = (date: Date | undefined) => {
		if (!date) return;
		const newDate = new Date(date);
		newDate.setHours(value.getHours(), value.getMinutes(), 0, 0);
		onChange(newDate);
		if (!isMobile) setIsOpen(false);
	};

	const handleTimeChange = (hour: number, minute: number) => {
		const newDate = new Date(value);
		newDate.setHours(hour, minute, 0, 0);
		onChange(newDate);
	};

	// Quick pick options
	const getQuickPickOptions = () => {
		const now = new Date();
		const tomorrow = new Date(now);
		tomorrow.setDate(tomorrow.getDate() + 1);

		return [
			{
				label: 'In 1 hour',
				getDate: () => {
					const d = new Date(now);
					d.setHours(d.getHours() + 1);
					d.setMinutes(0, 0, 0);
					return d;
				},
			},
			{
				label: 'Tomorrow 9am',
				getDate: () => {
					const d = new Date(tomorrow);
					d.setHours(9, 0, 0, 0);
					return d;
				},
			},
			{
				label: 'Tomorrow noon',
				getDate: () => {
					const d = new Date(tomorrow);
					d.setHours(12, 0, 0, 0);
					return d;
				},
			},
			{
				label: 'Tomorrow 6pm',
				getDate: () => {
					const d = new Date(tomorrow);
					d.setHours(18, 0, 0, 0);
					return d;
				},
			},
		];
	};

	// Handle quick pick
	const handleQuickPick = (getDate: () => Date) => {
		const newDate = getDate();

		// Validate against minDate
		if (minDate && newDate < minDate) {
			console.warn('Quick pick time is in the past, using minDate instead');
			onChange(minDate);
		} else {
			onChange(newDate);
		}

		setIsOpen(false);
	};

	// Format display
	const formatDateTime = (date: Date) => {
		return date.toLocaleString([], {
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	// Close on outside click
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	// Mobile bottom sheet view
	if (isMobile && isOpen) {
		return (
			<div ref={containerRef} className="relative">
				<button
					type="button"
					onClick={() => setIsOpen(!isOpen)}
					className="w-full px-4 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:border-ring outline-none transition text-left flex items-center justify-between group hover:border-ring/50"
				>
					<span className="flex items-center gap-2 truncate">
						<Clock className="w-4 h-4 flex-shrink-0 text-muted-foreground group-hover:text-ring" />
						<span className="truncate">{formatDateTime(value)}</span>
					</span>
					<X className="w-4 h-4 text-muted-foreground" />
				</button>

				{/* Mobile bottom sheet style picker */}
				<div className="fixed inset-0 z-50">
					<div
						className="absolute inset-0 bg-black/50 backdrop-blur-sm"
						onClick={() => setIsOpen(false)}
					/>
					<div className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-background shadow-2xl border-t">
						{/* Handle */}
						<div className="flex justify-center pt-2 pb-3">
							<div className="h-1 w-12 rounded-full bg-muted" />
						</div>

						{/* Best Times Chips */}
						<div className="px-4 pb-3">
							<div className="mb-2 flex items-center gap-1.5">
								<Sparkles className="h-3.5 w-3.5 text-primary" />
								<span className="text-xs font-semibold text-muted-foreground">
									Best Times
								</span>
							</div>
							<div className="flex gap-2">
								{BEST_TIMES.map((time) => (
									<button
										key={time.label}
										type="button"
										onClick={() => handleBestTimeClick(time.hours, time.minutes)}
										className={cn(
											'rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
											value.getHours() === time.hours &&
												value.getMinutes() === time.minutes
												? 'bg-primary text-primary-foreground'
												: 'bg-primary/10 text-primary hover:bg-primary/20',
										)}
									>
										{time.label}
									</button>
								))}
							</div>
						</div>

						{/* Daily load chart */}
						{hourlyLoad && (
							<div className="px-4 pb-3">
								<DailyLoadChart
									hourlyLoad={hourlyLoad}
									selectedHour={value.getHours()}
									onHourSelect={(hour) => handleTimeChange(hour, value.getMinutes())}
								/>
							</div>
						)}

						{/* Date & Time Selectors using shadcn components */}
						<div className="px-4 py-4 space-y-4">
							{/* Date Select */}
							<div className="space-y-2">
								<Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
									<CalendarIcon className="h-3.5 w-3.5" />
									Date
								</Label>
								<Select value={selectedDayValue} onValueChange={handleDayChange}>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{dayItems.map((item) => (
											<SelectItem key={item.value} value={item.value}>
												{item.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{/* Time Picker */}
							<div className="space-y-2">
								<Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
									<Clock className="h-3.5 w-3.5" />
									Time
								</Label>
								<TimePicker value={value} onChange={onChange} />
							</div>
						</div>

						{/* Action buttons */}
						<div className="flex gap-3 px-4 pb-4">
							{onPreview && (
								<button
									type="button"
									onClick={() => {
										setIsOpen(false);
										onPreview();
									}}
									className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-input bg-background py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
								>
									<Eye className="h-4 w-4" />
									Preview Story
								</button>
							)}
							<button
								type="button"
								onClick={() => {
									setIsOpen(false);
									onConfirm?.();
								}}
								className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
							>
								<Check className="h-4 w-4" />
								Confirm Time
							</button>
						</div>

						{/* Safe area */}
						<div className="h-[env(safe-area-inset-bottom)]" />
					</div>
				</div>
			</div>
		);
	}

	// Desktop popover view
	return (
		<div ref={containerRef} className="relative">
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className="w-full px-4 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:border-ring outline-none transition text-left flex items-center justify-between group hover:border-ring/50"
			>
				<span className="flex items-center gap-2 truncate">
					<Clock className="w-4 h-4 flex-shrink-0 text-muted-foreground group-hover:text-ring" />
					<span className="truncate">{formatDateTime(value)}</span>
				</span>
				{isOpen && <X className="w-4 h-4 text-muted-foreground" />}
			</button>

			{isOpen && (
				<div className="absolute top-full left-0 z-50 mt-2 bg-background border border-border rounded-xl shadow-xl p-4 w-full md:w-96">
					{/* Quick Picks */}
					{!hideQuickPicks && (
						<div className="grid grid-cols-2 gap-2 mb-4">
							{getQuickPickOptions().map((option) => (
								<button
									key={option.label}
									type="button"
									onClick={() => handleQuickPick(option.getDate)}
									className="px-3 py-2 text-xs font-bold bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition border border-primary/20"
								>
									{option.label}
								</button>
							))}
						</div>
					)}

					<div className={hideQuickPicks ? '' : 'border-t border-border pt-4'}>
						{/* Calendar */}
						<div className="mb-4">
							<Calendar
								mode="single"
								selected={value}
								onSelect={handleCalendarSelect}
								disabled={(date) => {
									const min = minDate || new Date();
									min.setHours(0, 0, 0, 0);
									const checkDate = new Date(date);
									checkDate.setHours(0, 0, 0, 0);
									return checkDate < min;
								}}
								className="rounded-md border"
							/>
						</div>

						{/* Time Picker */}
						<div className="border-t border-border pt-4">
							<label className="block text-xs font-bold text-muted-foreground mb-2 uppercase">
								Time
							</label>
							<TimePicker value={value} onChange={onChange} />
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
