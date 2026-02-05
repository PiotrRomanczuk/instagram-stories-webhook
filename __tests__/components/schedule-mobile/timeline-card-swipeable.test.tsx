/**
 * Tests for TimelineCardSwipeable Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimelineCardSwipeable } from '@/app/components/schedule-mobile/timeline-card-swipeable';
import { TimelineCardPost } from '@/app/components/schedule-mobile/timeline-card';

const mockPost: TimelineCardPost = {
	id: 'test-1',
	url: 'https://example.com/image.jpg',
	caption: 'Test caption',
	scheduledTime: Date.now() + 3600000,
	publishingStatus: 'scheduled',
	mediaType: 'IMAGE',
};

describe('TimelineCardSwipeable', () => {
	beforeEach(() => {
		// Mock window.innerWidth for mobile detection
		Object.defineProperty(window, 'innerWidth', {
			writable: true,
			configurable: true,
			value: 375, // iPhone width
		});
	});

	it('renders on mobile', () => {
		render(<TimelineCardSwipeable post={mockPost} />);

		const swipeableCard = screen.getByTestId('timeline-card-swipeable');
		expect(swipeableCard).toBeDefined();
		expect(swipeableCard.dataset.postId).toBe('test-1');
	});

	it('renders action buttons', () => {
		const onEdit = vi.fn();
		const onReschedule = vi.fn();
		const onCancel = vi.fn();

		render(
			<TimelineCardSwipeable
				post={mockPost}
				onEdit={onEdit}
				onReschedule={onReschedule}
				onCancel={onCancel}
			/>
		);

		// Action buttons should be in the DOM but hidden until swiped
		expect(screen.getByLabelText('Edit post')).toBeDefined();
		expect(screen.getByLabelText('Reschedule post')).toBeDefined();
		expect(screen.getByLabelText('Cancel post')).toBeDefined();
	});

	it('renders only provided action buttons', () => {
		const onEdit = vi.fn();

		render(<TimelineCardSwipeable post={mockPost} onEdit={onEdit} />);

		expect(screen.getByLabelText('Edit post')).toBeDefined();
		expect(screen.queryByLabelText('Reschedule post')).toBeNull();
		expect(screen.queryByLabelText('Cancel post')).toBeNull();
	});

	it('falls back to regular card on desktop', () => {
		// Mock desktop width
		Object.defineProperty(window, 'innerWidth', {
			writable: true,
			configurable: true,
			value: 1920,
		});

		render(<TimelineCardSwipeable post={mockPost} />);

		// Should render regular timeline card, not swipeable wrapper
		expect(screen.queryByTestId('timeline-card-swipeable')).toBeNull();
		expect(screen.getByTestId('timeline-card')).toBeDefined();
	});

	it('calls onClick when card is clicked', () => {
		const onClick = vi.fn();

		render(<TimelineCardSwipeable post={mockPost} onClick={onClick} />);

		const card = screen.getByTestId('timeline-card');
		card.click();

		expect(onClick).toHaveBeenCalledWith(mockPost);
	});

	it('renders with different post statuses', () => {
		const publishedPost: TimelineCardPost = {
			...mockPost,
			id: 'test-2',
			publishingStatus: 'published',
		};

		const { rerender } = render(<TimelineCardSwipeable post={publishedPost} />);
		expect(screen.getByTestId('timeline-card').dataset.status).toBe('published');

		const failedPost: TimelineCardPost = {
			...mockPost,
			id: 'test-3',
			publishingStatus: 'failed',
		};

		rerender(<TimelineCardSwipeable post={failedPost} />);
		expect(screen.getByTestId('timeline-card').dataset.status).toBe('failed');
	});
});
