'use client';

import type { FilterMode } from './leaderboard-toolbar';

interface ZeroStateProps {
	filter: FilterMode;
	qualifiedOnly: boolean;
	onShowAll: () => void;
}

export function ZeroState({ filter, qualifiedOnly, onShowAll }: ZeroStateProps) {
	const reason =
		filter === 'videos'
			? 'No videos in the last 24h.'
			: filter === 'photos'
				? 'No photos in the last 24h.'
				: 'No stories match this filter.';
	return (
		<div
			className="flex flex-col items-center gap-3.5 px-6 py-20 text-center"
			style={{ color: 'var(--muted)' }}
		>
			<div
				className="grid h-16 w-16 place-items-center"
				style={{
					borderRadius: 14,
					background: 'var(--bg-2)',
					color: 'var(--muted-2)',
					fontSize: 24,
				}}
			>
				—
			</div>
			<div style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 500 }}>{reason}</div>
			<div style={{ fontSize: 13, lineHeight: 1.55, maxWidth: 380 }}>
				The current filter excludes everything in your window. Switch to{' '}
				<span style={{ color: 'var(--ink)', fontWeight: 500 }}>All</span>
				{qualifiedOnly && ' or relax the qualified-only toggle'}.
			</div>
			<button
				onClick={onShowAll}
				className="px-3.5 py-2 text-[13px] font-medium"
				style={{
					borderRadius: 8,
					background: 'var(--ink)',
					color: 'var(--bg)',
					border: 'none',
					cursor: 'pointer',
				}}
			>
				Show all stories →
			</button>
		</div>
	);
}
