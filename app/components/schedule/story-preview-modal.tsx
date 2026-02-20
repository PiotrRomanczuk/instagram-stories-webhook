'use client';

import {
	X,
	User,
	MessageCircle,
	MoreHorizontal,
	Send,
	Bookmark,
	Heart,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ScheduledPostWithUser } from '@/lib/types';
import { useQuickAspectCheck } from '@/app/hooks/use-media-validation';
import { AspectRatioIndicator } from '../media/aspect-ratio-indicator';
import { UniversalVideoPlayer } from '@/app/components/media/universal-video-player';

interface StoryPreviewModalProps {
	isOpen: boolean;
	onClose: () => void;
	post: ScheduledPostWithUser;
}

export function StoryPreviewModal({
	isOpen,
	onClose,
	post,
}: StoryPreviewModalProps) {
	const [imageDimensions, setImageDimensions] = useState<{
		width: number;
		height: number;
	} | null>(null);
	const { aspectInfo, checkDimensions } = useQuickAspectCheck();

	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = 'hidden';
			if (post.type === 'IMAGE') {
				const img = new window.Image();
				img.onload = () => {
					setImageDimensions({
						width: img.naturalWidth,
						height: img.naturalHeight,
					});
					checkDimensions(img.naturalWidth, img.naturalHeight);
				};
				img.src = post.url;
			}
		} else {
			document.body.style.overflow = 'unset';
		}
		return () => {
			document.body.style.overflow = 'unset';
		};
	}, [isOpen, post.url, post.type, checkDimensions]);

	if (!isOpen) return null;

	// Calculate aspect ratio styling
	const isImage = post.type === 'IMAGE';
	const isVideo = post.type === 'VIDEO';

	// Default to object-cover which is what Instagram usually does if it's "close",
	// but if it's very different it letterboxes.
	// For our preview, we'll show it centered.

	return (
		<div className='fixed inset-0 z-[110] flex items-center justify-center p-0 md:p-8 animate-in fade-in duration-300'>
			{/* Backdrop */}
			<div
				className='absolute inset-0 bg-slate-950/95 backdrop-blur-md cursor-zoom-out'
				onClick={onClose}
			/>

			{/* Close Button - Mobile */}
			<button
				onClick={onClose}
				className='absolute top-4 right-4 z-[120] p-2 bg-white/10 hover:bg-white/20 rounded-full text-white md:hidden'
			>
				<X className='w-6 h-6' />
			</button>

			{/* Content Container */}
			<div className='relative w-full h-full md:h-auto md:max-w-md aspect-[9/16] flex flex-col items-center justify-center animate-in zoom-in-95 duration-300 shadow-2xl'>
				{/* Phone Mockup Frame */}
				<div className='relative w-full h-full md:rounded-[3rem] overflow-hidden bg-black shadow-2xl border-[8px] border-slate-900 md:border-[12px]'>
					{/* Media Content */}
					<div className='relative w-full h-full flex items-center justify-center bg-zinc-900'>
						{isVideo ? (
							<UniversalVideoPlayer
								url={post.url}
								controls
								playing
								loop
								muted
								contain
							/>
						) : (
							<div className='relative w-full h-full'>
								<Image
									src={post.url}
									alt='Story Preview'
									fill
									className='object-contain' // Show true aspect ratio with letterboxing
									unoptimized
								/>
								{/* Background blur for letterboxed images (mimicking what we might do or what IG might do) */}
								<div
									className='absolute inset-0 -z-10 opacity-30 blur-2xl scale-110'
									style={{
										backgroundImage: `url(${post.url})`,
										backgroundSize: 'cover',
										backgroundPosition: 'center',
									}}
								/>
							</div>
						)}

						{/* Top Gradient Overlay */}
						<div className='absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/40 to-transparent pointer-events-none' />

						{/* Bottom Gradient Overlay */}
						<div className='absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/60 to-transparent pointer-events-none' />

						{/* UI Elements - Progress Bar */}
						<div className='absolute top-4 left-4 right-4 h-[2px] bg-white/30 rounded-full overflow-hidden flex gap-1'>
							<div className='h-full flex-1 bg-white rounded-full' />
							<div className='h-full flex-1 bg-white/50 rounded-full' />
							<div className='h-full flex-1 bg-white/50 rounded-full' />
						</div>

						{/* UI Elements - Profile Info */}
						<div className='absolute top-8 left-4 right-4 flex items-center justify-between'>
							<div className='flex items-center gap-2'>
								<div className='w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[1.5px]'>
									<div className='w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden border border-black'>
										<User className='w-4 h-4 text-white' />
									</div>
								</div>
								<div className='flex flex-col'>
									<span className='text-white text-[13px] font-bold shadow-sm'>
										your_account
									</span>
									<span className='text-white/80 text-[11px] font-medium'>
										Sponsored
									</span>
								</div>
								<span className='text-white/60 text-[11px] font-bold ml-1'>
									• 12h
								</span>
							</div>
							<MoreHorizontal className='w-5 h-5 text-white' />
						</div>

						{/* User Tags Overlay */}
						{post.userTags && post.userTags.length > 0 && (
							<div className='absolute bottom-32 left-4 z-20'>
								<div className='flex flex-col gap-2'>
									{post.userTags.map((tag: { username: string }, i: number) => (
										<div
											key={i}
											className='inline-flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20'
										>
											<div className='w-4 h-4 rounded-full bg-white/20 flex items-center justify-center'>
												<User className='w-2 h-2 text-white' />
											</div>
											<span className='text-white text-[11px] font-bold'>
												@{tag.username}
											</span>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Caption at the bottom */}
						<div className='absolute bottom-20 left-4 right-4 space-y-2'>
							{post.caption && (
								<p className='text-white text-sm font-medium drop-shadow-md line-clamp-2'>
									{post.caption}
								</p>
							)}
						</div>

						{/* Bottom Interaction Bar */}
						<div className='absolute bottom-6 left-4 right-4 flex items-center gap-4'>
							<div className='flex-1 bg-transparent border border-white/40 rounded-full px-4 py-2.5 flex items-center'>
								<span className='text-white/70 text-sm'>Send message</span>
							</div>
							<Heart className='w-6 h-6 text-white' />
							<Send className='w-6 h-6 text-white -rotate-12' />
						</div>
					</div>

					{/* Sensor / Speaker Bar Mockup */}
					<div className='absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-900 rounded-b-2xl z-50 md:block hidden' />
				</div>

				{/* Info Text below modal */}
				<div className='absolute -bottom-24 left-0 right-0 flex flex-col items-center gap-2 hidden md:flex'>
					<div className='bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10'>
						<AspectRatioIndicator
							aspectInfo={aspectInfo}
							dimensions={imageDimensions}
							compact
						/>
					</div>
					<div className='text-center'>
						<p className='text-white/80 text-sm font-bold'>
							Instagram Story Preview
						</p>
						<p className='text-white/40 text-[10px] uppercase tracking-widest'>
							Mockup visualization
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
