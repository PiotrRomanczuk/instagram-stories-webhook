'use client';

import useSWR from 'swr';
import {
	AlertCircle,
	CheckCircle2,
	Loader2,
	Activity,
	Clock,
	AlertTriangle,
	TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { cn } from '@/lib/utils';

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

export function HealthMetricsNew() {
	const {
		data: metrics,
		isLoading,
		error,
	} = useSWR<Metrics>('/api/developer/cron-debug/metrics', fetcher, {
		refreshInterval: 10000,
		revalidateOnFocus: true,
	});

	if (error) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Activity className="h-5 w-5" />
						System Health
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-center py-4 text-destructive">
						Failed to load metrics. Please try again.
					</div>
				</CardContent>
			</Card>
		);
	}

	if (isLoading || !metrics) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Activity className="h-5 w-5" />
						System Health
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-center py-8">
						<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
					</div>
				</CardContent>
			</Card>
		);
	}

	const getHealthStatus = () => {
		if (metrics.postsStuck > 2 || metrics.errorRate > 15) return 'critical';
		if (metrics.postsStuck > 0 || metrics.errorRate > 5) return 'warning';
		return 'healthy';
	};

	const healthStatus = getHealthStatus();

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0">
				<CardTitle className="flex items-center gap-2">
					<Activity className="h-5 w-5" />
					System Health
				</CardTitle>
				<Badge
					variant={
						healthStatus === 'healthy'
							? 'default'
							: healthStatus === 'warning'
								? 'secondary'
								: 'destructive'
					}
					className="gap-1"
				>
					{healthStatus === 'healthy' ? (
						<CheckCircle2 className="h-3 w-3" />
					) : healthStatus === 'warning' ? (
						<AlertTriangle className="h-3 w-3" />
					) : (
						<AlertCircle className="h-3 w-3" />
					)}
					<span className="capitalize">{healthStatus}</span>
				</Badge>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					<MetricCard
						label="In Queue"
						value={metrics.postsInQueue}
						subtext="pending posts"
						icon={<Clock className="h-4 w-4" />}
						variant="default"
					/>
					<MetricCard
						label="Stuck"
						value={metrics.postsStuck}
						subtext="processing > 5m"
						icon={<AlertCircle className="h-4 w-4" />}
						variant={metrics.postsStuck > 0 ? 'destructive' : 'default'}
					/>
					<MetricCard
						label="Failed 24h"
						value={metrics.failedLast24h}
						subtext="posts"
						icon={<AlertTriangle className="h-4 w-4" />}
						variant={metrics.failedLast24h > 0 ? 'warning' : 'default'}
					/>
					<MetricCard
						label="Success Rate"
						value={`${100 - metrics.errorRate}%`}
						subtext="last 24h"
						icon={<TrendingUp className="h-4 w-4" />}
						variant="success"
					/>
				</div>
			</CardContent>
		</Card>
	);
}

function MetricCard({
	label,
	value,
	subtext,
	icon,
	variant,
}: {
	label: string;
	value: string | number;
	subtext: string;
	icon: React.ReactNode;
	variant: 'default' | 'destructive' | 'warning' | 'success';
}) {
	const variantStyles = {
		default: 'bg-muted',
		destructive: 'bg-destructive/10 border-destructive/20',
		warning: 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800',
		success: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800',
	};

	const textStyles = {
		default: 'text-foreground',
		destructive: 'text-destructive',
		warning: 'text-yellow-700 dark:text-yellow-400',
		success: 'text-emerald-700 dark:text-emerald-400',
	};

	return (
		<div className={cn('rounded-lg p-4 border', variantStyles[variant])}>
			<div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
				{icon}
				{label}
			</div>
			<div className={cn('text-2xl font-bold', textStyles[variant])}>{value}</div>
			<div className="text-xs text-muted-foreground">{subtext}</div>
		</div>
	);
}
