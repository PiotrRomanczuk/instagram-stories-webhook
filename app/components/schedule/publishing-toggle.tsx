'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Switch } from '@/app/components/ui/switch';
import { Radio } from 'lucide-react';
import { settingsKeys } from '@/lib/swr/query-keys';
import { useUpdatePublishing } from '@/lib/swr/mutations';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function PublishingToggle() {
	const { data, isLoading } = useSWR(
		settingsKeys.publishing(),
		async () => {
			const res = await fetch('/api/settings/publishing');
			if (!res.ok) throw new Error('Failed to fetch setting');
			return res.json();
		},
		{ revalidateOnFocus: true, dedupingInterval: 10000 }
	);

	// Centralized mutation with automatic optimistic updates
	const updatePublishing = useUpdatePublishing();

	const enabled = data?.enabled ?? true;

	const handleToggle = useCallback(async (checked: boolean) => {
		try {
			// Use centralized mutation (handles optimistic updates + rollback automatically)
			await updatePublishing(checked);
			toast.success(checked ? 'Publishing enabled' : 'Publishing paused');
		} catch {
			toast.error('Failed to update publishing setting');
		}
	}, [updatePublishing]);

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
