'use client';

import React from 'react';
import { ContentItem } from '@/lib/types/posts';
import { formatCreatorName } from './content-preview-modal.helpers';

interface MetadataGridProps {
	item: ContentItem;
}

/**
 * Metadata grid showing owner, content type, video details
 */
export function MetadataGrid({ item }: MetadataGridProps) {
	return (
		<section className='pt-4 border-t border-gray-50'>
			<div className='grid grid-cols-2 gap-6'>
				<div className='space-y-1'>
					<p className='text-[10px] font-black text-gray-300 uppercase tracking-widest'>Owner</p>
					<p className='text-xs font-bold text-gray-900 truncate'>{formatCreatorName(item.userEmail)}</p>
				</div>
				<div className='space-y-1'>
					<p className='text-[10px] font-black text-gray-300 uppercase tracking-widest'>Content Type</p>
					<p className='text-xs font-bold text-gray-900 capitalize'>{item.mediaType.toLowerCase()}</p>
				</div>
				{item.mediaType === 'VIDEO' && item.videoDuration && (
					<>
						<div className='space-y-1'>
							<p className='text-[10px] font-black text-gray-300 uppercase tracking-widest'>Duration</p>
							<p className='text-xs font-bold text-gray-900'>{Math.floor(item.videoDuration)}s</p>
						</div>
						{item.videoCodec && (
							<div className='space-y-1'>
								<p className='text-[10px] font-black text-gray-300 uppercase tracking-widest'>Codec</p>
								<p className='text-xs font-bold text-gray-900 uppercase'>{item.videoCodec}</p>
							</div>
						)}
						{item.videoFramerate && (
							<div className='space-y-1'>
								<p className='text-[10px] font-black text-gray-300 uppercase tracking-widest'>Frame Rate</p>
								<p className='text-xs font-bold text-gray-900'>{item.videoFramerate.toFixed(1)} fps</p>
							</div>
						)}
					</>
				)}
			</div>
		</section>
	);
}
