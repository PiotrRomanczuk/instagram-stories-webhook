'use client';

import { RefreshCw, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { useSchedulePosts } from './use-schedule-posts';
import { ScheduleForm } from './schedule-form';
import { PostList } from './post-list';
import { ProcessButton } from './process-button';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { LoadingSpinner } from '../ui/loading-spinner';
import { UserRole } from '@/lib/types';

export function ScheduleManager() {
    const { data: session } = useSession();
    const userRole = (session?.user as { role?: UserRole })?.role;
    const isAdmin = userRole === 'admin' || userRole === 'developer' || userRole === 'demo';
    const isDemo = userRole === 'demo';

    const { posts, loading, fetchPosts } = useSchedulePosts({ showAll: isAdmin });

    const handleCancel = async (id: string) => {
        if (!confirm('Are you sure you want to cancel this scheduled post?')) return;
        try {
            const res = await fetch(`/api/schedule?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Post cancelled');
                fetchPosts();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to cancel post');
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            toast.error(errorMessage);
        }
    };

    const handleReschedule = async (
        id: string,
        newTime: Date,
        updatedPost?: { url?: string; caption?: string }
    ) => {
        try {
            const updatePayload: { id: string; scheduledTime: string; url?: string; caption?: string } = {
                id,
                scheduledTime: newTime.toISOString(),
            };

            if (updatedPost?.url) {
                updatePayload.url = updatedPost.url;
            }

            if (updatedPost?.caption !== undefined) {
                updatePayload.caption = updatedPost.caption;
            }

            const res = await fetch('/api/schedule', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload),
            });

            if (res.ok) {
                toast.success('Post updated successfully');
                fetchPosts();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to update post');
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            toast.error(errorMessage);
        }
    };

    const handleReorder = async (reorderedPosts: import('@/lib/types').ScheduledPost[]) => {
        // 1. Get the original times from the posts, sorted
        // We assume the reorderedPosts passed in are just the PENDING ones
        const originalTimes = posts
            .filter(p => p.publishingStatus === 'scheduled')
            .map(p => p.scheduledTime)
            .filter((time): time is number => time !== undefined)
            .sort((a, b) => a - b);

        // 2. Assign these times to the new order
        const updates = reorderedPosts.map((post, index) => ({
            id: post.id,
            originalTime: post.scheduledTime,
            newTime: originalTimes[index]
        })).filter(u => u.originalTime !== u.newTime);

        if (updates.length === 0) return;

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

            toast.success('Order updated');
            fetchPosts();
        } catch (error) {
            console.error("Reorder failed", error);
            toast.error("Failed to reorder posts");
        }
    };

    const handleUpdateTags = async (id: string, tags: { username: string; x: number; y: number; }[]) => {
        try {
            const res = await fetch('/api/schedule', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id,
                    userTags: tags
                }),
            });

            if (res.ok) {
                toast.success('Tags updated');
                fetchPosts();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to update tags');
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            toast.error(errorMessage);
        }
    };

    const handlePostImmediately = async (id: string) => {
        try {
            const res = await fetch(`/api/schedule/process?id=${id}`);
            const data = await res.json();
            if (res.ok) {
                toast.success('Post processed successfully');
                fetchPosts();
            } else {
                toast.error(data.error || 'Failed to process post');
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            toast.error(errorMessage);
        }
    };

    const handleDuplicate = (post: import('@/lib/types').ScheduledPostWithUser) => {
        const duplicateData = {
            mediaUrl: post.url,
            caption: post.caption,
            userTags: post.userTags?.map(t => t.username) || [],
            scheduledTime: new Date(post.scheduledTime).toLocaleString()
        };

        navigator.clipboard.writeText(JSON.stringify(duplicateData, null, 2)).then(() => {
            toast.success('Post data copied to clipboard! Scroll to form and create new post.');
        }).catch(() => {
            toast.error('Could not copy to clipboard');
        });
    };

    return (
        <div className="space-y-8">
            {!isDemo && <ScheduleForm onScheduled={fetchPosts} />}

            <Card className="rounded-3xl p-8 shadow-xl shadow-gray-100/50 border-gray-100 relative">
                <CardHeader className="p-0 gap-0">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                            <Clock className="w-6 h-6" />
                        </div>
                        <CardTitle className="text-2xl font-black text-gray-900">Scheduled Posts</CardTitle>
                    </div>
                </CardHeader>
                <div className="absolute top-8 right-8 flex items-center gap-2">
                    <ProcessButton onProcessed={fetchPosts} />
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={fetchPosts}
                        className="rounded-xl"
                        title="Refresh"
                    >
                        <RefreshCw className="w-5 h-5 text-gray-600" />
                    </Button>
                </div>
                <CardContent className="p-0">
                    {loading ? (
                        <LoadingSpinner />
                    ) : (
                        <PostList
                            posts={posts as unknown as import('@/lib/types').ScheduledPostWithUser[]}
                            onCancel={handleCancel}
                            onReschedule={handleReschedule}
                            onReorder={handleReorder}
                            onUpdateTags={handleUpdateTags}
                            onPostImmediately={handlePostImmediately}
                            onDuplicate={handleDuplicate}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
