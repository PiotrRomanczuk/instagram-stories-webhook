'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Loader2, Check } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/lib/utils';
import { uploadToStorage } from '@/lib/storage/upload-client';

interface VideoThumbnailSelectorProps {
	videoUrl: string;
	contentId?: string; // Optional content ID for naming thumbnail
	onThumbnailSelect: (thumbnailUrl: string) => void;
	className?: string;
	disabled?: boolean;
}

interface ThumbnailFrame {
	timestamp: number;
	percentage: number;
	dataUrl: string;
}

export function VideoThumbnailSelector({
	videoUrl,
	contentId,
	onThumbnailSelect,
	className,
	disabled,
}: VideoThumbnailSelectorProps) {
	const [isLoading, setIsLoading] = useState(true);
	const [isUploading, setIsUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [frames, setFrames] = useState<ThumbnailFrame[]>([]);
	const [selectedFrame, setSelectedFrame] = useState<ThumbnailFrame | null>(
		null
	);
	const [currentTime, setCurrentTime] = useState(0);
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	// Extract frame at specific timestamp
	const captureFrameAtTime = useCallback(
		async (timestamp: number): Promise<string | null> => {
			const video = videoRef.current;
			const canvas = canvasRef.current;

			if (!video || !canvas) return null;

			return new Promise((resolve) => {
				video.currentTime = timestamp;

				const handleSeeked = () => {
					try {
						// Set canvas dimensions to video dimensions
						canvas.width = video.videoWidth;
						canvas.height = video.videoHeight;

						// Draw current frame to canvas
						const ctx = canvas.getContext('2d');
						if (ctx) {
							ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
							const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
							resolve(dataUrl);
						} else {
							resolve(null);
						}
					} catch (err) {
						console.error('Error capturing frame:', err);
						resolve(null);
					}

					video.removeEventListener('seeked', handleSeeked);
				};

				video.addEventListener('seeked', handleSeeked);
			});
		},
		[]
	);

	// Extract frames at different timestamps
	const extractFrames = useCallback(async () => {
		const video = videoRef.current;
		if (!video) return;

		setIsLoading(true);
		setError(null);

		try {
			const duration = video.duration;
			const percentages = [0, 20, 40, 60, 80, 100];
			const extractedFrames: ThumbnailFrame[] = [];

			for (const percentage of percentages) {
				const timestamp = (duration * percentage) / 100;
				const dataUrl = await captureFrameAtTime(timestamp);

				if (dataUrl) {
					extractedFrames.push({
						timestamp,
						percentage,
						dataUrl,
					});
				}
			}

			setFrames(extractedFrames);

			// Auto-select middle frame (50% or closest)
			const middleFrame =
				extractedFrames.find((f) => f.percentage === 60) ||
				extractedFrames[Math.floor(extractedFrames.length / 2)];
			setSelectedFrame(middleFrame || null);
		} catch (err) {
			console.error('Error extracting frames:', err);
			setError('Failed to extract video frames');
		} finally {
			setIsLoading(false);
		}
	}, [captureFrameAtTime]);

	// Handle video loaded
	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;

		const handleLoadedMetadata = () => {
			extractFrames();
		};

		video.addEventListener('loadedmetadata', handleLoadedMetadata);

		return () => {
			video.removeEventListener('loadedmetadata', handleLoadedMetadata);
		};
	}, [extractFrames]);

	// Capture current frame from video player
	const handleCaptureCurrentFrame = useCallback(async () => {
		const video = videoRef.current;
		if (!video) return;

		const dataUrl = await captureFrameAtTime(video.currentTime);

		if (dataUrl) {
			const newFrame: ThumbnailFrame = {
				timestamp: video.currentTime,
				percentage: (video.currentTime / video.duration) * 100,
				dataUrl,
			};

			setSelectedFrame(newFrame);
		}
	}, [captureFrameAtTime]);

	// Upload selected frame to Supabase
	const handleConfirmSelection = useCallback(async () => {
		if (!selectedFrame) return;

		setIsUploading(true);
		setError(null);

		try {
			// Convert data URL to blob
			const response = await fetch(selectedFrame.dataUrl);
			const blob = await response.blob();

			// Upload via authenticated API proxy
			const { publicUrl } = await uploadToStorage(blob, {
				path: 'thumbnails',
				upsert: true,
			});

			onThumbnailSelect(publicUrl);
		} catch (err) {
			console.error('Error uploading thumbnail:', err);
			setError(
				err instanceof Error ? err.message : 'Failed to upload thumbnail'
			);
		} finally {
			setIsUploading(false);
		}
	}, [selectedFrame, contentId, onThumbnailSelect]);

	return (
		<div className={cn('space-y-4', className)}>
			{/* Video player with scrubber */}
			<div className="space-y-2">
				<label className="text-sm font-medium">Select Thumbnail</label>
				<p className="text-xs text-muted-foreground">
					Choose a frame from the suggestions below or scrub the video to capture
					a custom frame
				</p>

				<div className="relative rounded-lg border overflow-hidden bg-black">
					<video
						ref={videoRef}
						src={videoUrl}
						controls
						className="w-full max-h-64 object-contain"
						onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
					/>
				</div>

				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={handleCaptureCurrentFrame}
					disabled={disabled || isLoading}
					className="w-full"
				>
					Capture Current Frame ({currentTime.toFixed(1)}s)
				</Button>
			</div>

			{/* Hidden canvas for frame extraction */}
			<canvas ref={canvasRef} className="hidden" />

			{/* Frame grid */}
			{isLoading ? (
				<div className="flex items-center justify-center py-8">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			) : frames.length > 0 ? (
				<div>
					<label className="text-sm font-medium">Suggested Frames</label>
					<div className="grid grid-cols-3 gap-2 mt-2">
						{frames.map((frame) => (
							<button
								key={frame.percentage}
								type="button"
								onClick={() => setSelectedFrame(frame)}
								disabled={disabled}
								className={cn(
									'relative aspect-video rounded-lg border-2 overflow-hidden transition-all',
									selectedFrame?.percentage === frame.percentage
										? 'border-primary ring-2 ring-primary/20'
										: 'border-transparent hover:border-primary/50'
								)}
							>
								<img
									src={frame.dataUrl}
									alt={`Frame at ${frame.percentage}%`}
									className="w-full h-full object-cover"
								/>

								{selectedFrame?.percentage === frame.percentage && (
									<div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
										<div className="bg-primary text-primary-foreground rounded-full p-1">
											<Check className="h-4 w-4" />
										</div>
									</div>
								)}

								<div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1">
									{frame.percentage}% ({frame.timestamp.toFixed(1)}s)
								</div>
							</button>
						))}
					</div>
				</div>
			) : null}

			{/* Confirm button */}
			{selectedFrame && (
				<Button
					type="button"
					onClick={handleConfirmSelection}
					disabled={disabled || isUploading}
					className="w-full"
				>
					{isUploading ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							Uploading Thumbnail...
						</>
					) : (
						'Confirm Thumbnail Selection'
					)}
				</Button>
			)}

			{error && <p className="text-sm text-destructive">{error}</p>}
		</div>
	);
}
