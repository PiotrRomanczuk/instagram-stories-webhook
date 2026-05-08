'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Image as ImageIcon, Video } from 'lucide-react';
import { proxyUrl } from '@/lib/instagram/proxy-url';
import type { InstagramStory } from '@/lib/instagram/media';
import {
	MONO_STACK,
	SECONDS_PER_TILE,
	COMPILATION_CAP_SECONDS,
} from './insights-tokens';

interface CompilationRowProps {
	story: InstagramStory;
	rate: number | null;
	views: number | undefined;
	index: number;
	onRemove: () => void;
}

function fmtTime(sec: number): string {
	const m = Math.floor(sec / 60);
	const s = sec % 60;
	return `${m}:${String(s).padStart(2, '0')}`;
}

function fmt(n: number | undefined): string {
	if (n === undefined || n === null) return '—';
	if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
	return n.toString();
}

export function CompilationRow({ story, rate, views, index, onRemove }: CompilationRowProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: story.id,
	});

	const start = index * SECONDS_PER_TILE;
	const end = Math.min((index + 1) * SECONDS_PER_TILE, COMPILATION_CAP_SECONDS);
	const isOver = (index + 1) * SECONDS_PER_TILE > COMPILATION_CAP_SECONDS;
	const thumb = proxyUrl(story.thumbnail_url ?? story.media_url);

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	return (
		<div
			ref={setNodeRef}
			style={{
				...style,
				background: isOver ? 'var(--amber-soft)' : 'transparent',
				border: isOver ? '1px dashed var(--amber)' : '1px solid transparent',
				borderRadius: 8,
				display: 'grid',
				gridTemplateColumns: '14px 44px minmax(0,1fr) 24px',
				gap: 10,
				alignItems: 'center',
				padding: '8px 10px',
			}}
		>
			<button
				{...attributes}
				{...listeners}
				className="flex h-full items-center justify-center p-0"
				style={{
					background: 'transparent',
					border: 'none',
					color: 'var(--muted-2)',
					cursor: 'grab',
				}}
				aria-label={`Reorder story, currently position ${index + 1}`}
			>
				<GripVertical className="h-3.5 w-3.5" />
			</button>

			<div
				className="relative h-[78px] w-11 overflow-hidden rounded-md"
				style={{ boxShadow: '0 0 0 1px var(--line-2)', background: 'var(--bg-2)' }}
			>
				{thumb ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
				) : (
					<span
						className="flex h-full w-full items-center justify-center"
						style={{ color: 'var(--muted-2)' }}
					>
						{story.media_type === 'VIDEO' ? (
							<Video className="h-3.5 w-3.5" />
						) : (
							<ImageIcon className="h-3.5 w-3.5" />
						)}
					</span>
				)}
				<span
					className="absolute left-[3px] top-[3px] grid h-4 w-4 place-items-center"
					style={{
						borderRadius: 99,
						background: 'var(--accent)',
						color: 'var(--accent-ink)',
						fontFamily: MONO_STACK,
						fontSize: 10,
						fontWeight: 700,
						boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
					}}
				>
					{index + 1}
				</span>
			</div>

			<div className="flex min-w-0 flex-col gap-0.5">
				<span style={{ fontFamily: MONO_STACK, fontSize: 11.5, color: 'var(--ink)' }}>
					{fmtTime(start)}
					<span style={{ color: 'var(--muted-2)' }}>–</span>
					{fmtTime(end)}
				</span>
				<span className="truncate" style={{ fontSize: 11, color: 'var(--muted)' }}>
					{rate === null
						? 'pending'
						: `${(rate * 100).toFixed(0)}% rate · ${fmt(views)} views`}
				</span>
			</div>

			<button
				onClick={onRemove}
				className="grid h-6 w-6 place-items-center"
				style={{
					borderRadius: 6,
					border: 'none',
					background: 'transparent',
					color: 'var(--muted-2)',
					cursor: 'pointer',
				}}
				aria-label="Remove from compilation"
			>
				<X className="h-3.5 w-3.5" />
			</button>
		</div>
	);
}
