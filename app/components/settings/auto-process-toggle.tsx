'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Switch } from '@/app/components/ui/switch';
import { Clapperboard } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/**
 * Admin toggle for the auto-process-videos system setting.
 * When enabled, uploaded videos are automatically processed to meet
 * Instagram Stories requirements (resolution, codec, frame rate).
 */
export function AutoProcessToggle() {
	const { data, mutate, isLoading } = useSWR(
		'/api/settings/auto-process',
		fetcher,
		{ revalidateOnFocus: true, dedupingInterval: 10_000 }
	);

	const enabled = data?.enabled ?? true;

	const handleToggle = useCallback(
		async (checked: boolean) => {
			// Optimistic update
			mutate({ enabled: checked }, false);

			try {
				const res = await fetch('/api/settings/auto-process', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ enabled: checked }),
				});

				if (!res.ok) {
					throw new Error('Failed to update');
				}

				toast.success(
					checked
						? 'Auto-processing enabled'
						: 'Auto-processing disabled'
				);
				mutate();
			} catch {
				// Revert on error
				mutate({ enabled: !checked }, false);
				toast.error('Failed to update auto-processing setting');
			}
		},
		[mutate]
	);

	return (
		<div className="flex items-center gap-2">
			<div className="flex items-center gap-1.5">
				<Clapperboard
					className={`h-3.5 w-3.5 ${enabled ? 'text-blue-500' : 'text-gray-400'}`}
				/>
				<span className="text-xs font-medium text-gray-600">
					{enabled ? 'Auto' : 'Manual'}
				</span>
			</div>
			<Switch
				checked={enabled}
				onCheckedChange={handleToggle}
				disabled={isLoading}
				className="data-[state=checked]:bg-blue-500"
			/>
		</div>
	);
}
