import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';

// Use vi.hoisted so these are available when vi.mock factories run (hoisted to top)
const { mockSpawn } = vi.hoisted(() => ({
	mockSpawn: vi.fn(),
}));

// Mock child_process before importing the module under test
vi.mock(import('child_process'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		default: { ...actual, spawn: mockSpawn },
		spawn: mockSpawn,
	};
});

vi.mock(import('fs'), async (importOriginal) => {
	const actual = await importOriginal();
	const mockPromises = {
		...actual.promises,
		writeFile: vi.fn().mockResolvedValue(undefined),
		readFile: vi.fn().mockResolvedValue(Buffer.from('processed-video-data')),
		unlink: vi.fn().mockResolvedValue(undefined),
	};
	return {
		...actual,
		default: { ...actual, promises: mockPromises },
		promises: mockPromises,
	};
});

vi.mock(import('os'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		default: { ...actual, tmpdir: vi.fn().mockReturnValue('/tmp') },
		tmpdir: vi.fn().mockReturnValue('/tmp'),
	};
});

vi.mock('@/lib/utils/logger', () => ({
	Logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

vi.mock('@/lib/config/supabase-admin', () => ({
	supabaseAdmin: {
		storage: {
			from: vi.fn().mockReturnValue({
				upload: vi.fn().mockResolvedValue({ error: null }),
				getPublicUrl: vi.fn().mockReturnValue({
					data: { publicUrl: 'https://example.com/processed.mp4' },
				}),
			}),
		},
	},
}));

import {
	checkFfmpegAvailable,
	getVideoMetadata,
	validateVideoForStories,
	videoNeedsProcessing,
	processVideoForStory,
	processAndUploadStoryVideo,
	getVideoProcessingBackend,
	extractVideoThumbnail,
	VIDEO_STORY_WIDTH,
	VIDEO_STORY_HEIGHT,
} from '@/lib/media/video-processor';

// Store original env and fetch for Railway tests
const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;

// Helper to create a mock child process with EventEmitter behavior
function createMockProcess() {
	const proc = new EventEmitter() as EventEmitter & {
		stdout: EventEmitter;
		stderr: EventEmitter;
	};
	proc.stdout = new EventEmitter();
	proc.stderr = new EventEmitter();
	return proc;
}

/**
 * Helper: create a mock process that immediately succeeds (emits 'close' 0).
 * Used for the ffmpeg availability check that ensureFfmpegAvailable() runs.
 */
function createSuccessfulFfmpegCheckProcess() {
	const proc = createMockProcess();
	process.nextTick(() => {
		proc.emit('close', 0);
	});
	return proc;
}

// Standard ffprobe output for a valid video
function createFfprobeOutput(overrides: Record<string, unknown> = {}) {
	const defaults = {
		streams: [
			{
				codec_type: 'video',
				codec_name: 'h264',
				width: 1080,
				height: 1920,
				r_frame_rate: '30/1',
			},
			{
				codec_type: 'audio',
				codec_name: 'aac',
			},
		],
		format: {
			duration: '15.0',
			bit_rate: '3500000',
			format_name: 'mp4',
			size: '6553600', // ~6.25 MB
		},
	};

	return JSON.stringify({ ...defaults, ...overrides });
}

/**
 * Sets up mockSpawn for getVideoMetadata tests:
 *  - The first call (ffmpeg -version check from ensureFfmpegAvailable) succeeds immediately
 *  - The second call (ffprobe) emits the given output and closes with the given code
 *
 * For error tests, pass errorEvent to emit an 'error' event on the ffprobe process instead.
 */
function setupSpawnForMetadata(opts: {
	ffprobeOutput?: string;
	ffprobeStderr?: string;
	ffprobeExitCode?: number;
	ffprobeError?: Error;
}) {
	let callIndex = 0;
	mockSpawn.mockImplementation(() => {
		callIndex++;
		if (callIndex === 1) {
			// ensureFfmpegAvailable -> spawn('ffmpeg', ['-version'])
			return createSuccessfulFfmpegCheckProcess();
		}
		// spawn('ffprobe', args)
		const ffprobeProc = createMockProcess();
		process.nextTick(() => {
			if (opts.ffprobeError) {
				ffprobeProc.emit('error', opts.ffprobeError);
			} else {
				if (opts.ffprobeStderr) {
					ffprobeProc.stderr.emit('data', opts.ffprobeStderr);
				}
				if (opts.ffprobeOutput) {
					ffprobeProc.stdout.emit('data', opts.ffprobeOutput);
				}
				ffprobeProc.emit('close', opts.ffprobeExitCode ?? 0);
			}
		});
		return ffprobeProc;
	});
}

describe('video-processor', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ======== checkFfmpegAvailable ========

	describe('checkFfmpegAvailable', () => {
		it('should return true when ffmpeg exits with code 0', async () => {
			const mockProc = createMockProcess();
			mockSpawn.mockReturnValue(mockProc);

			const promise = checkFfmpegAvailable();

			// Simulate ffmpeg exiting successfully
			mockProc.emit('close', 0);

			const result = await promise;
			expect(result).toBe(true);
			expect(mockSpawn).toHaveBeenCalledWith('ffmpeg', ['-version']);
		});

		it('should return false when ffmpeg exits with non-zero code', async () => {
			const mockProc = createMockProcess();
			mockSpawn.mockReturnValue(mockProc);

			const promise = checkFfmpegAvailable();

			mockProc.emit('close', 1);

			const result = await promise;
			expect(result).toBe(false);
		});

		it('should return false when ffmpeg spawn errors', async () => {
			const mockProc = createMockProcess();
			mockSpawn.mockReturnValue(mockProc);

			const promise = checkFfmpegAvailable();

			mockProc.emit('error', new Error('ENOENT: ffmpeg not found'));

			const result = await promise;
			expect(result).toBe(false);
		});
	});

	// ======== getVideoMetadata ========

	describe('getVideoMetadata', () => {
		// NOTE: getVideoMetadata calls ensureFfmpegAvailable() first, which spawns
		// 'ffmpeg -version'. We must account for this extra spawn call in every test.

		it('should parse ffprobe output correctly', async () => {
			setupSpawnForMetadata({ ffprobeOutput: createFfprobeOutput() });

			const metadata = await getVideoMetadata('/tmp/test.mp4');

			expect(metadata.width).toBe(1080);
			expect(metadata.height).toBe(1920);
			expect(metadata.duration).toBe(15.0);
			expect(metadata.codec).toBe('h264');
			expect(metadata.frameRate).toBe(30);
			expect(metadata.bitrate).toBe(3500000);
			expect(metadata.hasAudio).toBe(true);
			expect(metadata.audioCodec).toBe('aac');
			expect(metadata.format).toBe('mp4');
			expect(metadata.fileSize).toBe(6553600);
		});

		it('should parse frame rate from fraction format (e.g., "30000/1001")', async () => {
			const output = createFfprobeOutput({
				streams: [
					{
						codec_type: 'video',
						codec_name: 'h264',
						width: 1920,
						height: 1080,
						r_frame_rate: '30000/1001', // 29.97 fps NTSC
					},
				],
			});
			setupSpawnForMetadata({ ffprobeOutput: output });

			const metadata = await getVideoMetadata('/tmp/test.mp4');
			// 30000/1001 = 29.97002997...
			expect(metadata.frameRate).toBeCloseTo(29.97, 1);
		});

		it('should parse frame rate from simple number format', async () => {
			const output = createFfprobeOutput({
				streams: [
					{
						codec_type: 'video',
						codec_name: 'h264',
						width: 1920,
						height: 1080,
						r_frame_rate: '24', // No denominator
					},
				],
			});
			setupSpawnForMetadata({ ffprobeOutput: output });

			const metadata = await getVideoMetadata('/tmp/test.mp4');
			expect(metadata.frameRate).toBe(24);
		});

		it('should reject when no video stream found', async () => {
			const output = JSON.stringify({
				streams: [{ codec_type: 'audio', codec_name: 'aac' }],
				format: {
					duration: '120.0',
					bit_rate: '128000',
					format_name: 'mp3',
					size: '1920000',
				},
			});
			setupSpawnForMetadata({ ffprobeOutput: output });

			await expect(getVideoMetadata('/tmp/audio-only.mp3')).rejects.toThrow(
				'No video stream found'
			);
		});

		it('should reject when ffprobe fails with non-zero exit code', async () => {
			setupSpawnForMetadata({
				ffprobeStderr: 'Invalid data found when processing input',
				ffprobeExitCode: 1,
			});

			await expect(getVideoMetadata('/tmp/corrupt.mp4')).rejects.toThrow(
				'FFprobe failed'
			);
		});

		it('should reject when ffprobe binary is not found', async () => {
			setupSpawnForMetadata({
				ffprobeError: new Error('spawn ffprobe ENOENT'),
			});

			await expect(getVideoMetadata('/tmp/test.mp4')).rejects.toThrow(
				'FFprobe not found or failed'
			);
		});

		it('should reject on malformed JSON output', async () => {
			setupSpawnForMetadata({ ffprobeOutput: 'not valid json {{{' });

			await expect(getVideoMetadata('/tmp/test.mp4')).rejects.toThrow(
				'Failed to parse video metadata'
			);
		});

		it('should handle video without audio stream', async () => {
			const output = JSON.stringify({
				streams: [
					{
						codec_type: 'video',
						codec_name: 'h264',
						width: 1080,
						height: 1920,
						r_frame_rate: '30/1',
					},
				],
				format: {
					duration: '10.0',
					bit_rate: '3000000',
					format_name: 'mp4',
					size: '3750000',
				},
			});
			setupSpawnForMetadata({ ffprobeOutput: output });

			const metadata = await getVideoMetadata('/tmp/no-audio.mp4');
			expect(metadata.hasAudio).toBe(false);
			expect(metadata.audioCodec).toBeUndefined();
		});

		it('should pass correct arguments to ffprobe', async () => {
			setupSpawnForMetadata({ ffprobeOutput: createFfprobeOutput() });

			await getVideoMetadata('/tmp/test.mp4');

			expect(mockSpawn).toHaveBeenCalledWith('ffprobe', [
				'-v',
				'quiet',
				'-print_format',
				'json',
				'-show_format',
				'-show_streams',
				'/tmp/test.mp4',
			]);
		});
	});

	// ======== validateVideoForStories ========

	describe('validateVideoForStories', () => {
		// Helper: set up spawn to handle both the ensureFfmpegAvailable check
		// and the ffprobe call that getVideoMetadata makes
		function setupFfprobeForValidation(ffprobeOutput: string) {
			let callIndex = 0;
			mockSpawn.mockImplementation(() => {
				callIndex++;
				if (callIndex === 1) {
					// ensureFfmpegAvailable -> spawn('ffmpeg', ['-version'])
					return createSuccessfulFfmpegCheckProcess();
				}
				// spawn('ffprobe', args) - the actual metadata extraction
				const ffprobeProc = createMockProcess();
				process.nextTick(() => {
					ffprobeProc.stdout.emit('data', ffprobeOutput);
					ffprobeProc.emit('close', 0);
				});
				return ffprobeProc;
			});
		}

		it('should validate a perfect Instagram Stories video', async () => {
			setupFfprobeForValidation(createFfprobeOutput());

			const result = await validateVideoForStories(Buffer.from('video-data'));

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
			expect(result.metadata).not.toBeNull();
			expect(result.metadata?.width).toBe(1080);
			expect(result.metadata?.height).toBe(1920);
		});

		it('should flag video with wrong codec for processing', async () => {
			const output = createFfprobeOutput({
				streams: [
					{
						codec_type: 'video',
						codec_name: 'vp9',
						width: 1080,
						height: 1920,
						r_frame_rate: '30/1',
					},
					{ codec_type: 'audio', codec_name: 'aac' },
				],
			});
			setupFfprobeForValidation(output);

			const result = await validateVideoForStories(Buffer.from('video-data'));

			expect(result.valid).toBe(true); // Not a critical error
			expect(result.needsProcessing).toBe(true);
			expect(result.processingReasons).toEqual(
				expect.arrayContaining([expect.stringContaining('Codec vp9')])
			);
		});

		it('should flag video with wrong resolution for processing', async () => {
			const output = createFfprobeOutput({
				streams: [
					{
						codec_type: 'video',
						codec_name: 'h264',
						width: 1920,
						height: 1080, // 16:9 landscape
						r_frame_rate: '30/1',
					},
					{ codec_type: 'audio', codec_name: 'aac' },
				],
			});
			setupFfprobeForValidation(output);

			const result = await validateVideoForStories(Buffer.from('video-data'));

			expect(result.valid).toBe(true);
			expect(result.needsProcessing).toBe(true);
			expect(result.processingReasons).toEqual(
				expect.arrayContaining([expect.stringContaining('Resolution')])
			);
			expect(result.warnings).toEqual(
				expect.arrayContaining([expect.stringContaining('wider than 9:16')])
			);
		});

		it('should warn about tall videos needing pillarboxing', async () => {
			// Very tall video (e.g. 720x2560, ratio 0.28 which is < 0.5625)
			const output = createFfprobeOutput({
				streams: [
					{
						codec_type: 'video',
						codec_name: 'h264',
						width: 720,
						height: 2560,
						r_frame_rate: '30/1',
					},
					{ codec_type: 'audio', codec_name: 'aac' },
				],
			});
			setupFfprobeForValidation(output);

			const result = await validateVideoForStories(Buffer.from('video-data'));

			expect(result.warnings).toEqual(
				expect.arrayContaining([expect.stringContaining('taller than 9:16')])
			);
		});

		it('should flag oversized file for processing', async () => {
			const output = createFfprobeOutput({
				streams: [
					{
						codec_type: 'video',
						codec_name: 'h264',
						width: 1080,
						height: 1920,
						r_frame_rate: '30/1',
					},
					{ codec_type: 'audio', codec_name: 'aac' },
				],
				format: {
					duration: '15.0',
					bit_rate: '3500000',
					format_name: 'mp4',
					size: String(150 * 1024 * 1024), // 150 MB, over 100 MB limit
				},
			});
			setupFfprobeForValidation(output);

			const result = await validateVideoForStories(Buffer.from('video-data'));

			expect(result.needsProcessing).toBe(true);
			expect(result.processingReasons).toEqual(
				expect.arrayContaining([expect.stringContaining('File size')])
			);
			expect(result.warnings).toEqual(
				expect.arrayContaining([expect.stringContaining('File size')])
			);
		});

		it('should flag video exceeding max duration', async () => {
			const output = createFfprobeOutput({
				streams: [
					{
						codec_type: 'video',
						codec_name: 'h264',
						width: 1080,
						height: 1920,
						r_frame_rate: '30/1',
					},
					{ codec_type: 'audio', codec_name: 'aac' },
				],
				format: {
					duration: '120.0', // 2 minutes
					bit_rate: '3500000',
					format_name: 'mp4',
					size: '6553600',
				},
			});
			setupFfprobeForValidation(output);

			const result = await validateVideoForStories(Buffer.from('video-data'));

			expect(result.needsProcessing).toBe(true);
			expect(result.processingReasons).toEqual(
				expect.arrayContaining([expect.stringContaining('Duration')])
			);
			expect(result.warnings).toEqual(
				expect.arrayContaining([expect.stringContaining('120s')])
			);
		});

		it('should flag non-AAC audio for processing', async () => {
			const output = createFfprobeOutput({
				streams: [
					{
						codec_type: 'video',
						codec_name: 'h264',
						width: 1080,
						height: 1920,
						r_frame_rate: '30/1',
					},
					{ codec_type: 'audio', codec_name: 'mp3' },
				],
			});
			setupFfprobeForValidation(output);

			const result = await validateVideoForStories(Buffer.from('video-data'));

			expect(result.needsProcessing).toBe(true);
			expect(result.processingReasons).toEqual(
				expect.arrayContaining([expect.stringContaining('Audio codec mp3')])
			);
		});

		it('should report critical error for too-small resolution', async () => {
			const output = createFfprobeOutput({
				streams: [
					{
						codec_type: 'video',
						codec_name: 'h264',
						width: 200,
						height: 300,
						r_frame_rate: '30/1',
					},
				],
				format: {
					duration: '10.0',
					bit_rate: '500000',
					format_name: 'mp4',
					size: '625000',
				},
			});
			setupFfprobeForValidation(output);

			const result = await validateVideoForStories(Buffer.from('video-data'));

			expect(result.valid).toBe(false);
			expect(result.errors).toEqual(
				expect.arrayContaining([expect.stringContaining('too small')])
			);
		});

		it('should report critical error for too-short video', async () => {
			const output = createFfprobeOutput({
				streams: [
					{
						codec_type: 'video',
						codec_name: 'h264',
						width: 1080,
						height: 1920,
						r_frame_rate: '30/1',
					},
				],
				format: {
					duration: '0.5',
					bit_rate: '3500000',
					format_name: 'mp4',
					size: '218750',
				},
			});
			setupFfprobeForValidation(output);

			const result = await validateVideoForStories(Buffer.from('video-data'));

			expect(result.valid).toBe(false);
			expect(result.errors).toEqual(
				expect.arrayContaining([expect.stringContaining('too short')])
			);
		});

		it('should flag low frame rate for processing', async () => {
			const output = createFfprobeOutput({
				streams: [
					{
						codec_type: 'video',
						codec_name: 'h264',
						width: 1080,
						height: 1920,
						r_frame_rate: '15/1', // Below 23fps threshold
					},
					{ codec_type: 'audio', codec_name: 'aac' },
				],
			});
			setupFfprobeForValidation(output);

			const result = await validateVideoForStories(Buffer.from('video-data'));

			expect(result.needsProcessing).toBe(true);
			expect(result.processingReasons).toEqual(
				expect.arrayContaining([expect.stringContaining('Frame rate')])
			);
		});
	});

	// ======== videoNeedsProcessing ========

	describe('videoNeedsProcessing', () => {
		// videoNeedsProcessing -> validateVideoForStories -> getVideoMetadata
		// which calls ensureFfmpegAvailable (ffmpeg check) + ffprobe

		function setupForNeedsProcessing(ffprobeOutput: string) {
			let callIndex = 0;
			mockSpawn.mockImplementation(() => {
				callIndex++;
				if (callIndex === 1) {
					return createSuccessfulFfmpegCheckProcess();
				}
				const ffprobeProc = createMockProcess();
				process.nextTick(() => {
					ffprobeProc.stdout.emit('data', ffprobeOutput);
					ffprobeProc.emit('close', 0);
				});
				return ffprobeProc;
			});
		}

		it('should return false for a valid Instagram Stories video', async () => {
			setupForNeedsProcessing(createFfprobeOutput());

			const result = await videoNeedsProcessing(Buffer.from('video-data'));
			expect(result).toBe(false);
		});

		it('should return true for a video with wrong codec', async () => {
			const output = createFfprobeOutput({
				streams: [
					{
						codec_type: 'video',
						codec_name: 'vp9',
						width: 1080,
						height: 1920,
						r_frame_rate: '30/1',
					},
					{ codec_type: 'audio', codec_name: 'aac' },
				],
			});
			setupForNeedsProcessing(output);

			const result = await videoNeedsProcessing(Buffer.from('video-data'));
			expect(result).toBe(true);
		});

		it('should return true for a video with wrong resolution', async () => {
			const output = createFfprobeOutput({
				streams: [
					{
						codec_type: 'video',
						codec_name: 'h264',
						width: 1920,
						height: 1080,
						r_frame_rate: '30/1',
					},
					{ codec_type: 'audio', codec_name: 'aac' },
				],
			});
			setupForNeedsProcessing(output);

			const result = await videoNeedsProcessing(Buffer.from('video-data'));
			expect(result).toBe(true);
		});
	});

	// ======== processVideoForStory (tests buildFfmpegArgs indirectly) ========

	describe('processVideoForStory', () => {
		// processVideoForStory spawn sequence:
		// 1. ensureFfmpegAvailable() -> spawn('ffmpeg', ['-version'])
		// 2. getVideoMetadata(input) -> ensureFfmpegAvailable() -> spawn('ffmpeg', ['-version'])
		// 3. getVideoMetadata(input) -> spawn('ffprobe', args)  [input metadata]
		// 4. runFfmpeg(args) -> spawn('ffmpeg', args)  [actual processing]
		// 5. getVideoMetadata(output) -> ensureFfmpegAvailable() -> spawn('ffmpeg', ['-version'])
		// 6. getVideoMetadata(output) -> spawn('ffprobe', args)  [output metadata]

		function setupForProcessing(inputMetadata: string, outputMetadata: string) {
			let ffprobeCallCount = 0;
			mockSpawn.mockImplementation((cmd: string) => {
				const mockProc = createMockProcess();

				process.nextTick(() => {
					if (cmd === 'ffprobe') {
						ffprobeCallCount++;
						// First ffprobe = input metadata, second = output metadata
						mockProc.stdout.emit(
							'data',
							ffprobeCallCount === 1 ? inputMetadata : outputMetadata
						);
						mockProc.emit('close', 0);
					} else if (cmd === 'ffmpeg') {
						// All ffmpeg calls succeed (version checks + actual processing)
						mockProc.emit('close', 0);
					}
				});

				return mockProc;
			});
		}

		it('should process a wide video with letterboxing', async () => {
			// 1920x1080 (16:9 landscape) -> should get letterboxed
			const inputMeta = createFfprobeOutput({
				streams: [
					{
						codec_type: 'video',
						codec_name: 'h264',
						width: 1920,
						height: 1080,
						r_frame_rate: '30/1',
					},
					{ codec_type: 'audio', codec_name: 'aac' },
				],
			});

			const outputMeta = createFfprobeOutput({
				streams: [
					{
						codec_type: 'video',
						codec_name: 'h264',
						width: VIDEO_STORY_WIDTH,
						height: VIDEO_STORY_HEIGHT,
						r_frame_rate: '30/1',
					},
					{ codec_type: 'audio', codec_name: 'aac' },
				],
			});

			setupForProcessing(inputMeta, outputMeta);

			const result = await processVideoForStory(Buffer.from('wide-video'));

			expect(result.wasProcessed).toBe(true);
			expect(result.width).toBe(VIDEO_STORY_WIDTH);
			expect(result.height).toBe(VIDEO_STORY_HEIGHT);
			expect(result.processingApplied).toEqual(
				expect.arrayContaining(['aspect-ratio-letterbox'])
			);
		});

		it('should process a tall video with pillarboxing', async () => {
			// 720x2560 (very tall, ratio ~0.28) -> should get pillarboxed
			const inputMeta = createFfprobeOutput({
				streams: [
					{
						codec_type: 'video',
						codec_name: 'h264',
						width: 720,
						height: 2560,
						r_frame_rate: '30/1',
					},
					{ codec_type: 'audio', codec_name: 'aac' },
				],
			});

			const outputMeta = createFfprobeOutput({
				streams: [
					{
						codec_type: 'video',
						codec_name: 'h264',
						width: VIDEO_STORY_WIDTH,
						height: VIDEO_STORY_HEIGHT,
						r_frame_rate: '30/1',
					},
					{ codec_type: 'audio', codec_name: 'aac' },
				],
			});

			setupForProcessing(inputMeta, outputMeta);

			const result = await processVideoForStory(Buffer.from('tall-video'));

			expect(result.wasProcessed).toBe(true);
			expect(result.processingApplied).toEqual(
				expect.arrayContaining(['aspect-ratio-pillarbox'])
			);
		});

		it('should include h264-encoding in processing applied', async () => {
			const inputMeta = createFfprobeOutput();
			const outputMeta = createFfprobeOutput();

			setupForProcessing(inputMeta, outputMeta);

			const result = await processVideoForStory(Buffer.from('video'));

			expect(result.processingApplied).toContain('h264-encoding');
		});

		it('should add silent audio when video has no audio track', async () => {
			const inputMeta = createFfprobeOutput({
				streams: [
					{
						codec_type: 'video',
						codec_name: 'h264',
						width: 1080,
						height: 1920,
						r_frame_rate: '30/1',
					},
					// No audio stream
				],
			});

			const outputMeta = createFfprobeOutput();

			setupForProcessing(inputMeta, outputMeta);

			const result = await processVideoForStory(Buffer.from('no-audio-video'));

			expect(result.processingApplied).toContain('silent-audio-added');
		});

		it('should include aac-audio when video has audio', async () => {
			const inputMeta = createFfprobeOutput();
			const outputMeta = createFfprobeOutput();

			setupForProcessing(inputMeta, outputMeta);

			const result = await processVideoForStory(Buffer.from('video'));

			expect(result.processingApplied).toContain('aac-audio');
		});

		it('should trim duration when video exceeds max duration', async () => {
			const inputMeta = createFfprobeOutput({
				streams: [
					{
						codec_type: 'video',
						codec_name: 'h264',
						width: 1080,
						height: 1920,
						r_frame_rate: '30/1',
					},
					{ codec_type: 'audio', codec_name: 'aac' },
				],
				format: {
					duration: '120.0', // 2 minutes, over 60s limit
					bit_rate: '3500000',
					format_name: 'mp4',
					size: '52500000',
				},
			});

			const outputMeta = createFfprobeOutput({
				streams: [
					{
						codec_type: 'video',
						codec_name: 'h264',
						width: 1080,
						height: 1920,
						r_frame_rate: '30/1',
					},
					{ codec_type: 'audio', codec_name: 'aac' },
				],
				format: {
					duration: '60.0',
					bit_rate: '3500000',
					format_name: 'mp4',
					size: '26250000',
				},
			});

			setupForProcessing(inputMeta, outputMeta);

			const result = await processVideoForStory(Buffer.from('long-video'));

			expect(result.processingApplied).toContain('duration-trim-60s');
		});

		it('should adjust frame rate when outside acceptable range', async () => {
			const inputMeta = createFfprobeOutput({
				streams: [
					{
						codec_type: 'video',
						codec_name: 'h264',
						width: 1080,
						height: 1920,
						r_frame_rate: '15/1', // Below 23fps threshold
					},
					{ codec_type: 'audio', codec_name: 'aac' },
				],
			});

			const outputMeta = createFfprobeOutput();

			setupForProcessing(inputMeta, outputMeta);

			const result = await processVideoForStory(Buffer.from('low-fps-video'));

			expect(result.processingApplied).toContain('frame-rate');
		});

		it('should return original metadata', async () => {
			const inputMeta = createFfprobeOutput({
				streams: [
					{
						codec_type: 'video',
						codec_name: 'vp9',
						width: 1920,
						height: 1080,
						r_frame_rate: '24/1',
					},
					{ codec_type: 'audio', codec_name: 'opus' },
				],
				format: {
					duration: '45.0',
					bit_rate: '5000000',
					format_name: 'webm',
					size: '28125000',
				},
			});

			const outputMeta = createFfprobeOutput();

			setupForProcessing(inputMeta, outputMeta);

			const result = await processVideoForStory(Buffer.from('webm-video'));

			expect(result.originalMetadata.width).toBe(1920);
			expect(result.originalMetadata.height).toBe(1080);
			expect(result.originalMetadata.codec).toBe('vp9');
			expect(result.originalMetadata.duration).toBe(45.0);
		});

		it('should apply custom processing options', async () => {
			const inputMeta = createFfprobeOutput();
			const outputMeta = createFfprobeOutput();

			setupForProcessing(inputMeta, outputMeta);

			const result = await processVideoForStory(Buffer.from('video'), {
				preset: 'fast',
				videoBitrate: '5000k',
				audioBitrate: '192k',
			});

			expect(result.wasProcessed).toBe(true);
			// Filter for ffmpeg processing calls (not version checks).
			// Version checks use ['-version'], processing calls have many args.
			const ffmpegProcessingCalls = mockSpawn.mock.calls.filter(
				(call: unknown[]) => {
					const args = call[1] as string[] | undefined;
					return call[0] === 'ffmpeg' && args && args.length > 1;
				}
			);
			expect(ffmpegProcessingCalls.length).toBe(1);

			const ffmpegArgs = ffmpegProcessingCalls[0][1] as string[];
			expect(ffmpegArgs).toContain('fast');
			expect(ffmpegArgs).toContain('5000k');
			expect(ffmpegArgs).toContain('192k');
		});
	});

	// ======== getVideoProcessingBackend ========

	describe('getVideoProcessingBackend', () => {
		afterEach(() => {
			process.env = { ...originalEnv };
		});

		it('should return ffmpeg when FFmpeg is available', async () => {
			const mockProc = createMockProcess();
			mockSpawn.mockReturnValue(mockProc);
			process.nextTick(() => mockProc.emit('close', 0));

			const result = await getVideoProcessingBackend();
			expect(result).toBe('ffmpeg');
		});

		it('should return railway when FFmpeg is unavailable but Railway is configured', async () => {
			const mockProc = createMockProcess();
			mockSpawn.mockReturnValue(mockProc);
			process.nextTick(() => mockProc.emit('error', new Error('ENOENT')));

			process.env.RAILWAY_API_URL = 'https://test.railway.app';
			process.env.RAILWAY_API_SECRET = 'test-secret';

			const result = await getVideoProcessingBackend();
			expect(result).toBe('railway');
		});

		it('should return none when neither backend is available', async () => {
			const mockProc = createMockProcess();
			mockSpawn.mockReturnValue(mockProc);
			process.nextTick(() => mockProc.emit('error', new Error('ENOENT')));

			delete process.env.RAILWAY_API_URL;
			delete process.env.RAILWAY_API_SECRET;

			const result = await getVideoProcessingBackend();
			expect(result).toBe('none');
		});
	});

	// ======== processAndUploadStoryVideo ========

	describe('processAndUploadStoryVideo', () => {
		afterEach(() => {
			process.env = { ...originalEnv };
			globalThis.fetch = originalFetch;
		});

		it('should return original URL when no backend is available', async () => {
			const mockProc = createMockProcess();
			mockSpawn.mockReturnValue(mockProc);
			process.nextTick(() => mockProc.emit('error', new Error('ENOENT')));
			delete process.env.RAILWAY_API_URL;
			delete process.env.RAILWAY_API_SECRET;

			const result = await processAndUploadStoryVideo(
				'https://example.com/original.mp4',
				'content-123'
			);

			expect(result).toBe('https://example.com/original.mp4');
		});

		it('should use Railway when FFmpeg is unavailable but Railway is configured', async () => {
			const mockProc = createMockProcess();
			mockSpawn.mockReturnValue(mockProc);
			process.nextTick(() => mockProc.emit('error', new Error('ENOENT')));

			process.env.RAILWAY_API_URL = 'https://test.railway.app';
			process.env.RAILWAY_API_SECRET = 'test-secret';
			process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
			process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({
					processedUrl: 'https://test.supabase.co/processed.mp4',
					thumbnailUrl: 'https://test.supabase.co/thumb.jpg',
					metadata: {
						width: 1080,
						height: 1920,
						duration: 15,
						codec: 'h264',
						frameRate: 30,
						fileSize: 6553600,
						processingApplied: ['h264-encoding', 'aac-audio'],
					},
				}),
			}) as unknown as typeof fetch;

			const result = await processAndUploadStoryVideo(
				'https://example.com/original.mp4',
				'content-456'
			);

			expect(result).toBe('https://test.supabase.co/processed.mp4');
			expect(globalThis.fetch).toHaveBeenCalledWith(
				'https://test.railway.app/process-video',
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						'Authorization': 'Bearer test-secret',
					}),
				})
			);
		});
	});

	// ======== extractVideoThumbnail ========

	describe('extractVideoThumbnail', () => {
		afterEach(() => {
			process.env = { ...originalEnv };
			globalThis.fetch = originalFetch;
		});

		it('should use Railway when FFmpeg is unavailable but Railway is configured', async () => {
			const mockProc = createMockProcess();
			mockSpawn.mockReturnValue(mockProc);
			process.nextTick(() => mockProc.emit('error', new Error('ENOENT')));

			process.env.RAILWAY_API_URL = 'https://test.railway.app';
			process.env.RAILWAY_API_SECRET = 'test-secret';
			process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
			process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({
					processedUrl: 'https://test.supabase.co/processed.mp4',
					thumbnailUrl: 'https://test.supabase.co/thumb.jpg',
					metadata: {
						width: 1080,
						height: 1920,
						duration: 15,
						codec: 'h264',
						frameRate: 30,
						fileSize: 6553600,
						processingApplied: ['h264-encoding'],
					},
				}),
			}) as unknown as typeof fetch;

			const result = await extractVideoThumbnail(
				'https://example.com/video.mp4',
				'content-789'
			);

			expect(result).toBe('https://test.supabase.co/thumb.jpg');
		});

		it('should return null when Railway thumbnail extraction fails', async () => {
			const mockProc = createMockProcess();
			mockSpawn.mockReturnValue(mockProc);
			process.nextTick(() => mockProc.emit('error', new Error('ENOENT')));

			process.env.RAILWAY_API_URL = 'https://test.railway.app';
			process.env.RAILWAY_API_SECRET = 'test-secret';
			process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
			process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
				text: () => Promise.resolve('Internal Server Error'),
			}) as unknown as typeof fetch;

			const result = await extractVideoThumbnail(
				'https://example.com/video.mp4',
				'content-fail'
			);

			expect(result).toBeNull();
		});

		it('should return null when no backend is available', async () => {
			const mockProc = createMockProcess();
			mockSpawn.mockReturnValue(mockProc);
			process.nextTick(() => mockProc.emit('error', new Error('ENOENT')));

			delete process.env.RAILWAY_API_URL;
			delete process.env.RAILWAY_API_SECRET;

			const result = await extractVideoThumbnail(
				'https://example.com/video.mp4',
				'content-none'
			);

			expect(result).toBeNull();
		});
	});
});
