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
	horizontalListSortingStrategy,
	useSortable,
	sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Send, Loader2, X, Image as ImageIcon, Video, GripVertical } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { proxyUrl } from '@/lib/instagram/proxy-url';
import type { InstagramStory } from '@/lib/instagram/media';

interface SelectedStripProps {
	stories: InstagramStory[];
	onReorder: (orderedIds: string[]) => void;
	onRemove: (id: string) => void;
	onClear: () => void;
}

const MIN_SELECT = 3;

export function SelectedStrip({ stories, onReorder, onRemove, onClear }: SelectedStripProps) {
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
		if (stories.length < MIN_SELECT) {
			toast.error(`Pick at least ${MIN_SELECT} stories`);
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
				toast.success(`Composing ${body.storyCount} stories — TT inbox in ~60s`, {
					description: body.message,
				});
				onClear();
			} else {
				toast.error(body.error ?? `Send failed (${res.status})`);
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Send failed');
		} finally {
			setSending(false);
		}
	}

	if (stories.length === 0) return null;

	const ready = stories.length >= MIN_SELECT;
	const totalSeconds = stories.reduce((s) => s + 5, 0); // images ~5s; rough preview

	return (
		<Card className="border-primary/30 bg-gradient-to-br from-fuchsia-50/50 to-orange-50/30 dark:from-fuchsia-950/20 dark:to-orange-950/10">
			<CardContent className="space-y-3 p-4">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div className="text-xs text-muted-foreground">
						<span className="font-semibold text-foreground">{stories.length}</span> selected
						{ready ? ` · ~${totalSeconds}s` : ` · pick ${MIN_SELECT - stories.length} more`}{' '}
						· drag to reorder
					</div>
					<div className="flex items-center gap-1.5">
						<Button variant="ghost" size="sm" onClick={onClear} className="h-7 text-xs">
							Clear
						</Button>
						<Button size="sm" disabled={!ready || sending} onClick={send} className="gap-1.5">
							{sending ? (
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
							) : (
								<Send className="h-3.5 w-3.5" />
							)}
							Send to TT inbox
						</Button>
					</div>
				</div>

				<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
					<SortableContext items={stories.map((s) => s.id)} strategy={horizontalListSortingStrategy}>
						<div className="flex gap-2 overflow-x-auto pb-1">
							{stories.map((s, idx) => (
								<SortableTile key={s.id} story={s} index={idx} onRemove={onRemove} />
							))}
						</div>
					</SortableContext>
				</DndContext>
			</CardContent>
		</Card>
	);
}

function SortableTile({
	story,
	index,
	onRemove,
}: {
	story: InstagramStory;
	index: number;
	onRemove: (id: string) => void;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: story.id,
	});

	const style: React.CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.4 : 1,
	};

	const thumb = proxyUrl(story.thumbnail_url ?? story.media_url);

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={cn(
				'group relative h-24 w-16 shrink-0 overflow-hidden rounded-md border bg-muted',
				isDragging && 'ring-2 ring-primary',
			)}
		>
			<button
				{...attributes}
				{...listeners}
				className="absolute inset-0 cursor-grab active:cursor-grabbing"
				aria-label={`Reorder story ${index + 1}`}
			>
				{thumb ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img src={thumb} alt="" className="h-full w-full object-cover" />
				) : (
					<div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900">
						{story.media_type === 'VIDEO' ? (
							<Video className="h-4 w-4 text-white/50" />
						) : (
							<ImageIcon className="h-4 w-4 text-white/50" />
						)}
					</div>
				)}
			</button>
			<div className="pointer-events-none absolute left-0 top-0 rounded-br-md bg-black/70 px-1 py-0.5 text-[9px] font-bold text-white">
				#{index + 1}
			</div>
			<div className="pointer-events-none absolute bottom-0.5 left-0.5 rounded bg-black/40 p-0.5 text-white/70">
				<GripVertical className="h-2.5 w-2.5" />
			</div>
			<button
				onClick={() => onRemove(story.id)}
				className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
				aria-label="Remove from selection"
			>
				<X className="h-3 w-3" />
			</button>
		</div>
	);
}
