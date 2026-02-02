'use client';

import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface ConflictWarningProps {
	message: string;
	onDismiss: () => void;
}

export function ConflictWarning({ message, onDismiss }: ConflictWarningProps) {
	return (
		<div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
			<div className="flex items-center gap-3">
				<AlertTriangle className="h-5 w-5 text-amber-500" />
				<p className="text-sm font-medium text-amber-200">{message}</p>
			</div>
			<Button
				variant="ghost"
				size="sm"
				onClick={onDismiss}
				className="h-8 w-8 p-0 text-amber-400 hover:bg-amber-500/20 hover:text-amber-200"
			>
				<X className="h-4 w-4" />
				<span className="sr-only">Dismiss</span>
			</Button>
		</div>
	);
}
