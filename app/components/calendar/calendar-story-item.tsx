'use client';

import { useDraggable } from '@dnd-kit/core';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { GripVertical, Link as LinkIcon, Clock } from 'lucide-react';

export interface StoryAsset {
	id: string;
	title: string;
	thumbnailUrl: string;
	hasLink?: boolean;
	isSponsored?: boolean;
	scheduledTime?: Date;
}

interface CalendarStoryItemProps {
	story: StoryAsset;
	isPlaced?: boolean;
	showTime?: boolean;
}

export function CalendarStoryItem({
	story,
	isPlaced = false,
	showTime = false,
}: CalendarStoryItemProps) {
	const { attributes, listeners, setNodeRef, transform, isDragging } =
		useDraggable({
			id: story.id,
			data: story,
		});

	const style = transform
		? {
				transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
			}
		: undefined;

	return (
		<div
			ref={setNodeRef}
			style={style}
			{...listeners}
			{...attributes}
			className={cn(
				'group relative aspect-[9/16] cursor-grab overflow-hidden rounded-lg border transition-all active:cursor-grabbing',
				isPlaced
					? 'w-16 border-[#2b6cee] bg-[#1a2332] shadow-xl'
					: 'w-full border-[#2a3649] bg-[#1a2332] hover:border-[#2b6cee]',
				isDragging && 'z-50 opacity-80 shadow-2xl'
			)}
		>
			<div className="relative h-full w-full">
				<Image
					src={story.thumbnailUrl}
					alt={story.title}
					fill
					className="object-cover"
					sizes={isPlaced ? '64px' : '120px'}
				/>
			</div>

			{story.isSponsored && (
				<div className="absolute right-1 top-1">
					<span className="rounded bg-amber-500 px-1 py-0.5 text-[8px] font-bold text-black">
						AD
					</span>
				</div>
			)}

			<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
				<div className="flex items-center gap-1">
					{story.hasLink && <LinkIcon className="h-3 w-3 text-white" />}
					{showTime && story.scheduledTime && (
						<div className="flex items-center gap-0.5 text-[9px] text-white">
							<Clock className="h-2.5 w-2.5" />
							{story.scheduledTime.toLocaleTimeString([], {
								hour: '2-digit',
								minute: '2-digit',
							})}
						</div>
					)}
				</div>
			</div>

			{!isPlaced && (
				<div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/30 group-hover:opacity-100">
					<GripVertical className="h-6 w-6 text-white" />
				</div>
			)}
		</div>
	);
}
