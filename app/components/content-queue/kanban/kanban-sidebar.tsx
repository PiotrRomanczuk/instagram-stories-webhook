'use client';

/**
 * Kanban Sidebar Component
 * Left sidebar with views, quick schedule calendar, settings, support
 */

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
	LayoutGrid,
	List,
	Calendar,
	Settings,
	HelpCircle,
	ChevronLeft,
	ChevronRight,
} from 'lucide-react';

type ViewType = 'kanban' | 'list' | 'timeline';

interface KanbanSidebarProps {
	currentView: ViewType;
	onViewChange: (view: ViewType) => void;
	onQuickSchedule?: (date: Date) => void;
	scheduledDates?: number[]; // Array of timestamps with scheduled items
}

/**
 * Mini calendar component for quick scheduling
 */
function MiniCalendar({
	onSelectDate,
	scheduledDates = [],
}: {
	onSelectDate?: (date: Date) => void;
	scheduledDates?: number[];
}) {
	const [currentMonth, setCurrentMonth] = useState(new Date());

	const { days, monthLabel, prevMonthDays, nextMonthDays } = useMemo(() => {
		const year = currentMonth.getFullYear();
		const month = currentMonth.getMonth();
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const startDayOfWeek = firstDay.getDay();

		const daysInMonth = lastDay.getDate();
		const daysArray: number[] = [];

		// Previous month days
		const prevMonth = new Date(year, month, 0);
		const prevDays: number[] = [];
		for (let i = startDayOfWeek - 1; i >= 0; i--) {
			prevDays.push(prevMonth.getDate() - i);
		}

		// Current month days
		for (let i = 1; i <= daysInMonth; i++) {
			daysArray.push(i);
		}

		// Next month days to fill the grid
		const totalCells = 42; // 6 rows * 7 days
		const nextDays: number[] = [];
		const remaining = totalCells - prevDays.length - daysArray.length;
		for (let i = 1; i <= remaining && nextDays.length < 14; i++) {
			nextDays.push(i);
		}

		return {
			days: daysArray,
			monthLabel: currentMonth.toLocaleDateString('en-US', {
				month: 'long',
				year: 'numeric',
			}),
			prevMonthDays: prevDays,
			nextMonthDays: nextDays.slice(0, 7 - ((prevDays.length + daysArray.length) % 7) || 7),
		};
	}, [currentMonth]);

	const goToPrevMonth = () => {
		setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
	};

	const goToNextMonth = () => {
		setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
	};

	const today = new Date();
	const isToday = (day: number) => {
		return (
			day === today.getDate() &&
			currentMonth.getMonth() === today.getMonth() &&
			currentMonth.getFullYear() === today.getFullYear()
		);
	};

	const hasScheduledItem = (day: number) => {
		const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
		return scheduledDates.some((ts) => {
			const scheduled = new Date(ts);
			return (
				scheduled.getDate() === day &&
				scheduled.getMonth() === currentMonth.getMonth() &&
				scheduled.getFullYear() === currentMonth.getFullYear()
			);
		});
	};

	const handleDateClick = (day: number) => {
		if (onSelectDate) {
			onSelectDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
		}
	};

	return (
		<div className="bg-[#1a2234]/50 border border-[#2d3a54] rounded-xl p-3">
			{/* Month navigation */}
			<div className="flex items-center justify-between mb-3">
				<button
					onClick={goToPrevMonth}
					className="text-[#92a4c9] hover:text-white transition-colors p-1"
				>
					<ChevronLeft className="h-4 w-4" />
				</button>
				<span className="text-white text-xs font-bold uppercase">{monthLabel}</span>
				<button
					onClick={goToNextMonth}
					className="text-[#92a4c9] hover:text-white transition-colors p-1"
				>
					<ChevronRight className="h-4 w-4" />
				</button>
			</div>

			{/* Day headers */}
			<div className="grid grid-cols-7 gap-1 text-center mb-1">
				{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
					<span key={i} className="text-[10px] text-[#92a4c9] font-bold">
						{day}
					</span>
				))}
			</div>

			{/* Calendar grid */}
			<div className="grid grid-cols-7 gap-1 text-center">
				{/* Previous month days */}
				{prevMonthDays.map((day, i) => (
					<div
						key={`prev-${i}`}
						className="h-6 flex items-center justify-center text-[10px] text-[#556b91]"
					>
						{day}
					</div>
				))}

				{/* Current month days */}
				{days.map((day) => (
					<button
						key={day}
						onClick={() => handleDateClick(day)}
						className={cn(
							'h-6 flex items-center justify-center text-[10px] relative rounded-full transition-colors',
							isToday(day)
								? 'bg-[#2b6cee] text-white font-bold'
								: 'text-white hover:bg-[#2d3a54]'
						)}
					>
						{day}
						{hasScheduledItem(day) && !isToday(day) && (
							<span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-1 bg-[#2b6cee] rounded-full" />
						)}
					</button>
				))}

				{/* Next month days */}
				{nextMonthDays.map((day, i) => (
					<div
						key={`next-${i}`}
						className="h-6 flex items-center justify-center text-[10px] text-[#556b91]"
					>
						{day}
					</div>
				))}
			</div>
		</div>
	);
}

export function KanbanSidebar({
	currentView,
	onViewChange,
	onQuickSchedule,
	scheduledDates = [],
}: KanbanSidebarProps) {
	const views: { id: ViewType; label: string; icon: typeof LayoutGrid }[] = [
		{ id: 'kanban', label: 'Kanban Board', icon: LayoutGrid },
		{ id: 'list', label: 'List View', icon: List },
		{ id: 'timeline', label: 'Timeline', icon: Calendar },
	];

	return (
		<aside className="w-64 border-r border-[#2d3a54] bg-[#101622] flex flex-col justify-between p-4 shrink-0">
			<div className="flex flex-col gap-6">
				{/* Views Section */}
				<div className="flex flex-col gap-2">
					<p className="text-[#92a4c9] text-xs font-bold uppercase tracking-wider px-3">
						Views
					</p>
					{views.map((view) => {
						const Icon = view.icon;
						const isActive = currentView === view.id;
						return (
							<button
								key={view.id}
								onClick={() => onViewChange(view.id)}
								className={cn(
									'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left',
									isActive
										? 'bg-[#2b6cee]/10 text-[#2b6cee]'
										: 'text-[#92a4c9] hover:bg-[#1a2234] hover:text-white'
								)}
							>
								<Icon className={cn('h-5 w-5', isActive && 'fill-current')} />
								<p className={cn('text-sm', isActive ? 'font-semibold' : 'font-medium')}>
									{view.label}
								</p>
							</button>
						);
					})}
				</div>

				{/* Quick Schedule Calendar */}
				<div className="flex flex-col gap-3">
					<p className="text-[#92a4c9] text-xs font-bold uppercase tracking-wider px-3">
						Quick Schedule
					</p>
					<MiniCalendar onSelectDate={onQuickSchedule} scheduledDates={scheduledDates} />
				</div>
			</div>

			{/* Bottom Links */}
			<div className="flex flex-col gap-2 border-t border-[#2d3a54] pt-4">
				<button className="flex items-center gap-3 px-3 py-2 text-[#92a4c9] hover:text-white transition-colors">
					<Settings className="h-5 w-5" />
					<p className="text-sm font-medium">Settings</p>
				</button>
				<button className="flex items-center gap-3 px-3 py-2 text-[#92a4c9] hover:text-white transition-colors">
					<HelpCircle className="h-5 w-5" />
					<p className="text-sm font-medium">Support</p>
				</button>
			</div>
		</aside>
	);
}
