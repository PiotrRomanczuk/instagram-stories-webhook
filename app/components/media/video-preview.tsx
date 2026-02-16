'use client';

import { useState, useRef, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Smartphone, Video, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';

type ValidationStatus = 'valid' | 'warning' | 'error';

export interface VideoPreviewProps {
	videoUrl: string;
	thumbnailUrl?: string;
	duration?: number;
	resolution?: { width: number; height: number };
	codec?: string;
	framerate?: number;
	validationStatus?: ValidationStatus;
	className?: string;
	compact?: boolean;
}

function formatDuration(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const validationConfig: Record<ValidationStatus, { icon: typeof CheckCircle; label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
	valid: { icon: CheckCircle, label: 'Ready', variant: 'default' },
	warning: { icon: AlertTriangle, label: 'Needs Processing', variant: 'secondary' },
	error: { icon: AlertCircle, label: 'Invalid', variant: 'destructive' },
};

export function VideoPreview({
	videoUrl,
	thumbnailUrl,
	duration,
	resolution,
	codec,
	framerate,
	validationStatus,
	className,
	compact,
}: VideoPreviewProps) {
	const [isPlaying, setIsPlaying] = useState(false);
	const [isMuted, setIsMuted] = useState(true);
	const [showControls, setShowControls] = useState(true);
	const videoRef = useRef<HTMLVideoElement>(null);
	const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const handlePlayPause = useCallback(() => {
		const video = videoRef.current;
		if (!video) return;

		if (isPlaying) {
			video.pause();
			setIsPlaying(false);
			setShowControls(true);
		} else {
			video.play();
			setIsPlaying(true);
			if (controlsTimeoutRef.current) {
				clearTimeout(controlsTimeoutRef.current);
			}
			controlsTimeoutRef.current = setTimeout(() => {
				setShowControls(false);
			}, 3000);
		}
	}, [isPlaying]);

	const handleMuteToggle = useCallback((e: React.MouseEvent) => {
		e.stopPropagation();
		const video = videoRef.current;
		if (!video) return;

		video.muted = !isMuted;
		setIsMuted(!isMuted);
	}, [isMuted]);

	const handleScreenTap = useCallback(() => {
		setShowControls(true);
		if (controlsTimeoutRef.current) {
			clearTimeout(controlsTimeoutRef.current);
		}
		if (isPlaying) {
			controlsTimeoutRef.current = setTimeout(() => {
				setShowControls(false);
			}, 3000);
		}
	}, [isPlaying]);

	const handleVideoEnded = useCallback(() => {
		setIsPlaying(false);
		setShowControls(true);
	}, []);

	if (compact) {
		return (
			<div className={cn('inline-block', className)}>
				<div
					className="relative overflow-hidden rounded-lg bg-black"
					style={{ width: 80, height: 142 }}
				>
					{thumbnailUrl ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={thumbnailUrl}
							alt="Video preview"
							className="h-full w-full object-cover"
						/>
					) : (
						<div className="flex h-full w-full items-center justify-center text-muted-foreground">
							<Smartphone className="h-6 w-6" />
						</div>
					)}

					{/* Play icon overlay */}
					<div className="absolute inset-0 flex items-center justify-center">
						<div className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
							<Play className="h-3.5 w-3.5 text-white ml-0.5" fill="white" />
						</div>
					</div>

					{/* Duration badge */}
					{duration != null && (
						<div className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[9px] font-bold text-white">
							{formatDuration(duration)}
						</div>
					)}

					{/* Validation dot */}
					{validationStatus && (
						<div className="absolute top-1 left-1">
							<div className={cn(
								'h-2 w-2 rounded-full',
								validationStatus === 'valid' && 'bg-emerald-500',
								validationStatus === 'warning' && 'bg-amber-500',
								validationStatus === 'error' && 'bg-red-500',
							)} />
						</div>
					)}
				</div>
			</div>
		);
	}

	// Story dimensions in 9:16 ratio
	const frameWidth = 270;
	const frameHeight = 480;

	const validationInfo = validationStatus ? validationConfig[validationStatus] : null;
	const ValidationIcon = validationInfo?.icon;

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
				<div className="absolute left-1/2 top-2 z-20 h-5 w-20 -translate-x-1/2 rounded-full bg-foreground/20" />

				{/* Screen */}
				<div
					className="relative overflow-hidden rounded-[1.5rem] bg-black"
					style={{ width: frameWidth, height: frameHeight }}
					onClick={handleScreenTap}
				>
					{/* Video element (hidden behind thumbnail until playing) */}
					<video
						ref={videoRef}
						src={videoUrl}
						muted={isMuted}
						playsInline
						preload="metadata"
						className={cn(
							'absolute inset-0 h-full w-full object-contain',
							!isPlaying && thumbnailUrl && 'opacity-0',
						)}
						onEnded={handleVideoEnded}
					/>

					{/* Thumbnail overlay (visible when not playing) */}
					{!isPlaying && thumbnailUrl && (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={thumbnailUrl}
							alt="Video thumbnail"
							className="absolute inset-0 h-full w-full object-contain"
							style={{ backgroundColor: '#000' }}
						/>
					)}

					{/* Placeholder when no thumbnail and not playing */}
					{!isPlaying && !thumbnailUrl && !videoUrl && (
						<div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
							<Smartphone className="h-12 w-12" />
							<span className="text-sm">Video Preview</span>
						</div>
					)}

					{/* Gradient overlays */}
					<div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/40 to-transparent" />
					<div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />

					{/* Duration badge (top right) */}
					{duration != null && (
						<div className="absolute right-3 top-8 z-10">
							<Badge variant="secondary" className="bg-black/60 text-white backdrop-blur-sm border-0 gap-1">
								<Video className="h-3 w-3" />
								{formatDuration(duration)}
							</Badge>
						</div>
					)}

					{/* Validation badge (top left) */}
					{validationInfo && ValidationIcon && (
						<div className="absolute left-3 top-8 z-10">
							<Badge variant={validationInfo.variant} className="gap-1 backdrop-blur-sm">
								<ValidationIcon className="h-3 w-3" />
								{validationInfo.label}
							</Badge>
						</div>
					)}

					{/* Play/Pause controls */}
					<AnimatePresence>
						{showControls && (
							<motion.div
								className="absolute inset-0 z-10 flex items-center justify-center"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								transition={{ duration: 0.2 }}
							>
								<motion.button
									type="button"
									onClick={handlePlayPause}
									className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm transition-colors hover:bg-black/70"
									whileTap={{ scale: 0.9 }}
									aria-label={isPlaying ? 'Pause video' : 'Play video'}
								>
									{isPlaying ? (
										<Pause className="h-7 w-7 text-white" fill="white" />
									) : (
										<Play className="h-7 w-7 text-white ml-1" fill="white" />
									)}
								</motion.button>
							</motion.div>
						)}
					</AnimatePresence>

					{/* Bottom controls (mute toggle) */}
					<AnimatePresence>
						{showControls && isPlaying && (
							<motion.div
								className="absolute bottom-4 right-3 z-10"
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: 8 }}
								transition={{ duration: 0.2 }}
							>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									onClick={handleMuteToggle}
									className="h-8 w-8 rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 hover:text-white"
									aria-label={isMuted ? 'Unmute video' : 'Mute video'}
								>
									{isMuted ? (
										<VolumeX className="h-4 w-4" />
									) : (
										<Volume2 className="h-4 w-4" />
									)}
								</Button>
							</motion.div>
						)}
					</AnimatePresence>
				</div>

				{/* Home bar */}
				<div className="absolute bottom-3 left-1/2 h-1 w-24 -translate-x-1/2 rounded-full bg-foreground/20" />
			</div>

			{/* Label */}
			<span className="text-xs text-muted-foreground">9:16 Video Preview</span>

			{/* Metadata display */}
			{(resolution || codec || framerate) && (
				<div className="flex flex-wrap items-center justify-center gap-1.5">
					{resolution && (
						<Badge variant="outline" className="text-[10px]">
							{resolution.width}x{resolution.height}
						</Badge>
					)}
					{codec && (
						<Badge variant="outline" className="text-[10px]">
							{codec}
						</Badge>
					)}
					{framerate && (
						<Badge variant="outline" className="text-[10px]">
							{framerate}fps
						</Badge>
					)}
				</div>
			)}
		</div>
	);
}
