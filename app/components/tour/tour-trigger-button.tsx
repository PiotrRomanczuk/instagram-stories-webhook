'use client';

import { HelpCircle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/app/components/ui/tooltip';

interface TourTriggerButtonProps {
	onStartTour: () => void;
}

export function TourTriggerButton({ onStartTour }: TourTriggerButtonProps) {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						onClick={onStartTour}
						data-tour="admin-help-button"
						aria-label="Start tour"
					>
						<HelpCircle className="h-5 w-5" />
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>Start guided tour</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
