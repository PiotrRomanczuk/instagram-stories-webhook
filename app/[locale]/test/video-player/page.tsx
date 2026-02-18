'use client';

import { useEffect, useState } from 'react';
import ReactPlayer from 'react-player';
import { VideoPreview } from '@/app/components/media/video-preview';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Play, Pause, RefreshCw } from 'lucide-react';

interface VideoData {
	id: string;
	media_url: string;
	storage_path: string;
	thumbnail_url: string | null;
	video_duration: number | null;
	video_codec: string | null;
	created_at: string;
	publishing_status: string;
}

export default function VideoPlayerTestPage() {
	const [videos, setVideos] = useState<VideoData[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null);
	const [testResults, setTestResults] = useState<Record<string, string>>({});

	useEffect(() => {
		fetchVideos();
	}, []);

	async function fetchVideos() {
		try {
			setLoading(true);
			const response = await fetch('/api/test/videos');

			if (!response.ok) {
				throw new Error('Failed to fetch videos');
			}

			const data = await response.json();
			setVideos(data.videos || []);

			if (data.videos && data.videos.length > 0) {
				setSelectedVideo(data.videos[0]);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load videos');
		} finally {
			setLoading(false);
		}
	}

	function testVideoLoad(videoId: string, playerType: string, success: boolean) {
		setTestResults(prev => ({
			...prev,
			[`${videoId}-${playerType}`]: success ? 'PASS' : 'FAIL'
		}));
	}

	if (loading) {
		return (
			<div className="container mx-auto p-8">
				<h1 className="text-3xl font-bold mb-8">Video Player Test Suite</h1>
				<p>Loading videos from Supabase...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="container mx-auto p-8">
				<h1 className="text-3xl font-bold mb-8">Video Player Test Suite</h1>
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
					<p className="font-bold">Error</p>
					<p>{error}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto p-8 max-w-7xl">
			<div className="flex items-center justify-between mb-8">
				<h1 className="text-3xl font-bold">Video Player Test Suite</h1>
				<Button onClick={fetchVideos} variant="outline">
					<RefreshCw className="h-4 w-4 mr-2" />
					Reload
				</Button>
			</div>

			{/* Summary Stats */}
			<div className="grid grid-cols-4 gap-4 mb-8">
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium">Total Videos</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{videos.length}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium">With Thumbnails</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{videos.filter(v => v.thumbnail_url).length}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium">With Duration</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{videos.filter(v => v.video_duration).length}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium">With Codec</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{videos.filter(v => v.video_codec).length}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Video List */}
			<Card className="mb-8">
				<CardHeader>
					<CardTitle>Available Videos</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						{videos.map((video) => (
							<div
								key={video.id}
								onClick={() => setSelectedVideo(video)}
								className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
									selectedVideo?.id === video.id ? 'border-blue-500 bg-blue-50' : ''
								}`}
							>
								<div className="flex items-center justify-between">
									<div>
										<p className="font-mono text-sm">{video.id}</p>
										<p className="text-xs text-gray-500">{video.storage_path}</p>
									</div>
									<div className="flex gap-2">
										<Badge variant={video.thumbnail_url ? 'default' : 'destructive'}>
											{video.thumbnail_url ? 'Has Thumb' : 'No Thumb'}
										</Badge>
										<Badge variant={video.video_duration ? 'default' : 'secondary'}>
											{video.video_duration ? `${video.video_duration}s` : 'No Duration'}
										</Badge>
										<Badge variant="outline">{video.publishing_status}</Badge>
									</div>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Selected Video Tests */}
			{selectedVideo && (
				<div className="space-y-8">
					<div>
						<h2 className="text-2xl font-bold mb-4">Testing: {selectedVideo.id}</h2>
						<div className="bg-gray-100 p-4 rounded-lg font-mono text-sm">
							<p><strong>URL:</strong> {selectedVideo.media_url}</p>
							<p><strong>Thumbnail:</strong> {selectedVideo.thumbnail_url || 'null'}</p>
							<p><strong>Duration:</strong> {selectedVideo.video_duration || 'null'}</p>
							<p><strong>Codec:</strong> {selectedVideo.video_codec || 'null'}</p>
						</div>
					</div>

					{/* Test 1: Native HTML5 Video */}
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<CardTitle>Test 1: Native HTML5 Video Element</CardTitle>
								<Badge variant={testResults[`${selectedVideo.id}-native`] === 'PASS' ? 'default' : 'secondary'}>
									{testResults[`${selectedVideo.id}-native`] || 'PENDING'}
								</Badge>
							</div>
						</CardHeader>
						<CardContent>
							<div className="bg-black rounded-lg p-4 flex items-center justify-center">
								<video
									src={selectedVideo.media_url}
									controls
									className="max-w-full max-h-96"
									onLoadedData={() => testVideoLoad(selectedVideo.id, 'native', true)}
									onError={() => testVideoLoad(selectedVideo.id, 'native', false)}
									poster={selectedVideo.thumbnail_url || undefined}
								/>
							</div>
							<p className="mt-4 text-sm text-gray-600">
								Standard HTML5 video element with controls. Should work with any browser-supported video format.
							</p>
						</CardContent>
					</Card>

					{/* Test 2: ReactPlayer */}
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<CardTitle>Test 2: ReactPlayer Component</CardTitle>
								<Badge variant={testResults[`${selectedVideo.id}-reactplayer`] === 'PASS' ? 'default' : 'secondary'}>
									{testResults[`${selectedVideo.id}-reactplayer`] || 'PENDING'}
								</Badge>
							</div>
						</CardHeader>
						<CardContent>
							<div className="bg-black rounded-lg p-4 flex items-center justify-center">
								<ReactPlayer
									url={selectedVideo.media_url}
									controls
									width="100%"
									height="auto"
									style={{ maxHeight: '400px' }}
									onReady={() => testVideoLoad(selectedVideo.id, 'reactplayer', true)}
									onError={() => testVideoLoad(selectedVideo.id, 'reactplayer', false)}
									light={selectedVideo.thumbnail_url || undefined}
								/>
							</div>
							<p className="mt-4 text-sm text-gray-600">
								ReactPlayer with controls and light mode (shows thumbnail until play). Used in submission cards.
							</p>
						</CardContent>
					</Card>

					{/* Test 3: ReactPlayer (MediaModal style) */}
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<CardTitle>Test 3: ReactPlayer (MediaModal Config)</CardTitle>
								<Badge variant={testResults[`${selectedVideo.id}-modal`] === 'PASS' ? 'default' : 'secondary'}>
									{testResults[`${selectedVideo.id}-modal`] || 'PENDING'}
								</Badge>
							</div>
						</CardHeader>
						<CardContent>
							<div className="bg-black rounded-lg p-4 flex items-center justify-center min-h-[300px]">
								<ReactPlayer
									url={selectedVideo.media_url}
									controls
									width="100%"
									height="100%"
									playing={false}
									onReady={() => testVideoLoad(selectedVideo.id, 'modal', true)}
									onError={() => testVideoLoad(selectedVideo.id, 'modal', false)}
								/>
							</div>
							<p className="mt-4 text-sm text-gray-600">
								ReactPlayer configured like MediaModal component (src prop, playsInline). Used when clicking video posts.
							</p>
						</CardContent>
					</Card>

					{/* Test 4: VideoPreview Component */}
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<CardTitle>Test 4: VideoPreview Component</CardTitle>
								<Badge variant={testResults[`${selectedVideo.id}-videopreview`] === 'PASS' ? 'default' : 'secondary'}>
									{testResults[`${selectedVideo.id}-videopreview`] || 'PENDING'}
								</Badge>
							</div>
						</CardHeader>
						<CardContent>
							<div className="flex items-center justify-center p-8">
								<VideoPreview
									videoUrl={selectedVideo.media_url}
									thumbnailUrl={selectedVideo.thumbnail_url || undefined}
									duration={selectedVideo.video_duration || undefined}
									codec={selectedVideo.video_codec || undefined}
									validationStatus="valid"
								/>
							</div>
							<p className="mt-4 text-sm text-gray-600">
								Custom VideoPreview component with phone frame. Used on submit page and review page.
							</p>
						</CardContent>
					</Card>

					{/* Test 5: Compact VideoPreview */}
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<CardTitle>Test 5: VideoPreview (Compact Mode)</CardTitle>
								<Badge variant={testResults[`${selectedVideo.id}-compact`] === 'PASS' ? 'default' : 'secondary'}>
									{testResults[`${selectedVideo.id}-compact`] || 'PENDING'}
								</Badge>
							</div>
						</CardHeader>
						<CardContent>
							<div className="flex items-center justify-center p-8">
								<VideoPreview
									videoUrl={selectedVideo.media_url}
									thumbnailUrl={selectedVideo.thumbnail_url || undefined}
									duration={selectedVideo.video_duration || undefined}
									compact
								/>
							</div>
							<p className="mt-4 text-sm text-gray-600">
								Compact VideoPreview (80x142px) for grid views and thumbnails.
							</p>
						</CardContent>
					</Card>
				</div>
			)}

			{videos.length === 0 && (
				<Card>
					<CardContent className="pt-6">
						<p className="text-center text-gray-500">
							No videos found in storage. Upload a video to test the player implementations.
						</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
