import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
	title: string;
	description?: string;
	actions?: React.ReactNode;
	badge?: React.ReactNode;
	className?: string;
	backLink?: string;
	backLinkText?: string;
}

export function PageHeader({
	title,
	description,
	actions,
	badge,
	className,
	backLink,
	backLinkText = 'Back',
}: PageHeaderProps) {
	return (
		<div className={cn('space-y-4', className)}>
			{backLink && (
				<Link
					href={backLink}
					className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
				>
					<ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
					{backLinkText}
				</Link>
			)}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="space-y-1">
					<div className="flex items-center gap-3">
						<h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
							{title}
						</h1>
						{badge}
					</div>
					{description && (
						<p className="text-sm text-muted-foreground">{description}</p>
					)}
				</div>
				{actions && <div className="flex items-center gap-2">{actions}</div>}
			</div>
		</div>
	);
}
