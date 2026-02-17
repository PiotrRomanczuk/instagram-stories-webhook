'use client';

import { Loader2, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';
import { Progress } from '@/app/components/ui/progress';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/lib/utils';
import type { ProcessingStep } from '@/lib/media/ffmpeg-wasm-processor';

const STEP_LABELS: Record<ProcessingStep, string> = {
	loading: 'Loading FFmpeg...',
	reading: 'Reading video file...',
	processing: 'Processing video...',
	thumbnail: 'Extracting thumbnail...',
	done: 'Processing complete!',
};

const STEP_ORDER: ProcessingStep[] = ['loading', 'reading', 'processing', 'thumbnail', 'done'];

interface VideoProcessingProgressProps {
	step: ProcessingStep;
	progress: number;
	error?: string | null;
	onRetry?: () => void;
	className?: string;
}

export function VideoProcessingProgress({
	step,
	progress,
	error,
	onRetry,
	className,
}: VideoProcessingProgressProps) {
	if (error) {
		return (
			<div className={cn('flex flex-col items-center gap-3 p-4', className)}>
				<AlertCircle className="h-8 w-8 text-destructive" />
				<p className="text-sm font-medium text-destructive text-center">
					{error}
				</p>
				{onRetry && (
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={onRetry}
					>
						<RotateCcw className="mr-2 h-4 w-4" />
						Retry
					</Button>
				)}
			</div>
		);
	}

	const isDone = step === 'done';
	const currentIndex = STEP_ORDER.indexOf(step);

	return (
		<div className={cn('flex flex-col items-center gap-4 w-full max-w-sm p-4', className)}>
			{/* Icon + label */}
			<div className="flex items-center gap-2">
				{isDone ? (
					<CheckCircle2 className="h-6 w-6 text-green-600" />
				) : (
					<Loader2 className="h-6 w-6 animate-spin text-primary" />
				)}
				<p className="text-sm font-medium">{STEP_LABELS[step]}</p>
			</div>

			{/* Progress bar */}
			<Progress value={progress} className="w-full" />
			<p className="text-xs text-muted-foreground">{progress}%</p>

			{/* Step dots */}
			<div className="flex items-center gap-1.5">
				{STEP_ORDER.slice(0, -1).map((s, i) => {
					const isCompleted = i < currentIndex;
					const isCurrent = s === step;
					return (
						<div
							key={s}
							className={cn(
								'h-2 w-2 rounded-full transition-colors',
								isCompleted && 'bg-green-500',
								isCurrent && 'bg-primary',
								!isCompleted && !isCurrent && 'bg-muted',
							)}
						/>
					);
				})}
			</div>
		</div>
	);
}
