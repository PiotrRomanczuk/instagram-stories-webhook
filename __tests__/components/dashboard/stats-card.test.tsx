import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Clock } from 'lucide-react';
import { StatsCard, StatsCardSkeleton } from '@/app/components/dashboard/stats-card';

describe('StatsCard', () => {
	it('should render label and value', () => {
		render(
			<StatsCard
				label="Test Label"
				value={42}
				icon={<Clock data-testid="icon" />}
			/>
		);

		expect(screen.getByText('Test Label')).toBeInTheDocument();
		expect(screen.getByText('42')).toBeInTheDocument();
	});

	it('should render string value', () => {
		render(
			<StatsCard
				label="Status"
				value="OK"
				icon={<Clock data-testid="icon" />}
			/>
		);

		expect(screen.getByText('OK')).toBeInTheDocument();
	});

	it('should render icon', () => {
		render(
			<StatsCard
				label="Test"
				value={0}
				icon={<Clock data-testid="test-icon" />}
			/>
		);

		expect(screen.getByTestId('test-icon')).toBeInTheDocument();
	});

	it('should render description when provided', () => {
		render(
			<StatsCard
				label="Test"
				value={5}
				icon={<Clock />}
				description="This is a description"
			/>
		);

		expect(screen.getByText('This is a description')).toBeInTheDocument();
	});

	it('should render positive trend', () => {
		render(
			<StatsCard
				label="Test"
				value={100}
				icon={<Clock />}
				trend={{ value: 12, isPositive: true }}
			/>
		);

		expect(screen.getByText('+12%')).toBeInTheDocument();
	});

	it('should render negative trend', () => {
		render(
			<StatsCard
				label="Test"
				value={100}
				icon={<Clock />}
				trend={{ value: -5, isPositive: false }}
			/>
		);

		expect(screen.getByText('-5%')).toBeInTheDocument();
	});

	it('should apply custom className', () => {
		const { container } = render(
			<StatsCard
				label="Test"
				value={0}
				icon={<Clock />}
				className="custom-class"
			/>
		);

		expect(container.querySelector('.custom-class')).toBeInTheDocument();
	});
});

describe('StatsCardSkeleton', () => {
	it('should render skeleton elements', () => {
		const { container } = render(<StatsCardSkeleton />);

		const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
		expect(skeletons.length).toBeGreaterThan(0);
	});

	it('should apply custom className', () => {
		const { container } = render(<StatsCardSkeleton className="custom-skeleton" />);

		expect(container.querySelector('.custom-skeleton')).toBeInTheDocument();
	});
});
