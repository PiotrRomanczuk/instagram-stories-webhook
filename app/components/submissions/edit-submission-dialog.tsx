'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { ContentItem } from '@/lib/types';

const MAX_CAPTION_LENGTH = 2200;

interface EditSubmissionDialogProps {
	submission: ContentItem | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (submission: ContentItem, caption: string) => Promise<void>;
}

export function EditSubmissionDialog({
	submission,
	open,
	onOpenChange,
	onSave,
}: EditSubmissionDialogProps) {
	const [caption, setCaption] = useState('');
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		if (submission) {
			setCaption(submission.caption || '');
		}
	}, [submission]);

	const handleSave = async () => {
		if (!submission) return;

		setIsSaving(true);
		try {
			await onSave(submission, caption);
			onOpenChange(false);
			toast.success('Submission updated');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update');
		} finally {
			setIsSaving(false);
		}
	};

	const captionLength = caption.length;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Edit Submission</DialogTitle>
					<DialogDescription>
						Update your submission before it's reviewed.
					</DialogDescription>
				</DialogHeader>

				{submission && (
					<div className="space-y-4">
						{/* Image preview */}
						<div className="overflow-hidden rounded-lg">
							<img
								src={submission.mediaUrl}
								alt="Submission"
								className="max-h-48 w-full object-contain"
							/>
						</div>

						{/* Caption */}
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label htmlFor="edit-caption">Caption</Label>
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
								id="edit-caption"
								placeholder="Add a caption..."
								value={caption}
								onChange={(e) => setCaption(e.target.value)}
								maxLength={MAX_CAPTION_LENGTH}
								rows={4}
								disabled={isSaving}
							/>
						</div>
					</div>
				)}

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isSaving}
					>
						Cancel
					</Button>
					<Button onClick={handleSave} disabled={isSaving}>
						{isSaving ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Saving...
							</>
						) : (
							'Save Changes'
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
