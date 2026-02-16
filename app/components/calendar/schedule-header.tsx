'use client';

/**
 * Schedule Header - Top navigation bar with date controls and actions
 */

import { ChevronLeft, ChevronRight, Search, Zap, Plus, Minus, LayoutList, CalendarDays, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { format, addWeeks, subWeeks, addDays, subDays, startOfWeek, endOfWeek, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export type ViewMode = 'day' | 'week' | 'month';
export type ScheduleViewType = 'timeline' | 'calendar' | 'list';

interface ScheduleHeaderProps {
	currentDate: Date;
	viewMode: ViewMode;
	onDateChange: (date: Date) => void;
	onViewModeChange: (mode: ViewMode) => void;
	onPublishNow?: () => void;
	onNewSchedule?: () => void;
	searchQuery?: string;
	onSearchChange?: (query: string) => void;
	granularity?: number;
	onIncreaseGranularity?: () => void;
	onDecreaseGranularity?: () => void;
	scheduleViewType?: ScheduleViewType;
	onScheduleViewTypeChange?: (type: ScheduleViewType) => void;
}

export function ScheduleHeader({
	currentDate,
	viewMode,
	onDateChange,
	onViewModeChange,
	onPublishNow,
	onNewSchedule,
	searchQuery = '',
	onSearchChange,
	granularity = 15,
	onIncreaseGranularity,
	onDecreaseGranularity,
	scheduleViewType = 'calendar',
	onScheduleViewTypeChange,
}: ScheduleHeaderProps) {
	const getDateRangeText = () => {
		switch (viewMode) {
			case 'day':
				return format(currentDate, 'MMMM d, yyyy');
			case 'week': {
				const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
				const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
				if (weekStart.getMonth() === weekEnd.getMonth()) {
					return `${format(weekStart, 'MMMM d')} - ${format(weekEnd, 'd, yyyy')}`;
				}
				return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
			}
			case 'month': {
				return format(currentDate, 'MMMM yyyy');
			}
		}
	};

	const handlePrevious = () => {
		switch (viewMode) {
			case 'day':
				onDateChange(subDays(currentDate, 1));
				break;
			case 'week':
				onDateChange(subWeeks(currentDate, 1));
				break;
			case 'month':
				onDateChange(subMonths(currentDate, 1));
				break;
		}
	};

	const handleNext = () => {
		switch (viewMode) {
			case 'day':
				onDateChange(addDays(currentDate, 1));
				break;
			case 'week':
				onDateChange(addWeeks(currentDate, 1));
				break;
			case 'month':
				onDateChange(addMonths(currentDate, 1));
				break;
		}
	};

	const handleToday = () => {
		onDateChange(new Date());
	};

	return (
		<header className="flex h-auto shrink-0 flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-white px-3 py-2 sm:h-16 sm:flex-nowrap sm:gap-0 sm:px-6 sm:py-0">
			{/* Left side: Date navigation */}
			<div className="flex items-center gap-2 sm:gap-6">
				<div className="flex items-center gap-1 sm:gap-2">
					<Button
						variant="ghost"
						size="icon"
						onClick={handlePrevious}
						className="h-7 w-7 text-gray-500 hover:bg-gray-100 hover:text-gray-900 sm:h-8 sm:w-8"
					>
						<ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
					</Button>
					<h2 className="min-w-[120px] text-center text-sm font-bold text-gray-900 sm:min-w-[180px] sm:text-lg">
						{getDateRangeText()}
					</h2>
					<Button
						variant="ghost"
						size="icon"
						onClick={handleNext}
						className="h-7 w-7 text-gray-500 hover:bg-gray-100 hover:text-gray-900 sm:h-8 sm:w-8"
					>
						<ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
					</Button>
				</div>

				{/* View mode indicator - day only (hidden on mobile) */}
				<div className="hidden rounded-lg bg-gray-100 p-1 sm:flex">
					<span className="rounded-md bg-white px-3 py-1 text-xs font-medium text-gray-900 shadow-sm">
						Day
					</span>
				</div>

				{/* Granularity controls (hidden on mobile - Ctrl+scroll not available on touch) */}
				{onDecreaseGranularity && onIncreaseGranularity && (
					<div className="hidden items-center rounded-lg border border-gray-200 sm:flex">
						<Button
							variant="ghost"
							size="sm"
							onClick={onDecreaseGranularity}
							disabled={granularity === 60}
							className="h-8 w-8 p-0 text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
							title="Decrease granularity (larger time blocks)"
						>
							<Minus className="h-4 w-4" />
						</Button>
						<span className="w-12 text-center text-xs font-medium text-gray-700">
							{granularity}m
						</span>
						<Button
							variant="ghost"
							size="sm"
							onClick={onIncreaseGranularity}
							disabled={granularity === 1}
							className="h-8 w-8 p-0 text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
							title="Increase granularity (smaller time blocks)"
						>
							<Plus className="h-4 w-4" />
						</Button>
					</div>
				)}

				<Button
					variant="ghost"
					size="sm"
					onClick={handleToday}
					className="text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-900"
				>
					Today
				</Button>
			</div>

			{/* View mode toggle - pill style */}
			{onScheduleViewTypeChange && (
				<div className="flex rounded-lg bg-gray-100 p-0.5">
					{([
						{ type: 'timeline' as const, icon: Clock, label: 'Timeline' },
						{ type: 'calendar' as const, icon: CalendarDays, label: 'Calendar' },
						{ type: 'list' as const, icon: LayoutList, label: 'List' },
					]).map(({ type, icon: Icon, label }) => (
						<button
							key={type}
							type="button"
							onClick={() => onScheduleViewTypeChange(type)}
							className={cn(
								'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all',
								scheduleViewType === type
									? 'bg-white text-gray-900 shadow-sm'
									: 'text-gray-500 hover:text-gray-700'
							)}
						>
							<Icon className="h-3.5 w-3.5" />
							<span className="hidden sm:inline">{label}</span>
						</button>
					))}
				</div>
			)}

			{/* Right side: Search and actions */}
			<div className="flex items-center gap-2 sm:gap-4">
				{onSearchChange && (
					<div className="relative hidden sm:block">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
						<Input
							placeholder="Search events..."
							value={searchQuery}
							onChange={(e) => onSearchChange(e.target.value)}
							className="w-64 border-gray-200 bg-gray-50 pl-10 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:ring-[#2b6cee]"
						/>
					</div>
				)}

				{/* MVP: Instant publish hidden — scheduling only */}

				{onNewSchedule && (
					<Button
						onClick={onNewSchedule}
						variant="outline"
						className="gap-2 border-gray-300 bg-white px-2 text-gray-700 hover:bg-gray-50 sm:px-4"
					>
						<Plus className="h-4 w-4" />
						<span className="hidden sm:inline">New Schedule</span>
					</Button>
				)}
			</div>
		</header>
	);
}
