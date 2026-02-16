import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoPreview } from '@/app/components/media/video-preview';

// Mock framer-motion to avoid animation complexity in tests
vi.mock('framer-motion', () => ({
	motion: {
		div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
			const { whileTap, initial, animate, exit, transition, ...rest } = props;
			return <div {...rest}>{children}</div>;
		},
		button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
			const { whileTap, initial, animate, exit, transition, ...rest } = props;
			return <button {...rest}>{children}</button>;
		},
	},
	AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock HTMLVideoElement play/pause
beforeEach(() => {
	HTMLVideoElement.prototype.play = vi.fn().mockResolvedValue(undefined);
	HTMLVideoElement.prototype.pause = vi.fn();
});

describe('VideoPreview', () => {
	const defaultProps = {
		videoUrl: 'https://example.com/video.mp4',
	};

	describe('compact mode', () => {
		it('should render compact preview with thumbnail', () => {
			render(
				<VideoPreview
					{...defaultProps}
					thumbnailUrl="https://example.com/thumb.jpg"
					compact
				/>
			);
			const img = screen.getByAltText('Video preview');
			expect(img).toBeInTheDocument();
			expect(img).toHaveAttribute('src', 'https://example.com/thumb.jpg');
		});

		it('should show placeholder icon when no thumbnail in compact mode', () => {
			const { container } = render(
				<VideoPreview {...defaultProps} compact />
			);
			// Should render Smartphone icon as placeholder
			expect(container.querySelector('svg')).toBeInTheDocument();
		});

		it('should display duration badge in compact mode', () => {
			render(
				<VideoPreview {...defaultProps} duration={65} compact />
			);
			expect(screen.getByText('1:05')).toBeInTheDocument();
		});

		it('should display validation dot in compact mode', () => {
			const { container } = render(
				<VideoPreview {...defaultProps} validationStatus="valid" compact />
			);
			const dot = container.querySelector('.bg-emerald-500');
			expect(dot).toBeInTheDocument();
		});

		it('should show warning validation dot', () => {
			const { container } = render(
				<VideoPreview {...defaultProps} validationStatus="warning" compact />
			);
			const dot = container.querySelector('.bg-amber-500');
			expect(dot).toBeInTheDocument();
		});

		it('should show error validation dot', () => {
			const { container } = render(
				<VideoPreview {...defaultProps} validationStatus="error" compact />
			);
			const dot = container.querySelector('.bg-red-500');
			expect(dot).toBeInTheDocument();
		});

		it('should apply custom className in compact mode', () => {
			const { container } = render(
				<VideoPreview {...defaultProps} compact className="custom-class" />
			);
			expect(container.querySelector('.custom-class')).toBeInTheDocument();
		});
	});

	describe('full mode', () => {
		it('should render the 9:16 phone frame', () => {
			render(<VideoPreview {...defaultProps} />);
			expect(screen.getByText('9:16 Video Preview')).toBeInTheDocument();
		});

		it('should render a video element', () => {
			const { container } = render(<VideoPreview {...defaultProps} />);
			const video = container.querySelector('video');
			expect(video).toBeInTheDocument();
			expect(video).toHaveAttribute('src', 'https://example.com/video.mp4');
		});

		it('should start muted', () => {
			const { container } = render(<VideoPreview {...defaultProps} />);
			const video = container.querySelector('video');
			expect(video).toHaveAttribute('muted', '');
		});

		it('should show thumbnail overlay when not playing', () => {
			render(
				<VideoPreview
					{...defaultProps}
					thumbnailUrl="https://example.com/thumb.jpg"
				/>
			);
			const thumbnail = screen.getByAltText('Video thumbnail');
			expect(thumbnail).toBeInTheDocument();
		});

		it('should display duration badge', () => {
			render(<VideoPreview {...defaultProps} duration={90} />);
			expect(screen.getByText('1:30')).toBeInTheDocument();
		});

		it('should display validation badge with valid status', () => {
			render(<VideoPreview {...defaultProps} validationStatus="valid" />);
			expect(screen.getByText('Ready')).toBeInTheDocument();
		});

		it('should display validation badge with warning status', () => {
			render(<VideoPreview {...defaultProps} validationStatus="warning" />);
			expect(screen.getByText('Needs Processing')).toBeInTheDocument();
		});

		it('should display validation badge with error status', () => {
			render(<VideoPreview {...defaultProps} validationStatus="error" />);
			expect(screen.getByText('Invalid')).toBeInTheDocument();
		});

		it('should show play button with correct aria-label', () => {
			render(<VideoPreview {...defaultProps} />);
			expect(screen.getByLabelText('Play video')).toBeInTheDocument();
		});

		it('should toggle to pause on play button click', () => {
			render(<VideoPreview {...defaultProps} />);
			const playButton = screen.getByLabelText('Play video');
			fireEvent.click(playButton);
			expect(screen.getByLabelText('Pause video')).toBeInTheDocument();
		});

		it('should show mute button when playing', () => {
			render(<VideoPreview {...defaultProps} />);
			const playButton = screen.getByLabelText('Play video');
			fireEvent.click(playButton);
			expect(screen.getByLabelText('Unmute video')).toBeInTheDocument();
		});

		it('should toggle mute state', () => {
			render(<VideoPreview {...defaultProps} />);
			// Start playing
			fireEvent.click(screen.getByLabelText('Play video'));
			// Toggle mute
			const muteButton = screen.getByLabelText('Unmute video');
			fireEvent.click(muteButton);
			expect(screen.getByLabelText('Mute video')).toBeInTheDocument();
		});

		it('should apply custom className in full mode', () => {
			const { container } = render(
				<VideoPreview {...defaultProps} className="my-custom-class" />
			);
			expect(container.querySelector('.my-custom-class')).toBeInTheDocument();
		});
	});

	describe('metadata display', () => {
		it('should display resolution', () => {
			render(
				<VideoPreview
					{...defaultProps}
					resolution={{ width: 1080, height: 1920 }}
				/>
			);
			expect(screen.getByText('1080x1920')).toBeInTheDocument();
		});

		it('should display codec', () => {
			render(<VideoPreview {...defaultProps} codec="h264" />);
			expect(screen.getByText('h264')).toBeInTheDocument();
		});

		it('should display framerate', () => {
			render(<VideoPreview {...defaultProps} framerate={30} />);
			expect(screen.getByText('30fps')).toBeInTheDocument();
		});

		it('should display all metadata together', () => {
			render(
				<VideoPreview
					{...defaultProps}
					resolution={{ width: 1080, height: 1920 }}
					codec="h264"
					framerate={30}
				/>
			);
			expect(screen.getByText('1080x1920')).toBeInTheDocument();
			expect(screen.getByText('h264')).toBeInTheDocument();
			expect(screen.getByText('30fps')).toBeInTheDocument();
		});

		it('should not render metadata section when no metadata provided', () => {
			const { container } = render(<VideoPreview {...defaultProps} />);
			// Only the label badge should exist, no outline badges for metadata
			const outlineBadges = container.querySelectorAll('[data-variant="outline"]');
			expect(outlineBadges.length).toBe(0);
		});
	});

	describe('duration formatting', () => {
		it('should format seconds correctly', () => {
			render(<VideoPreview {...defaultProps} duration={5} />);
			expect(screen.getByText('0:05')).toBeInTheDocument();
		});

		it('should format minutes and seconds correctly', () => {
			render(<VideoPreview {...defaultProps} duration={125} />);
			expect(screen.getByText('2:05')).toBeInTheDocument();
		});

		it('should format zero duration', () => {
			render(<VideoPreview {...defaultProps} duration={0} />);
			expect(screen.getByText('0:00')).toBeInTheDocument();
		});
	});
});
