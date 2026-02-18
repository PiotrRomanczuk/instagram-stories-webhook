import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/config/supabase-admin';

/**
 * GET /api/test/video-player-ui
 *
 * Returns an HTML page for testing video player implementations.
 * Public endpoint - no authentication required.
 */
export async function GET() {
	try {
		// Fetch videos from database
		const { data: videos, error } = await supabaseAdmin
			.from('content_items')
			.select('id, media_url, storage_path, thumbnail_url, video_duration, video_codec, created_at, publishing_status')
			.eq('media_type', 'VIDEO')
			.order('created_at', { ascending: false })
			.limit(10);

		if (error) {
			throw error;
		}

		const html = `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Video Player Test Suite</title>
	<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
	<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
	<script src="https://unpkg.com/react-player@2.16.0/dist/ReactPlayer.standalone.js"></script>
	<style>
		body {
			font-family: system-ui, -apple-system, sans-serif;
			margin: 0;
			padding: 20px;
			background: #f5f5f5;
		}
		.container {
			max-width: 1400px;
			margin: 0 auto;
		}
		h1 {
			margin-bottom: 30px;
		}
		.stats {
			display: grid;
			grid-template-columns: repeat(4, 1fr);
			gap: 20px;
			margin-bottom: 30px;
		}
		.stat-card {
			background: white;
			padding: 20px;
			border-radius: 8px;
			box-shadow: 0 1px 3px rgba(0,0,0,0.1);
		}
		.stat-card h3 {
			font-size: 14px;
			color: #666;
			margin: 0 0 10px 0;
		}
		.stat-card .value {
			font-size: 32px;
			font-weight: bold;
			color: #333;
		}
		.video-list {
			background: white;
			padding: 20px;
			border-radius: 8px;
			box-shadow: 0 1px 3px rgba(0,0,0,0.1);
			margin-bottom: 30px;
		}
		.video-item {
			padding: 15px;
			border: 2px solid #e0e0e0;
			border-radius: 8px;
			margin-bottom: 10px;
			cursor: pointer;
			transition: all 0.2s;
		}
		.video-item:hover {
			border-color: #3b82f6;
			background: #f8fafc;
		}
		.video-item.selected {
			border-color: #3b82f6;
			background: #eff6ff;
		}
		.video-meta {
			display: flex;
			justify-content: space-between;
			align-items: center;
		}
		.video-id {
			font-family: monospace;
			font-size: 14px;
		}
		.badges {
			display: flex;
			gap: 8px;
		}
		.badge {
			padding: 4px 12px;
			border-radius: 4px;
			font-size: 12px;
			font-weight: 600;
		}
		.badge.success {
			background: #10b981;
			color: white;
		}
		.badge.error {
			background: #ef4444;
			color: white;
		}
		.badge.neutral {
			background: #6b7280;
			color: white;
		}
		.test-grid {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
			gap: 20px;
		}
		.test-card {
			background: white;
			padding: 20px;
			border-radius: 8px;
			box-shadow: 0 1px 3px rgba(0,0,0,0.1);
		}
		.test-card h3 {
			margin-top: 0;
			display: flex;
			justify-content: space-between;
			align-items: center;
		}
		.player-container {
			background: #000;
			border-radius: 8px;
			padding: 20px;
			min-height: 300px;
			display: flex;
			align-items: center;
			justify-content: center;
			margin: 15px 0;
		}
		video {
			max-width: 100%;
			max-height: 400px;
		}
		.metadata {
			background: #f5f5f5;
			padding: 15px;
			border-radius: 6px;
			font-family: monospace;
			font-size: 12px;
			margin-top: 15px;
		}
		.status-indicator {
			display: inline-block;
			width: 12px;
			height: 12px;
			border-radius: 50%;
			margin-right: 8px;
		}
		.status-pass { background: #10b981; }
		.status-fail { background: #ef4444; }
		.status-pending { background: #6b7280; }
	</style>
</head>
<body>
	<div class="container">
		<h1>🎬 Video Player Test Suite</h1>

		<div class="stats">
			<div class="stat-card">
				<h3>Total Videos</h3>
				<div class="value">${videos?.length || 0}</div>
			</div>
			<div class="stat-card">
				<h3>With Thumbnails</h3>
				<div class="value">${videos?.filter(v => v.thumbnail_url).length || 0}</div>
			</div>
			<div class="stat-card">
				<h3>With Duration</h3>
				<div class="value">${videos?.filter(v => v.video_duration).length || 0}</div>
			</div>
			<div class="stat-card">
				<h3>With Codec</h3>
				<div class="value">${videos?.filter(v => v.video_codec).length || 0}</div>
			</div>
		</div>

		<div class="video-list">
			<h2>Available Videos (Click to Test)</h2>
			<div id="videoList"></div>
		</div>

		<div id="testResults"></div>
	</div>

	<script>
		const videos = ${JSON.stringify(videos || [])};
		let selectedVideo = videos[0] || null;

		function renderVideoList() {
			const container = document.getElementById('videoList');
			container.innerHTML = videos.map(video => \`
				<div class="video-item \${selectedVideo?.id === video.id ? 'selected' : ''}"
					 onclick="selectVideo('\${video.id}')">
					<div class="video-meta">
						<div class="video-id">\${video.id}</div>
						<div class="badges">
							<span class="badge \${video.thumbnail_url ? 'success' : 'error'}">
								\${video.thumbnail_url ? 'Has Thumb' : 'No Thumb'}
							</span>
							<span class="badge \${video.video_duration ? 'success' : 'neutral'}">
								\${video.video_duration ? video.video_duration + 's' : 'No Duration'}
							</span>
							<span class="badge neutral">\${video.publishing_status}</span>
						</div>
					</div>
					<div style="font-size: 11px; color: #666; margin-top: 8px;">
						\${video.storage_path}
					</div>
				</div>
			\`).join('');
		}

		function selectVideo(id) {
			selectedVideo = videos.find(v => v.id === id);
			renderVideoList();
			renderTests();
		}

		function renderTests() {
			if (!selectedVideo) {
				document.getElementById('testResults').innerHTML = '<p>No video selected</p>';
				return;
			}

			const container = document.getElementById('testResults');
			container.innerHTML = \`
				<h2>Testing: \${selectedVideo.id}</h2>
				<div class="metadata">
					<strong>URL:</strong> \${selectedVideo.media_url}<br>
					<strong>Thumbnail:</strong> \${selectedVideo.thumbnail_url || 'null'}<br>
					<strong>Duration:</strong> \${selectedVideo.video_duration || 'null'}<br>
					<strong>Codec:</strong> \${selectedVideo.video_codec || 'null'}
				</div>

				<div class="test-grid">
					<!-- Test 1: Native HTML5 Video -->
					<div class="test-card">
						<h3>
							<span>Test 1: Native HTML5 Video</span>
							<span id="status-native" class="status-indicator status-pending"></span>
						</h3>
						<div class="player-container">
							<video
								src="\${selectedVideo.media_url}"
								controls
								poster="\${selectedVideo.thumbnail_url || ''}"
								onloadeddata="updateStatus('native', true)"
								onerror="updateStatus('native', false)"
							></video>
						</div>
						<p style="font-size: 13px; color: #666;">
							Standard HTML5 video with controls. Should work with any browser-supported format.
						</p>
					</div>

					<!-- Test 2: ReactPlayer -->
					<div class="test-card">
						<h3>
							<span>Test 2: ReactPlayer</span>
							<span id="status-reactplayer" class="status-indicator status-pending"></span>
						</h3>
						<div class="player-container" id="reactplayer-container"></div>
						<p style="font-size: 13px; color: #666;">
							ReactPlayer component with controls and light mode.
						</p>
					</div>

					<!-- Test 3: Direct Video (No Controls) -->
					<div class="test-card">
						<h3>
							<span>Test 3: Video (No Controls)</span>
							<span id="status-nocontrols" class="status-indicator status-pending"></span>
						</h3>
						<div class="player-container">
							<video
								src="\${selectedVideo.media_url}"
								onloadeddata="updateStatus('nocontrols', true)"
								onerror="updateStatus('nocontrols', false)"
								style="max-width: 100%; max-height: 400px;"
							></video>
						</div>
						<p style="font-size: 13px; color: #666;">
							Video element without controls - tests basic video loading.
						</p>
					</div>

					<!-- Test 4: Video with Autoplay -->
					<div class="test-card">
						<h3>
							<span>Test 4: Video (Muted Autoplay)</span>
							<span id="status-autoplay" class="status-indicator status-pending"></span>
						</h3>
						<div class="player-container">
							<video
								src="\${selectedVideo.media_url}"
								controls
								muted
								autoplay
								playsInline
								onloadeddata="updateStatus('autoplay', true)"
								onerror="updateStatus('autoplay', false)"
								style="max-width: 100%; max-height: 400px;"
							></video>
						</div>
						<p style="font-size: 13px; color: #666;">
							Video with muted autoplay (Instagram Stories style).
						</p>
					</div>
				</div>
			\`;

			// Initialize ReactPlayer
			setTimeout(() => {
				const container = document.getElementById('reactplayer-container');
				if (window.ReactPlayer && container) {
					try {
						ReactDOM.render(
							React.createElement(window.ReactPlayer, {
								url: selectedVideo.media_url,
								controls: true,
								width: '100%',
								height: '300px',
								light: selectedVideo.thumbnail_url || false,
								onReady: () => updateStatus('reactplayer', true),
								onError: () => updateStatus('reactplayer', false)
							}),
							container
						);
					} catch (e) {
						console.error('ReactPlayer error:', e);
						updateStatus('reactplayer', false);
					}
				}
			}, 100);
		}

		function updateStatus(testId, success) {
			const indicator = document.getElementById('status-' + testId);
			if (indicator) {
				indicator.className = 'status-indicator status-' + (success ? 'pass' : 'fail');
			}
			console.log('Test ' + testId + ':', success ? 'PASS' : 'FAIL');
		}

		// Initialize
		renderVideoList();
		if (selectedVideo) {
			renderTests();
		}
	</script>
</body>
</html>
		`;

		return new NextResponse(html, {
			headers: {
				'Content-Type': 'text/html',
			},
		});
	} catch (error) {
		console.error('[test/video-player-ui] Error:', error);
		return NextResponse.json(
			{ error: 'Failed to load test page' },
			{ status: 500 }
		);
	}
}
