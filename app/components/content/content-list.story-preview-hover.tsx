'use client';

import { useState } from 'react';
import { ContentItem } from '@/lib/types/posts';

/**
 * Story Preview on Hover Component
 */
export function StoryPreviewHover({ item }: { item: ContentItem }) {
	const [imageError, setImageError] = useState(false);
	const hasValidUrl = item.mediaUrl && !item.mediaUrl.startsWith('blob:');

	if (!hasValidUrl || imageError) {
		return null; // Don't show preview for invalid images
	}

	return (
		<div className='absolute left-full ml-4 top-1/2 -translate-y-1/2 z-50 opacity-0 group-hover/media:opacity-100 pointer-events-none transition-opacity duration-200'>
			<div className='relative w-[180px] aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl border-4 border-white bg-gray-900'>
				{/* Blurred Background */}
				<img
					src={item.mediaUrl}
					alt=''
					className='absolute inset-0 h-full w-full object-cover blur-2xl opacity-60 scale-125'
					onError={() => setImageError(true)}
				/>
				{/* Main Media */}
				<img
					src={item.mediaUrl}
					alt='Story Preview'
					className='relative z-10 h-full w-full object-contain drop-shadow-lg'
					onError={() => setImageError(true)}
				/>
				{/* Story UI Overlay */}
				<div className='absolute inset-0 z-20 p-3 flex flex-col justify-between pointer-events-none'>
					<div className='space-y-2'>
						<div className='flex gap-1 h-0.5'>
							<div className='flex-1 bg-white/60 rounded-full' />
							<div className='flex-1 bg-white/20 rounded-full' />
						</div>
						<div className='flex items-center gap-2'>
							<div className='w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-0.5'>
								<div className='w-full h-full rounded-full bg-black flex items-center justify-center text-[6px] font-black text-white'>
									IG
								</div>
							</div>
							<span className='text-[8px] font-bold text-white drop-shadow'>
								Story Preview
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
