'use client';

import React from 'react';
import { ContentItem } from '@/lib/types/posts';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface PanelHeaderProps {
	item: ContentItem;
	onClose: () => void;
	hasNavigation: boolean;
	canGoPrevious: boolean;
	canGoNext: boolean;
	currentIndex: number;
	itemsCount: number;
	onGoToPrevious: () => void;
	onGoToNext: () => void;
}

/**
 * Right panel header with title, status dot, mobile nav, and close button
 */
export function PanelHeader({
	item, onClose, hasNavigation, canGoPrevious, canGoNext,
	currentIndex, itemsCount, onGoToPrevious, onGoToNext,
}: PanelHeaderProps) {
	return (
		<div className='p-4 md:p-8 border-b border-gray-100 flex items-center justify-between gap-2'>
			<div className='min-w-0 flex-1'>
				<h2 className='text-lg md:text-2xl font-black text-gray-900 leading-tight truncate'>
					{item.title || item.caption || 'Post Details'}
				</h2>
				<div className='flex items-center gap-2 mt-1'>
					<span className={`inline-block w-2 h-2 rounded-full ${item.publishingStatus === 'failed' ? 'bg-red-500' : item.publishingStatus === 'published' ? 'bg-emerald-500 animate-pulse' : item.publishingStatus === 'processing' ? 'bg-amber-500 animate-pulse' : item.publishingStatus === 'scheduled' ? 'bg-blue-500' : 'bg-gray-400'}`} />
					<p className='text-[11px] text-gray-400 font-bold uppercase tracking-widest'>
						{item.source} • {item.mediaType}
					</p>
				</div>
			</div>
			{hasNavigation && (
				<div className='flex items-center gap-1 md:hidden'>
					<button onClick={onGoToPrevious} disabled={!canGoPrevious} className={`p-1.5 rounded-lg transition ${canGoPrevious ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-300'}`}>
						<ChevronLeft className='h-4 w-4' />
					</button>
					<span className='text-[11px] text-gray-400 font-bold min-w-[36px] text-center'>
						{currentIndex + 1}/{itemsCount}
					</span>
					<button onClick={onGoToNext} disabled={!canGoNext} className={`p-1.5 rounded-lg transition ${canGoNext ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-300'}`}>
						<ChevronRight className='h-4 w-4' />
					</button>
				</div>
			)}
			<button onClick={onClose} className='hidden md:flex p-3 bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-2xl transition-all active:scale-[0.9]'>
				<X className='h-6 w-6' />
			</button>
		</div>
	);
}
