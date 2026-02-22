/**
 * Browser-side Video Processing using FFmpeg-WASM
 *
 * Replicates the server-side FFmpeg transformations for Instagram Stories:
 * - Resolution: 1080x1920 (9:16 aspect ratio) with padding
 * - Codec: H.264 video, AAC audio
 * - Format: MP4
 * - Frame Rate: 30 fps
 * - Duration: Max 57 seconds (safety margin below Instagram's 60s limit)
 *
 * Uses @ffmpeg/ffmpeg to run FFmpeg entirely in the browser via WebAssembly.
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

// Instagram Stories constants (matching server-side video-processor.ts)
const VIDEO_STORY_WIDTH = 1080;
const VIDEO_STORY_HEIGHT = 1920;
const VIDEO_MAX_DURATION_SEC = 57;
const VIDEO_FRAME_RATE = 30;
const VIDEO_BITRATE = '3500k';
const AUDIO_BITRATE = '128k';
const THUMBNAIL_WIDTH = 540;
const THUMBNAIL_HEIGHT = 960;
const THUMBNAIL_OFFSET_SEC = 2;

export interface BrowserVideoMetadata {
	width: number;
	height: number;
	duration: number;
	codec: string;
	frameRate: number;
	hasAudio: boolean;
	fileSize: number;
}

export type ProcessingStep =
	| 'loading'
	| 'reading'
	| 'processing'
	| 'thumbnail'
	| 'done';

export interface BrowserProcessingResult {
	processedBlob: Blob;
	thumbnail: Blob;
	metadata: BrowserVideoMetadata;
}

// Singleton FFmpeg instance, cached after first load
let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<void> | null = null;

/**
 * Load FFmpeg WASM. Caches the instance after first load.
 * Loads core from unpkg CDN for cross-origin isolation compatibility.
 */
export async function loadFFmpeg(
	onProgress?: (progress: number) => void,
): Promise<FFmpeg> {
	if (ffmpegInstance?.loaded) {
		return ffmpegInstance;
	}

	if (loadPromise) {
		await loadPromise;
		return ffmpegInstance!;
	}

	const ffmpeg = new FFmpeg();

	if (onProgress) {
		ffmpeg.on('progress', ({ progress }: { progress: number }) => {
			onProgress(Math.min(Math.round(progress * 100), 100));
		});
	}

	loadPromise = (async () => {
		const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
		await ffmpeg.load({
			coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
			wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
		});
		ffmpegInstance = ffmpeg;
	})();

	try {
		await loadPromise;
	} catch (error) {
		loadPromise = null;
		ffmpegInstance = null;
		throw error;
	}

	return ffmpegInstance!;
}

/**
 * Build FFmpeg arguments for Instagram Stories video processing.
 * Mirrors the server-side buildFfmpegArgs logic.
 */
function buildProcessingArgs(inputFile: string, outputFile: string): string[] {
	// Since we can't reliably probe metadata in WASM, we apply all
	// transformations unconditionally. This ensures output always
	// meets Instagram Stories spec regardless of input format.
	const filterParts = [
		// Scale to fit within 1080x1920, maintaining aspect ratio
		`scale=${VIDEO_STORY_WIDTH}:${VIDEO_STORY_HEIGHT}:force_original_aspect_ratio=decrease`,
		// Pad to exactly 1080x1920 with black bars
		`pad=${VIDEO_STORY_WIDTH}:${VIDEO_STORY_HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=black`,
		// Set frame rate
		`fps=${VIDEO_FRAME_RATE}`,
	];

	return [
		'-y',
		'-i', inputFile,
		'-vf', filterParts.join(','),
		'-c:v', 'libx264',
		'-preset', 'fast', // Use 'fast' in browser for performance
		'-profile:v', 'high',
		'-level', '4.0',
		'-b:v', VIDEO_BITRATE,
		'-maxrate', VIDEO_BITRATE,
		'-bufsize', '7000k',
		'-pix_fmt', 'yuv420p',
		'-t', VIDEO_MAX_DURATION_SEC.toString(),
		'-c:a', 'aac',
		'-b:a', AUDIO_BITRATE,
		'-ac', '2',
		'-ar', '44100',
		'-movflags', '+faststart',
		'-f', 'mp4',
		outputFile,
	];
}

/**
 * Build FFmpeg arguments for thumbnail extraction.
 */
function buildThumbnailArgs(
	inputFile: string,
	outputFile: string,
	offsetSec: number,
): string[] {
	return [
		'-y',
		'-ss', offsetSec.toString(),
		'-i', inputFile,
		'-frames:v', '1',
		'-vf', `scale=${THUMBNAIL_WIDTH}:${THUMBNAIL_HEIGHT}:force_original_aspect_ratio=decrease,pad=${THUMBNAIL_WIDTH}:${THUMBNAIL_HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=black`,
		'-q:v', '2',
		outputFile,
	];
}

/**
 * Process a video file in the browser for Instagram Stories.
 *
 * Applies all necessary transformations:
 * - Scales to 1080x1920 with black padding
 * - Converts to H.264/AAC
 * - Limits to 57 seconds
 * - Extracts a thumbnail at 2s
 *
 * @param file - The video File from file input or drag-and-drop
 * @param onProgress - Callback for progress updates (0-100)
 * @param onStep - Callback for current processing step
 */
export async function processVideoInBrowser(
	file: File,
	onProgress?: (progress: number) => void,
	onStep?: (step: ProcessingStep) => void,
): Promise<BrowserProcessingResult> {
	// Step 1: Load FFmpeg
	onStep?.('loading');
	onProgress?.(0);
	const ffmpeg = await loadFFmpeg();

	// Step 2: Write input file to virtual filesystem
	onStep?.('reading');
	onProgress?.(10);
	const inputFileName = 'input' + getExtension(file.name);
	const fileData = await fetchFile(file);
	await ffmpeg.writeFile(inputFileName, fileData);

	// Set up progress tracking for the processing step
	if (onProgress) {
		ffmpeg.on('progress', ({ progress }: { progress: number }) => {
			// Map FFmpeg progress (0-1) to our range (15-80)
			const mapped = 15 + Math.round(progress * 65);
			onProgress(Math.min(mapped, 80));
		});
	}

	// Step 3: Process video
	onStep?.('processing');
	const outputFileName = 'output.mp4';
	const args = buildProcessingArgs(inputFileName, outputFileName);

	await ffmpeg.exec(args);

	const processedData = await ffmpeg.readFile(outputFileName);
	const processedBlob = toBlob(processedData, 'video/mp4');

	onProgress?.(85);

	// Step 4: Extract thumbnail
	onStep?.('thumbnail');
	const thumbnailFileName = 'thumbnail.jpg';
	const thumbArgs = buildThumbnailArgs(inputFileName, thumbnailFileName, THUMBNAIL_OFFSET_SEC);

	let thumbnail: Blob;
	try {
		await ffmpeg.exec(thumbArgs);
		const thumbData = await ffmpeg.readFile(thumbnailFileName);
		thumbnail = toBlob(thumbData, 'image/jpeg');
	} catch {
		// If thumbnail extraction fails (e.g., video shorter than 2s), try at 0s
		try {
			const fallbackArgs = buildThumbnailArgs(inputFileName, thumbnailFileName, 0);
			await ffmpeg.exec(fallbackArgs);
			const thumbData = await ffmpeg.readFile(thumbnailFileName);
			thumbnail = toBlob(thumbData, 'image/jpeg');
		} catch {
			// Return an empty blob if thumbnail extraction fails entirely
			thumbnail = new Blob([], { type: 'image/jpeg' });
		}
	}

	onProgress?.(95);

	// Cleanup virtual filesystem
	try {
		await ffmpeg.deleteFile(inputFileName);
		await ffmpeg.deleteFile(outputFileName);
		await ffmpeg.deleteFile(thumbnailFileName);
	} catch {
		// Ignore cleanup errors
	}

	// Build metadata for the processed output
	const metadata: BrowserVideoMetadata = {
		width: VIDEO_STORY_WIDTH,
		height: VIDEO_STORY_HEIGHT,
		duration: Math.min(file.size > 0 ? VIDEO_MAX_DURATION_SEC : 0, VIDEO_MAX_DURATION_SEC),
		codec: 'h264',
		frameRate: VIDEO_FRAME_RATE,
		hasAudio: true,
		fileSize: processedBlob.size,
	};

	onStep?.('done');
	onProgress?.(100);

	return {
		processedBlob,
		thumbnail,
		metadata,
	};
}

/**
 * Check if FFmpeg-WASM is supported in the current browser.
 * Requires SharedArrayBuffer which needs cross-origin isolation headers.
 */
export function isFFmpegWasmSupported(): boolean {
	return typeof SharedArrayBuffer !== 'undefined' && typeof WebAssembly !== 'undefined';
}

function getExtension(filename: string): string {
	const dot = filename.lastIndexOf('.');
	if (dot === -1) return '.mp4';
	return filename.substring(dot).toLowerCase();
}

/**
 * Convert FFmpeg readFile output to a Blob.
 * Handles the Uint8Array<ArrayBufferLike> vs ArrayBuffer type mismatch.
 */
function toBlob(data: Uint8Array | string, mimeType: string): Blob {
	if (typeof data === 'string') {
		return new Blob([new TextEncoder().encode(data)], { type: mimeType });
	}
	// Copy into a standard ArrayBuffer to satisfy TypeScript's Blob constructor
	const buffer = new ArrayBuffer(data.byteLength);
	new Uint8Array(buffer).set(data);
	return new Blob([buffer], { type: mimeType });
}
