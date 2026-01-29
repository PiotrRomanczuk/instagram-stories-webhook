'use client';

import useSWR from 'swr';
import { AlertCircle, CheckCircle2, Clock, TrendingDown } from 'lucide-react';
import { Panel } from '@/app/components/ui/panel';

interface Metrics {
	postsInQueue: number;
	postsProcessing: number;
	postsStuck: number;
	failedLast24h: number;
	publishedLast24h: number;
	errorRate: number;
}

const fetcher = async (url: string) => {
	const res = await fetch(url);
	if (!res.ok) throw new Error('Failed to fetch metrics');
	return res.json();
};

export function HealthMetrics() {
	const { data: metrics, isLoading, error } = useSWR<Metrics>(
		'/api/developer/cron-debug/metrics',
		fetcher,
		{ refreshInterval: 10000, revalidateOnFocus: true },
	);

	if (error) {
		return (
			<Panel title="📊 System Health" icon={<TrendingDown className="w-6 h-6" />}>
				<div className="text-center py-4 text-red-600">
					Failed to load metrics. Please try again.
				</div>
			</Panel>
		);
	}

	if (isLoading || !metrics) {
		return (
			<Panel title="📊 System Health" icon={<TrendingDown className="w-6 h-6" />}>
				<div className="animate-pulse grid grid-cols-2 md:grid-cols-4 gap-4">
					{[1, 2, 3, 4].map((i) => (
						<div key={i} className="h-20 bg-slate-200 rounded-lg"></div>
					))}
				</div>
			</Panel>
		);
	}

	const getHealthStatus = () => {
		if (metrics.postsStuck > 2 || metrics.errorRate > 15) return 'critical';
		if (metrics.postsStuck > 0 || metrics.errorRate > 5) return 'warning';
		return 'healthy';
	};

	const healthStatus = getHealthStatus();
	const healthColor = {
		healthy: 'emerald',
		warning: 'amber',
		critical: 'rose',
	}[healthStatus];

	return (
		<Panel
			title="📊 System Health"
			icon={<TrendingDown className="w-6 h-6" />}
		>
			<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
				{/* Status Badge */}
				<div
					className={`rounded-2xl p-4 bg-${healthColor}-50 border border-${healthColor}-200`}
				>
					<div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">
						Status
					</div>
					<div
						className={`text-2xl font-black text-${healthColor}-700 flex items-center gap-2`}
					>
						{healthStatus === 'healthy' ? (
							<CheckCircle2 className="w-6 h-6" />
						) : healthStatus === 'warning' ? (
							<AlertCircle className="w-6 h-6" />
						) : (
							<AlertCircle className="w-6 h-6" />
						)}
						<span className="capitalize">{healthStatus}</span>
					</div>
				</div>

				{/* Queued */}
				<div className="rounded-2xl p-4 bg-indigo-50 border border-indigo-200">
					<div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">
						In Queue
					</div>
					<div className="text-3xl font-black text-indigo-700">
						{metrics.postsInQueue}
					</div>
					<div className="text-xs text-slate-600 mt-1">pending posts</div>
				</div>

				{/* Stuck */}
				<div className="rounded-2xl p-4 bg-rose-50 border border-rose-200">
					<div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">
						Stuck
					</div>
					<div className="text-3xl font-black text-rose-700">
						{metrics.postsStuck}
					</div>
					<div className="text-xs text-slate-600 mt-1">processing {'\u003E'} 5m</div>
				</div>

				{/* Failed */}
				<div className="rounded-2xl p-4 bg-amber-50 border border-amber-200">
					<div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">
						Failed 24h
					</div>
					<div className="text-3xl font-black text-amber-700">
						{metrics.failedLast24h}
					</div>
					<div className="text-xs text-slate-600 mt-1">posts</div>
				</div>

				{/* Success Rate */}
				<div className="rounded-2xl p-4 bg-emerald-50 border border-emerald-200">
					<div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">
						Success Rate
					</div>
					<div className="text-3xl font-black text-emerald-700">
						{100 - metrics.errorRate}%
					</div>
					<div className="text-xs text-slate-600 mt-1">last 24h</div>
				</div>
			</div>
		</Panel>
	);
}
