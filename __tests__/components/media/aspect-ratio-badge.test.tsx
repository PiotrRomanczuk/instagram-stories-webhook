import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AspectRatioBadge } from '@/app/components/media/aspect-ratio-badge';
import { AspectRatioInfo } from '@/lib/types';

describe('AspectRatioBadge', () => {
	it('should show "No image" when aspectInfo is null', () => {
		render(<AspectRatioBadge aspectInfo={null} />);
		expect(screen.getByText('No image')).toBeInTheDocument();
	});

	it('should show "9:16 Perfect" for perfect ratio', () => {
		const aspectInfo: AspectRatioInfo = {
			ratio: 0.5625,
			isIdeal: true,
			isAcceptable: true,
			needsProcessing: false,
			recommendation: 'perfect',
			message: 'Perfect!',
		};

		render(<AspectRatioBadge aspectInfo={aspectInfo} />);
		expect(screen.getByText('9:16 Perfect')).toBeInTheDocument();
	});

	it('should show "Close to 9:16" for acceptable ratio', () => {
		const aspectInfo: AspectRatioInfo = {
			ratio: 0.58,
			isIdeal: false,
			isAcceptable: true,
			needsProcessing: false,
			recommendation: 'acceptable',
			message: 'Close enough',
		};

		render(<AspectRatioBadge aspectInfo={aspectInfo} />);
		expect(screen.getByText('Close to 9:16')).toBeInTheDocument();
	});

	it('should show "Will add padding" for needs_padding', () => {
		const aspectInfo: AspectRatioInfo = {
			ratio: 1,
			isIdeal: false,
			isAcceptable: false,
			needsProcessing: true,
			recommendation: 'needs_padding',
			message: 'Too wide',
		};

		render(<AspectRatioBadge aspectInfo={aspectInfo} />);
		expect(screen.getByText('Will add padding')).toBeInTheDocument();
	});

	it('should show "May need crop" for needs_crop', () => {
		const aspectInfo: AspectRatioInfo = {
			ratio: 0.3,
			isIdeal: false,
			isAcceptable: false,
			needsProcessing: true,
			recommendation: 'needs_crop',
			message: 'Too tall',
		};

		render(<AspectRatioBadge aspectInfo={aspectInfo} />);
		expect(screen.getByText('May need crop')).toBeInTheDocument();
	});

	it('should apply custom className', () => {
		const { container } = render(
			<AspectRatioBadge aspectInfo={null} className="custom-class" />
		);
		expect(container.querySelector('.custom-class')).toBeInTheDocument();
	});
});
