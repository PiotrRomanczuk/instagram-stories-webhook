'use client';

import { RefreshCw, Clock } from 'lucide-react';
import { useSchedulePosts } from './use-schedule-posts';
import { ScheduleForm } from './schedule-form';
import { PostList } from './post-list';
import { ProcessButton } from './process-button';
import { Panel } from '../ui/panel';
import { LoadingSpinner } from '../ui/loading-spinner';

export function ScheduleManager() {
    const { posts, loading, fetchPosts } = useSchedulePosts();

    const handleCancel = async (id: string) => {
        if (!confirm('Are you sure you want to cancel this scheduled post?')) return;
        try {
            const res = await fetch(`/api/schedule?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                alert('✅ Post cancelled');
                fetchPosts();
            } else {
                const data = await res.json();
                alert(`❌ Error: ${data.error}`);
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            alert(`❌ Error: ${errorMessage}`);
        }
    };

    const handleReschedule = async (id: string, newTime: Date) => {
        try {
            const res = await fetch('/api/schedule', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id,
                    scheduledTime: newTime.toISOString(),
                }),
            });

            if (res.ok) {
                // No need to alert, real-time sync or manual refresh will handle it
                fetchPosts();
            } else {
                const data = await res.json();
                alert(`❌ Error: ${data.error}`);
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            alert(`❌ Error: ${errorMessage}`);
        }
    };

    const handleReorder = async (reorderedPosts: any[]) => {
        // 1. Get the original times from the posts, sorted
        // We assume the reorderedPosts passed in are just the PENDING ones
        const originalTimes = posts
            .filter(p => p.status === 'pending')
            .map(p => p.scheduledTime)
            .sort((a, b) => a - b);

        // 2. Assign these times to the new order
        const updates = reorderedPosts.map((post, index) => ({
            id: post.id,
            originalTime: post.scheduledTime,
            newTime: originalTimes[index]
        })).filter(u => u.originalTime !== u.newTime);

        if (updates.length === 0) return;

        // 3. Optimistically update local state if possible (optional, but fetchPosts will handle it)
        // For now, we'll just fire the API calls

        try {
            // We could do a batch update API, but for now loop is safer with existing endpoints
            await Promise.all(updates.map(u =>
                fetch('/api/schedule', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: u.id,
                        scheduledTime: new Date(u.newTime).toISOString(),
                    }),
                })
            ));

            fetchPosts();
        } catch (error) {
            console.error("Reorder failed", error);
            alert("Failed to reorder posts");
        }
    };

    return (
        <div className="space-y-8">
            <ScheduleForm onScheduled={fetchPosts} />

            <Panel
                title="Scheduled Posts"
                icon={<Clock className="w-6 h-6" />}
                className="relative"
            >
                <div className="absolute top-8 right-8 flex items-center gap-2">
                    <ProcessButton onProcessed={fetchPosts} />
                    <button
                        onClick={fetchPosts}
                        className="p-2 hover:bg-gray-100 rounded-xl transition"
                        title="Refresh"
                    >
                        <RefreshCw className="w-5 h-5 text-gray-600" />
                    </button>
                </div>

                {loading ? (
                    <LoadingSpinner />
                ) : (
                    <PostList
                        posts={posts}
                        onCancel={handleCancel}
                        onReschedule={handleReschedule}
                        onReorder={handleReorder}
                    />
                )}
            </Panel>
        </div>
    );
}
