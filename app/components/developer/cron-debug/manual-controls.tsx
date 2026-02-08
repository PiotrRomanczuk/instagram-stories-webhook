'use client';

import { useState } from 'react';
import { Loader, Play, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Panel } from '@/app/components/ui/panel';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { Button } from '@/app/components/ui/button';

interface JobResult {
	success: boolean;
	job: string;
	message: string;
	result?: unknown;
	error?: string;
}

export function ManualControls() {
	const [loading, setLoading] = useState<string | null>(null);

	const handleTrigger = async (job: string) => {
		setLoading(job);
		try {
			const res = await fetch('/api/developer/cron-debug/trigger', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ job }),
			});

			const data: JobResult = await res.json();

			if (!res.ok) {
				toast.error(`Error: ${data.error || 'Failed to trigger job'}`);
				return;
			}

			toast.success(`${job} job triggered successfully`);
		} catch (err) {
			toast.error(
				`Failed to trigger job: ${err instanceof Error ? err.message : 'Unknown error'}`,
			);
		} finally {
			setLoading(null);
		}
	};

	const jobs = [
		{
			name: 'process',
			label: 'Process Scheduled Posts',
			description: 'Manually trigger the scheduled post processor (runs every 1 min normally)',
		},
		{
			name: 'identity-audit',
			label: 'Run Identity Audit',
			description: 'Check account identity consistency (runs every 5 min normally)',
		},
		{
			name: 'check-media-health',
			label: 'Check Media Health',
			description: 'Verify pending meme media URLs are accessible (runs every 6 hours)',
		},
	];

	return (
		<Panel title="Manual Controls" icon={<Play className="w-6 h-6" />}>
			<Alert className="mb-6 border-amber-200 bg-amber-50">
				<AlertCircle className="h-5 w-5 text-amber-600" />
				<AlertTitle className="text-amber-900 font-semibold">
					Use for debugging only
				</AlertTitle>
				<AlertDescription className="text-amber-700">
					Manually triggering cron jobs can interfere with normal scheduling.
					Use only when testing or troubleshooting.
				</AlertDescription>
			</Alert>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				{jobs.map((job) => (
					<div
						key={job.name}
						className="p-4 border-2 border-indigo-200 rounded-xl hover:border-indigo-600 hover:bg-indigo-50 disabled:opacity-50 transition-all text-left group"
					>
						<h3 className="font-bold text-slate-900 group-hover:text-indigo-600 mb-1">
							{job.label}
						</h3>
						<p className="text-xs text-slate-600 mb-3 group-hover:text-slate-700">
							{job.description}
						</p>
						<Button
							onClick={() => handleTrigger(job.name)}
							disabled={loading !== null}
							className="w-full"
						>
							{loading === job.name ? (
								<Loader className="w-4 h-4 animate-spin" />
							) : (
								<Play className="w-4 h-4" />
							)}
							{loading === job.name ? 'Running...' : 'Trigger'}
						</Button>
					</div>
				))}
			</div>
		</Panel>
	);
}
