'use client';

import { useState } from 'react';
import { Activity, CheckCircle2, AlertCircle, Loader2, Power, PowerOff, Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CronRun {
	job: string;
	lastRunAt: string | null;
	status: 'idle' | 'running' | 'unknown';
}

interface PipelineHealthProps {
	cron: CronRun[] | undefined;
	pipelineEnabled: boolean | undefined;
	isLoading?: boolean;
	onPipelineRun?: () => void;
}

const JOB_LABELS: Record<string, string> = {
	'archive-stories': 'Archive stories',
	'tiktok-pipeline': 'TikTok pipeline',
	'refresh-tiktok-token': 'Refresh TikTok token',
};

function formatRelative(iso: string | null): string {
	if (!iso) return 'Never';
	const diff = Date.now() - new Date(iso).getTime();
	const min = Math.floor(diff / 60_000);
	if (min < 1) return 'just now';
	if (min < 60) return `${min}m ago`;
	const hr = Math.floor(min / 60);
	if (hr < 24) return `${hr}h ago`;
	const d = Math.floor(hr / 24);
	return `${d}d ago`;
}

export function PipelineHealthCard({
	cron,
	pipelineEnabled,
	isLoading,
	onPipelineRun,
}: PipelineHealthProps) {
	const [running, setRunning] = useState(false);

	async function handleRunNow() {
		setRunning(true);
		try {
			const res = await fetch('/api/cron/tiktok-pipeline', { method: 'POST' });
			if (res.ok) {
				toast.success('Pipeline run triggered');
				onPipelineRun?.();
			} else {
				const body = await res.json().catch(() => ({}));
				toast.error(body.error ?? `Run failed (${res.status})`);
			}
		} catch (err) {
			toast.error(`Run failed: ${err instanceof Error ? err.message : 'Unknown'}`);
		} finally {
			setRunning(false);
		}
	}

	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between gap-2">
					<div>
						<CardTitle className="flex items-center gap-2 text-base">
							<Activity className="h-4 w-4" />
							Pipeline health
						</CardTitle>
						<div className="mt-1 flex items-center gap-2">
							{pipelineEnabled ? (
								<Badge className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
									<Power className="h-3 w-3" />
									Enabled
								</Badge>
							) : (
								<Badge variant="secondary" className="gap-1">
									<PowerOff className="h-3 w-3" />
									Disabled
								</Badge>
							)}
						</div>
					</div>
					<Button size="sm" onClick={handleRunNow} disabled={running || !pipelineEnabled}>
						{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
						<span className="hidden sm:inline">{running ? 'Running…' : 'Run now'}</span>
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				{isLoading || !cron ? (
					<div className="space-y-2">
						{Array.from({ length: 3 }).map((_, i) => (
							<Skeleton key={i} className="h-10 w-full" />
						))}
					</div>
				) : (
					<ul className="space-y-1.5">
						{cron.map((run) => {
							const isRunning = run.status === 'running';
							const isStale =
								run.lastRunAt &&
								Date.now() - new Date(run.lastRunAt).getTime() > 24 * 60 * 60 * 1000;
							return (
								<li
									key={run.job}
									className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm"
								>
									<div className="flex items-center gap-2 min-w-0">
										{isRunning ? (
											<Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-blue-600" />
										) : run.lastRunAt ? (
											<CheckCircle2
												className={cn(
													'h-3.5 w-3.5 shrink-0',
													isStale ? 'text-amber-500' : 'text-emerald-500',
												)}
											/>
										) : (
											<AlertCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
										)}
										<span className="truncate font-medium">
											{JOB_LABELS[run.job] ?? run.job}
										</span>
									</div>
									<span className="text-xs text-muted-foreground tabular-nums">
										{isRunning ? 'running…' : formatRelative(run.lastRunAt)}
									</span>
								</li>
							);
						})}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}
