import * as React from 'react';
import { cn } from '@/lib/utils';

interface SfAvatarProps {
	src?: string | null;
	alt?: string;
	fallback?: string;
	size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
	ring?: boolean;
	ringColor?: string;
	showStatus?: boolean;
	status?: 'online' | 'offline' | 'busy';
	className?: string;
}

const sizeClasses = {
	xs: 'h-6 w-6 text-[10px]', sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm',
	lg: 'h-12 w-12 text-base', xl: 'h-16 w-16 text-lg',
};

const ringClasses = {
	xs: 'ring-1 ring-offset-1', sm: 'ring-2 ring-offset-1', md: 'ring-2 ring-offset-2',
	lg: 'ring-2 ring-offset-2', xl: 'ring-[3px] ring-offset-2',
};

const statusSizeClasses = {
	xs: 'h-1.5 w-1.5 -bottom-0.5 -right-0.5', sm: 'h-2 w-2 bottom-0 right-0',
	md: 'h-2.5 w-2.5 bottom-0 right-0', lg: 'h-3 w-3 bottom-0.5 right-0.5', xl: 'h-4 w-4 bottom-1 right-1',
};

const statusColorClasses = { online: 'bg-emerald-500', offline: 'bg-gray-400', busy: 'bg-red-500' };

/** User avatar with ring styling and status indicator */
export function SfAvatar({
	src, alt = 'User avatar', fallback, size = 'md', ring = false,
	ringColor = 'ring-[var(--sf-primary)]', showStatus = false, status = 'online', className,
}: SfAvatarProps) {
	const [hasError, setHasError] = React.useState(false);

	const initials = React.useMemo(() => {
		if (fallback) return fallback.slice(0, 2).toUpperCase();
		if (alt && alt !== 'User avatar') {
			const words = alt.split(' ').filter(Boolean);
			if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
			return alt.slice(0, 2).toUpperCase();
		}
		return '?';
	}, [fallback, alt]);

	const showImage = src && !hasError;

	return (
		<div className={cn('relative inline-flex', className)}>
			<div className={cn(
				'overflow-hidden rounded-full flex items-center justify-center font-medium',
				'bg-slate-200 text-slate-600',
				sizeClasses[size],
				ring && [ringClasses[size], ringColor, 'ring-offset-white']
			)}>
				{showImage ? (
					<img src={src} alt={alt} className="h-full w-full object-cover" onError={() => setHasError(true)} />
				) : (
					<span>{initials}</span>
				)}
			</div>
			{showStatus && (
				<span className={cn('absolute rounded-full border-2 border-white', statusSizeClasses[size], statusColorClasses[status])} />
			)}
		</div>
	);
}

interface SfAvatarGroupProps {
	avatars: Array<Pick<SfAvatarProps, 'src' | 'alt' | 'fallback'>>;
	max?: number;
	size?: SfAvatarProps['size'];
	className?: string;
}

export function SfAvatarGroup({ avatars, max = 4, size = 'sm', className }: SfAvatarGroupProps) {
	const visibleAvatars = avatars.slice(0, max);
	const remainingCount = avatars.length - max;

	return (
		<div className={cn('flex -space-x-2', className)}>
			{visibleAvatars.map((avatar, index) => (
				<SfAvatar key={index} {...avatar} size={size} ring ringColor="ring-white" />
			))}
			{remainingCount > 0 && (
				<div className={cn(
					'flex items-center justify-center rounded-full font-medium',
					'bg-slate-100 text-slate-600',
					'ring-2 ring-white',
					sizeClasses[size]
				)}>
					+{remainingCount}
				</div>
			)}
		</div>
	);
}
