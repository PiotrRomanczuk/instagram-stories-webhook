'use client';

import { format } from 'date-fns';
import { Edit, Clock, CheckCircle, XCircle, Send, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/app/components/ui/tooltip';
import { ContentItem, SubmissionStatus, PublishingStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SubmissionCardProps {
	submission: ContentItem;
	onEdit?: (submission: ContentItem) => void;
	className?: string;
}

function getStatusBadge(submission: ContentItem) {
	const { submissionStatus, publishingStatus } = submission;

	// Published takes precedence
	if (publishingStatus === 'published') {
		return (
			<Badge className="gap-1 bg-green-500 hover:bg-green-600">
				<CheckCircle className="h-3 w-3" />
				Published
			</Badge>
		);
	}

	// Scheduled
	if (publishingStatus === 'scheduled') {
		return (
			<Badge className="gap-1 bg-blue-500 hover:bg-blue-600">
				<Clock className="h-3 w-3" />
				Scheduled
			</Badge>
		);
	}

	// Processing
	if (publishingStatus === 'processing') {
		return (
			<Badge className="gap-1 bg-purple-500 hover:bg-purple-600">
				<Send className="h-3 w-3" />
				Processing
			</Badge>
		);
	}

	// Failed
	if (publishingStatus === 'failed') {
		return (
			<Badge variant="destructive" className="gap-1">
				<AlertCircle className="h-3 w-3" />
				Failed
			</Badge>
		);
	}

	// Submission statuses
	if (submissionStatus === 'approved') {
		return (
			<Badge className="gap-1 bg-emerald-500 hover:bg-emerald-600">
				<CheckCircle className="h-3 w-3" />
				Approved
			</Badge>
		);
	}

	if (submissionStatus === 'rejected') {
		return (
			<Badge variant="destructive" className="gap-1">
				<XCircle className="h-3 w-3" />
				Rejected
			</Badge>
		);
	}

	// Pending (default)
	return (
		<Badge variant="secondary" className="gap-1">
			<Clock className="h-3 w-3" />
			Pending
		</Badge>
	);
}

export function SubmissionCard({ submission, onEdit, className }: SubmissionCardProps) {
	const canEdit = submission.submissionStatus === 'pending';
	const createdDate = new Date(submission.createdAt);

	return (
		<Card className={cn('group overflow-hidden', className)}>
			<div className="relative aspect-[9/16] bg-muted">
				<img
					src={submission.mediaUrl}
					alt={submission.title || 'Submission'}
					className="h-full w-full object-cover"
				/>

				{/* Overlay with actions */}
				<div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-b from-black/60 via-transparent to-black/60 p-3 opacity-0 transition-opacity group-hover:opacity-100">
					<div className="flex justify-end">
						{canEdit && onEdit && (
							<Button
								variant="secondary"
								size="icon"
								className="h-8 w-8"
								onClick={() => onEdit(submission)}
							>
								<Edit className="h-4 w-4" />
							</Button>
						)}
					</div>
				</div>

				{/* Status badge - always visible */}
				<div className="absolute left-2 top-2">
					{getStatusBadge(submission)}
				</div>
			</div>

			<CardContent className="space-y-2 p-3">
				{/* Caption preview */}
				{submission.caption && (
					<p className="line-clamp-2 text-sm text-foreground">
						{submission.caption}
					</p>
				)}

				{/* Rejection reason */}
				{submission.submissionStatus === 'rejected' && submission.rejectionReason && (
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<p className="line-clamp-1 text-xs text-destructive">
									Reason: {submission.rejectionReason}
								</p>
							</TooltipTrigger>
							<TooltipContent>
								<p className="max-w-xs">{submission.rejectionReason}</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				)}

				{/* Date */}
				<p className="text-xs text-muted-foreground">
					{format(createdDate, 'MMM d, yyyy')}
				</p>
			</CardContent>
		</Card>
	);
}
