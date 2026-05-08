'use client';

import { useState } from 'react';
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	DragEndEvent,
} from '@dnd-kit/core';
import {
	SortableContext,
	arrayMove,
	verticalListSortingStrategy,
	sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { Loader2, Plus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { InstagramStory } from '@/lib/instagram/media';
import { MONO_STACK, COMPILATION_CAP_SECONDS } from './insights-tokens';
import { CompilationRow } from './compilation-row';
import type { CompilationSummary } from './use-compilation-summary';

interface CompilationPaneProps {
	stories: InstagramStory[]; // ordered list of picked stories
	rateById: Map<string, number | null>;
	viewsById: Map<string, number | undefined>;
	summary: CompilationSummary;
	onReorder: (orderedIds: string[]) => void;
	onRemove: (id: string) => void;
	onClear: () => void;
	onSent: () => void;
}

export function CompilationPane({
	stories,
	rateById,
	viewsById,
	summary,
	onReorder,
	onRemove,
	onClear,
	onSent,
}: CompilationPaneProps) {
	const [sending, setSending] = useState(false);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (!over || active.id === over.id) return;
		const oldIndex = stories.findIndex((s) => s.id === active.id);
		const newIndex = stories.findIndex((s) => s.id === over.id);
		if (oldIndex < 0 || newIndex < 0) return;
		onReorder(arrayMove(stories, oldIndex, newIndex).map((s) => s.id));
	}

	async function send() {
		if (summary.count < summary.min) {
			toast.error(`Pick at least ${summary.min} stories`);
			return;
		}
		setSending(true);
		try {
			const res = await fetch('/api/compositions/compose', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ igMediaIds: stories.map((s) => s.id) }),
			});
			const body = await res.json().catch(() => ({}));
			if (res.ok) {
				toast.success(
					`Composing ${body.storyCount ?? summary.count} stories — TT inbox in ~60s`,
					{ description: body.message },
				);
				onSent();
			} else {
				toast.error(body.error ?? `Send failed (${res.status})`);
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Send failed');
		} finally {
			setSending(false);
		}
	}

	const empty = summary.count === 0;
	const canSend = !empty && !summary.underMin && !sending;

	return (
		<div
			className="flex h-full w-full flex-col xl:w-[360px] xl:flex-shrink-0"
			style={{
				background: 'var(--surface)',
				borderLeft: '1px solid var(--line-2)',
			}}
		>
			<div
				className="flex flex-col gap-2.5 px-5 pb-3 pt-5"
				style={{ borderBottom: '1px solid var(--line-2)' }}
			>
				<div className="flex items-baseline justify-between">
					<span
						className="uppercase"
						style={{
							fontSize: 11,
							color: 'var(--muted)',
							letterSpacing: '0.12em',
							fontFamily: MONO_STACK,
						}}
					>
						Compilation
					</span>
					<span
						className="uppercase"
						style={{
							fontSize: 11,
							color: 'var(--muted-2)',
							letterSpacing: '0.08em',
							fontFamily: MONO_STACK,
						}}
					>
						Order = play order
					</span>
				</div>

				<div className="flex items-baseline gap-2.5">
					<span
						style={{
							fontFamily: MONO_STACK,
							fontSize: 32,
							fontWeight: 600,
							color: 'var(--ink)',
							letterSpacing: '-0.03em',
							lineHeight: 1,
						}}
					>
						{summary.count}
						<span style={{ color: 'var(--muted-2)', fontWeight: 400 }}>
							/{summary.target}
						</span>
					</span>
					<span
						style={{
							fontFamily: MONO_STACK,
							fontSize: 13,
							color: summary.overBudget ? 'var(--amber)' : 'var(--muted)',
						}}
					>
						≈{summary.seconds}s
					</span>
					<span
						style={{
							fontFamily: MONO_STACK,
							fontSize: 12,
							color: 'var(--muted-2)',
						}}
					>
						of {summary.cap}s budget
					</span>
				</div>

				<div
					className="relative h-1.5 overflow-hidden rounded-full"
					style={{ background: 'var(--bar-track)' }}
				>
					<span
						className="absolute inset-y-0 left-0 rounded-full"
						style={{
							width: `${summary.fillPct}%`,
							background: summary.overBudget ? 'var(--amber)' : 'var(--bar)',
						}}
					/>
					{[1, 2, 3, 4, 5, 6].map((i) => (
						<span
							key={i}
							aria-hidden
							className="absolute inset-y-0"
							style={{
								left: `${(i / (COMPILATION_CAP_SECONDS / 5 / 2)) * 50}%`,
								width: 1,
								background: 'var(--surface)',
							}}
						/>
					))}
				</div>

				{summary.overBudget && (
					<div
						className="flex items-center gap-2 px-2.5 py-2"
						style={{
							borderRadius: 6,
							background: 'var(--amber-soft)',
							color: 'var(--amber)',
							fontSize: 11.5,
						}}
					>
						<AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
						<span>Over {summary.cap}s — clips past the cap will be dropped at compose.</span>
					</div>
				)}
				{!summary.overBudget && summary.underMin && (
					<div
						className="px-2.5 py-2"
						style={{
							borderRadius: 6,
							background: 'var(--bg-2)',
							color: 'var(--muted)',
							fontSize: 11.5,
						}}
					>
						Need{' '}
						<span style={{ color: 'var(--ink)', fontFamily: MONO_STACK }}>
							{summary.min - summary.count}
						</span>{' '}
						more — minimum is {summary.min} stories per video.
					</div>
				)}
			</div>

			<div className="flex flex-1 flex-col gap-1 overflow-auto px-3 py-2.5">
				{empty ? (
					<EmptyPane />
				) : (
					<DndContext
						sensors={sensors}
						collisionDetection={closestCenter}
						onDragEnd={handleDragEnd}
					>
						<SortableContext
							items={stories.map((s) => s.id)}
							strategy={verticalListSortingStrategy}
						>
							{stories.map((s, i) => (
								<CompilationRow
									key={s.id}
									story={s}
									rate={rateById.get(s.id) ?? null}
									views={viewsById.get(s.id)}
									index={i}
									onRemove={() => onRemove(s.id)}
								/>
							))}
						</SortableContext>
					</DndContext>
				)}
			</div>

			<div
				className="flex gap-2.5 px-3.5 py-3"
				style={{ borderTop: '1px solid var(--line-2)' }}
			>
				<button
					onClick={onClear}
					disabled={empty}
					className="px-3.5 py-2.5 text-[13px]"
					style={{
						borderRadius: 8,
						background: 'transparent',
						border: '1px solid var(--line)',
						color: empty ? 'var(--muted-2)' : 'var(--ink)',
						cursor: empty ? 'default' : 'pointer',
						flex: '0 0 auto',
					}}
				>
					Clear
				</button>
				<button
					onClick={send}
					disabled={!canSend}
					className="flex flex-1 items-center justify-center gap-2 px-3.5 py-2.5 text-[13px]"
					style={{
						borderRadius: 8,
						background: !canSend ? 'var(--bar-track)' : 'var(--ink)',
						color: !canSend ? 'var(--muted-2)' : 'var(--bg)',
						border: 'none',
						fontWeight: 600,
						letterSpacing: '-0.005em',
						cursor: !canSend ? 'default' : 'pointer',
					}}
				>
					{sending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
					Send to TT inbox →
				</button>
			</div>
		</div>
	);
}

function EmptyPane() {
	return (
		<div
			className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center"
			style={{ color: 'var(--muted)' }}
		>
			<div
				className="grid h-12 w-12 place-items-center"
				style={{
					borderRadius: 12,
					border: '1.5px dashed var(--line)',
					color: 'var(--muted-2)',
				}}
			>
				<Plus className="h-5 w-5" />
			</div>
			<div style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>
				Pick stories to build a video
			</div>
			<div style={{ fontSize: 12, lineHeight: 1.5, maxWidth: 240 }}>
				Click any row in the leaderboard. Drag here to reorder. Min 3, target 7,
				max 20 stories.
			</div>
		</div>
	);
}
