'use client';

import { Badge } from '@/app/components/ui/badge';
import { Check, AlertTriangle, ImageIcon } from 'lucide-react';
import { AspectRatioInfo } from '@/lib/types';
import { cn } from '@/lib/utils';

interface AspectRatioBadgeProps {
	aspectInfo: AspectRatioInfo | null;
	className?: string;
}

export function AspectRatioBadge({ aspectInfo, className }: AspectRatioBadgeProps) {
	if (!aspectInfo) {
		return (
			<Badge variant="outline" className={cn('gap-1', className)}>
				<ImageIcon className="h-3 w-3" />
				<span>No image</span>
			</Badge>
		);
	}

	const { recommendation, isIdeal, isAcceptable } = aspectInfo;

	if (recommendation === 'perfect' || isIdeal) {
		return (
			<Badge
				variant="default"
				className={cn('gap-1 bg-green-500 hover:bg-green-600', className)}
			>
				<Check className="h-3 w-3" />
				<span>9:16 Perfect</span>
			</Badge>
		);
	}

	if (recommendation === 'acceptable' || isAcceptable) {
		return (
			<Badge
				variant="secondary"
				className={cn('gap-1', className)}
			>
				<Check className="h-3 w-3" />
				<span>Close to 9:16</span>
			</Badge>
		);
	}

	if (recommendation === 'needs_padding') {
		return (
			<Badge
				variant="outline"
				className={cn('gap-1 border-yellow-500 text-yellow-600', className)}
			>
				<AlertTriangle className="h-3 w-3" />
				<span>Will add padding</span>
			</Badge>
		);
	}

	if (recommendation === 'needs_crop') {
		return (
			<Badge
				variant="outline"
				className={cn('gap-1 border-orange-500 text-orange-600', className)}
			>
				<AlertTriangle className="h-3 w-3" />
				<span>May need crop</span>
			</Badge>
		);
	}

	return (
		<Badge variant="outline" className={cn('gap-1', className)}>
			<ImageIcon className="h-3 w-3" />
			<span>{aspectInfo.ratio.toFixed(2)}:1</span>
		</Badge>
	);
}
