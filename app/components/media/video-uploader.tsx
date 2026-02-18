'use client';

import { useState, useCallback, useRef } from 'react';
import {
	Upload,
	X,
	Link as LinkIcon,
	Loader2,
	Video as VideoIcon,
	CheckCircle2,
	AlertCircle,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Progress } from '@/app/components/ui/progress';
import { cn } from '@/lib/utils';
import { VideoMetadata, VideoValidationResult } from '@/lib/types';
import { uploadToStorage } from '@/lib/storage/upload-client';
import { validateVideoFile } from '@/lib/media/video-validation-client';
import { VideoRequirements } from './video-requirements';
import { VideoProcessingProgress } from './video-processing-progress';
import {
	processVideoInBrowser,
	isFFmpegWasmSupported,
	type ProcessingStep,
} from '@/lib/media/ffmpeg-wasm-processor';

/** Extract a thumbnail frame from a video file at the given time (default 0.5s) */
function extractVideoThumbnail(file: File, timeSeconds = 0.5): Promise<string | null> {
	return new Promise((resolve) => {
		const video = document.createElement('video');
		const objectUrl = URL.createObjectURL(file);
		video.src = objectUrl;
		video.muted = true;
		video.preload = 'metadata';

		const cleanup = () => URL.revokeObjectURL(objectUrl);
		const timeout = setTimeout(() => {
			cleanup();
			resolve(null);
		}, 10_000);

		video.addEventListener('loadedmetadata', () => {
			// Seek to the requested time or 0 if video is shorter
			video.currentTime = Math.min(timeSeconds, video.duration);
		}, { once: true });

		video.addEventListener('seeked', () => {
			clearTimeout(timeout);
			try {
				const canvas = document.createElement('canvas');
				canvas.width = video.videoWidth;
				canvas.height = video.videoHeight;
				const ctx = canvas.getContext('2d');
				if (!ctx) {
					cleanup();
					resolve(null);
					return;
				}
				ctx.drawImage(video, 0, 0);
				const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
				cleanup();
				resolve(dataUrl);
			} catch {
				cleanup();
				resolve(null);
			}
		}, { once: true });

		video.addEventListener('error', () => {
			clearTimeout(timeout);
			cleanup();
			resolve(null);
		}, { once: true });
	});
}

type UploadStage = 'idle' | 'uploading' | 'browser-processing' | 'validating' | 'processing' | 'complete';

const STAGE_LABELS: Record<UploadStage, string> = {
	idle: '',
	uploading: 'Uploading video...',
	'browser-processing': 'Processing video in browser...',
	validating: 'Validating against Instagram requirements...',
	processing: 'Processing video on server...',
	complete: 'Complete!',
};

const STAGE_ORDER: UploadStage[] = ['uploading', 'browser-processing', 'validating', 'processing', 'complete'];

interface VideoUploaderProps {
	value: string | null;
	onChange: (
		url: string | null,
		metadata?: VideoMetadata,
		storagePath?: string,
		thumbnailUrl?: string
	) => void;
	onValidationResult?: (result: VideoValidationResult | null) => void;
	className?: string;
	disabled?: boolean;
	maxSize?: number; // in MB, default 100
	autoProcess?: boolean; // Auto-trigger processing for invalid videos
	/** Show requirements before file selection (default: true) */
	showRequirements?: boolean;
}

export function VideoUploader({
	value,
	onChange,
	onValidationResult,
	className,
	disabled,
	maxSize = 100,
	autoProcess = true,
	showRequirements = true,
}: VideoUploaderProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [stage, setStage] = useState<UploadStage>('idle');
	const [urlInput, setUrlInput] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [errorGuidance, setErrorGuidance] = useState<string | null>(null);
	const [validationResult, setValidationResult] =
		useState<VideoValidationResult | null>(null);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [processingStep, setProcessingStep] = useState<ProcessingStep>('loading');
	const [processingProgress, setProcessingProgress] = useState(0);
	const [processingError, setProcessingError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const pendingFileRef = useRef<File | null>(null);

	const isActive = stage !== 'idle' && stage !== 'complete';

	const setErrorWithGuidance = useCallback(
		(message: string, guidance?: string) => {
			setError(message);
			setErrorGuidance(guidance ?? null);
		},
		[]
	);

	const clearError = useCallback(() => {
		setError(null);
		setErrorGuidance(null);
		setProcessingError(null);
	}, []);

	const validateVideo = useCallback(
		async (url: string): Promise<VideoValidationResult | null> => {
			setStage('validating');
			try {
				const response = await fetch('/api/media/validate-video', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ videoUrl: url }),
				});

				if (!response.ok) {
					throw new Error('Failed to validate video');
				}

				const result: VideoValidationResult = await response.json();
				setValidationResult(result);
				onValidationResult?.(result);
				return result;
			} catch (err) {
				console.error('Video validation error:', err);
				setErrorWithGuidance(
					'Failed to validate video',
					'The server could not analyze your video. Please try again or use a different file.'
				);
				return null;
			}
		},
		[onValidationResult, setErrorWithGuidance]
	);

	/** Server-side processing fallback via Railway API */
	const processVideoOnServer = useCallback(async (url: string) => {
		setStage('processing');
		try {
			const response = await fetch('/api/media/process-video', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ videoUrl: url }),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => null);
				if (response.status === 503 && errorData?.processingUnavailable) {
					throw new Error(
						'Video processing is currently unavailable. Please upload a video that already meets Instagram Stories requirements (1080x1920, H.264, MP4).'
					);
				}
				throw new Error(errorData?.error || 'Failed to process video');
			}

			const result = await response.json();
			return result.processedUrl;
		} catch (err) {
			console.error('Video processing error:', err);
			throw err instanceof Error ? err : new Error('Failed to process video');
		}
	}, []);

	/** Process video in the browser using FFmpeg-wasm, then upload the processed result */
	const processAndUploadInBrowser = useCallback(
		async (file: File): Promise<{ publicUrl: string; storagePath: string; metadata: VideoMetadata }> => {
			setStage('browser-processing');
			setProcessingProgress(0);
			setProcessingStep('loading');
			setProcessingError(null);

			const result = await processVideoInBrowser(
				file,
				(progress) => setProcessingProgress(progress),
				(step) => setProcessingStep(step),
			);

			// Upload the processed blob
			setStage('uploading');
			setUploadProgress(0);

			const processedFile = new File(
				[result.processedBlob],
				'processed-story.mp4',
				{ type: 'video/mp4' },
			);

			const { publicUrl, storagePath } = await uploadToStorage(
				processedFile,
				{ path: 'uploads/videos' },
			);

			setUploadProgress(100);

			const metadata: VideoMetadata = {
				width: result.metadata.width,
				height: result.metadata.height,
				duration: result.metadata.duration,
				codec: result.metadata.codec,
				frameRate: result.metadata.frameRate,
				bitrate: 0,
				hasAudio: result.metadata.hasAudio,
				format: 'mp4',
				fileSize: result.metadata.fileSize,
			};

			return { publicUrl, storagePath, metadata };
		},
		[],
	);

	const handleFile = useCallback(
		async (file: File) => {
			// Client-side validation first
			const clientValidation = validateVideoFile(file, maxSize);
			if (!clientValidation.valid) {
				const firstError = clientValidation.errors[0];
				setErrorWithGuidance(firstError.message, firstError.guidance);
				return;
			}

			clearError();
			pendingFileRef.current = file;

			// Extract thumbnail from original file (runs in parallel with upload/processing)
			const thumbnail = await extractVideoThumbnail(file).catch(() => null);

			// Upload thumbnail to Supabase Storage
			let thumbnailUrl: string | undefined;
			if (thumbnail) {
				try {
					const response = await fetch(thumbnail);
					const blob = await response.blob();
					const thumbnailFile = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' });

					const { publicUrl: thumbUrl } = await uploadToStorage(
						thumbnailFile,
						{ path: 'thumbnails' }
					);

					thumbnailUrl = thumbUrl;
					console.log('[VideoUploader] Thumbnail uploaded:', thumbUrl);
				} catch (err) {
					console.error('[VideoUploader] Thumbnail upload failed:', err);
					// Continue without thumbnail (non-blocking)
				}
			}

			// Try browser-based processing first if supported
			if (autoProcess && isFFmpegWasmSupported()) {
				try {
					const { publicUrl, storagePath, metadata } = await processAndUploadInBrowser(file);
					setStage('complete');
					onChange(publicUrl, metadata, storagePath, thumbnailUrl);
				} catch (browserErr) {
					console.error('Browser processing failed, falling back to server:', browserErr);

					// Fallback: upload raw file, then server-side process
					try {
						setStage('uploading');
						setUploadProgress(0);

						const { publicUrl, storagePath } = await uploadToStorage(
							file,
							{ path: 'uploads/videos' },
						);
						setUploadProgress(100);

						const validation = await validateVideo(publicUrl);

						if (validation && !validation.valid) {
							const processedUrl = await processVideoOnServer(publicUrl);
							setStage('complete');
							onChange(processedUrl, validation.metadata ?? undefined, storagePath, thumbnailUrl);
						} else {
							setStage('complete');
							onChange(publicUrl, validation?.metadata ?? undefined, storagePath, thumbnailUrl);
						}
					} catch (serverErr) {
						setErrorWithGuidance(
							serverErr instanceof Error ? serverErr.message : 'Failed to process video',
							'Both browser and server processing failed. Try a different video file or format.',
						);
					}
				}
			} else {
				// No browser processing: upload raw, validate, process on server
				try {
					setStage('uploading');
					setUploadProgress(0);

					const { publicUrl, storagePath } = await uploadToStorage(
						file,
						{ path: 'uploads/videos' },
					);
					setUploadProgress(100);

					const validation = await validateVideo(publicUrl);

					if (validation && !validation.valid && autoProcess) {
						const processedUrl = await processVideoOnServer(publicUrl);
						setStage('complete');
						onChange(processedUrl, validation.metadata ?? undefined, storagePath, thumbnailUrl);
					} else {
						setStage('complete');
						onChange(publicUrl, validation?.metadata ?? undefined, storagePath, thumbnailUrl);
					}
				} catch (err) {
					setErrorWithGuidance(
						err instanceof Error ? err.message : 'Failed to upload video',
						'Check your connection and try again. If the problem persists, try a smaller file.',
					);
				}
			}

			// Reset stage after a brief delay to show completion
			setTimeout(() => {
				setStage('idle');
				setUploadProgress(0);
				setProcessingProgress(0);
				pendingFileRef.current = null;
			}, 1500);
		},
		[
			maxSize,
			onChange,
			validateVideo,
			autoProcess,
			processVideoOnServer,
			processAndUploadInBrowser,
			clearError,
			setErrorWithGuidance,
		]
	);

	const handleRetryProcessing = useCallback(() => {
		const file = pendingFileRef.current;
		if (file) {
			setProcessingError(null);
			handleFile(file);
		}
	}, [handleFile]);

	const handleUrlSubmit = useCallback(async () => {
		if (!urlInput.trim()) return;

		setStage('validating');
		clearError();

		try {
			// URL uploads always go through server-side processing
			const validation = await validateVideo(urlInput);

			if (validation && !validation.valid && autoProcess) {
				const processedUrl = await processVideoOnServer(urlInput);
				setStage('complete');
				onChange(processedUrl, validation.metadata ?? undefined);
			} else {
				setStage('complete');
				onChange(urlInput, validation?.metadata ?? undefined);
			}

			setUrlInput('');
		} catch (err) {
			setErrorWithGuidance(
				'Failed to load video from URL',
				'Make sure the URL points directly to a video file and is publicly accessible.'
			);
			console.error(err);
		} finally {
			setTimeout(() => {
				setStage('idle');
			}, 1500);
		}
	}, [
		urlInput,
		onChange,
		validateVideo,
		autoProcess,
		processVideoOnServer,
		clearError,
		setErrorWithGuidance,
	]);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setIsDragging(false);

			const file = e.dataTransfer.files[0];
			if (file) {
				handleFile(file);
			}
		},
		[handleFile]
	);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
	}, []);

	const handleFileInput = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file) {
				handleFile(file);
			}
		},
		[handleFile]
	);

	const handleRemove = useCallback(() => {
		onChange(null);
		setValidationResult(null);
		onValidationResult?.(null);
		clearError();
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	}, [onChange, onValidationResult, clearError]);

	if (value) {
		return (
			<div className={cn('space-y-2', className)}>
				<div className="relative">
					<video
						src={value}
						controls
						className="max-h-64 w-full rounded-lg border object-contain bg-black"
					/>
					<Button
						type="button"
						variant="destructive"
						size="icon"
						className="absolute right-2 top-2"
						onClick={handleRemove}
						disabled={disabled}
					>
						<X className="h-4 w-4" />
					</Button>
				</div>

				{/* Validation status */}
				{validationResult && (
					<div className="space-y-2 rounded-lg border p-3 text-sm">
						{validationResult.metadata && (
							<div className="grid grid-cols-2 gap-2 text-xs">
								<div>
									<span className="text-muted-foreground">
										Duration:
									</span>{' '}
									{validationResult.metadata.duration.toFixed(
										1
									)}
									s
								</div>
								<div>
									<span className="text-muted-foreground">
										Resolution:
									</span>{' '}
									{validationResult.metadata.width}x
									{validationResult.metadata.height}
								</div>
								<div>
									<span className="text-muted-foreground">
										Codec:
									</span>{' '}
									{validationResult.metadata.codec}
								</div>
								<div>
									<span className="text-muted-foreground">
										Frame Rate:
									</span>{' '}
									{validationResult.metadata.frameRate.toFixed(
										1
									)}{' '}
									fps
								</div>
							</div>
						)}

						{validationResult.valid ? (
							<p className="text-green-600 font-medium flex items-center gap-1.5">
								<CheckCircle2 className="h-4 w-4" />
								Video is ready for Instagram Stories
							</p>
						) : (
							<div className="space-y-1">
								<p className="text-amber-600 font-medium flex items-center gap-1.5">
									<AlertCircle className="h-4 w-4" />
									Video needs processing
								</p>
								{validationResult.errors.length > 0 && (
									<ul className="list-disc list-inside text-destructive">
										{validationResult.errors.map(
											(err, i) => (
												<li key={i}>{err}</li>
											)
										)}
									</ul>
								)}
								{validationResult.warnings.length > 0 && (
									<ul className="list-disc list-inside text-amber-600">
										{validationResult.warnings.map(
											(warn, i) => (
												<li key={i}>{warn}</li>
											)
										)}
									</ul>
								)}
							</div>
						)}
					</div>
				)}
			</div>
		);
	}

	return (
		<div className={cn('space-y-4', className)}>
			{/* Requirements - shown before file selection */}
			{showRequirements && stage === 'idle' && (
				<VideoRequirements />
			)}

			{/* Drop zone */}
			<div
				className={cn(
					'flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors',
					isDragging
						? 'border-primary bg-primary/5'
						: 'border-muted-foreground/25 hover:border-primary/50',
					disabled && 'cursor-not-allowed opacity-50',
					isActive && 'pointer-events-none'
				)}
				onDrop={handleDrop}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onClick={() =>
					!disabled && !isActive && fileInputRef.current?.click()
				}
			>
				<input
					ref={fileInputRef}
					type="file"
					accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
					onChange={handleFileInput}
					className="hidden"
					disabled={disabled}
				/>

				{stage === 'browser-processing' ? (
					<VideoProcessingProgress
						step={processingStep}
						progress={processingProgress}
						error={processingError}
						onRetry={handleRetryProcessing}
					/>
				) : isActive || stage === 'complete' ? (
					<UploadProgressStepper
						stage={stage}
						uploadProgress={uploadProgress}
					/>
				) : (
					<>
						<Upload className="mb-2 h-10 w-10 text-muted-foreground" />
						<VideoIcon className="mb-2 h-6 w-6 text-muted-foreground" />
						<p className="text-sm font-medium">
							Drop video here or click to upload
						</p>
						<p className="text-xs text-muted-foreground">
							MP4, MOV, WebM up to {maxSize}MB
						</p>
					</>
				)}
			</div>

			{/* URL input */}
			<div className="flex items-center gap-2">
				<div className="relative flex-1">
					<LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						type="url"
						placeholder="Or paste video URL..."
						value={urlInput}
						onChange={(e) => setUrlInput(e.target.value)}
						className="pl-10"
						disabled={disabled || isActive}
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								e.preventDefault();
								handleUrlSubmit();
							}
						}}
					/>
				</div>
				<Button
					type="button"
					variant="secondary"
					onClick={handleUrlSubmit}
					disabled={disabled || isActive || !urlInput.trim()}
				>
					{isActive ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						'Load'
					)}
				</Button>
			</div>

			{/* Error with guidance */}
			{error && (
				<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
					<p className="text-sm font-medium text-destructive flex items-center gap-1.5">
						<AlertCircle className="h-4 w-4 shrink-0" />
						{error}
					</p>
					{errorGuidance && (
						<p className="text-xs text-muted-foreground pl-6">
							{errorGuidance}
						</p>
					)}
				</div>
			)}
		</div>
	);
}

/** Multi-stage progress stepper displayed during upload/validation/processing */
function UploadProgressStepper({
	stage,
	uploadProgress,
}: {
	stage: UploadStage;
	uploadProgress: number;
}) {
	const currentIndex = STAGE_ORDER.indexOf(stage);

	return (
		<div className="flex w-full max-w-xs flex-col items-center gap-4">
			{/* Stage indicator */}
			<div className="flex items-center gap-2">
				{stage === 'complete' ? (
					<CheckCircle2 className="h-6 w-6 text-green-600" />
				) : (
					<Loader2 className="h-6 w-6 animate-spin text-primary" />
				)}
				<p className="text-sm font-medium">{STAGE_LABELS[stage]}</p>
			</div>

			{/* Progress bar for upload stage */}
			{stage === 'uploading' && (
				<Progress value={uploadProgress} className="w-full" />
			)}

			{/* Step dots */}
			<div className="flex items-center gap-1.5">
				{STAGE_ORDER.slice(0, -1).map((s, i) => {
					const isCompleted = i < currentIndex;
					const isCurrent = s === stage;
					return (
						<div
							key={s}
							className={cn(
								'h-2 w-2 rounded-full transition-colors',
								isCompleted && 'bg-green-500',
								isCurrent && 'bg-primary',
								!isCompleted && !isCurrent && 'bg-muted'
							)}
						/>
					);
				})}
			</div>
		</div>
	);
}
