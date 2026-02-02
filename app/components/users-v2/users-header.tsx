'use client';

import { Users, PlayCircle, Star, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
	title: string;
	value: string | number;
	change?: number;
	icon: React.ReactNode;
}

function StatCard({ title, value, change, icon }: StatCardProps) {
	const isPositive = change && change > 0;
	const isNegative = change && change < 0;

	return (
		<div className="flex flex-col gap-2 rounded-xl border border-[#2a3649] bg-[#111722] p-6">
			<div className="flex items-center justify-between">
				<p className="text-sm font-medium text-[#92a4c9]">{title}</p>
				<span className="text-[#2b6cee]">{icon}</span>
			</div>
			<div className="flex items-end gap-2">
				<p className="text-3xl font-bold leading-none text-white">{value}</p>
				{change !== undefined && (
					<p
						className={cn(
							'mb-1 flex items-center text-xs font-bold',
							isPositive && 'text-[#0bda5e]',
							isNegative && 'text-[#fa6238]'
						)}
					>
						{isPositive ? (
							<TrendingUp className="mr-0.5 h-3 w-3" />
						) : isNegative ? (
							<TrendingDown className="mr-0.5 h-3 w-3" />
						) : null}
						{isPositive ? '+' : ''}
						{change}%
					</p>
				)}
			</div>
		</div>
	);
}

interface UsersHeaderProps {
	totalCreators: number;
	activeStories: number;
	avgPerformance: number;
	creatorsChange?: number;
	storiesChange?: number;
	performanceChange?: number;
}

export function UsersHeader({
	totalCreators,
	activeStories,
	avgPerformance,
	creatorsChange,
	storiesChange,
	performanceChange,
}: UsersHeaderProps) {
	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
			<StatCard
				title="Total Creators"
				value={totalCreators}
				change={creatorsChange}
				icon={<Users className="h-5 w-5" />}
			/>
			<StatCard
				title="Active Stories"
				value={activeStories}
				change={storiesChange}
				icon={<PlayCircle className="h-5 w-5" />}
			/>
			<StatCard
				title="Avg. Performance"
				value={`${avgPerformance}/5`}
				change={performanceChange}
				icon={<Star className="h-5 w-5" />}
			/>
		</div>
	);
}
