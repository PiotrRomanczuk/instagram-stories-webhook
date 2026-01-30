'use client';

import { cn } from '@/lib/utils';
import { Smartphone } from 'lucide-react';

interface StoryPreviewProps {
	imageUrl: string | null;
	alt?: string;
	className?: string;
}

export function StoryPreview({ imageUrl, alt = 'Story preview', className }: StoryPreviewProps) {
	// Story dimensions in 9:16 ratio
	const frameWidth = 270;
	const frameHeight = 480;

	return (
		<div className={cn('flex flex-col items-center gap-2', className)}>
			<div
				className="relative rounded-[2rem] border-4 border-foreground/20 bg-muted p-2 shadow-lg"
				style={{
					width: frameWidth + 16,
					height: frameHeight + 16,
				}}
			>
				{/* Notch */}
				<div className="absolute left-1/2 top-2 h-5 w-20 -translate-x-1/2 rounded-full bg-foreground/20" />

				{/* Screen */}
				<div
					className="relative overflow-hidden rounded-[1.5rem] bg-black"
					style={{ width: frameWidth, height: frameHeight }}
				>
					{imageUrl ? (
						<img
							src={imageUrl}
							alt={alt}
							className="h-full w-full object-contain"
							style={{ backgroundColor: '#000' }}
						/>
					) : (
						<div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
							<Smartphone className="h-12 w-12" />
							<span className="text-sm">Story Preview</span>
						</div>
					)}
				</div>

				{/* Home bar */}
				<div className="absolute bottom-3 left-1/2 h-1 w-24 -translate-x-1/2 rounded-full bg-foreground/20" />
			</div>
			<span className="text-xs text-muted-foreground">9:16 Preview</span>
		</div>
	);
}
