'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Check } from 'lucide-react';
import { MemeSubmission } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface MemeEditModalProps {
	isOpen: boolean;
	onClose: () => void;
	meme: MemeSubmission;
	onSave: (updates: {
		title?: string;
		caption?: string;
		version?: number;
	}) => void;
	onCancel?: () => void;
}

export function MemeEditModal({
	isOpen,
	onClose,
	meme,
	onSave,
	onCancel,
}: MemeEditModalProps) {
	const [editTitle, setEditTitle] = useState(meme.title || '');
	const [editCaption, setEditCaption] = useState(meme.caption || '');
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState('');
	const isVideo = meme.media_url.toLowerCase().endsWith('.mp4');

	const handleSave = async () => {
		setError('');

		if (!editTitle && !editCaption) {
			setError('At least title or caption is required');
			return;
		}

		setIsSaving(true);
		try {
			const updates: { title?: string; caption?: string; version?: number } =
				{};
			if (editTitle) updates.title = editTitle;
			if (editCaption) updates.caption = editCaption;

			updates.version = meme.version || 1;

			onSave(updates);
			onClose();
		} catch {
			setError('Failed to save changes');
		} finally {
			setIsSaving(false);
		}
	};

	const handleCancel = () => {
		if (onCancel) {
			onCancel();
		}
		onClose();
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleCancel(); }}>
			<DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader className="bg-gradient-to-r from-indigo-50 to-white -mx-6 -mt-6 px-6 pt-6 pb-4 border-b border-gray-200">
					<DialogTitle>Edit Meme Submission</DialogTitle>
				</DialogHeader>

				<div className='space-y-6 pt-2'>
					{/* Media Preview */}
					<div className='bg-gray-50 rounded-xl p-4 border border-gray-200'>
						<div className='text-xs font-bold text-gray-600 uppercase tracking-wide mb-3'>
							Media Preview
						</div>

						<div className='relative bg-gray-100 rounded-lg overflow-hidden h-48'>
							{isVideo ? (
								<video
									src={meme.media_url}
									className='w-full h-full object-cover'
									controls={false}
								/>
							) : (
								<Image
									src={meme.media_url}
									alt='Meme preview'
									fill
									className='object-cover'
									unoptimized
								/>
							)}
						</div>

						<div className='mt-3'>
							<Badge variant="default" className='bg-black text-white text-[10px] font-bold'>
								{isVideo ? 'VIDEO' : 'IMAGE'}
							</Badge>
						</div>
					</div>

					{/* Edit Fields */}
					<div className='space-y-4'>
						<div>
							<Label className='font-bold text-gray-700 mb-2'>
								Title (Optional)
							</Label>
							<Input
								type='text'
								value={editTitle}
								onChange={(e) => {
									setEditTitle(e.target.value.slice(0, 100));
									setError('');
								}}
								placeholder='Add a title to your meme'
								maxLength={100}
							/>
							<p className='text-[10px] text-gray-400 mt-1 text-right'>
								{editTitle.length}/100
							</p>
						</div>

						<div>
							<Label className='font-bold text-gray-700 mb-2'>
								Caption (Optional)
							</Label>
							<Textarea
								value={editCaption}
								onChange={(e) => {
									setEditCaption(e.target.value.slice(0, 2200));
									setError('');
								}}
								placeholder='Add a description or caption for your meme'
								maxLength={2200}
								rows={3}
							/>
							<p className='text-[10px] text-gray-400 mt-1 text-right'>
								{editCaption.length}/2200
							</p>
						</div>
					</div>

					{error && (
						<Alert variant='destructive'>
							<AlertCircle className='h-4 w-4' />
							<AlertDescription className='font-bold uppercase tracking-tight text-xs'>
								{error}
							</AlertDescription>
						</Alert>
					)}
				</div>

				<DialogFooter className="bg-gray-50 -mx-6 -mb-6 px-6 py-4 border-t border-gray-200">
					<Button
						variant='outline'
						onClick={handleCancel}
					>
						Cancel
					</Button>
					<Button
						onClick={handleSave}
						disabled={isSaving}
					>
						<Check className='w-4 h-4' />
						{isSaving ? 'Saving...' : 'Save Changes'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
