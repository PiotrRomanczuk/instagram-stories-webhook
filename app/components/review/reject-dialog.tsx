'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
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

interface RejectDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: (reason: string) => Promise<void>;
	itemTitle?: string;
}

export function RejectDialog({
	open,
	onOpenChange,
	onConfirm,
	itemTitle,
}: RejectDialogProps) {
	const [reason, setReason] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleConfirm = async () => {


		setError(null);
		setIsSubmitting(true);
		try {
			await onConfirm(reason.trim());
			setReason('');
			onOpenChange(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to reject submission');
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleCancel = () => {
		setReason('');
		setError(null);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Reject Submission</DialogTitle>
					<DialogDescription>
						{itemTitle
							? `Rejecting "${itemTitle}". Please provide a reason for the user.`
							: 'Please provide a reason for rejecting this submission.'}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="rejection-reason">Rejection Reason</Label>
						<Textarea
							id="rejection-reason"
							placeholder="e.g., Image quality is too low, content doesn't meet guidelines..."
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							rows={4}
							className="resize-none"
						/>
						{error && <p className="text-sm text-red-600">{error}</p>}
					</div>
				</div>

				<DialogFooter className="gap-2 sm:gap-0">
					<Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={handleConfirm}
						disabled={isSubmitting}
					>
						{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Reject Submission
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
