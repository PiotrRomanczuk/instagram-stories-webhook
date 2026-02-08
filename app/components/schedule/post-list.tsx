
import { useState, useMemo } from 'react';
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
import { Calendar, Search, X } from 'lucide-react';
import { EmptyState } from '../ui/empty-state';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/app/components/ui/select';

interface PostListProps {
    posts: ScheduledPostWithUser[];
    onCancel: (id: string) => void;
    onReschedule: (id: string, newTime: Date, updatedPost?: { url?: string; caption?: string }) => void;
    onReorder?: (posts: ScheduledPostWithUser[]) => void;
    onUpdateTags?: (id: string, tags: { username: string; x: number; y: number; }[]) => void;
    onPostImmediately?: (id: string) => void;
    onDuplicate?: (post: ScheduledPostWithUser) => void;
}

export function PostList({ posts, onCancel, onReschedule, onReorder, onUpdateTags, onPostImmediately, onDuplicate }: PostListProps) {
    // Separate state for optimistic updates
    const [pendingPosts, setPendingPosts] = useState<ScheduledPostWithUser[]>(() => posts.filter(p => p.status === 'pending'));
    const [prevPosts, setPrevPosts] = useState<ScheduledPostWithUser[]>(posts);

    // Filter state
    const [showFilters, setShowFilters] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'published' | 'failed'>('all');
    const [dateFromFilter, setDateFromFilter] = useState('');
    const [dateToFilter, setDateToFilter] = useState('');

    if (posts !== prevPosts) {
        setPrevPosts(posts);
        setPendingPosts(posts.filter(p => p.status === 'pending'));
    }

    // Apply filters
    const filteredPosts = useMemo(() => {
        return posts.filter(post => {
            // Status filter
            if (statusFilter !== 'all' && post.status !== statusFilter) return false;

            // Text search (caption)
            if (searchText && !post.caption?.toLowerCase().includes(searchText.toLowerCase())) return false;

            // Date range filter
            const postDate = new Date(post.scheduledTime);
            if (dateFromFilter) {
                const fromDate = new Date(dateFromFilter);
                if (postDate < fromDate) return false;
            }
            if (dateToFilter) {
                const toDate = new Date(dateToFilter);
                toDate.setHours(23, 59, 59, 999);
                if (postDate > toDate) return false;
            }

            return true;
        });
    }, [posts, searchText, statusFilter, dateFromFilter, dateToFilter]);

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

    const published = filteredPosts.filter(p => p.status === 'published');
    const failed = filteredPosts.filter(p => p.status === 'failed');
    const pending = filteredPosts.filter(p => p.status === 'pending');
    const hasActiveFilters = searchText || statusFilter !== 'all' || dateFromFilter || dateToFilter;
    const totalFiltered = filteredPosts.length;

    return (
        <div className="space-y-8">
            {/* Filter Bar */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setShowFilters(!showFilters)}
                        className="rounded-lg"
                        size="sm"
                    >
                        <Search className="w-4 h-4" />
                        {showFilters ? 'Hide' : 'Show'} Filters
                        {hasActiveFilters && <Badge className="ml-1 bg-indigo-100 text-indigo-600">Active</Badge>}
                    </Button>
                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setSearchText('');
                                setStatusFilter('all');
                                setDateFromFilter('');
                                setDateToFilter('');
                            }}
                            className="text-xs"
                        >
                            <X className="w-3 h-3" />
                            Clear
                        </Button>
                    )}
                    {totalFiltered < posts.length && (
                        <span className="text-xs font-medium text-gray-500 ml-auto">
                            Showing {totalFiltered} of {posts.length}
                        </span>
                    )}
                </div>

                {showFilters && (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <Label className="text-xs font-bold text-gray-700 uppercase mb-1.5">Search Caption</Label>
                            <Input
                                type="text"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                placeholder="Search..."
                                className="rounded-lg"
                            />
                        </div>
                        <div>
                            <Label className="text-xs font-bold text-gray-700 uppercase mb-1.5">Status</Label>
                            <Select
                                value={statusFilter}
                                onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
                            >
                                <SelectTrigger className="w-full rounded-lg">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="published">Published</SelectItem>
                                    <SelectItem value="failed">Failed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs font-bold text-gray-700 uppercase mb-1.5">From Date</Label>
                            <Input
                                type="date"
                                value={dateFromFilter}
                                onChange={(e) => setDateFromFilter(e.target.value)}
                                className="rounded-lg"
                            />
                        </div>
                        <div>
                            <Label className="text-xs font-bold text-gray-700 uppercase mb-1.5">To Date</Label>
                            <Input
                                type="date"
                                value={dateToFilter}
                                onChange={(e) => setDateToFilter(e.target.value)}
                                className="rounded-lg"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Posts Grid */}
            {pending.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                            Pending ({pending.length})
                        </h3>
                        {pending.length > 0 && !hasActiveFilters && (
                            <span className="text-xs text-xs text-gray-400 font-medium">
                                Drag to reorder
                            </span>
                        )}
                    </div>

                    {hasActiveFilters ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {pending.map(post => (
                                <PostCard
                                    key={post.id}
                                    post={post}
                                    onCancel={onCancel}
                                    onReschedule={onReschedule}
                                    onUpdateTags={onUpdateTags}
                                    onPostImmediately={onPostImmediately}
                                    onDuplicate={onDuplicate}
                                    isDraggable={false}
                                />
                            ))}
                        </div>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={pendingPosts.map(p => p.id)}
                                strategy={rectSortingStrategy}
                            >
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {pendingPosts.map(post => (
                                        <PostCard
                                            key={post.id}
                                            post={post}
                                            onCancel={onCancel}
                                            onReschedule={onReschedule}
                                            onUpdateTags={onUpdateTags}
                                            onPostImmediately={onPostImmediately}
                                            onDuplicate={onDuplicate}
                                            isDraggable={true}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}
                </div>
            )}

            {published.length > 0 && (
                <div>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
                        Published ({published.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {published.map(post => (
                            <PostCard
                                key={post.id}
                                post={post}
                                onCancel={onCancel}
                                onReschedule={onReschedule}
                                onUpdateTags={onUpdateTags}
                                onPostImmediately={onPostImmediately}
                                onDuplicate={onDuplicate}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {failed.map(post => (
                            <PostCard
                                key={post.id}
                                post={post}
                                onCancel={onCancel}
                                onReschedule={onReschedule}
                                onUpdateTags={onUpdateTags}
                                onPostImmediately={onPostImmediately}
                                onDuplicate={onDuplicate}
                                isDraggable={false}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* No results state */}
            {totalFiltered === 0 && hasActiveFilters && (
                <div className="text-center py-12">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">No posts match your filters</p>
                    <p className="text-sm text-gray-400 mt-1">Try adjusting your search or date range</p>
                </div>
            )}
        </div>
    );
}
