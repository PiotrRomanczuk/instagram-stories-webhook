'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, X, Link as LinkIcon, Loader2, Video as VideoIcon } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { cn } from '@/lib/utils';
import { VideoMetadata, VideoValidationResult } from '@/lib/types';
import { supabase } from '@/lib/config/supabase';

interface VideoUploaderProps {
	value: string | null;
	onChange: (
		url: string | null,
		metadata?: VideoMetadata,
		storagePath?: string
	) => void;
	onValidationResult?: (result: VideoValidationResult | null) => void;
	className?: string;
	disabled?: boolean;
	maxSize?: number; // in MB, default 100
	autoProcess?: boolean; // Auto-trigger processing for invalid videos
}

export function VideoUploader({
	value,
	onChange,
	onValidationResult,
	className,
	disabled,
	maxSize = 100,
	autoProcess = false,
}: VideoUploaderProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [isValidating, setIsValidating] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [urlInput, setUrlInput] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [validationResult, setValidationResult] =
		useState<VideoValidationResult | null>(null);
	const [uploadProgress, setUploadProgress] = useState(0);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const validateVideo = useCallback(
		async (url: string): Promise<VideoValidationResult | null> => {
			setIsValidating(true);
			try {
				const response = await fetch('/api/media/validate-video', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ url }),
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
				setError('Failed to validate video');
				return null;
			} finally {
				setIsValidating(false);
			}
		},
		[onValidationResult]
	);

	const processVideo = useCallback(async (url: string) => {
		setIsProcessing(true);
		try {
			const response = await fetch('/api/media/process-video', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url }),
			});

			if (!response.ok) {
				throw new Error('Failed to process video');
			}

			const result = await response.json();
			return result.processedUrl;
		} catch (err) {
			console.error('Video processing error:', err);
			throw new Error('Failed to process video');
		} finally {
			setIsProcessing(false);
		}
	}, []);

	const handleFile = useCallback(
		async (file: File) => {
			if (!file.type.startsWith('video/')) {
				setError('Please upload a video file');
				return;
			}

			const maxSizeBytes = maxSize * 1024 * 1024;
			if (file.size > maxSizeBytes) {
				setError(`Video must be less than ${maxSize}MB`);
				return;
			}

			setIsLoading(true);
			setError(null);
			setUploadProgress(0);

			try {
				// Upload to Supabase storage
				const fileExt = file.name.split('.').pop() || 'mp4';
				const fileName = `uploads/videos/${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;

				const { error: uploadError } = await supabase.storage
					.from('stories')
					.upload(fileName, file, {
						cacheControl: '3600',
						upsert: false,
					});

				if (uploadError) {
					throw new Error(uploadError.message);
				}

				// Get public URL
				const {
					data: { publicUrl },
				} = supabase.storage.from('stories').getPublicUrl(fileName);

				setUploadProgress(100);

				// Validate video
				const validation = await validateVideo(publicUrl);

				if (validation && !validation.valid && autoProcess) {
					// Auto-process if enabled and video needs processing
					const processedUrl = await processVideo(publicUrl);
					onChange(processedUrl, validation.metadata ?? undefined, fileName);
				} else {
					// Use original URL
					onChange(publicUrl, validation?.metadata ?? undefined, fileName);
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to upload video');
				console.error(err);
			} finally {
				setIsLoading(false);
				setUploadProgress(0);
			}
		},
		[maxSize, onChange, validateVideo, autoProcess, processVideo]
	);

	const handleUrlSubmit = useCallback(async () => {
		if (!urlInput.trim()) return;

		setIsLoading(true);
		setError(null);

		try {
			// Validate video from URL
			const validation = await validateVideo(urlInput);

			if (validation && !validation.valid && autoProcess) {
				// Auto-process if enabled and video needs processing
				const processedUrl = await processVideo(urlInput);
				onChange(processedUrl, validation.metadata ?? undefined);
			} else {
				// Use original URL
				onChange(urlInput, validation?.metadata ?? undefined);
			}

			setUrlInput('');
		} catch (err) {
			setError('Failed to load video from URL');
			console.error(err);
		} finally {
			setIsLoading(false);
		}
	}, [urlInput, onChange, validateVideo, autoProcess, processVideo]);

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
		setError(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	}, [onChange, onValidationResult]);

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
									<span className="text-muted-foreground">Duration:</span>{' '}
									{validationResult.metadata.duration.toFixed(1)}s
								</div>
								<div>
									<span className="text-muted-foreground">Resolution:</span>{' '}
									{validationResult.metadata.width}x
									{validationResult.metadata.height}
								</div>
								<div>
									<span className="text-muted-foreground">Codec:</span>{' '}
									{validationResult.metadata.codec}
								</div>
								<div>
									<span className="text-muted-foreground">Frame Rate:</span>{' '}
									{validationResult.metadata.frameRate.toFixed(1)} fps
								</div>
							</div>
						)}

						{validationResult.valid ? (
							<p className="text-green-600 font-medium">✓ Video is ready for Instagram Stories</p>
						) : (
							<div className="space-y-1">
								<p className="text-amber-600 font-medium">⚠ Video needs processing</p>
								{validationResult.errors.length > 0 && (
									<ul className="list-disc list-inside text-destructive">
										{validationResult.errors.map((err, i) => (
											<li key={i}>{err}</li>
										))}
									</ul>
								)}
								{validationResult.warnings.length > 0 && (
									<ul className="list-disc list-inside text-amber-600">
										{validationResult.warnings.map((warn, i) => (
											<li key={i}>{warn}</li>
										))}
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
			{/* Drop zone */}
			<div
				className={cn(
					'flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors',
					isDragging
						? 'border-primary bg-primary/5'
						: 'border-muted-foreground/25 hover:border-primary/50',
					disabled && 'cursor-not-allowed opacity-50'
				)}
				onDrop={handleDrop}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onClick={() => !disabled && fileInputRef.current?.click()}
			>
				<input
					ref={fileInputRef}
					type="file"
					accept="video/*"
					onChange={handleFileInput}
					className="hidden"
					disabled={disabled}
				/>

				{isLoading || isValidating || isProcessing ? (
					<div className="flex flex-col items-center gap-2">
						<Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
						<p className="text-sm font-medium">
							{isProcessing
								? 'Processing video...'
								: isValidating
									? 'Validating video...'
									: 'Uploading...'}
						</p>
						{uploadProgress > 0 && uploadProgress < 100 && (
							<div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
								<div
									className="h-full bg-primary transition-all duration-300"
									style={{ width: `${uploadProgress}%` }}
								/>
							</div>
						)}
					</div>
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
						disabled={disabled || isLoading}
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
					disabled={disabled || isLoading || !urlInput.trim()}
				>
					{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load'}
				</Button>
			</div>

			{error && <p className="text-sm text-destructive">{error}</p>}
		</div>
	);
}
