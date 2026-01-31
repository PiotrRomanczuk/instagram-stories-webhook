'use client';

import { useState, useCallback, useEffect } from 'react';
import { BarChart3, Calendar, RefreshCw, Loader2, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { QuotaCardNew } from './quota-card-new';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface PublishedPost {
	id: string;
	url: string;
	type: 'IMAGE' | 'VIDEO';
	caption?: string;
	postType?: string;
	status: string;
	publishedAt?: number;
	igMediaId?: string;
}

interface InsightsData {
	impressions?: number;
	reach?: number;
	replies?: number;
	exits?: number;
	taps_forward?: number;
	taps_back?: number;
}

export function InsightsDashboardNew() {
	const [posts, setPosts] = useState<PublishedPost[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedPost, setSelectedPost] = useState<PublishedPost | null>(null);
	const [insights, setInsights] = useState<InsightsData | null>(null);
	const [insightsLoading, setInsightsLoading] = useState(false);

	const fetchPosts = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch('/api/schedule');
			if (res.ok) {
				const data = await res.json();
				const publishedPosts = (data.posts || [])
					.filter((p: PublishedPost) => p.status === 'published')
					.sort(
						(a: PublishedPost, b: PublishedPost) =>
							(b.publishedAt || 0) - (a.publishedAt || 0)
					);
				setPosts(publishedPosts);
			}
		} catch (error) {
			console.error('Failed to fetch posts:', error);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchPosts();
	}, [fetchPosts]);

	const fetchInsights = async (postId: string) => {
		setInsightsLoading(true);
		setInsights(null);
		try {
			const res = await fetch(`/api/insights/${postId}`);
			if (res.ok) {
				const data = await res.json();
				setInsights(data.insights);
			}
		} catch (error) {
			console.error('Failed to fetch insights:', error);
		} finally {
			setInsightsLoading(false);
		}
	};

	const handleSelectPost = (post: PublishedPost) => {
		setSelectedPost(post);
		if (post.igMediaId) {
			fetchInsights(post.id);
		}
	};

	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<QuotaCardNew />
			</div>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0">
					<CardTitle className="flex items-center gap-2">
						<BarChart3 className="h-5 w-5" />
						Content Performance
					</CardTitle>
					<Button variant="outline" size="sm" onClick={fetchPosts} disabled={loading}>
						<RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
						Refresh
					</Button>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="flex items-center justify-center py-24">
							<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
						</div>
					) : posts.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-20 text-center">
							<div className="rounded-full bg-muted p-6 mb-4">
								<BarChart3 className="h-8 w-8 text-muted-foreground" />
							</div>
							<h3 className="text-lg font-semibold">No published content yet</h3>
							<p className="text-muted-foreground max-w-xs mt-2">
								Once your scheduled posts are published to Instagram, they will
								appear here with performance metrics.
							</p>
						</div>
					) : (
						<ScrollArea className="h-[500px]">
							<div className="space-y-3">
								{posts.map((post) => (
									<button
										key={post.id}
										onClick={() => handleSelectPost(post)}
										className="w-full flex flex-col md:flex-row items-start md:items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-left"
									>
										<div className="relative w-full md:w-20 aspect-square rounded-lg overflow-hidden bg-muted flex-shrink-0">
											{post.type === 'VIDEO' ? (
												<video
													src={post.url}
													className="w-full h-full object-cover"
												/>
											) : (
												<Image
													src={post.url}
													alt="Post thumbnail"
													fill
													className="object-cover"
													unoptimized
												/>
											)}
										</div>

										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 mb-1">
												<Badge variant="secondary" className="text-xs">
													{post.postType || 'STORY'}
												</Badge>
												<span className="text-xs text-muted-foreground flex items-center gap-1">
													<Calendar className="h-3 w-3" />
													{post.publishedAt
														? new Date(post.publishedAt).toLocaleDateString(
																undefined,
																{
																	month: 'short',
																	day: 'numeric',
																	hour: '2-digit',
																	minute: '2-digit',
																}
															)
														: 'Unknown date'}
												</span>
											</div>
											<p className="text-sm truncate mb-2">
												{post.caption || 'No caption'}
											</p>

											<div className="flex items-center gap-2">
												<Badge variant="outline" className="gap-1">
													<BarChart3 className="h-3 w-3" />
													View Insights
												</Badge>
												{!post.igMediaId && (
													<Badge variant="destructive" className="text-xs">
														No ID - Insights Unavailable
													</Badge>
												)}
											</div>
										</div>

										<ExternalLink className="hidden md:block h-4 w-4 text-muted-foreground" />
									</button>
								))}
							</div>
						</ScrollArea>
					)}
				</CardContent>
			</Card>

			<Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Post Insights</DialogTitle>
					</DialogHeader>
					{selectedPost && (
						<div className="space-y-4">
							<div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
								{selectedPost.type === 'VIDEO' ? (
									<video
										src={selectedPost.url}
										className="w-full h-full object-cover"
										controls
									/>
								) : (
									<Image
										src={selectedPost.url}
										alt="Post"
										fill
										className="object-cover"
										unoptimized
									/>
								)}
							</div>

							{insightsLoading ? (
								<div className="flex items-center justify-center py-8">
									<Loader2 className="h-6 w-6 animate-spin" />
								</div>
							) : !selectedPost.igMediaId ? (
								<p className="text-center text-muted-foreground py-4">
									Insights unavailable - no Instagram Media ID
								</p>
							) : insights ? (
								<div className="grid grid-cols-2 gap-3">
									<InsightMetric label="Impressions" value={insights.impressions} />
									<InsightMetric label="Reach" value={insights.reach} />
									<InsightMetric label="Replies" value={insights.replies} />
									<InsightMetric label="Exits" value={insights.exits} />
									<InsightMetric label="Taps Forward" value={insights.taps_forward} />
									<InsightMetric label="Taps Back" value={insights.taps_back} />
								</div>
							) : (
								<p className="text-center text-muted-foreground py-4">
									No insights data available
								</p>
							)}
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}

function InsightMetric({ label, value }: { label: string; value?: number }) {
	return (
		<div className="p-3 rounded-lg bg-muted">
			<p className="text-xs text-muted-foreground">{label}</p>
			<p className="text-lg font-semibold">{value ?? '-'}</p>
		</div>
	);
}
