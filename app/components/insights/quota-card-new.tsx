'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Battery, BatteryWarning, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Progress } from '@/app/components/ui/progress';
import { cn } from '@/lib/utils';

interface QuotaData {
	config?: {
		quota_duration: number;
		quota_total: number;
	};
	quota_usage: number;
}

export function QuotaCardNew() {
	const [quota, setQuota] = useState<QuotaData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchQuota = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch('/api/schedule/quota');
			const data = await res.json();

			if (res.ok && data.limit) {
				setQuota(data.limit);
			} else {
				if (res.status !== 404) {
					setError(data.error || 'Failed to load usage data');
				}
			}
		} catch {
			setError('Connection failed');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchQuota();
	}, [fetchQuota]);

	if (error) return null;

	const total = quota?.config?.quota_total || 0;
	const used = quota?.quota_usage || 0;
	const percentUsed = total > 0 ? (used / total) * 100 : 0;

	let statusColor = 'text-emerald-500';
	let progressColor = 'bg-emerald-500';

	if (percentUsed > 80) {
		statusColor = 'text-amber-500';
		progressColor = 'bg-amber-500';
	}
	if (percentUsed > 95) {
		statusColor = 'text-destructive';
		progressColor = 'bg-destructive';
	}

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium">API Usage Quota</CardTitle>
				<Button
					variant="ghost"
					size="icon"
					onClick={fetchQuota}
					disabled={loading}
					className="h-8 w-8"
				>
					<RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
				</Button>
			</CardHeader>
			<CardContent>
				{loading && !quota ? (
					<div className="flex items-center justify-center py-4">
						<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
					</div>
				) : !quota ? (
					<p className="text-sm text-muted-foreground">Usage data unavailable.</p>
				) : (
					<div className="space-y-4">
						<div className="flex items-end justify-between">
							<div>
								<p className="text-3xl font-bold">
									{used}{' '}
									<span className="text-lg text-muted-foreground font-normal">
										/ {total}
									</span>
								</p>
								<p className="text-xs text-muted-foreground mt-1">
									Posts Used Today
								</p>
							</div>
							<div className={cn('p-2 rounded-lg bg-muted', statusColor)}>
								{percentUsed > 80 ? (
									<BatteryWarning className="h-6 w-6" />
								) : (
									<Battery className="h-6 w-6" />
								)}
							</div>
						</div>

						<div className="space-y-2">
							<Progress
								value={percentUsed}
								className={cn('h-2', progressColor)}
							/>
							<p className="text-xs text-muted-foreground text-center">
								Rolling 24-hour window. Usage drops 24h after each post.
							</p>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
