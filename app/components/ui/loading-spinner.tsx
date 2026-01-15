import { Loader } from 'lucide-react';

export function LoadingSpinner({ size = 8, color = 'indigo-600' }: { size?: number, color?: string }) {
    return (
        <div className="text-center py-12">
            <Loader className={`w-${size} h-${size} text-${color} animate-spin mx-auto mb-4`} />
            <p className="text-gray-500">Loading...</p>
        </div>
    );
}
