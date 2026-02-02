'use client';

import { Eye, CheckCircle, ImageIcon, Users, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
	label: string;
	value: string | number;
	change?: number;
	icon: React.ReactNode;
}

function KPICard({ label, value, change, icon }: KPICardProps) {
	const isPositive = change && change > 0;
	const isNegative = change && change < 0;

	return (
		<div
			className={cn(
				'flex flex-col gap-2 p-5 rounded-xl',
				'bg-[#1a2332] border border-[#2a3649]'
			)}
		>
			<div className="flex items-center justify-between">
				<span className="text-xs font-medium uppercase tracking-wider text-[#92a4c9]">
					{label}
				</span>
				<div className="h-8 w-8 rounded-lg bg-[#2b6cee]/10 flex items-center justify-center text-[#2b6cee]">
					{icon}
				</div>
			</div>

			<div className="flex items-end justify-between gap-2">
				<span className="text-2xl font-bold text-white">{value}</span>
				{change !== undefined && (
					<div
						className={cn(
							'flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded',
							isPositive && 'text-emerald-400 bg-emerald-400/10',
							isNegative && 'text-red-400 bg-red-400/10',
							!isPositive && !isNegative && 'text-[#92a4c9] bg-[#2a3649]'
						)}
					>
						{isPositive && <TrendingUp className="h-3 w-3" />}
						{isNegative && <TrendingDown className="h-3 w-3" />}
						<span>
							{isPositive && '+'}
							{change}%
						</span>
					</div>
				)}
			</div>
		</div>
	);
}

interface AnalyticsKPIRowProps {
	totalViews: number;
	viewsChange?: number;
	completionRate: number;
	completionChange?: number;
	storiesPosted: number;
	storiesChange?: number;
	activeCreators: number;
	creatorsChange?: number;
}

export function AnalyticsKPIRow({
	totalViews,
	viewsChange,
	completionRate,
	completionChange,
	storiesPosted,
	storiesChange,
	activeCreators,
	creatorsChange,
}: AnalyticsKPIRowProps) {
	const formatViews = (views: number): string => {
		if (views >= 1000000) {
			return `${(views / 1000000).toFixed(1)}M`;
		}
		if (views >= 1000) {
			return `${(views / 1000).toFixed(1)}K`;
		}
		return views.toString();
	};

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			<KPICard
				label="Total Story Views"
				value={formatViews(totalViews)}
				change={viewsChange}
				icon={<Eye className="h-4 w-4" />}
			/>
			<KPICard
				label="Avg. Completion Rate"
				value={`${completionRate}%`}
				change={completionChange}
				icon={<CheckCircle className="h-4 w-4" />}
			/>
			<KPICard
				label="Stories Posted"
				value={storiesPosted}
				change={storiesChange}
				icon={<ImageIcon className="h-4 w-4" />}
			/>
			<KPICard
				label="Active Creators"
				value={activeCreators}
				change={creatorsChange}
				icon={<Users className="h-4 w-4" />}
			/>
		</div>
	);
}
