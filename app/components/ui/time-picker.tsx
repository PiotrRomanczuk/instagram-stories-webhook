'use client';

/**
 * TimePicker - shadcn-based time selection component
 * Uses Select components for hours and minutes instead of custom drum picker
 */

import * as React from 'react';
import { Clock } from 'lucide-react';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from './select';
import { cn } from '@/lib/utils';

interface TimePickerProps {
	value: Date;
	onChange: (date: Date) => void;
	className?: string;
	use12Hour?: boolean;
}

export function TimePicker({
	value,
	onChange,
	className,
	use12Hour = true,
}: TimePickerProps) {
	const hours = value.getHours();
	const minutes = value.getMinutes();

	// 12-hour format helpers
	const hours12 = hours % 12 || 12;
	const isPM = hours >= 12;

	const handleHourChange = (hourStr: string) => {
		let hour = parseInt(hourStr, 10);
		if (use12Hour) {
			// Convert 12-hour to 24-hour
			if (isPM && hour !== 12) hour += 12;
			if (!isPM && hour === 12) hour = 0;
		}
		const newDate = new Date(value);
		newDate.setHours(hour);
		onChange(newDate);
	};

	const handleMinuteChange = (minuteStr: string) => {
		const minute = parseInt(minuteStr, 10);
		const newDate = new Date(value);
		newDate.setMinutes(minute);
		onChange(newDate);
	};

	const handlePeriodChange = (period: string) => {
		const newDate = new Date(value);
		const currentHour = newDate.getHours();
		if (period === 'PM' && currentHour < 12) {
			newDate.setHours(currentHour + 12);
		} else if (period === 'AM' && currentHour >= 12) {
			newDate.setHours(currentHour - 12);
		}
		onChange(newDate);
	};

	// Generate hour options
	const hourOptions = use12Hour
		? Array.from({ length: 12 }, (_, i) => i + 1)
		: Array.from({ length: 24 }, (_, i) => i);

	// Generate minute options (every minute)
	const minuteOptions = Array.from({ length: 60 }, (_, i) => i);

	return (
		<div className={cn('flex items-center gap-2', className)}>
			<Clock className="h-4 w-4 text-muted-foreground" />

			{/* Hour Select */}
			<Select
				value={use12Hour ? String(hours12) : String(hours)}
				onValueChange={handleHourChange}
			>
				<SelectTrigger className="w-[70px]">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{hourOptions.map((h) => (
						<SelectItem key={h} value={String(h)}>
							{String(h).padStart(2, '0')}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			<span className="text-muted-foreground">:</span>

			{/* Minute Select */}
			<Select value={String(minutes)} onValueChange={handleMinuteChange}>
				<SelectTrigger className="w-[70px]">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{minuteOptions.map((m) => (
						<SelectItem key={m} value={String(m)}>
							{String(m).padStart(2, '0')}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{/* AM/PM Select (if 12-hour format) */}
			{use12Hour && (
				<Select value={isPM ? 'PM' : 'AM'} onValueChange={handlePeriodChange}>
					<SelectTrigger className="w-[70px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="AM">AM</SelectItem>
						<SelectItem value="PM">PM</SelectItem>
					</SelectContent>
				</Select>
			)}
		</div>
	);
}

/**
 * TimePickerInput - Alternative compact input-style time picker
 * Uses native input[type=time] styled to match shadcn
 */
export function TimePickerInput({
	value,
	onChange,
	className,
}: Omit<TimePickerProps, 'use12Hour'>) {
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const [hours, minutes] = e.target.value.split(':').map(Number);
		if (isNaN(hours) || isNaN(minutes)) return;
		const newDate = new Date(value);
		newDate.setHours(hours, minutes, 0, 0);
		onChange(newDate);
	};

	const timeValue = `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;

	return (
		<div className={cn('relative', className)}>
			<Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
			<input
				type="time"
				value={timeValue}
				onChange={handleChange}
				className="flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
			/>
		</div>
	);
}
