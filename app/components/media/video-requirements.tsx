import {
	Monitor,
	Film,
	Clock,
	Gauge,
	HardDrive,
	Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RequirementItem {
	icon: React.ReactNode;
	label: string;
	value: string;
}

const REQUIREMENTS: RequirementItem[] = [
	{
		icon: <Monitor className="h-4 w-4" />,
		label: 'Resolution',
		value: '1080 x 1920px (9:16)',
	},
	{
		icon: <Film className="h-4 w-4" />,
		label: 'Format',
		value: 'MP4 (H.264)',
	},
	{
		icon: <Clock className="h-4 w-4" />,
		label: 'Duration',
		value: '57 seconds max',
	},
	{
		icon: <Gauge className="h-4 w-4" />,
		label: 'Frame rate',
		value: '30 fps',
	},
	{
		icon: <HardDrive className="h-4 w-4" />,
		label: 'File size',
		value: '100 MB max',
	},
];

interface VideoRequirementsProps {
	className?: string;
	/** Compact layout for inline display */
	compact?: boolean;
}

export function VideoRequirements({
	className,
	compact = false,
}: VideoRequirementsProps) {
	if (compact) {
		return (
			<div className={cn('text-xs text-muted-foreground', className)}>
				<p>
					MP4/MOV/WebM, up to 100MB, max 57s, 1080x1920
					recommended
				</p>
			</div>
		);
	}

	return (
		<div
			className={cn(
				'rounded-lg border bg-muted/30 p-4 space-y-3',
				className
			)}
		>
			<h4 className="text-sm font-medium">
				Instagram Stories requirements
			</h4>

			<div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
				{REQUIREMENTS.map((req) => (
					<div
						key={req.label}
						className="flex items-center gap-2 text-xs"
					>
						<span className="text-muted-foreground shrink-0">
							{req.icon}
						</span>
						<div>
							<span className="text-muted-foreground">
								{req.label}:
							</span>{' '}
							<span className="font-medium">{req.value}</span>
						</div>
					</div>
				))}
			</div>

			<p className="flex items-center gap-1.5 text-xs text-muted-foreground">
				<Wand2 className="h-3.5 w-3.5 shrink-0" />
				Videos that don&apos;t meet these requirements will be
				automatically converted.
			</p>
		</div>
	);
}
