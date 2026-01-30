import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from '@/app/components/layout/page-header';

describe('PageHeader', () => {
	it('should render title', () => {
		render(<PageHeader title="Test Title" />);
		expect(screen.getByRole('heading', { name: 'Test Title' })).toBeInTheDocument();
	});

	it('should render description when provided', () => {
		render(<PageHeader title="Title" description="Test description" />);
		expect(screen.getByText('Test description')).toBeInTheDocument();
	});

	it('should not render description when not provided', () => {
		render(<PageHeader title="Title" />);
		expect(screen.queryByText('Test description')).not.toBeInTheDocument();
	});

	it('should render actions when provided', () => {
		render(
			<PageHeader
				title="Title"
				actions={<button>Action Button</button>}
			/>
		);
		expect(screen.getByRole('button', { name: 'Action Button' })).toBeInTheDocument();
	});

	it('should render badge when provided', () => {
		render(
			<PageHeader
				title="Title"
				badge={<span data-testid="badge">5</span>}
			/>
		);
		expect(screen.getByTestId('badge')).toBeInTheDocument();
	});

	it('should apply custom className', () => {
		const { container } = render(<PageHeader title="Title" className="custom-class" />);
		const wrapper = container.firstChild as HTMLElement;
		expect(wrapper).toHaveClass('custom-class');
	});

	it('should render all elements together', () => {
		render(
			<PageHeader
				title="Dashboard"
				description="Welcome to your dashboard"
				badge={<span data-testid="count">10</span>}
				actions={<button>New</button>}
			/>
		);

		expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
		expect(screen.getByText('Welcome to your dashboard')).toBeInTheDocument();
		expect(screen.getByTestId('count')).toHaveTextContent('10');
		expect(screen.getByRole('button', { name: 'New' })).toBeInTheDocument();
	});
});
