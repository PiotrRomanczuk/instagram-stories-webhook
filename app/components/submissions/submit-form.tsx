'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent } from '@/app/components/ui/card';
import { ImageUploader } from '@/app/components/media/image-uploader';
import { VideoUploader } from '@/app/components/media/video-uploader';
import { StoryPreview } from '@/app/components/media/story-preview';
import { VideoPreview } from '@/app/components/media/video-preview';
import { AspectRatioBadge } from '@/app/components/media/aspect-ratio-badge';
import { AspectRatioInfo, MediaDimensions, MediaType, VideoMetadata, VideoValidationResult } from '@/lib/types';

const MAX_CAPTION_LENGTH = 2200;

export function SubmitForm() {
	const router = useRouter();
	const [mediaType, setMediaType] = useState<MediaType>('IMAGE');
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [videoUrl, setVideoUrl] = useState<string | null>(null);
	const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | undefined>(undefined);
	const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
	const [dimensions, setDimensions] = useState<MediaDimensions | null>(null);
	const [storagePath, setStoragePath] = useState<string | null>(null);
	const [aspectInfo, setAspectInfo] = useState<AspectRatioInfo | null>(null);
	const [caption, setCaption] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleImageChange = (url: string | null, dims?: MediaDimensions, path?: string) => {
		setImageUrl(url);
		setDimensions(dims || null);
		setStoragePath(path || null);
	};

	const handleVideoChange = (url: string | null, metadata?: VideoMetadata, path?: string) => {
		setVideoUrl(url);
		setVideoMetadata(metadata);
		setStoragePath(path || null);
		// Note: thumbnailUrl will be generated server-side during validation
	};

	const mediaUrl = mediaType === 'VIDEO' ? videoUrl : imageUrl;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!mediaUrl) {
			toast.error(`Please upload ${mediaType === 'VIDEO' ? 'a video' : 'an image'}`);
			return;
		}

		setIsSubmitting(true);

		try {
			const response = await fetch('/api/content', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					source: 'submission',
					mediaUrl,
					mediaType,
					caption: caption.trim() || undefined,
					dimensions,
					storagePath: storagePath || undefined,
					...(mediaType === 'VIDEO' && videoMetadata ? {
						videoDuration: videoMetadata.duration,
						videoCodec: videoMetadata.codec,
						videoFramerate: videoMetadata.frameRate,
					} : {}),
				}),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to submit');
			}

			toast.success('Submission sent for review!');
			router.push('/submissions');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to submit');
		} finally {
			setIsSubmitting(false);
		}
	};

	const isValid = mediaUrl !== null;
	const captionLength = caption.length;

	const submitButton = (
		<Button type="submit" disabled={!isValid || isSubmitting} size="lg">
			{isSubmitting ? (
				<>
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					Submitting...
				</>
			) : (
				<>
					<Send className="mr-2 h-4 w-4" />
					Submit for Review
				</>
			)}
		</Button>
	);

	return (
		<form onSubmit={handleSubmit} className="space-y-6 pb-24 lg:pb-0">
			<div className="grid gap-6 lg:grid-cols-2">
				{/* Left: Upload & Caption */}
				<div className="space-y-6">
					{/* Media Type Toggle */}
					<div className="flex gap-2">
						<Button
							type="button"
							variant={mediaType === 'IMAGE' ? 'default' : 'outline'}
							size="sm"
							onClick={() => setMediaType('IMAGE')}
							disabled={isSubmitting}
						>
							Image
						</Button>
						<Button
							type="button"
							variant={mediaType === 'VIDEO' ? 'default' : 'outline'}
							size="sm"
							onClick={() => setMediaType('VIDEO')}
							disabled={isSubmitting}
						>
							Video
						</Button>
					</div>

					{/* Media Upload */}
					<div className="space-y-2">
						<Label htmlFor="media">
							<span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">1</span>
							{' '}{mediaType === 'VIDEO' ? 'Video' : 'Image'}
						</Label>
						{mediaType === 'IMAGE' ? (
							<ImageUploader
								value={imageUrl}
								onChange={handleImageChange}
								onAspectRatioChange={setAspectInfo}
								disabled={isSubmitting}
							/>
						) : (
							<VideoUploader
								value={videoUrl}
								onChange={handleVideoChange}
								disabled={isSubmitting}
								autoProcess={true}
								showRequirements={true}
							/>
						)}
					</div>

					{/* Aspect Ratio Info */}
					{aspectInfo && aspectInfo.needsProcessing && (
						<Card className="border-yellow-200 bg-yellow-50">
							<CardContent className="flex items-start gap-3 py-3">
								<AspectRatioBadge aspectInfo={aspectInfo} />
								<p className="text-sm text-yellow-800">{aspectInfo.message}</p>
							</CardContent>
						</Card>
					)}

					{/* Caption */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label htmlFor="caption">
								<span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">2</span>
								{' '}Caption
							</Label>
							<span
								className={`text-xs ${
									captionLength > MAX_CAPTION_LENGTH
										? 'text-destructive'
										: 'text-muted-foreground'
								}`}
							>
								{captionLength}/{MAX_CAPTION_LENGTH}
							</span>
						</div>
						<Textarea
							id="caption"
							placeholder="Add a caption for your story..."
							value={caption}
							onChange={(e) => setCaption(e.target.value)}
							maxLength={MAX_CAPTION_LENGTH}
							rows={4}
							disabled={isSubmitting}
						/>
					</div>

					{/* Mobile Submit Button */}
					<div className="flex justify-end lg:hidden">
						{submitButton}
					</div>

					{/* Mobile Compact Preview */}
					{mediaUrl && (
						<div className="flex items-center gap-3 lg:hidden">
							{mediaType === 'VIDEO' ? (
								<VideoPreview
									videoUrl={videoUrl!}
									duration={videoMetadata?.duration}
								/>
							) : (
								<StoryPreview imageUrl={imageUrl!} compact />
							)}
							<span className="text-xs text-muted-foreground">Preview</span>
						</div>
					)}
				</div>

				{/* Right: Full Preview (desktop only) */}
				<div className="hidden lg:flex justify-center lg:justify-end">
					{mediaType === 'VIDEO' && videoUrl ? (
						<VideoPreview
							videoUrl={videoUrl}
							duration={videoMetadata?.duration}
							resolution={videoMetadata ? { width: videoMetadata.width, height: videoMetadata.height } : undefined}
							codec={videoMetadata?.codec}
							framerate={videoMetadata?.frameRate}
						/>
					) : imageUrl ? (
						<StoryPreview imageUrl={imageUrl} />
					) : null}
				</div>
			</div>

			{/* Desktop Submit Button */}
			<div className="hidden lg:flex justify-end">
				{submitButton}
			</div>
		</form>
	);
}
