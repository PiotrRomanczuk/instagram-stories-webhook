'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { RefreshCw, ExternalLink, Clock, Image as ImageIcon, Video, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { formatDistanceToNow } from 'date-fns';

interface InstagramStory {
	id: string;
	media_type: 'IMAGE' | 'VIDEO';
	media_url: string;
	thumbnail_url?: string;
	permalink?: string;
	caption?: string;
	timestamp: string;
	username?: string;
}

interface StoriesResponse {
	stories: InstagramStory[];
	count: number;
	error?: string;
}

export function StoryPreview() {
	const [loading, setLoading] = useState(false);
	const [data, setData] = useState<StoriesResponse | null>(null);
	const [error, setError] = useState<string | null>(null);

	const fetchStories = async () => {
		setLoading(true);
		setError(null);

		try {
			const res = await fetch('/api/instagram/recent-stories?limit=5');
			const result = await res.json();

			if (!res.ok) {
				throw new Error(result.error || 'Failed to fetch stories');
			}

			setData(result);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to fetch stories';
			setError(errorMessage);
			setData(null);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchStories();
	}, []);

	const lastStory = data?.stories[0];

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="flex items-center gap-2">
							<ImageIcon className="h-5 w-5" />
							Posted Stories Preview
						</CardTitle>
						<CardDescription>
							View your most recently posted Instagram stories
						</CardDescription>
					</div>
					<Button
						onClick={fetchStories}
						disabled={loading}
						variant="outline"
						size="sm"
					>
						<RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
						Refresh
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				{error && (
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				{!error && !loading && data && data.count === 0 && (
					<div className="text-center py-8 text-muted-foreground">
						<ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
						<p className="font-medium">No recent stories found</p>
						<p className="text-sm">Stories expire after 24 hours</p>
					</div>
				)}

				{!error && !loading && lastStory && (
					<div className="space-y-4">
						{/* Last Story Preview */}
						<div className="relative aspect-[9/16] max-w-[280px] mx-auto bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl overflow-hidden shadow-xl">
							{lastStory.media_type === 'IMAGE' ? (
								<Image
									src={lastStory.media_url}
									alt="Last story"
									fill
									className="object-cover"
									unoptimized
								/>
							) : (
								<div className="relative w-full h-full flex items-center justify-center bg-black">
									<video
										src={lastStory.media_url}
										className="w-full h-full object-cover"
										controls
										preload="metadata"
									/>
								</div>
							)}

							{/* Story Info Overlay */}
							<div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
								<div className="flex items-center gap-2">
									<Badge variant="secondary" className="gap-1">
										{lastStory.media_type === 'IMAGE' ? (
											<ImageIcon className="h-3 w-3" />
										) : (
											<Video className="h-3 w-3" />
										)}
										{lastStory.media_type}
									</Badge>
									<Badge variant="outline" className="gap-1 text-white border-white/40">
										<Clock className="h-3 w-3" />
										{formatDistanceToNow(new Date(lastStory.timestamp), { addSuffix: true })}
									</Badge>
								</div>
							</div>

							{/* Caption Overlay */}
							{lastStory.caption && (
								<div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
									<p className="text-white text-sm line-clamp-3">
										{lastStory.caption}
									</p>
								</div>
							)}
						</div>

						{/* Story Details */}
						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">Story ID</span>
								<code className="text-xs bg-muted px-2 py-1 rounded">
									{lastStory.id}
								</code>
							</div>
							{lastStory.username && (
								<div className="flex items-center justify-between text-sm">
									<span className="text-muted-foreground">Posted by</span>
									<span className="font-medium">@{lastStory.username}</span>
								</div>
							)}
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">Posted</span>
								<span className="font-medium">
									{new Date(lastStory.timestamp).toLocaleString()}
								</span>
							</div>
							{lastStory.permalink && (
								<div className="pt-2">
									<Button asChild variant="outline" size="sm" className="w-full">
										<a
											href={lastStory.permalink}
											target="_blank"
											rel="noopener noreferrer"
										>
											<ExternalLink className="h-4 w-4 mr-2" />
											View on Instagram
										</a>
									</Button>
								</div>
							)}
						</div>

						{/* Additional Stories Count */}
						{data.count > 1 && (
							<div className="text-center text-sm text-muted-foreground pt-2 border-t">
								{data.count - 1} more {data.count === 2 ? 'story' : 'stories'} in last 24h
							</div>
						)}
					</div>
				)}

				{loading && (
					<div className="flex items-center justify-center py-12">
						<RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				)}
			</CardContent>
		</Card>
	);
}
