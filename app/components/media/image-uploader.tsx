'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, X, Link as LinkIcon, Loader2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { cn } from '@/lib/utils';
import {
	analyzeAspectRatio,
	getImageDimensionsFromFile,
	getImageDimensionsFromUrl,
} from '@/lib/media/validator';
import { AspectRatioInfo, MediaDimensions } from '@/lib/types';
import { AspectRatioBadge } from './aspect-ratio-badge';
import { supabase } from '@/lib/config/supabase';

interface ImageUploaderProps {
	value: string | null;
	onChange: (url: string | null, dimensions?: MediaDimensions, storagePath?: string) => void;
	onAspectRatioChange?: (info: AspectRatioInfo | null) => void;
	className?: string;
	disabled?: boolean;
}

export function ImageUploader({
	value,
	onChange,
	onAspectRatioChange,
	className,
	disabled,
}: ImageUploaderProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [urlInput, setUrlInput] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [aspectInfo, setAspectInfo] = useState<AspectRatioInfo | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const updateAspectInfo = useCallback(
		(dimensions: MediaDimensions | null) => {
			const info = dimensions ? analyzeAspectRatio(dimensions) : null;
			setAspectInfo(info);
			onAspectRatioChange?.(info);
		},
		[onAspectRatioChange]
	);

	const handleFile = useCallback(
		async (file: File) => {
			if (!file.type.startsWith('image/')) {
				setError('Please upload an image file');
				return;
			}

			if (file.size > 10 * 1024 * 1024) {
				setError('Image must be less than 10MB');
				return;
			}

			setIsLoading(true);
			setError(null);

			try {
				// Get dimensions first
				const dimensions = await getImageDimensionsFromFile(file);
				updateAspectInfo(dimensions);

				// Upload to Supabase storage
				const fileExt = file.name.split('.').pop();
				const fileName = `uploads/memes/${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;

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
				const { data: { publicUrl } } = supabase.storage
					.from('stories')
					.getPublicUrl(fileName);

				onChange(publicUrl, dimensions, fileName);
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to upload image');
				console.error(err);
			} finally {
				setIsLoading(false);
			}
		},
		[onChange, updateAspectInfo]
	);

	const handleUrlSubmit = useCallback(async () => {
		if (!urlInput.trim()) return;

		setIsLoading(true);
		setError(null);

		try {
			const dimensions = await getImageDimensionsFromUrl(urlInput);
			onChange(urlInput, dimensions);
			updateAspectInfo(dimensions);
			setUrlInput('');
		} catch (err) {
			setError('Failed to load image from URL');
			console.error(err);
		} finally {
			setIsLoading(false);
		}
	}, [urlInput, onChange, updateAspectInfo]);

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
		updateAspectInfo(null);
		setError(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	}, [onChange, updateAspectInfo]);

	if (value) {
		return (
			<div className={cn('space-y-2', className)}>
				<div className="relative">
					<img
						src={value}
						alt="Uploaded image"
						className="max-h-64 w-full rounded-lg border object-contain"
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
				<AspectRatioBadge aspectInfo={aspectInfo} />
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
					accept="image/*"
					onChange={handleFileInput}
					className="hidden"
					disabled={disabled}
				/>

				{isLoading ? (
					<Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
				) : (
					<>
						<Upload className="mb-2 h-10 w-10 text-muted-foreground" />
						<p className="text-sm font-medium">Drop image here or click to upload</p>
						<p className="text-xs text-muted-foreground">
							PNG, JPG up to 10MB
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
						placeholder="Or paste image URL..."
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

			{error && (
				<p className="text-sm text-destructive">{error}</p>
			)}
		</div>
	);
}
