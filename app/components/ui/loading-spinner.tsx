import { Spinner } from './spinner';
import { cn } from '@/lib/utils';

export function LoadingSpinner({ size = 8, color = 'indigo-600' }: { size?: number, color?: string }) {
    const sizeClasses: Record<number, string> = {
        4: 'size-4',
        6: 'size-6',
        8: 'size-8',
        10: 'size-10',
        12: 'size-12',
    };

    return (
        <div className="text-center py-12">
            <Spinner className={cn(sizeClasses[size] || 'size-8', `text-${color}`, 'mx-auto mb-4')} />
            <p className="text-gray-500">Loading...</p>
        </div>
    );
}
