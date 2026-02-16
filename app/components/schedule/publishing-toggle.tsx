'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Switch } from '@/app/components/ui/switch';
import { Radio } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function PublishingToggle() {
	const { data, mutate, isLoading } = useSWR(
		'/api/settings/publishing',
		fetcher,
		{ revalidateOnFocus: true, dedupingInterval: 10000 }
	);

	const enabled = data?.enabled ?? true;

	const handleToggle = useCallback(async (checked: boolean) => {
		// Optimistic update
		mutate({ enabled: checked }, false);

		try {
			const res = await fetch('/api/settings/publishing', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ enabled: checked }),
			});

			if (!res.ok) {
				throw new Error('Failed to update');
			}

			toast.success(checked ? 'Publishing enabled' : 'Publishing paused');
			mutate();
		} catch {
			// Revert on error
			mutate({ enabled: !checked }, false);
			toast.error('Failed to update publishing setting');
		}
	}, [mutate]);

	return (
		<div className="flex items-center gap-2">
			<div className="flex items-center gap-1.5">
				<Radio
					className={`h-3.5 w-3.5 ${enabled ? 'text-emerald-500' : 'text-gray-400'}`}
				/>
				<span className="text-xs font-medium text-gray-600">
					{enabled ? 'Live' : 'Paused'}
				</span>
			</div>
			<Switch
				checked={enabled}
				onCheckedChange={handleToggle}
				disabled={isLoading}
				className="data-[state=checked]:bg-emerald-500"
			/>
		</div>
	);
}
