'use client';

import { cn } from '@/lib/utils';

interface DailyLoadChartProps {
	/** Map of hour (0-23) to count of scheduled items */
	hourlyLoad: Record<number, number>;
	selectedHour?: number;
	onHourSelect?: (hour: number) => void;
	className?: string;
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 to 23:00

export function DailyLoadChart({
	hourlyLoad,
	selectedHour,
	onHourSelect,
	className,
}: DailyLoadChartProps) {
	const maxLoad = Math.max(1, ...Object.values(hourlyLoad));

	return (
		<div className={cn('rounded-xl bg-gray-50 p-3', className)}>
			<div className="mb-2 flex items-center justify-between">
				<span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
					Daily Schedule Load
				</span>
				<span className="text-[10px] text-gray-400">
					{Object.values(hourlyLoad).reduce((a, b) => a + b, 0)} posts today
				</span>
			</div>
			<div className="flex items-end gap-[2px]" style={{ height: 48 }}>
				{HOURS.map((hour) => {
					const count = hourlyLoad[hour] || 0;
					const heightPct = count > 0 ? Math.max(15, (count / maxLoad) * 100) : 4;
					const isSelected = selectedHour === hour;

					return (
						<button
							key={hour}
							type="button"
							onClick={() => onHourSelect?.(hour)}
							className={cn(
								'flex-1 rounded-t-sm transition-all',
								isSelected
									? 'bg-[#2b6cee]'
									: count > 0
										? 'bg-[#2b6cee]/30 hover:bg-[#2b6cee]/50'
										: 'bg-gray-200 hover:bg-gray-300'
							)}
							style={{ height: `${heightPct}%` }}
							title={`${String(hour).padStart(2, '0')}:00: ${count} ${count === 1 ? 'post' : 'posts'}`}
						/>
					);
				})}
			</div>
			{/* Hour labels */}
			<div className="mt-1 flex">
				{[6, 9, 12, 15, 18, 21].map((hour) => (
					<span
						key={hour}
						className="flex-1 text-center text-[8px] text-gray-400"
					>
						{String(hour).padStart(2, '0')}
					</span>
				))}
			</div>
		</div>
	);
}
