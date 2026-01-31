'use client';

import { useState } from 'react';
import { Check, X, Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';

interface ReviewActionsProps {
	itemId: string;
	onApprove: (id: string) => Promise<void>;
	onReject: (id: string) => void;
	onSchedule: (id: string) => void;
	disabled?: boolean;
	compact?: boolean;
}

export function ReviewActions({
	itemId,
	onApprove,
	onReject,
	onSchedule,
	disabled = false,
	compact = false,
}: ReviewActionsProps) {
	const [isApproving, setIsApproving] = useState(false);

	const handleApprove = async () => {
		setIsApproving(true);
		try {
			await onApprove(itemId);
		} finally {
			setIsApproving(false);
		}
	};

	if (compact) {
		return (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="outline" size="sm" disabled={disabled}>
						Actions
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onClick={handleApprove} disabled={isApproving}>
						<Check className="mr-2 h-4 w-4 text-green-600" />
						Approve
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => onReject(itemId)}>
						<X className="mr-2 h-4 w-4 text-red-600" />
						Reject
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => onSchedule(itemId)}>
						<Calendar className="mr-2 h-4 w-4 text-blue-600" />
						Approve & Schedule
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		);
	}

	return (
		<div className="flex items-center gap-2">
			<Button
				variant="outline"
				size="sm"
				onClick={handleApprove}
				disabled={disabled || isApproving}
				className="text-green-600 hover:text-green-700 hover:bg-green-50"
			>
				{isApproving ? (
					<Loader2 className="mr-1 h-4 w-4 animate-spin" />
				) : (
					<Check className="mr-1 h-4 w-4" />
				)}
				Approve
			</Button>
			<Button
				variant="outline"
				size="sm"
				onClick={() => onReject(itemId)}
				disabled={disabled}
				className="text-red-600 hover:text-red-700 hover:bg-red-50"
			>
				<X className="mr-1 h-4 w-4" />
				Reject
			</Button>
			<Button
				variant="outline"
				size="sm"
				onClick={() => onSchedule(itemId)}
				disabled={disabled}
				className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
			>
				<Calendar className="mr-1 h-4 w-4" />
				Schedule
			</Button>
		</div>
	);
}
