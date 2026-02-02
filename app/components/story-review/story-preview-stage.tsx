'use client';

import { ChevronLeft, ChevronRight, Smartphone } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/lib/utils';

interface StoryPreviewStageProps {
	imageUrl: string | null;
	username?: string;
	onPrevious: () => void;
	onNext: () => void;
	hasPrevious: boolean;
	hasNext: boolean;
	currentIndex: number;
	totalCount: number;
}

export function StoryPreviewStage({
	imageUrl,
	username,
	onPrevious,
	onNext,
	hasPrevious,
	hasNext,
	currentIndex,
	totalCount,
}: StoryPreviewStageProps) {
	// Story phone frame dimensions (9:19 aspect ratio as specified)
	const frameWidth = 280;
	const frameHeight = Math.round(frameWidth * (19 / 9));

	return (
		<div className="flex items-center justify-center gap-4">
			{/* Previous Button */}
			<Button
				variant="ghost"
				size="icon"
				onClick={onPrevious}
				disabled={!hasPrevious}
				className={cn(
					'h-12 w-12 rounded-full',
					'bg-[#1a2332] border border-[#2a3649] text-[#92a4c9]',
					'hover:bg-[#2a3649] hover:text-white',
					'disabled:opacity-30 disabled:cursor-not-allowed'
				)}
				title="Previous (K or Left Arrow)"
			>
				<ChevronLeft className="h-6 w-6" />
			</Button>

			{/* Phone Mockup */}
			<div className="flex flex-col items-center gap-3">
				<div
					className={cn(
						'relative rounded-[2.5rem] p-3',
						'bg-gradient-to-b from-[#1a2332] to-[#101622]',
						'border-4 border-[#2a3649]',
						'shadow-2xl shadow-black/50'
					)}
					style={{
						width: frameWidth + 24,
						height: frameHeight + 24,
					}}
				>
					{/* Dynamic Island / Notch */}
					<div className="absolute left-1/2 top-4 -translate-x-1/2">
						<div className="h-6 w-24 rounded-full bg-black" />
					</div>

					{/* Screen */}
					<div
						className="relative overflow-hidden rounded-[2rem] bg-black"
						style={{ width: frameWidth, height: frameHeight }}
					>
						{imageUrl ? (
							<>
								{/* Story Image */}
								<img
									src={imageUrl}
									alt="Story preview"
									className="h-full w-full object-cover"
								/>

								{/* Instagram Story UI Overlay */}
								<div className="absolute inset-0 pointer-events-none">
									{/* Top gradient */}
									<div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent" />

									{/* Username pill */}
									{username && (
										<div className="absolute top-10 left-3 flex items-center gap-2">
											<div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 p-[2px]">
												<div className="h-full w-full rounded-full bg-gray-800" />
											</div>
											<span className="text-white text-sm font-medium">
												{username}
											</span>
										</div>
									)}

									{/* Story progress bar */}
									<div className="absolute top-2 left-2 right-2 h-0.5 rounded-full bg-white/30">
										<div className="h-full w-1/3 rounded-full bg-white" />
									</div>
								</div>
							</>
						) : (
							<div className="flex h-full w-full flex-col items-center justify-center gap-3 text-[#92a4c9]">
								<Smartphone className="h-16 w-16 opacity-50" />
								<span className="text-sm">No story selected</span>
							</div>
						)}
					</div>

					{/* Home Indicator */}
					<div className="absolute bottom-2 left-1/2 -translate-x-1/2">
						<div className="h-1 w-32 rounded-full bg-white/20" />
					</div>
				</div>

				{/* Counter */}
				{totalCount > 0 && (
					<div className="flex items-center gap-2 text-sm text-[#92a4c9]">
						<span>{currentIndex + 1}</span>
						<span>/</span>
						<span>{totalCount}</span>
					</div>
				)}
			</div>

			{/* Next Button */}
			<Button
				variant="ghost"
				size="icon"
				onClick={onNext}
				disabled={!hasNext}
				className={cn(
					'h-12 w-12 rounded-full',
					'bg-[#1a2332] border border-[#2a3649] text-[#92a4c9]',
					'hover:bg-[#2a3649] hover:text-white',
					'disabled:opacity-30 disabled:cursor-not-allowed'
				)}
				title="Next (J or Right Arrow)"
			>
				<ChevronRight className="h-6 w-6" />
			</Button>
		</div>
	);
}
