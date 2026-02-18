import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VideoUploader } from '@/app/components/media/video-uploader';

// Mock external dependencies that involve network/storage
vi.mock('@/lib/storage/upload-client', () => ({
	uploadToStorage: vi.fn().mockResolvedValue({
		publicUrl: 'https://storage.example.com/video.mp4',
		storagePath: 'uploads/videos/video.mp4',
	}),
}));

vi.mock('@/lib/media/video-validation-client', () => ({
	validateVideoFile: vi.fn().mockReturnValue({ valid: true, errors: [] }),
}));

vi.mock('@/lib/media/ffmpeg-wasm-processor', () => ({
	processVideoInBrowser: vi.fn(),
	isFFmpegWasmSupported: vi.fn().mockReturnValue(false),
}));

vi.mock('./video-requirements', () => ({
	VideoRequirements: () => <div data-testid="video-requirements">Requirements</div>,
}));

vi.mock('./video-processing-progress', () => ({
	VideoProcessingProgress: () => <div data-testid="video-processing-progress">Processing</div>,
}));

// Helpers for thumbnail extraction mocks
type MockVideoElement = {
	src: string;
	muted: boolean;
	preload: string;
	currentTime: number;
	duration: number;
	videoWidth: number;
	videoHeight: number;
	listeners: Record<string, Array<{ handler: EventListener; options?: { once?: boolean } }>>;
	addEventListener: ReturnType<typeof vi.fn>;
	dispatchEvent: (type: string) => void;
};

function createMockVideoElement(): MockVideoElement {
	const listeners: Record<string, Array<{ handler: EventListener; options?: { once?: boolean } }>> = {};

	return {
		src: '',
		muted: false,
		preload: '',
		currentTime: 0,
		duration: 10,
		videoWidth: 1080,
		videoHeight: 1920,
		listeners,
		addEventListener: vi.fn((event: string, handler: EventListener, options?: { once?: boolean }) => {
			if (!listeners[event]) listeners[event] = [];
			listeners[event].push({ handler, options });
		}),
		dispatchEvent: (type: string) => {
			const eventListeners = listeners[type] || [];
			for (const { handler } of eventListeners) {
				handler(new Event(type));
			}
			// Remove once listeners after firing
			if (listeners[type]) {
				listeners[type] = listeners[type].filter(l => !l.options?.once);
			}
		},
	};
}

beforeEach(() => {
	// Mock fetch for validation API
	vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
		ok: true,
		json: () => Promise.resolve({
			valid: true,
			errors: [],
			warnings: [],
			metadata: {
				width: 1080,
				height: 1920,
				duration: 10,
				codec: 'h264',
				frameRate: 30,
				bitrate: 3500000,
				hasAudio: true,
				format: 'mp4',
				fileSize: 5000000,
			},
			needsProcessing: false,
			processingReasons: [],
		}),
	}));
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('VideoUploader', () => {
	const defaultProps = {
		value: null as string | null,
		onChange: vi.fn(),
	};

	describe('rendering', () => {
		it('should render the drop zone when no value', () => {
			render(<VideoUploader {...defaultProps} />);
			expect(screen.getByText('Drop video here or click to upload')).toBeInTheDocument();
		});

		it('should render video preview when value is set', () => {
			const { container } = render(
				<VideoUploader {...defaultProps} value="https://example.com/video.mp4" />
			);
			const video = container.querySelector('video');
			expect(video).toBeInTheDocument();
			expect(video).toHaveAttribute('src', 'https://example.com/video.mp4');
		});

		it('should show file size limit text', () => {
			render(<VideoUploader {...defaultProps} maxSize={50} />);
			expect(screen.getByText('MP4, MOV, WebM up to 50MB')).toBeInTheDocument();
		});

		it('should show remove button when value is set', () => {
			render(
				<VideoUploader {...defaultProps} value="https://example.com/video.mp4" />
			);
			const removeButton = screen.getByRole('button');
			expect(removeButton).toBeInTheDocument();
		});

		it('should call onChange with null when remove button is clicked', () => {
			const onChange = vi.fn();
			render(
				<VideoUploader
					{...defaultProps}
					onChange={onChange}
					value="https://example.com/video.mp4"
				/>
			);

			fireEvent.click(screen.getByRole('button'));
			expect(onChange).toHaveBeenCalledWith(null);
		});
	});

	describe('thumbnail extraction (extractVideoThumbnail)', () => {
		let mockVideoElement: MockVideoElement;
		let mockCanvasContext: { drawImage: ReturnType<typeof vi.fn> };
		let mockCanvasElement: {
			width: number;
			height: number;
			getContext: ReturnType<typeof vi.fn>;
			toDataURL: ReturnType<typeof vi.fn>;
		};
		let createElementSpy: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			// Mock URL.createObjectURL and revokeObjectURL
			vi.stubGlobal('URL', {
				...globalThis.URL,
				createObjectURL: vi.fn().mockReturnValue('blob:mock-object-url'),
				revokeObjectURL: vi.fn(),
			});

			mockCanvasContext = { drawImage: vi.fn() };

			mockCanvasElement = {
				width: 0,
				height: 0,
				getContext: vi.fn().mockReturnValue(mockCanvasContext),
				toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,mockThumbnailData'),
			};

			mockVideoElement = createMockVideoElement();

			// Override document.createElement to intercept video/canvas for thumbnail extraction
			const originalCreateElement = document.createElement.bind(document);
			createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string, options?: ElementCreationOptions) => {
				if (tagName === 'video') {
					return mockVideoElement as unknown as HTMLVideoElement;
				}
				if (tagName === 'canvas') {
					return mockCanvasElement as unknown as HTMLCanvasElement;
				}
				return originalCreateElement(tagName, options);
			});
		});

		afterEach(() => {
			createElementSpy.mockRestore();
		});

		it('should extract a thumbnail from a video file during upload', async () => {
			const onChange = vi.fn();
			render(
				<VideoUploader
					{...defaultProps}
					onChange={onChange}
					autoProcess={false}
					showRequirements={false}
				/>
			);

			const file = new File(['video-data'], 'test.mp4', { type: 'video/mp4' });
			const input = document.querySelector('input[type="file"]') as HTMLInputElement;

			fireEvent.change(input, { target: { files: [file] } });

			// Simulate the video element lifecycle for thumbnail extraction
			mockVideoElement.dispatchEvent('loadedmetadata');
			mockVideoElement.dispatchEvent('seeked');

			await waitFor(() => {
				expect(onChange).toHaveBeenCalled();
			});

			// Verify the thumbnail URL (4th argument) was passed
			const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
			expect(lastCall[3]).toBe('data:image/jpeg;base64,mockThumbnailData');
		});

		it('should pass thumbnailUrl as undefined when extraction fails', async () => {
			const onChange = vi.fn();
			render(
				<VideoUploader
					{...defaultProps}
					onChange={onChange}
					autoProcess={false}
					showRequirements={false}
				/>
			);

			const file = new File(['video-data'], 'test.mp4', { type: 'video/mp4' });
			const input = document.querySelector('input[type="file"]') as HTMLInputElement;

			fireEvent.change(input, { target: { files: [file] } });

			// Simulate video error -> thumbnail extraction returns null
			mockVideoElement.dispatchEvent('error');

			await waitFor(() => {
				expect(onChange).toHaveBeenCalled();
			});

			const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
			expect(lastCall[3]).toBeUndefined();
		});

		it('should handle canvas getContext returning null', async () => {
			mockCanvasElement.getContext.mockReturnValue(null);

			const onChange = vi.fn();
			render(
				<VideoUploader
					{...defaultProps}
					onChange={onChange}
					autoProcess={false}
					showRequirements={false}
				/>
			);

			const file = new File(['video-data'], 'test.mp4', { type: 'video/mp4' });
			const input = document.querySelector('input[type="file"]') as HTMLInputElement;

			fireEvent.change(input, { target: { files: [file] } });

			mockVideoElement.dispatchEvent('loadedmetadata');
			mockVideoElement.dispatchEvent('seeked');

			await waitFor(() => {
				expect(onChange).toHaveBeenCalled();
			});

			// Should gracefully fall back to undefined when canvas context is null
			const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
			expect(lastCall[3]).toBeUndefined();
		});

		it('should set canvas dimensions from video dimensions', async () => {
			mockVideoElement.videoWidth = 720;
			mockVideoElement.videoHeight = 1280;

			const onChange = vi.fn();
			render(
				<VideoUploader
					{...defaultProps}
					onChange={onChange}
					autoProcess={false}
					showRequirements={false}
				/>
			);

			const file = new File(['video-data'], 'test.mp4', { type: 'video/mp4' });
			const input = document.querySelector('input[type="file"]') as HTMLInputElement;

			fireEvent.change(input, { target: { files: [file] } });

			mockVideoElement.dispatchEvent('loadedmetadata');
			mockVideoElement.dispatchEvent('seeked');

			await waitFor(() => {
				expect(mockCanvasElement.width).toBe(720);
				expect(mockCanvasElement.height).toBe(1280);
			});
		});

		it('should seek to 0.5s by default for thumbnail', async () => {
			mockVideoElement.duration = 10;

			render(
				<VideoUploader
					{...defaultProps}
					onChange={vi.fn()}
					autoProcess={false}
					showRequirements={false}
				/>
			);

			const file = new File(['video-data'], 'test.mp4', { type: 'video/mp4' });
			const input = document.querySelector('input[type="file"]') as HTMLInputElement;

			fireEvent.change(input, { target: { files: [file] } });

			mockVideoElement.dispatchEvent('loadedmetadata');

			expect(mockVideoElement.currentTime).toBe(0.5);
		});

		it('should clamp seek time to video duration if shorter than 0.5s', async () => {
			mockVideoElement.duration = 0.3;

			render(
				<VideoUploader
					{...defaultProps}
					onChange={vi.fn()}
					autoProcess={false}
					showRequirements={false}
				/>
			);

			const file = new File(['video-data'], 'test.mp4', { type: 'video/mp4' });
			const input = document.querySelector('input[type="file"]') as HTMLInputElement;

			fireEvent.change(input, { target: { files: [file] } });

			mockVideoElement.dispatchEvent('loadedmetadata');

			expect(mockVideoElement.currentTime).toBe(0.3);
		});

		it('should clean up object URL after successful extraction', async () => {
			const onChange = vi.fn();
			render(
				<VideoUploader
					{...defaultProps}
					onChange={onChange}
					autoProcess={false}
					showRequirements={false}
				/>
			);

			const file = new File(['video-data'], 'test.mp4', { type: 'video/mp4' });
			const input = document.querySelector('input[type="file"]') as HTMLInputElement;

			fireEvent.change(input, { target: { files: [file] } });

			mockVideoElement.dispatchEvent('loadedmetadata');
			mockVideoElement.dispatchEvent('seeked');

			await waitFor(() => {
				expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-object-url');
			});
		});

		it('should clean up object URL after error', async () => {
			const onChange = vi.fn();
			render(
				<VideoUploader
					{...defaultProps}
					onChange={onChange}
					autoProcess={false}
					showRequirements={false}
				/>
			);

			const file = new File(['video-data'], 'test.mp4', { type: 'video/mp4' });
			const input = document.querySelector('input[type="file"]') as HTMLInputElement;

			fireEvent.change(input, { target: { files: [file] } });

			mockVideoElement.dispatchEvent('error');

			await waitFor(() => {
				expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-object-url');
			});
		});
	});
});
