/**
 * Client-side media utility functions
 */

/**
 * Extract a thumbnail frame from a video URL at the given time (default 0.5s)
 * 
 * @param videoUrl URL of the video to extract thumbnail from
 * @param timeSeconds Time in seconds to capture the frame at (default: 0.5)
 * @returns Promise resolving to the data URL of the image, or null if failed
 */
export async function extractThumbnailFromVideo(
	videoUrl: string,
	timeSeconds = 0.5
): Promise<string | null> {
	if (typeof window === 'undefined') return null;

	return new Promise((resolve) => {
		const video = document.createElement('video');
		video.src = videoUrl;
		video.muted = true;
		video.crossOrigin = 'anonymous';
		video.preload = 'metadata';
		video.playsInline = true;

		const cleanup = () => {
			video.pause();
			video.removeAttribute('src');
			video.load();
		};

		const timeout = setTimeout(() => {
			cleanup();
			resolve(null);
		}, 10_000);

		// Video needs to be loaded enough to seek
		video.addEventListener('loadedmetadata', () => {
			// Seek to the requested time or 0 if video is shorter
			// Use a small offset if video is very short to avoid 0s sometimes being black
			const seekTime = Math.min(timeSeconds, video.duration > 0.1 ? video.duration / 2 : 0);
			video.currentTime = seekTime;
		}, { once: true });

		video.addEventListener('seeked', () => {
			try {
				const canvas = document.createElement('canvas');
				canvas.width = video.videoWidth || 360;
				canvas.height = video.videoHeight || 640;
				const ctx = canvas.getContext('2d');
				if (!ctx) {
					clearTimeout(timeout);
					cleanup();
					resolve(null);
					return;
				}
				ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
				const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
				clearTimeout(timeout);
				cleanup();
				resolve(dataUrl);
			} catch (e) {
				console.error('Error extracting thumbnail frame:', e);
				clearTimeout(timeout);
				cleanup();
				resolve(null);
			}
		}, { once: true });

		video.addEventListener('error', () => {
			clearTimeout(timeout);
			cleanup();
			resolve(null);
		}, { once: true });
	});
}
