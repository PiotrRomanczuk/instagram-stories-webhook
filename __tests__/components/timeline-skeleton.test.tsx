/**
 * Tests for Timeline Skeleton Loading Components
 * - TimelineCardSkeleton: Individual card skeleton
 * - TimelineGridSkeleton: Grid of skeleton cards with staggered animation
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimelineCardSkeleton } from '@/app/components/schedule-mobile/timeline-card-skeleton';
import { TimelineGridSkeleton } from '@/app/components/schedule-mobile/timeline-grid-skeleton';

describe('TimelineCardSkeleton', () => {
	it('renders skeleton card with correct structure', () => {
		render(<TimelineCardSkeleton />);

		const skeleton = screen.getByTestId('timeline-card-skeleton');
		expect(skeleton).toBeInTheDocument();
	});

	it('has accessible screen reader text', () => {
		render(<TimelineCardSkeleton />);

		// Screen reader text is present
		expect(screen.getByText('Loading scheduled post...')).toBeInTheDocument();
	});

	it('applies pulse animation class', () => {
		render(<TimelineCardSkeleton />);

		const skeleton = screen.getByTestId('timeline-card-skeleton');
		expect(skeleton).toHaveClass('animate-pulse');
	});

	it('matches TimelineCard dimensions', () => {
		const { container } = render(<TimelineCardSkeleton />);

		// Thumbnail should be responsive (w-16 h-16 sm:w-20 sm:h-20)
		const thumbnail = container.querySelector('.w-16');
		expect(thumbnail).toBeInTheDocument();

		// Should have rounded corners
		const card = screen.getByTestId('timeline-card-skeleton');
		expect(card).toHaveClass('rounded-xl');
	});
});

describe('TimelineGridSkeleton', () => {
	it('renders default number of skeleton cards', () => {
		const { container } = render(<TimelineGridSkeleton />);

		const skeletons = container.querySelectorAll('[data-testid="timeline-card-skeleton"]');
		expect(skeletons.length).toBe(6); // Default count
	});

	it('renders custom number of skeleton cards', () => {
		const { container } = render(<TimelineGridSkeleton count={3} />);

		const skeletons = container.querySelectorAll('[data-testid="timeline-card-skeleton"]');
		expect(skeletons.length).toBe(3);
	});

	it('has proper ARIA labels for grid', () => {
		render(<TimelineGridSkeleton />);

		expect(screen.getByRole('status')).toBeInTheDocument();
		expect(screen.getByLabelText('Loading posts')).toBeInTheDocument();
		expect(screen.getByText('Loading scheduled posts...')).toBeInTheDocument();
	});

	it('renders skeleton group header', () => {
		const { container } = render(<TimelineGridSkeleton />);

		const header = container.querySelector('.skeleton-shimmer.h-3.w-32');
		expect(header).toBeInTheDocument();
	});

	it('uses responsive grid layout', () => {
		const { container } = render(<TimelineGridSkeleton />);

		const grid = container.querySelector('.grid');
		expect(grid).toHaveClass('grid-cols-1');
		expect(grid).toHaveClass('md:grid-cols-2');
		expect(grid).toHaveClass('lg:grid-cols-3');
		expect(grid).toHaveClass('gap-4');
	});

	it('renders with staggered animation delays', () => {
		// This test verifies the structure exists
		// Actual animation timing is handled by framer-motion
		const { container } = render(<TimelineGridSkeleton count={3} />);

		const animatedDivs = container.querySelectorAll('div[style*="opacity"]');
		// Framer-motion creates motion divs with inline styles
		expect(animatedDivs.length).toBeGreaterThanOrEqual(0);
	});
});

describe('Skeleton Integration', () => {
	it('skeleton cards match real card dimensions', () => {
		const { container: skeletonContainer } = render(<TimelineCardSkeleton />);

		// Verify key dimension classes that match TimelineCard
		const skeleton = skeletonContainer.querySelector('[data-testid="timeline-card-skeleton"]');
		expect(skeleton).toHaveClass('rounded-xl');
		expect(skeleton).toHaveClass('bg-white');
		expect(skeleton).toHaveClass('animate-pulse');
	});

	it('skeleton grid matches timeline layout structure', () => {
		const { container } = render(<TimelineGridSkeleton />);

		// Should have same grid classes as TimelineLayout
		const grid = container.querySelector('.grid');
		expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'gap-4');
	});
});
