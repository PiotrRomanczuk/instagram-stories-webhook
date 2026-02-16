'use client';

import React, { useState, useEffect } from 'react';
import { ContentItem } from '@/lib/types/posts';
import { Eye, Users, Loader2 } from 'lucide-react';
import { MediaInsight } from '@/lib/types/instagram';

/**
 * Format creator name - handles UUID fallback gracefully
 */
export function formatCreatorName(userEmail?: string): string {
	if (!userEmail) return 'Unknown';
	const uuidPattern =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if (uuidPattern.test(userEmail)) {
		return 'Unknown';
	}
	return userEmail.split('@')[0] || 'Unknown';
}

/**
 * Format overdue duration in human-readable form
 */
export function formatOverdueDuration(scheduledTime: number): string {
	const now = Date.now();
	const diffMs = now - scheduledTime;
	const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
	const diffDays = Math.floor(diffHours / 24);

	if (diffDays > 0) {
		return `${diffDays}d`;
	}
	if (diffHours > 0) {
		return `${diffHours}h`;
	}
	const diffMinutes = Math.floor(diffMs / (1000 * 60));
	return `${diffMinutes}m`;
}

/**
 * Story Preview on Hover Component
 */
export function StoryPreviewHover({ item }: { item: ContentItem }) {
	const [imageError, setImageError] = useState(false);
	const hasValidUrl = item.mediaUrl && !item.mediaUrl.startsWith('blob:');

	if (!hasValidUrl || imageError) {
		return null;
	}

	return (
		<div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 z-50 opacity-0 group-hover/media:opacity-100 pointer-events-none transition-opacity duration-200">
			<div className="relative w-[180px] aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl border-4 border-white bg-gray-900">
				<img
					src={item.mediaUrl}
					alt=""
					className="absolute inset-0 h-full w-full object-cover blur-2xl opacity-60 scale-125"
					onError={() => setImageError(true)}
				/>
				<img
					src={item.mediaUrl}
					alt="Story Preview"
					className="relative z-10 h-full w-full object-contain drop-shadow-lg"
					onError={() => setImageError(true)}
				/>
				<div className="absolute inset-0 z-20 p-3 flex flex-col justify-between pointer-events-none">
					<div className="space-y-2">
						<div className="flex gap-1 h-0.5">
							<div className="flex-1 bg-white/60 rounded-full" />
							<div className="flex-1 bg-white/20 rounded-full" />
						</div>
						<div className="flex items-center gap-2">
							<div className="w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-0.5">
								<div className="w-full h-full rounded-full bg-black flex items-center justify-center text-[6px] font-black text-white">
									IG
								</div>
							</div>
							<span className="text-[8px] font-bold text-white drop-shadow">
								Story Preview
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

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
				const response = await fetch(
					`/api/content/${contentId}/insights`,
				);
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
			<div className="flex items-center gap-1 text-gray-400">
				<Loader2 className="h-3 w-3 animate-spin" />
			</div>
		);
	}

	if (error) {
		return (
			<span className="text-[10px] text-gray-400" title={error}>
				-
			</span>
		);
	}

	const impressions =
		insights.find((i) => i.name === 'impressions')?.values?.[0]?.value ?? 0;
	const reach =
		insights.find((i) => i.name === 'reach')?.values?.[0]?.value ?? 0;

	if (impressions === 0 && reach === 0) {
		return <span className="text-[10px] text-gray-400">No data</span>;
	}

	return (
		<div className="flex items-center gap-3">
			<div className="flex items-center gap-1" title="Impressions">
				<Eye className="h-3 w-3 text-indigo-500" />
				<span className="text-xs font-bold text-gray-700">
					{impressions.toLocaleString()}
				</span>
			</div>
			<div className="flex items-center gap-1" title="Reach">
				<Users className="h-3 w-3 text-emerald-500" />
				<span className="text-xs font-bold text-gray-700">
					{reach.toLocaleString()}
				</span>
			</div>
		</div>
	);
}
