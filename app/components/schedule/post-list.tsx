import { ScheduledPost } from '@/lib/types';
import { PostCard } from './post-card';
import { Calendar } from 'lucide-react';

interface PostListProps {
    posts: ScheduledPost[];
    onCancel: (id: string) => void;
}

export function PostList({ posts, onCancel }: PostListProps) {
    if (posts.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50 rounded-2xl">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No scheduled posts yet</p>
            </div>
        );
    }

    const pending = posts.filter(p => p.status === 'pending');
    const published = posts.filter(p => p.status === 'published');
    const failed = posts.filter(p => p.status === 'failed');

    return (
        <div className="space-y-8">
            {pending.length > 0 && (
                <div>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Pending ({pending.length})</h3>
                    <div className="space-y-3">
                        {pending.map(post => <PostCard key={post.id} post={post} onCancel={onCancel} />)}
                    </div>
                </div>
            )}
            {published.length > 0 && (
                <div>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Published ({published.length})</h3>
                    <div className="space-y-3">
                        {published.map(post => <PostCard key={post.id} post={post} onCancel={onCancel} />)}
                    </div>
                </div>
            )}
            {failed.length > 0 && (
                <div>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Failed ({failed.length})</h3>
                    <div className="space-y-3">
                        {failed.map(post => <PostCard key={post.id} post={post} onCancel={onCancel} />)}
                    </div>
                </div>
            )}
        </div>
    );
}
