'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Switch } from '@/app/components/ui/switch';
import { Clapperboard } from 'lucide-react';
import { settingsKeys } from '@/lib/swr/query-keys';
import { useUpdateAutoProcess } from '@/lib/swr/mutations';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/**
 * Admin toggle for the auto-process-videos system setting.
 * When enabled, uploaded videos are automatically processed to meet
 * Instagram Stories requirements (resolution, codec, frame rate).
 */
export function AutoProcessToggle() {
	const { data, isLoading } = useSWR(
		settingsKeys.autoProcess(),
		async () => {
			const res = await fetch('/api/settings/auto-process');
			if (!res.ok) throw new Error('Failed to fetch setting');
			return res.json();
		},
		{ revalidateOnFocus: true, dedupingInterval: 10_000 }
	);

	// Centralized mutation with automatic optimistic updates
	const updateAutoProcess = useUpdateAutoProcess();

	const enabled = data?.enabled ?? true;

	const handleToggle = useCallback(
		async (checked: boolean) => {
			try {
				// Use centralized mutation (handles optimistic updates + rollback automatically)
				await updateAutoProcess(checked);
				toast.success(
					checked
						? 'Auto-processing enabled'
						: 'Auto-processing disabled'
				);
			} catch {
				toast.error('Failed to update auto-processing setting');
			}
		},
		[updateAutoProcess]
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
