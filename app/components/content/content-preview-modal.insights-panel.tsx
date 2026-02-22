'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MediaInsight } from '@/lib/types/instagram';
import {
	Eye, Users, MessageCircle, ArrowRight, ArrowLeft, LogOut,
	Loader2, BarChart3, RefreshCw, TrendingUp,
} from 'lucide-react';

/**
 * Map insight names to display labels and icons
 */
export const INSIGHT_CONFIG: Record<
	string,
	{ label: string; icon: React.ElementType; description: string }
> = {
	impressions: {
		label: 'Impressions',
		icon: Eye,
		description: 'Total number of times the story was seen',
	},
	reach: {
		label: 'Reach',
		icon: Users,
		description: 'Number of unique accounts that saw the story',
	},
	replies: {
		label: 'Replies',
		icon: MessageCircle,
		description: 'Number of replies to the story',
	},
	taps_forward: {
		label: 'Taps Forward',
		icon: ArrowRight,
		description: 'Number of taps to see the next story',
	},
	taps_back: {
		label: 'Taps Back',
		icon: ArrowLeft,
		description: 'Number of taps to see the previous story',
	},
	exits: {
		label: 'Exits',
		icon: LogOut,
		description: 'Number of times someone exited the story',
	},
};

/**
 * Insights Panel Component for published posts
 */
export function InsightsPanel({ contentId }: { contentId: string }) {
	const [insights, setInsights] = useState<MediaInsight[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchInsights = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		try {
			const response = await fetch(`/api/content/${contentId}/insights`);
			const data = await response.json();

			if (!response.ok) {
				setError(data.message || data.error || 'Failed to load insights');
				return;
			}

			setInsights(data.insights || []);
		} catch (err) {
			setError('Failed to fetch insights');
			console.error('Insights fetch error:', err);
		} finally {
			setIsLoading(false);
		}
	}, [contentId]);

	useEffect(() => {
		fetchInsights();
	}, [fetchInsights]);

	if (isLoading) {
		return (
			<section className='space-y-4'>
				<div className='flex items-center justify-between'>
					<h3 className='text-xs font-black text-gray-400 uppercase tracking-[0.2em]'>Performance</h3>
					<BarChart3 className='h-4 w-4 text-gray-200' />
				</div>
				<div className='flex items-center justify-center py-8'>
					<Loader2 className='h-6 w-6 text-indigo-400 animate-spin' />
				</div>
			</section>
		);
	}

	if (error) {
		return (
			<section className='space-y-4'>
				<div className='flex items-center justify-between'>
					<h3 className='text-xs font-black text-gray-400 uppercase tracking-[0.2em]'>Performance</h3>
					<button onClick={fetchInsights} className='p-1 hover:bg-gray-100 rounded transition-colors' title='Retry'>
						<RefreshCw className='h-4 w-4 text-gray-400 hover:text-gray-600' />
					</button>
				</div>
				<div className='p-4 bg-amber-50 rounded-2xl border border-amber-100'>
					<p className='text-xs text-amber-700'>{error}</p>
				</div>
			</section>
		);
	}

	if (insights.length === 0) {
		return (
			<section className='space-y-4'>
				<div className='flex items-center justify-between'>
					<h3 className='text-xs font-black text-gray-400 uppercase tracking-[0.2em]'>Performance</h3>
					<BarChart3 className='h-4 w-4 text-gray-200' />
				</div>
				<div className='p-4 bg-gray-50 rounded-2xl'>
					<p className='text-xs text-gray-500'>No insights available yet.</p>
				</div>
			</section>
		);
	}

	return (
		<section className='space-y-4'>
			<div className='flex items-center justify-between'>
				<h3 className='text-xs font-black text-gray-400 uppercase tracking-[0.2em]'>Performance</h3>
				<button onClick={fetchInsights} className='p-1 hover:bg-gray-100 rounded transition-colors' title='Refresh insights'>
					<RefreshCw className='h-4 w-4 text-gray-400 hover:text-gray-600' />
				</button>
			</div>
			<div className='grid grid-cols-2 gap-3'>
				{insights.map((insight) => {
					const config = INSIGHT_CONFIG[insight.name];
					const Icon = config?.icon || TrendingUp;
					const value = insight.values?.[0]?.value ?? 0;

					return (
						<div
							key={insight.name}
							className='p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100/50 group hover:shadow-md transition-all'
							title={config?.description || insight.description}
						>
							<div className='flex items-center gap-2 mb-2'>
								<Icon className='h-4 w-4 text-indigo-500' />
								<span className='text-[10px] font-bold text-indigo-600 uppercase tracking-wider'>
									{config?.label || insight.name.replace(/_/g, ' ')}
								</span>
							</div>
							<p className='text-2xl font-black text-gray-900'>{value.toLocaleString()}</p>
						</div>
					);
				})}
			</div>
		</section>
	);
}
