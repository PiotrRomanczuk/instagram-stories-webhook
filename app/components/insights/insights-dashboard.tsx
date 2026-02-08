'use client';

import { useState } from 'react';
import { useSchedulePosts } from '../schedule/use-schedule-posts';
import { BarChart3, Calendar, ExternalLink, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { LoadingSpinner } from '../ui/loading-spinner';
import { InsightsPanel } from '../schedule/insights-panel';
import Image from 'next/image';

import { QuotaUsageCard } from './quota-usage-card';

export function InsightsDashboard() {
    const { posts, loading, fetchPosts } = useSchedulePosts();
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

    // Filter only published posts
    const publishedPosts = posts
        .filter(p => p.status === 'published')
        .sort((a, b) => b.publishedAt! - a.publishedAt!); // Newest first

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <QuotaUsageCard />
                </div>
            </div>

            <Card className="rounded-3xl p-8 shadow-xl shadow-gray-100/50 border-gray-100 relative min-h-[500px]">
                <CardHeader className="p-0 gap-0">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                            <BarChart3 className="w-6 h-6" />
                        </div>
                        <CardTitle className="text-2xl font-black text-gray-900">Content Performance</CardTitle>
                    </div>
                </CardHeader>
                <div className="absolute top-8 right-8 flex items-center gap-2">
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
                    <div className="mt-4">
                        {publishedPosts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                    <BarChart3 className="w-8 h-8 text-slate-400" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-700">No published content yet</h3>
                                <p className="text-slate-500 max-w-xs mt-2">
                                    Once your scheduled posts are published to Instagram, they will appear here with performance metrics.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {publishedPosts.map((post) => (
                                    <div
                                        key={post.id}
                                        onClick={() => setSelectedPostId(post.id)}
                                        className="group flex flex-col md:flex-row items-start md:items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-indigo-100 hover:shadow-lg transition-all cursor-pointer"
                                    >
                                        {/* Thumbnail */}
                                        <div className="relative w-full md:w-24 aspect-square rounded-xl overflow-hidden bg-slate-200 shrink-0">
                                            {post.type === 'VIDEO' ? (
                                                <video src={post.url} className="w-full h-full object-cover" />
                                            ) : (
                                                <Image
                                                    src={post.url}
                                                    alt="Post thumbnail"
                                                    fill
                                                    className="object-cover"
                                                    unoptimized
                                                />
                                            )}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge className="bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest border-0">
                                                    {post.postType || 'STORY'}
                                                </Badge>
                                                <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {post.publishedAt
                                                        ? new Date(post.publishedAt).toLocaleDateString(undefined, {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })
                                                        : 'Unknown date'}
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium text-slate-900 line-clamp-1 mb-2">
                                                {post.caption || 'No caption'}
                                            </p>

                                            {/* Quick Actions / Status */}
                                            <div className="flex items-center gap-4">
                                                <Badge className="bg-indigo-50 text-indigo-600 border-0 font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                    <BarChart3 className="w-3.5 h-3.5" />
                                                    View Insights
                                                </Badge>

                                                {!post.igMediaId && (
                                                    <Badge variant="destructive" className="bg-rose-50 text-rose-500 border-0 text-[10px] font-bold">
                                                        Insights Unavailable (No ID)
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>

                                        <div className="hidden md:block p-2 text-slate-300 group-hover:text-indigo-600 transition-colors">
                                            <ExternalLink className="w-5 h-5" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {selectedPostId && (
                <InsightsPanel
                    postId={selectedPostId}
                    isOpen={!!selectedPostId}
                    onClose={() => setSelectedPostId(null)}
                />
            )}
        </div>
    );
}
