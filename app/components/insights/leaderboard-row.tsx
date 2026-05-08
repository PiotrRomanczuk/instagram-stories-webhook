'use client';

import { Image as ImageIcon, Video, Play, Plus, Check, ArrowUpRight } from 'lucide-react';
import { proxyUrl } from '@/lib/instagram/proxy-url';
import type { InstagramStory } from '@/lib/instagram/media';
import type { ScoredStory } from '@/lib/insights/score-story';
import { MONO_STACK } from './insights-tokens';

interface LeaderboardRowProps {
	story: InstagramStory;
	score: ScoredStory;
	metrics: {
		impressions?: number;
		views?: number;
		reach?: number;
		replies?: number;
	} | undefined;
	rank: number;
	isSelected: boolean;
	position: number | null;
	onToggle: () => void;
}

function fmt(n: number | undefined): string {
	if (n === undefined || n === null) return '—';
	if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
	return n.toString();
}

function fmtAge(iso: string): string {
	const diff = Date.now() - new Date(iso).getTime();
	const min = Math.floor(diff / 60_000);
	if (min < 60) return `${Math.max(min, 0)}m`;
	const hr = Math.floor(min / 60);
	if (hr < 24) return `${hr}h`;
	return `${Math.floor(hr / 24)}d`;
}

function barOpacity(rate: number): number {
	if (rate >= 0.85) return 1;
	if (rate >= 0.75) return 0.75;
	return 0.5;
}

export function LeaderboardRow({
	story,
	score,
	metrics,
	rank,
	isSelected,
	position,
	onToggle,
}: LeaderboardRowProps) {
	const ratePct = (score.rate * 100).toFixed(0);
	const views = metrics?.impressions ?? metrics?.views;
	const isPending = !score.qualifies;
	const isVideo = story.media_type === 'VIDEO';
	const thumb = proxyUrl(story.thumbnail_url ?? story.media_url);

	return (
		<div
			className="relative grid grid-cols-[88px_1fr_56px] items-center gap-4 px-5 py-3 sm:gap-5 sm:px-6"
			style={{
				background: isSelected ? 'var(--surface-2)' : 'transparent',
				borderBottom: '1px solid var(--line-2)',
			}}
		>
			{isSelected && (
				<span
					aria-hidden
					className="absolute left-0 top-0 bottom-0"
					style={{
						width: 3,
						background: 'var(--accent)',
						borderRadius: '0 2px 2px 0',
					}}
				/>
			)}

			<button
				onClick={onToggle}
				className="relative h-[156px] w-[88px] overflow-hidden rounded-lg p-0"
				style={{
					boxShadow: isSelected
						? '0 0 0 2px var(--accent), 0 0 0 4px var(--surface)'
						: '0 0 0 1px var(--line-2)',
					background: 'var(--bg-2)',
					cursor: 'pointer',
					border: 'none',
				}}
				aria-pressed={isSelected}
				aria-label={isSelected ? 'Deselect story' : 'Select story'}
			>
				{thumb ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={thumb}
						alt=""
						className="h-full w-full object-cover"
						loading="lazy"
					/>
				) : (
					<span className="flex h-full w-full items-center justify-center" style={{ color: 'var(--muted-2)' }}>
						{isVideo ? <Video className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
					</span>
				)}

				<span
					className="absolute left-1.5 top-1.5 px-1.5 py-0.5 text-[10.5px] font-bold uppercase"
					style={{
						borderRadius: 5,
						background: rank === 0 && !isPending ? 'var(--amber)' : 'rgba(13,13,14,0.62)',
						color: rank === 0 && !isPending ? 'var(--amber-ink)' : '#fff',
						letterSpacing: '0.04em',
						fontFamily: MONO_STACK,
					}}
				>
					{rank === 0 && !isPending ? 'TOP' : `#${rank + 1}`}
				</span>

				{isVideo && (
					<span
						className="absolute right-1.5 top-1.5 grid h-[18px] w-[18px] place-items-center"
						style={{
							borderRadius: '50%',
							background: 'rgba(13,13,14,0.6)',
							color: '#fff',
						}}
					>
						<Play className="h-2.5 w-2.5" fill="currentColor" />
					</span>
				)}

				{isSelected && position !== null && (
					<span
						className="absolute bottom-1.5 left-1.5 px-2 py-0.5"
						style={{
							borderRadius: 99,
							background: 'var(--accent)',
							color: 'var(--accent-ink)',
							fontFamily: MONO_STACK,
							fontSize: 11,
							fontWeight: 700,
							letterSpacing: '0.02em',
							boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
						}}
					>
						{position}
					</span>
				)}
			</button>

			<div className="flex min-w-0 flex-col gap-2">
				<div className="flex items-baseline gap-2.5">
					{isPending ? (
						<span
							style={{
								fontFamily: MONO_STACK,
								fontSize: 20,
								color: 'var(--muted)',
							}}
						>
							pending
						</span>
					) : (
						<>
							<span
								style={{
									fontFamily: MONO_STACK,
									fontSize: 24,
									fontWeight: 600,
									color: 'var(--ink)',
									letterSpacing: '-0.02em',
								}}
							>
								{ratePct}
								<span style={{ color: 'var(--muted)', fontWeight: 400 }}>%</span>
							</span>
							<span
								className="uppercase"
								style={{
									fontSize: 10.5,
									color: 'var(--muted-2)',
									letterSpacing: '0.1em',
								}}
							>
								engagement
							</span>
						</>
					)}
				</div>

				{!isPending && (
					<div
						className="relative h-1.5 max-w-[520px] overflow-hidden rounded-full"
						style={{ background: 'var(--bar-track)' }}
					>
						<span
							className="absolute inset-y-0 left-0 rounded-full"
							style={{
								width: `${score.rate * 100}%`,
								background: 'var(--bar)',
								opacity: barOpacity(score.rate),
							}}
						/>
					</div>
				)}

				<div
					className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px]"
					style={{ color: 'var(--muted)', fontFamily: MONO_STACK }}
				>
					<span>
						<span style={{ color: 'var(--ink)' }}>{fmtAge(story.timestamp)}</span> ago
					</span>
					<span aria-hidden style={{ color: 'var(--muted-2)' }}>·</span>
					<span>
						<span style={{ color: 'var(--ink)' }}>{fmt(views)}</span> views
					</span>
					<span aria-hidden className="hidden sm:inline" style={{ color: 'var(--muted-2)' }}>·</span>
					<span className="hidden sm:inline">
						<span style={{ color: 'var(--ink)' }}>{fmt(metrics?.reach)}</span> reach
					</span>
					<span aria-hidden style={{ color: 'var(--muted-2)' }}>·</span>
					<span>
						<span style={{ color: 'var(--ink)' }}>{fmt(metrics?.replies)}</span> replies
					</span>
				</div>
			</div>

			<div className="flex flex-col items-end gap-2">
				<button
					onClick={onToggle}
					className="grid h-11 w-11 place-items-center"
					style={{
						borderRadius: 10,
						border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--line)'}`,
						background: isSelected ? 'var(--accent)' : 'var(--surface-2)',
						color: isSelected ? 'var(--accent-ink)' : 'var(--muted)',
						cursor: 'pointer',
						padding: 0,
					}}
					aria-pressed={isSelected}
					aria-label={isSelected ? 'Remove from compilation' : 'Add to compilation'}
				>
					{isSelected ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <Plus className="h-4 w-4" />}
				</button>
				{story.permalink && (
					<a
						href={story.permalink}
						target="_blank"
						rel="noopener noreferrer"
						title="View on Instagram"
						style={{ color: 'var(--muted-2)' }}
					>
						<ArrowUpRight className="h-4 w-4" />
					</a>
				)}
			</div>
		</div>
	);
}
