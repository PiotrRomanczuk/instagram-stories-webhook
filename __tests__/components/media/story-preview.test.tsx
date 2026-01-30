import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StoryPreview } from '@/app/components/media/story-preview';

describe('StoryPreview', () => {
	it('should show placeholder when no image URL', () => {
		render(<StoryPreview imageUrl={null} />);
		expect(screen.getByText('Story Preview')).toBeInTheDocument();
	});

	it('should show image when URL provided', () => {
		render(<StoryPreview imageUrl="https://example.com/image.jpg" />);
		const img = screen.getByRole('img');
		expect(img).toBeInTheDocument();
		expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
	});

	it('should show 9:16 Preview label', () => {
		render(<StoryPreview imageUrl={null} />);
		expect(screen.getByText('9:16 Preview')).toBeInTheDocument();
	});

	it('should use custom alt text', () => {
		render(
			<StoryPreview imageUrl="https://example.com/image.jpg" alt="Custom alt" />
		);
		const img = screen.getByRole('img');
		expect(img).toHaveAttribute('alt', 'Custom alt');
	});

	it('should apply custom className', () => {
		const { container } = render(
			<StoryPreview imageUrl={null} className="custom-class" />
		);
		expect(container.querySelector('.custom-class')).toBeInTheDocument();
	});
});
