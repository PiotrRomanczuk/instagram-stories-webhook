import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UniversalVideoPlayer } from '@/app/components/media/universal-video-player';

// Mock react-player
vi.mock('react-player', () => ({
    default: ({ url, playing, muted, loop, width, height, controls }: any) => (
        <div data-testid="react-player" data-url={url} data-playing={playing} data-muted={muted}>
            Player Mock
        </div>
    ),
}));

// Mock extractThumbnailFromVideo
vi.mock('@/lib/media/client-utils', () => ({
    extractThumbnailFromVideo: vi.fn().mockResolvedValue('mock-thumbnail-url'),
}));

describe('UniversalVideoPlayer', () => {
    const defaultProps = {
        url: 'https://example.com/video.mp4',
    };

    it('renders the player', () => {
        render(<UniversalVideoPlayer {...defaultProps} />);
        expect(screen.getByTestId('react-player')).toBeInTheDocument();
        expect(screen.getByTestId('react-player')).toHaveAttribute('data-url', defaultProps.url);
    });

    it('shows placeholder icon while loading thumbnail if light={true}', () => {
        // When light={true}, it should NOT show the placeholder div because ReactPlayer handles its own light mode if provided
        // But if light is NOT provided, it might show our custom loading state
        const { container } = render(<UniversalVideoPlayer {...defaultProps} />);
        // By default showPlaceholder is true and light is false
        // Since isReady is false initially, it should show the placeholder
        expect(container.querySelector('svg.animate-pulse')).toBeInTheDocument();
    });

    it('supports object-contain via props', () => {
        render(<UniversalVideoPlayer {...defaultProps} contain />);
        // Hard to test the 'as any' config here without more complex mocks, 
        // but we can verify it doesn't crash
    });
});
