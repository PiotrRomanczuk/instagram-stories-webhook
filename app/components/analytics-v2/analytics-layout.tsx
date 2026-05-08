'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { AnalyticsKPIRow, KpiDelta } from './analytics-kpi-row';
import { PerformanceChart, ChartDataPoint } from './performance-chart';
import { cn } from '@/lib/utils';

interface AnalyticsResponse {
	range: '7d' | '30d' | '90d';
	periodStart: string;
	kpis: {
		archived: KpiDelta;
		drafted: KpiDelta;
		publishRate: KpiDelta;
		inboxToday: { used: number; cap: number };
	};
	daily: ChartDataPoint[];
}

type DateRange = '7d' | '30d' | '90d';

const fetcher = async (url: string): Promise<AnalyticsResponse> => {
	const res = await fetch(url);
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(body.error ?? `Request failed (${res.status})`);
	}
	return res.json();
};

export function AnalyticsLayout() {
	const [dateRange, setDateRange] = useState<DateRange>('30d');
	const { data, error, isLoading, mutate } = useSWR<AnalyticsResponse>(
		`/api/analytics?range=${dateRange}`,
		fetcher,
		{ revalidateOnFocus: false, dedupingInterval: 30_000 },
	);

	if (isLoading) {
		return (
			<div className="flex min-h-[600px] items-center justify-center">
				<div className="space-y-4 text-center">
					<Loader2 className="mx-auto h-12 w-12 animate-spin text-[#92a4c9]" />
					<p className="font-medium text-[#92a4c9]">Loading analytics...</p>
				</div>
			</div>
		);
	}

	if (error || !data) {
		return (
			<div className="flex min-h-[600px] flex-col items-center justify-center text-center">
				<AlertTriangle className="mb-4 h-12 w-12 text-red-400" />
				<h3 className="text-lg font-semibold text-white">Couldn&apos;t load analytics</h3>
				<p className="mb-4 mt-2 text-sm text-[#92a4c9]">
					{error instanceof Error ? error.message : 'Unknown error'}
				</p>
				<Button onClick={() => mutate()} variant="outline">
					Try again
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold text-white">Pipeline analytics</h1>
					<p className="text-sm text-[#92a4c9]">
						IG → TikTok throughput. Counts of stories archived, compositions drafted to
						the TT inbox, publish-rate health, and today&apos;s inbox-slot saturation.
					</p>
				</div>

				<div className="flex items-center gap-1 rounded-lg border border-[#2a3649] bg-[#1a2332] p-1">
					{(['7d', '30d', '90d'] as DateRange[]).map((range) => (
						<button
							key={range}
							onClick={() => setDateRange(range)}
							className={cn(
								'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
								dateRange === range
									? 'bg-[#2b6cee] text-white'
									: 'text-[#92a4c9] hover:text-white',
							)}
						>
							{range === '7d' && 'Last 7 days'}
							{range === '30d' && 'Last 30 days'}
							{range === '90d' && 'Last 90 days'}
						</button>
					))}
				</div>
			</div>

			<AnalyticsKPIRow
				archived={data.kpis.archived}
				drafted={data.kpis.drafted}
				publishRate={data.kpis.publishRate}
				inboxToday={data.kpis.inboxToday}
			/>

			<PerformanceChart data={data.daily} />
		</div>
	);
}
