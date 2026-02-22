'use client';

import { useState, useEffect } from 'react';
import { Eye, Users, Loader2 } from 'lucide-react';
import { MediaInsight } from '@/lib/types/instagram';

/**
 * Quick Insights Display for List View
 */
export function QuickInsights({ contentId }: { contentId: string }) {
	const [insights, setInsights] = useState<MediaInsight[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchInsights = async () => {
			try {
				const response = await fetch(`/api/content/${contentId}/insights`);
				const data = await response.json();

				if (!response.ok) {
					setError(data.message || 'Unavailable');
					return;
				}

				setInsights(data.insights || []);
			} catch {
				setError('Failed');
			} finally {
				setIsLoading(false);
			}
		};

		fetchInsights();
	}, [contentId]);

	if (isLoading) {
		return (
			<div className='flex items-center gap-1 text-gray-400'>
				<Loader2 className='h-3 w-3 animate-spin' />
			</div>
		);
	}

	if (error) {
		return (
			<span className='text-[10px] text-gray-400' title={error}>
				-
			</span>
		);
	}

	// Extract key metrics
	const impressions = insights.find((i) => i.name === 'impressions')?.values?.[0]?.value ?? 0;
	const reach = insights.find((i) => i.name === 'reach')?.values?.[0]?.value ?? 0;

	if (impressions === 0 && reach === 0) {
		return <span className='text-[10px] text-gray-400'>No data</span>;
	}

	return (
		<div className='flex items-center gap-3'>
			<div className='flex items-center gap-1' title='Impressions'>
				<Eye className='h-3 w-3 text-indigo-500' />
				<span className='text-xs font-bold text-gray-700'>
					{impressions.toLocaleString()}
				</span>
			</div>
			<div className='flex items-center gap-1' title='Reach'>
				<Users className='h-3 w-3 text-emerald-500' />
				<span className='text-xs font-bold text-gray-700'>
					{reach.toLocaleString()}
				</span>
			</div>
		</div>
	);
}
