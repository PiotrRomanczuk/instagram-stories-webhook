'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, AlertCircle, Clock } from 'lucide-react';
import type { ProcessingStatus, ProcessingBackend } from '@/lib/types/common';

interface ProcessingStatusData {
	id: string;
	status: ProcessingStatus;
	backend?: ProcessingBackend;
	elapsedMs?: number;
	processingApplied?: string[];
	error?: string;
	storyReady: boolean;
	startedAt?: string;
	completedAt?: string;
}

interface RailwayProcessingIndicatorProps {
	contentId: string;
	initialStatus?: ProcessingStatus;
	onComplete?: (status: 'completed' | 'failed') => void;
	pollInterval?: number; // milliseconds, default 2000
}

/**
 * Railway Processing Indicator Component
 *
 * Displays real-time processing status for Railway video processing with:
 * - Animated spinner during processing
 * - Elapsed time counter
 * - Completion checkmark or error state
 * - Processing transformations applied
 *
 * Polls /api/media/processing-status/[id] every 2 seconds (configurable)
 * until processing completes or fails.
 */
export function RailwayProcessingIndicator({
	contentId,
	initialStatus = 'pending',
	onComplete,
	pollInterval = 2000,
}: RailwayProcessingIndicatorProps) {
	const [status, setStatus] = useState<ProcessingStatusData | null>(null);
	const [isPolling, setIsPolling] = useState(true);

	useEffect(() => {
		let intervalId: NodeJS.Timeout;

		const fetchStatus = async () => {
			try {
				const response = await fetch(`/api/media/processing-status/${contentId}`);
				if (!response.ok) {
					console.error('Failed to fetch processing status:', response.statusText);
					return;
				}

				const data: ProcessingStatusData = await response.json();
				setStatus(data);

				// Stop polling if processing completed or failed
				if (data.status === 'completed' || data.status === 'failed') {
					setIsPolling(false);
					onComplete?.(data.status);
				}
			} catch (error) {
				console.error('Error fetching processing status:', error);
			}
		};

		// Initial fetch
		fetchStatus();

		// Start polling if processing is in progress
		if (isPolling && (initialStatus === 'pending' || initialStatus === 'processing')) {
			intervalId = setInterval(fetchStatus, pollInterval);
		}

		return () => {
			if (intervalId) {
				clearInterval(intervalId);
			}
		};
	}, [contentId, pollInterval, isPolling, initialStatus, onComplete]);

	if (!status) {
		return (
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
				<Loader2 className="h-4 w-4 animate-spin" />
				<span>Loading status...</span>
			</div>
		);
	}

	const formatElapsedTime = (ms?: number): string => {
		if (!ms) return '--:--';
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
	};

	const getStatusDisplay = () => {
		switch (status.status) {
			case 'pending':
				return {
					icon: <Clock className="h-4 w-4 text-muted-foreground" />,
					text: 'Waiting to process...',
					color: 'text-muted-foreground',
				};
			case 'processing':
				return {
					icon: <Loader2 className="h-4 w-4 animate-spin text-blue-500" />,
					text: `Processing with ${status.backend || 'Railway'}...`,
					color: 'text-blue-600',
				};
			case 'completed':
				return {
					icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
					text: 'Processing complete',
					color: 'text-green-600',
				};
			case 'failed':
				return {
					icon: <AlertCircle className="h-4 w-4 text-red-500" />,
					text: 'Processing failed',
					color: 'text-red-600',
				};
			default:
				return {
					icon: <Clock className="h-4 w-4 text-muted-foreground" />,
					text: 'Unknown status',
					color: 'text-muted-foreground',
				};
		}
	};

	const display = getStatusDisplay();

	return (
		<div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
			{/* Status Row */}
			<div className="flex items-center justify-between gap-3">
				<div className="flex items-center gap-2">
					{display.icon}
					<span className={`text-sm font-medium ${display.color}`}>
						{display.text}
					</span>
				</div>

				{/* Elapsed Time */}
				{status.elapsedMs !== undefined && (
					<div className="flex items-center gap-1 text-xs text-muted-foreground">
						<Clock className="h-3 w-3" />
						<span>{formatElapsedTime(status.elapsedMs)}</span>
					</div>
				)}
			</div>

			{/* Processing Details */}
			{status.status === 'completed' && status.processingApplied && status.processingApplied.length > 0 && (
				<div className="text-xs text-muted-foreground">
					<span className="font-medium">Applied:</span>{' '}
					{status.processingApplied.join(', ')}
				</div>
			)}

			{/* Error Message */}
			{status.status === 'failed' && status.error && (
				<div className="text-xs text-red-600">
					<span className="font-medium">Error:</span> {status.error}
				</div>
			)}

			{/* Ready for Publishing Indicator */}
			{status.storyReady && (
				<div className="flex items-center gap-1 text-xs text-green-600">
					<CheckCircle2 className="h-3 w-3" />
					<span className="font-medium">Ready for Instagram Stories</span>
				</div>
			)}
		</div>
	);
}
