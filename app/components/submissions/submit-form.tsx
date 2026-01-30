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
import { StoryPreview } from '@/app/components/media/story-preview';
import { AspectRatioBadge } from '@/app/components/media/aspect-ratio-badge';
import { AspectRatioInfo, MediaDimensions } from '@/lib/types';

const MAX_CAPTION_LENGTH = 2200;

export function SubmitForm() {
	const router = useRouter();
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [dimensions, setDimensions] = useState<MediaDimensions | null>(null);
	const [aspectInfo, setAspectInfo] = useState<AspectRatioInfo | null>(null);
	const [caption, setCaption] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleImageChange = (url: string | null, dims?: MediaDimensions) => {
		setImageUrl(url);
		setDimensions(dims || null);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!imageUrl) {
			toast.error('Please upload an image');
			return;
		}

		setIsSubmitting(true);

		try {
			const response = await fetch('/api/content', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					source: 'submission',
					mediaUrl: imageUrl,
					mediaType: 'IMAGE',
					caption: caption.trim() || undefined,
					dimensions,
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

	const isValid = imageUrl !== null;
	const captionLength = caption.length;

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<div className="grid gap-6 lg:grid-cols-2">
				{/* Left: Upload & Caption */}
				<div className="space-y-6">
					{/* Image Upload */}
					<div className="space-y-2">
						<Label htmlFor="image">Image</Label>
						<ImageUploader
							value={imageUrl}
							onChange={handleImageChange}
							onAspectRatioChange={setAspectInfo}
							disabled={isSubmitting}
						/>
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
							<Label htmlFor="caption">Caption</Label>
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
				</div>

				{/* Right: Preview */}
				<div className="flex justify-center lg:justify-end">
					<StoryPreview imageUrl={imageUrl} />
				</div>
			</div>

			{/* Submit Button */}
			<div className="flex justify-end">
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
			</div>
		</form>
	);
}
