'use client';

import { useState } from 'react';
import { CheckCircle, RefreshCw, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/lib/utils';

interface StoryFeedbackFormProps {
	onApprove: () => Promise<void>;
	onRequestChanges: (feedback: string) => Promise<void>;
	onReject: (reason: string) => Promise<void>;
	disabled?: boolean;
}

export function StoryFeedbackForm({
	onApprove,
	onRequestChanges,
	onReject,
	disabled = false,
}: StoryFeedbackFormProps) {
	const [feedback, setFeedback] = useState('');
	const [isApproving, setIsApproving] = useState(false);
	const [isRequestingChanges, setIsRequestingChanges] = useState(false);
	const [isRejecting, setIsRejecting] = useState(false);

	const isLoading = isApproving || isRequestingChanges || isRejecting;

	const handleApprove = async () => {
		setIsApproving(true);
		try {
			await onApprove();
		} finally {
			setIsApproving(false);
		}
	};

	const handleRequestChanges = async () => {
		if (!feedback.trim()) return;
		setIsRequestingChanges(true);
		try {
			await onRequestChanges(feedback);
			setFeedback('');
		} finally {
			setIsRequestingChanges(false);
		}
	};

	const handleReject = async () => {
		setIsRejecting(true);
		try {
			await onReject(feedback || 'Content does not meet guidelines');
			setFeedback('');
		} finally {
			setIsRejecting(false);
		}
	};

	return (
		<div
			className={cn(
				'p-4 rounded-xl',
				'bg-[#1a2332] border border-[#2a3649]'
			)}
		>
			{/* Revision Feedback */}
			<div className="mb-4">
				<label className="block text-xs font-semibold uppercase tracking-wider text-[#92a4c9] mb-2">
					Revision Feedback
				</label>
				<textarea
					value={feedback}
					onChange={(e) => setFeedback(e.target.value)}
					placeholder="Enter notes for the creator if changes are required..."
					disabled={disabled || isLoading}
					className={cn(
						'w-full min-h-[100px] p-3 rounded-lg resize-none',
						'bg-[#101622] border border-[#2a3649]',
						'text-white placeholder:text-[#92a4c9]/50',
						'focus:outline-none focus:ring-2 focus:ring-[#2b6cee] focus:border-transparent',
						'disabled:opacity-50 disabled:cursor-not-allowed'
					)}
				/>
			</div>

			{/* Action Buttons */}
			<div className="space-y-2">
				{/* Primary: Approve & Schedule */}
				<Button
					onClick={handleApprove}
					disabled={disabled || isLoading}
					className={cn(
						'w-full h-11',
						'bg-[#2b6cee] hover:bg-[#2b6cee]/90',
						'text-white font-medium'
					)}
				>
					{isApproving ? (
						<Loader2 className="h-4 w-4 animate-spin mr-2" />
					) : (
						<CheckCircle className="h-4 w-4 mr-2" />
					)}
					Approve & Schedule
				</Button>

				{/* Secondary Row */}
				<div className="grid grid-cols-2 gap-2">
					{/* Request Changes */}
					<Button
						variant="outline"
						onClick={handleRequestChanges}
						disabled={disabled || isLoading || !feedback.trim()}
						className={cn(
							'h-10',
							'bg-transparent border-[#2a3649]',
							'text-amber-400 hover:text-amber-300',
							'hover:bg-amber-400/10 hover:border-amber-400/50',
							'disabled:opacity-50'
						)}
					>
						{isRequestingChanges ? (
							<Loader2 className="h-4 w-4 animate-spin mr-2" />
						) : (
							<RefreshCw className="h-4 w-4 mr-2" />
						)}
						Request Changes
					</Button>

					{/* Reject */}
					<Button
						variant="outline"
						onClick={handleReject}
						disabled={disabled || isLoading}
						className={cn(
							'h-10',
							'bg-transparent border-[#2a3649]',
							'text-red-400 hover:text-red-300',
							'hover:bg-red-400/10 hover:border-red-400/50',
							'disabled:opacity-50'
						)}
					>
						{isRejecting ? (
							<Loader2 className="h-4 w-4 animate-spin mr-2" />
						) : (
							<XCircle className="h-4 w-4 mr-2" />
						)}
						Reject
					</Button>
				</div>
			</div>

			{/* Keyboard Shortcuts Hint */}
			<div className="mt-4 pt-3 border-t border-[#2a3649]">
				<p className="text-xs text-[#92a4c9]">
					Keyboard shortcuts:{' '}
					<span className="text-white">A</span> approve,{' '}
					<span className="text-white">R</span> reject,{' '}
					<span className="text-white">J/K</span> or{' '}
					<span className="text-white">Arrow keys</span> navigate
				</p>
			</div>
		</div>
	);
}
