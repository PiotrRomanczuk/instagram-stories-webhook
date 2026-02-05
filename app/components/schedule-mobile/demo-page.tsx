'use client';

import { Suspense } from 'react';
import { TimelineNavigation } from './timeline-navigation';
import { TimelineContainer } from './timeline-container';

/**
 * Demo page showing how to use schedule-mobile components
 *
 * This is an example implementation of a complete schedule page with:
 * - Responsive navigation (bottom bar on mobile, sidebar on desktop)
 * - Search with debouncing
 * - Filter chips with URL state persistence
 * - Dark theme styling
 *
 * Usage:
 * 1. Copy this file to app/schedule/page.tsx
 * 2. Replace mock data with actual API calls
 * 3. Connect to your scheduled posts data source
 */

interface MockPost {
    id: string;
    title: string;
    status: 'scheduled' | 'published' | 'failed';
    scheduledTime: string;
    mediaUrl: string;
}

const mockPosts: MockPost[] = [
    {
        id: '1',
        title: 'New Summer Collection',
        status: 'scheduled',
        scheduledTime: '2024-02-05T10:30:00Z',
        mediaUrl: '/images/summer.jpg',
    },
    {
        id: '2',
        title: 'Promo Campaign',
        status: 'published',
        scheduledTime: '2024-02-04T15:00:00Z',
        mediaUrl: '/images/promo.jpg',
    },
    {
        id: '3',
        title: 'Uploading Content',
        status: 'scheduled',
        scheduledTime: '2024-02-06T09:15:00Z',
        mediaUrl: '/images/content.jpg',
    },
];

export function DemoPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-950" />}>
            <div className="min-h-screen bg-gray-950">
                {/* Responsive Navigation */}
                <TimelineNavigation />

                {/* Main Content Area - adjust padding for navigation */}
                <div className="md:ml-60 pb-20 md:pb-0">
                    <TimelineContainer
                        onSearchChange={(query) => {
                            console.log('Searching for:', query);
                            // TODO: Fetch filtered posts from API
                            // Example: fetchPosts({ search: query })
                        }}
                        onFilterChange={(filter) => {
                            console.log('Filter changed to:', filter);
                            // TODO: Fetch filtered posts from API
                            // Example: fetchPosts({ status: filter })
                        }}
                    >
                        {/* Timeline Content */}
                        <div className="space-y-4">
                            {mockPosts.map((post) => (
                                <div
                                    key={post.id}
                                    className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-gray-800 rounded-lg" />
                                        <div className="flex-1">
                                            <h3 className="text-white font-medium">
                                                {post.title}
                                            </h3>
                                            <p className="text-sm text-gray-400">
                                                {post.scheduledTime}
                                            </p>
                                        </div>
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                post.status === 'published'
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : post.status === 'scheduled'
                                                    ? 'bg-blue-500/20 text-blue-400'
                                                    : 'bg-red-500/20 text-red-400'
                                            }`}
                                        >
                                            {post.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Empty State Example */}
                        {mockPosts.length === 0 && (
                            <div className="text-center py-20">
                                <p className="text-gray-500">No posts found</p>
                            </div>
                        )}
                    </TimelineContainer>
                </div>
            </div>
        </Suspense>
    );
}
