import { Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { ScheduledPost } from '@/lib/types';
import { StatusBadge } from '../ui/status-badge';

interface PostCardProps {
    post: ScheduledPost;
    onCancel: (id: string) => void;
}

const statusIcons = {
    pending: Clock,
    published: CheckCircle,
    failed: XCircle,
    cancelled: XCircle,
};

const statusColors = {
    pending: 'bg-blue-50 border-blue-200 text-blue-700',
    published: 'bg-green-50 border-green-200 text-green-700',
    failed: 'bg-red-50 border-red-200 text-red-700',
    cancelled: 'bg-gray-50 border-gray-200 text-gray-700',
};

export function PostCard({ post, onCancel }: PostCardProps) {
    const StatusIcon = statusIcons[post.status];
    const colorClasses = statusColors[post.status];
    const scheduledDate = new Date(post.scheduledTime);
    const isPast = post.scheduledTime < Date.now();

    return (
        <div className={`${colorClasses} border rounded-2xl p-4 flex items-center justify-between gap-4`}>
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <StatusIcon className={`w-5 h-5 shrink-0`} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900 text-sm">{post.type}</span>
                        <StatusBadge status={post.status} />
                    </div>
                    <p className="text-xs text-gray-600 truncate mb-1">{post.url}</p>
                    <p className="text-xs font-semibold text-gray-700">
                        📅 {scheduledDate.toLocaleDateString()} at {scheduledDate.toLocaleTimeString()}
                        {isPast && post.status === 'pending' && <span className="text-orange-600 ml-2">(Processing...)</span>}
                    </p>
                    {post.error && <p className="text-xs text-red-600 mt-1">Error: {post.error}</p>}
                </div>
            </div>
            {post.status === 'pending' && (
                <button
                    onClick={() => onCancel(post.id)}
                    className="p-2 hover:bg-red-100 rounded-xl transition text-red-600"
                    title="Cancel"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}
