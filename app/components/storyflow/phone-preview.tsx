'use client';

import { useState, useEffect } from 'react';
import { Smartphone, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContentItem } from '@/lib/types';
import ReactPlayer from 'react-player';

interface PhonePreviewProps {
	item: ContentItem | null;
	onImageError?: () => void;
	className?: string;
}

export function PhonePreview({ item, onImageError, className }: PhonePreviewProps) {
	const [imageError, setImageError] = useState(false);
	const [imageLoaded, setImageLoaded] = useState(false);
	const [retryKey, setRetryKey] = useState(0);

	// Reset image state when item changes
	/* eslint-disable react-hooks/set-state-in-effect -- Reset derived state on prop change */
	useEffect(() => {
		setImageError(false);
		setImageLoaded(false);
		setRetryKey(0);
	}, [item?.mediaUrl]);
	/* eslint-enable react-hooks/set-state-in-effect */

	const handleImageError = () => {
		setImageError(true);
		onImageError?.();
	};

	const handleImageLoad = () => {
		setImageLoaded(true);
	};

	const handleRetry = () => {
		setImageError(false);
		setImageLoaded(false);
		setRetryKey((k) => k + 1);
	};

	const isVideo = item?.mediaType === 'VIDEO';

	return (
		<div className={cn('flex flex-col items-center gap-2', className)}>
			<div
				className="relative rounded-[2rem] border-4 border-foreground/20 bg-muted p-2 shadow-lg w-[216px] h-[396px] sm:w-[286px] sm:h-[496px]"
			>
				{/* Notch */}
				<div className="absolute left-1/2 top-2 h-4 w-16 sm:h-5 sm:w-20 -translate-x-1/2 rounded-full bg-foreground/20" />

				{/* Screen */}
				<div
					className="relative overflow-hidden rounded-[1.5rem] bg-black w-[200px] h-[380px] sm:w-[270px] sm:h-[480px]"
				>
					{item ? (
						<>
							{/* Story Media */}
							{imageError ? (
								<div className="flex h-full w-full flex-col items-center justify-center gap-3 text-muted-foreground">
									<Smartphone className="h-12 w-12" />
									<span className="text-sm">Failed to load {isVideo ? 'video' : 'image'}</span>
									<button
										onClick={handleRetry}
										className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
									>
										<RefreshCw className="h-3 w-3" />
										Retry
									</button>
								</div>
							) : isVideo ? (
								<div className="h-full w-full">
									<ReactPlayer
										src={item.mediaUrl}
										controls
										width="100%"
										height="100%"
										light={item.thumbnailUrl || undefined}
										playsInline
										onReady={handleImageLoad}
										onError={handleImageError}
									/>
								</div>
							) : (
								<>
									{!imageLoaded && (
										<div className="absolute inset-0 flex items-center justify-center bg-black">
											<div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
										</div>
									)}
									<img
										key={retryKey}
										src={item.mediaUrl}
										alt="Story preview"
										className={cn(
											'h-full w-full object-contain',
											!imageLoaded && 'opacity-0'
										)}
										style={{ backgroundColor: '#000' }}
										onError={handleImageError}
										onLoad={handleImageLoad}
									/>
								</>
							)}
						</>
					) : (
						<div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
							<Smartphone className="h-12 w-12" />
							<span className="text-sm">No story selected</span>
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
