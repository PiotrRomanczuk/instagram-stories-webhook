
import { useState } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy
} from '@dnd-kit/sortable';


import { ScheduledPostWithUser } from '@/lib/types';
import { PostCard } from './post-card';
import { Calendar } from 'lucide-react';
import { EmptyState } from '../ui/empty-state';

interface PostListProps {
    posts: ScheduledPostWithUser[];
    onCancel: (id: string) => void;
    onReschedule: (id: string, newTime: Date) => void;
    onReorder?: (posts: ScheduledPostWithUser[]) => void;
    onUpdateTags?: (id: string, tags: { username: string; x: number; y: number; }[]) => void;
    onPostImmediately?: (id: string) => void;
}

export function PostList({ posts, onCancel, onReschedule, onReorder, onUpdateTags, onPostImmediately }: PostListProps) {
    // Separate state for optimistic updates
    const [pendingPosts, setPendingPosts] = useState<ScheduledPostWithUser[]>(() => posts.filter(p => p.status === 'pending'));
    const [prevPosts, setPrevPosts] = useState<ScheduledPostWithUser[]>(posts);

    if (posts !== prevPosts) {
        setPrevPosts(posts);
        setPendingPosts(posts.filter(p => p.status === 'pending'));
    }

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Needs 8px movement to start drag, prevents accidental drags on clicks
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = pendingPosts.findIndex((p) => p.id === active.id);
            const newIndex = pendingPosts.findIndex((p) => p.id === over.id);

            const newOrder = arrayMove(pendingPosts, oldIndex, newIndex);

            // Optimistic update
            setPendingPosts(newOrder);

            // Trigger actual update
            if (onReorder) {
                onReorder(newOrder);
            }
        }
    }

    if (posts.length === 0) {
        return (
            <EmptyState
                icon={Calendar}
                title="No scheduled posts yet"
                description="Your schedule is empty. Use the form above to schedule your first Instagram story."
            />
        );
    }

    const published = posts.filter(p => p.status === 'published');
    const failed = posts.filter(p => p.status === 'failed');

    return (
        <div className="space-y-12">
            {pendingPosts.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                            Pending ({pendingPosts.length})
                        </h3>
                        <span className="text-xs text-xs text-gray-400 font-medium">
                            Drag to reorder
                        </span>
                    </div>

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={pendingPosts.map(p => p.id)}
                            strategy={rectSortingStrategy}
                        >
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {pendingPosts.map(post => (
                                    <PostCard
                                        key={post.id}
                                        post={post}
                                        onCancel={onCancel}
                                        onReschedule={onReschedule}
                                        onUpdateTags={onUpdateTags}
                                        onPostImmediately={onPostImmediately}
                                        isDraggable={true}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>
            )}

            {published.length > 0 && (
                <div>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
                        Published ({published.length})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {published.map(post => (
                            <PostCard
                                key={post.id}
                                post={post}
                                onCancel={onCancel}
                                onReschedule={onReschedule}
                                onUpdateTags={onUpdateTags}
                                onPostImmediately={onPostImmediately}
                                isDraggable={false}
                            />
                        ))}
                    </div>
                </div>
            )}

            {failed.length > 0 && (
                <div>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
                        Failed ({failed.length})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {failed.map(post => (
                            <PostCard
                                key={post.id}
                                post={post}
                                onCancel={onCancel}
                                onReschedule={onReschedule}
                                onUpdateTags={onUpdateTags}
                                onPostImmediately={onPostImmediately}
                                isDraggable={false}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
