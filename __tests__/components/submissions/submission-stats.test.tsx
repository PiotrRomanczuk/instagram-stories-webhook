import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SubmissionStats } from '@/app/components/submissions/submission-stats';

describe('SubmissionStats', () => {
	it('should render all stat cards', () => {
		render(
			<SubmissionStats
				pending={5}
				approved={3}
				scheduled={2}
				published={10}
			/>
		);

		expect(screen.getByText('5')).toBeInTheDocument();
		expect(screen.getByText('3')).toBeInTheDocument();
		expect(screen.getByText('2')).toBeInTheDocument();
		expect(screen.getByText('10')).toBeInTheDocument();
	});

	it('should show labels', () => {
		render(
			<SubmissionStats
				pending={0}
				approved={0}
				scheduled={0}
				published={0}
			/>
		);

		expect(screen.getByText('Pending')).toBeInTheDocument();
		expect(screen.getByText('Approved')).toBeInTheDocument();
		expect(screen.getByText('Scheduled')).toBeInTheDocument();
		expect(screen.getByText('Published')).toBeInTheDocument();
	});

	it('should show loading skeletons when isLoading is true', () => {
		const { container } = render(
			<SubmissionStats
				pending={0}
				approved={0}
				scheduled={0}
				published={0}
				isLoading
			/>
		);

		// Skeleton components have animation class
		const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
		expect(skeletons.length).toBeGreaterThan(0);
	});

	it('should show zero values correctly', () => {
		render(
			<SubmissionStats
				pending={0}
				approved={0}
				scheduled={0}
				published={0}
			/>
		);

		const zeros = screen.getAllByText('0');
		expect(zeros.length).toBe(4);
	});
});
