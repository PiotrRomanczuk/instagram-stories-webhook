'use client';

import { useState } from 'react';
import { MoreHorizontal, Heart, Send, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContentItem } from '@/lib/types';

interface PhonePreviewProps {
	item: ContentItem | null;
	onImageError?: () => void;
	className?: string;
}

export function PhonePreview({ item, onImageError, className }: PhonePreviewProps) {
	const [imageError, setImageError] = useState(false);
	const [imageLoaded, setImageLoaded] = useState(false);

	// Reset image state when item changes
	const currentMediaUrl = item?.mediaUrl;
	const [lastMediaUrl, setLastMediaUrl] = useState<string | undefined>(undefined);

	if (currentMediaUrl !== lastMediaUrl) {
		setLastMediaUrl(currentMediaUrl);
		setImageError(false);
		setImageLoaded(false);
	}

	const handleImageError = () => {
		setImageError(true);
		onImageError?.();
	};

	const handleImageLoad = () => {
		setImageLoaded(true);
	};

	// Extract username from email
	const username = item?.userEmail?.split('@')[0] || 'unknown';

	return (
		<div className={cn('relative', className)} style={{ aspectRatio: '9 / 16', width: '100%', maxWidth: '340px' }}>
			{/* Phone Frame */}
			<div className="relative w-full h-full bg-slate-900 rounded-[2.5rem] p-3 border-[8px] border-slate-800 shadow-2xl ring-1 ring-white/10">
				{/* Notch */}
				<div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-32 bg-slate-800 rounded-b-2xl z-20" />

				{/* Content Area */}
				<div className="relative w-full h-full rounded-[1.8rem] overflow-hidden bg-black group">
					{item ? (
						<>
							{/* Story Media */}
							{imageError ? (
								<div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-400">
									<Smartphone className="h-16 w-16 opacity-50 mb-3" />
									<span className="text-sm">Failed to load image</span>
								</div>
							) : (
								<>
									{!imageLoaded && (
										<div className="absolute inset-0 flex items-center justify-center bg-slate-800">
											<div className="h-8 w-8 border-2 border-[#2b6cee] border-t-transparent rounded-full animate-spin" />
										</div>
									)}
									<img
										src={item.mediaUrl}
										alt="Story preview"
										className={cn(
											'w-full h-full object-cover brightness-90 group-hover:scale-105 transition-transform duration-700',
											!imageLoaded && 'opacity-0'
										)}
										onError={handleImageError}
										onLoad={handleImageLoad}
									/>
								</>
							)}

							{/* Header Overlays */}
							<div className="absolute top-8 left-0 right-0 px-4 flex items-center justify-between z-10">
								<div className="flex items-center gap-2">
									{/* Avatar */}
									<div className="w-8 h-8 rounded-full border border-white/50 overflow-hidden bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 p-[2px]">
										<div className="w-full h-full rounded-full bg-slate-800" />
									</div>
									<span className="text-white text-xs font-bold drop-shadow-md">{username}</span>
									<span className="text-white/70 text-[10px] drop-shadow-md">Just now</span>
								</div>
								<MoreHorizontal className="h-5 w-5 text-white" />
							</div>

							{/* Story Progress Bar */}
							<div className="absolute top-2 left-2 right-2 h-0.5 rounded-full bg-white/30 z-10">
								<div className="h-full w-1/3 rounded-full bg-white" />
							</div>

							{/* Caption Overlay (if exists and short) */}
							{item.caption && item.caption.length <= 100 && (
								<div className="absolute bottom-20 left-0 right-0 px-4 z-10">
									<div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2">
										<p className="text-white text-xs line-clamp-2">{item.caption}</p>
									</div>
								</div>
							)}

							{/* Bottom Interaction Bar */}
							<div className="absolute bottom-6 left-0 right-0 px-4 flex items-center gap-3 z-10">
								<div className="flex-1 h-9 rounded-full border border-white/50 px-4 flex items-center">
									<span className="text-white/60 text-[11px]">Send message...</span>
								</div>
								<Heart className="h-5 w-5 text-white" />
								<Send className="h-5 w-5 text-white" />
							</div>
						</>
					) : (
						<div className="flex h-full w-full flex-col items-center justify-center gap-3 text-slate-400">
							<Smartphone className="h-16 w-16 opacity-50" />
							<span className="text-sm">No story selected</span>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
