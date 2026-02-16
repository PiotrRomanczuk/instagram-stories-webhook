'use client';

import React from 'react';
import { ContentItem } from '@/lib/types/posts';
import { Eye, Share2 } from 'lucide-react';

interface PreviewMediaSectionProps {
	item: ContentItem;
	showStoryFrame: boolean;
	onToggleStoryFrame: (show: boolean) => void;
}

export function PreviewMediaSection({ item, showStoryFrame, onToggleStoryFrame }: PreviewMediaSectionProps) {
	return (
		<div className="h-[280px] flex-shrink-0 md:h-auto md:flex-1 bg-gray-950 relative flex items-center justify-center overflow-hidden">
			{showStoryFrame ? (
				<div className="h-full w-full aspect-[9/16] max-h-full flex items-center justify-center relative overflow-hidden">
					{item.mediaType === 'VIDEO' && item.thumbnailUrl ? (
						<img src={item.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover blur-3xl opacity-40 scale-125" />
					) : (
						<img src={item.mediaUrl} alt="" className="absolute inset-0 h-full w-full object-cover blur-3xl opacity-40 scale-125" />
					)}
					{item.mediaType === 'VIDEO' ? (
						<video src={item.mediaUrl} controls poster={item.thumbnailUrl} className="relative z-10 max-h-full max-w-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]" />
					) : (
						<img src={item.mediaUrl} alt="Story Preview" className="relative z-10 max-h-full max-w-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]" />
					)}
					<div className="absolute inset-0 z-20 p-6 flex flex-col justify-between pointer-events-none">
						<div className="space-y-4">
							<div className="flex gap-1.5 h-1">
								<div className="flex-1 bg-white/60 rounded-full h-full" />
								<div className="flex-1 bg-white/20 rounded-full h-full" />
							</div>
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-0.5">
									<div className="w-full h-full rounded-full bg-black border-2 border-black flex items-center justify-center text-[10px] font-black text-white">IG</div>
								</div>
								<div>
									<div className="text-xs font-black text-white leading-none mb-0.5">Your Story</div>
									<div className="text-[10px] text-white/60 font-medium">Antigravity Hub</div>
								</div>
							</div>
						</div>
					</div>
					{item.userTags && item.userTags.length > 0 && (
						<div className="absolute inset-0 z-30 pointer-events-none">
							{item.userTags.map((tag, i) => (
								<div key={i} className="absolute px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg flex items-center gap-1.5 text-white text-[11px] font-bold border border-white/20 shadow-xl" style={{ left: `${tag.x * 100}%`, top: `${tag.y * 100}%`, transform: 'translate(-50%, -50%)' }}>
									<span className="opacity-70 font-black">@</span>{tag.username}
								</div>
							))}
						</div>
					)}
				</div>
			) : (
				<div className="relative w-full h-full flex items-center justify-center p-8">
					{item.mediaType === 'VIDEO' ? (
						<video src={item.mediaUrl} controls poster={item.thumbnailUrl} className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl" />
					) : (
						<img src={item.mediaUrl} alt="Original Preview" className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl" />
					)}
				</div>
			)}
			<div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-1 shadow-2xl flex">
				<button onClick={() => onToggleStoryFrame(false)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${!showStoryFrame ? 'bg-white text-black shadow-lg' : 'text-white/60 hover:text-white'}`}>
					<Eye className="inline-block h-4 w-4 mr-2" />Original
				</button>
				<button onClick={() => onToggleStoryFrame(true)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${showStoryFrame ? 'bg-white text-black shadow-lg' : 'text-white/60 hover:text-white'}`}>
					<Share2 className="inline-block h-4 w-4 mr-2" />Story View
				</button>
			</div>
		</div>
	);
}
