'use client';

import { useState } from 'react';
import { ImageOff, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaThumbnailProps {
	src: string | undefined | null;
	alt?: string;
	className?: string;
	aspectRatio?: 'square' | 'story' | 'auto';
	showPlayIcon?: boolean;
	size?: 'xs' | 'sm' | 'md' | 'lg';
}

const sizeClasses = {
	xs: 'h-8 w-8',
	sm: 'h-12 w-12',
	md: 'h-24 w-24',
	lg: 'h-32 w-32',
};

const aspectClasses = {
	square: 'aspect-square',
	story: 'aspect-[9/16]',
	auto: '',
};

/**
 * A reusable media thumbnail component with built-in error handling.
 * Shows a placeholder when the image URL is invalid or fails to load.
 */
export function MediaThumbnail({
	src,
	alt = '',
	className,
	aspectRatio = 'square',
	showPlayIcon = false,
	size,
}: MediaThumbnailProps) {
	const [error, setError] = useState(false);

	// Check for invalid URLs (blob:, empty, null, undefined)
	const hasValidUrl = src && !src.startsWith('blob:') && src.length > 0;

	const containerClasses = cn(
		'relative overflow-hidden rounded bg-muted',
		aspectClasses[aspectRatio],
		size && sizeClasses[size],
		className,
	);

	if (!hasValidUrl || error) {
		return (
			<div className={cn(containerClasses, 'flex items-center justify-center')}>
				<div className="flex flex-col items-center justify-center gap-1 text-muted-foreground">
					<ImageOff className={cn(
						'opacity-50',
						size === 'xs' ? 'h-3 w-3' : size === 'sm' ? 'h-4 w-4' : 'h-8 w-8'
					)} />
					{!size || size === 'md' || size === 'lg' ? (
						<span className="text-[10px]">No image</span>
					) : null}
				</div>
			</div>
		);
	}

	return (
		<div className={containerClasses}>
			<img
				src={src}
				alt={alt}
				className="h-full w-full object-cover"
				onError={() => setError(true)}
			/>
			{showPlayIcon && (
				<div className="absolute inset-0 flex items-center justify-center bg-black/30">
					<Play className="h-8 w-8 fill-white text-white" />
				</div>
			)}
		</div>
	);
}
