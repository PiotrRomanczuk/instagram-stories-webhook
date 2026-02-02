'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Smartphone, Play } from 'lucide-react';

interface SfPhoneFrameProps {
	imageUrl?: string | null;
	videoUrl?: string | null;
	isVideo?: boolean;
	alt?: string;
	size?: 'sm' | 'md' | 'lg';
	showTimeIndicator?: boolean;
	username?: string;
	userAvatar?: string | null;
	className?: string;
	onPlayClick?: () => void;
}

const sizeConfig = {
	sm: { width: 180, height: 340, notch: 'h-3 w-12', homeBar: 'h-0.5 w-14' },
	md: { width: 240, height: 454, notch: 'h-4 w-16', homeBar: 'h-1 w-20' },
	lg: { width: 300, height: 568, notch: 'h-5 w-20', homeBar: 'h-1 w-24' },
};

/** iPhone mockup for story preview with 9:19 aspect ratio */
export function SfPhoneFrame({
	imageUrl, videoUrl, isVideo = false, alt = 'Story preview', size = 'md',
	showTimeIndicator = false, username, userAvatar, className, onPlayClick,
}: SfPhoneFrameProps) {
	const config = sizeConfig[size];
	const mediaUrl = videoUrl || imageUrl;

	return (
		<div className={cn('flex flex-col items-center gap-2', className)}>
			<div
				className="relative rounded-[2rem] p-2 border-4 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-[var(--sf-border-dark)] shadow-xl"
				style={{ width: config.width + 16 }}
			>
				{/* Dynamic Island */}
				<div className={cn('absolute left-1/2 top-2.5 -translate-x-1/2 rounded-full bg-slate-300 dark:bg-slate-700', config.notch)} />

				{/* Screen */}
				<div className="relative overflow-hidden rounded-[1.5rem] bg-black" style={{ width: config.width, height: config.height }}>
					{showTimeIndicator && (
						<div className="absolute left-3 right-3 top-3 z-10 flex gap-1">
							<div className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
								<div className="h-full w-1/3 rounded-full bg-white" />
							</div>
						</div>
					)}

					{username && (
						<div className="absolute left-3 right-3 top-8 z-10 flex items-center gap-2">
							{userAvatar ? (
								<img src={userAvatar} alt={username} className="h-8 w-8 rounded-full border-2 border-white object-cover" />
							) : (
								<div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-600 text-xs font-medium text-white">
									{username.slice(0, 2).toUpperCase()}
								</div>
							)}
							<span className="text-sm font-semibold text-white drop-shadow-lg">{username}</span>
						</div>
					)}

					{mediaUrl ? (
						<div className="relative h-full w-full">
							<img src={isVideo && imageUrl ? imageUrl : mediaUrl} alt={alt} className="h-full w-full object-cover" />
							{isVideo && (
								<button
									type="button"
									onClick={onPlayClick}
									className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors hover:bg-black/30"
								>
									<div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg">
										<Play className="h-6 w-6 text-slate-900 ml-1" fill="currentColor" />
									</div>
								</button>
							)}
						</div>
					) : (
						<div className="flex h-full w-full flex-col items-center justify-center gap-3 text-slate-500">
							<Smartphone className="h-12 w-12" />
							<span className="text-sm font-medium">Story Preview</span>
						</div>
					)}
				</div>

				{/* Home bar */}
				<div className={cn('absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-slate-300 dark:bg-slate-600', config.homeBar)} />
			</div>
			<span className="text-xs font-medium text-[var(--sf-text-secondary)]">9:19 Preview</span>
		</div>
	);
}

interface SfPhoneFrameGridProps {
	children: React.ReactNode;
	className?: string;
}

/** Grid layout for multiple phone frames */
export function SfPhoneFrameGrid({ children, className }: SfPhoneFrameGridProps) {
	return (
		<div className={cn('grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5', className)}>
			{children}
		</div>
	);
}
