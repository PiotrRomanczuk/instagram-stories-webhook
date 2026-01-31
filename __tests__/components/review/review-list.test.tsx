import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReviewList } from '@/app/components/review/review-list';
import { ContentItem } from '@/lib/types';

const mockItems: ContentItem[] = [
	{
		id: '1',
		userId: 'user1',
		userEmail: 'user1@example.com',
		mediaUrl: 'https://example.com/image1.jpg',
		mediaType: 'IMAGE',
		source: 'submission',
		submissionStatus: 'pending',
		publishingStatus: 'draft',
		title: 'First Submission',
		caption: 'This is a great meme about programming',
		version: 1,
		createdAt: '2024-01-15T10:00:00Z',
		updatedAt: '2024-01-15T10:00:00Z',
	},
	{
		id: '2',
		userId: 'user2',
		userEmail: 'user2@example.com',
		mediaUrl: 'https://example.com/image2.jpg',
		mediaType: 'IMAGE',
		source: 'submission',
		submissionStatus: 'pending',
		publishingStatus: 'draft',
		caption: 'Another funny meme',
		version: 1,
		createdAt: '2024-01-14T10:00:00Z',
		updatedAt: '2024-01-14T10:00:00Z',
	},
];

describe('ReviewList', () => {
	const mockOnSelectionChange = vi.fn();
	const mockOnApprove = vi.fn();
	const mockOnReject = vi.fn();
	const mockOnSchedule = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render items in a table', () => {
		render(
			<ReviewList
				items={mockItems}
				selectedIds={[]}
				onSelectionChange={mockOnSelectionChange}
				onApprove={mockOnApprove}
				onReject={mockOnReject}
				onSchedule={mockOnSchedule}
			/>
		);

		expect(screen.getByText('user1@example.com')).toBeInTheDocument();
		expect(screen.getByText('user2@example.com')).toBeInTheDocument();
	});

	it('should show empty state when no items', () => {
		render(
			<ReviewList
				items={[]}
				selectedIds={[]}
				onSelectionChange={mockOnSelectionChange}
				onApprove={mockOnApprove}
				onReject={mockOnReject}
				onSchedule={mockOnSchedule}
			/>
		);

		expect(screen.getByText('No pending submissions')).toBeInTheDocument();
		expect(screen.getByText(/all submissions have been reviewed/i)).toBeInTheDocument();
	});

	it('should show loading skeleton when isLoading is true', () => {
		const { container } = render(
			<ReviewList
				items={[]}
				isLoading={true}
				selectedIds={[]}
				onSelectionChange={mockOnSelectionChange}
				onApprove={mockOnApprove}
				onReject={mockOnReject}
				onSchedule={mockOnSchedule}
			/>
		);

		// Should render skeleton elements
		const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
		expect(skeletons.length).toBeGreaterThan(0);
	});

	it('should display table headers', () => {
		render(
			<ReviewList
				items={mockItems}
				selectedIds={[]}
				onSelectionChange={mockOnSelectionChange}
				onApprove={mockOnApprove}
				onReject={mockOnReject}
				onSchedule={mockOnSchedule}
			/>
		);

		// Use getAllByRole to find column headers
		const columnHeaders = screen.getAllByRole('columnheader');
		const headerTexts = columnHeaders.map((h) => h.textContent);

		expect(headerTexts).toContain('Preview');
		expect(headerTexts).toContain('Caption');
		expect(headerTexts).toContain('Submitted By');
		expect(headerTexts).toContain('Date');
		expect(headerTexts).toContain('Actions');
	});

	it('should call onSelectionChange when selecting an item', () => {
		render(
			<ReviewList
				items={mockItems}
				selectedIds={[]}
				onSelectionChange={mockOnSelectionChange}
				onApprove={mockOnApprove}
				onReject={mockOnReject}
				onSchedule={mockOnSchedule}
			/>
		);

		const checkboxes = screen.getAllByRole('checkbox');
		// First checkbox is "select all", second is first item
		fireEvent.click(checkboxes[1]);

		expect(mockOnSelectionChange).toHaveBeenCalledWith(['1']);
	});

	it('should call onSelectionChange with all items when select all is clicked', () => {
		render(
			<ReviewList
				items={mockItems}
				selectedIds={[]}
				onSelectionChange={mockOnSelectionChange}
				onApprove={mockOnApprove}
				onReject={mockOnReject}
				onSchedule={mockOnSchedule}
			/>
		);

		const checkboxes = screen.getAllByRole('checkbox');
		// First checkbox is "select all"
		fireEvent.click(checkboxes[0]);

		expect(mockOnSelectionChange).toHaveBeenCalledWith(['1', '2']);
	});

	it('should deselect all when select all is clicked and all are selected', () => {
		render(
			<ReviewList
				items={mockItems}
				selectedIds={['1', '2']}
				onSelectionChange={mockOnSelectionChange}
				onApprove={mockOnApprove}
				onReject={mockOnReject}
				onSchedule={mockOnSchedule}
			/>
		);

		const checkboxes = screen.getAllByRole('checkbox');
		fireEvent.click(checkboxes[0]);

		expect(mockOnSelectionChange).toHaveBeenCalledWith([]);
	});

	it('should display caption in table', () => {
		render(
			<ReviewList
				items={mockItems}
				selectedIds={[]}
				onSelectionChange={mockOnSelectionChange}
				onApprove={mockOnApprove}
				onReject={mockOnReject}
				onSchedule={mockOnSchedule}
			/>
		);

		expect(screen.getByText('This is a great meme about programming')).toBeInTheDocument();
		expect(screen.getByText('Another funny meme')).toBeInTheDocument();
	});

	it('should show "No caption" when item has no caption or title', () => {
		const itemsWithoutCaption: ContentItem[] = [
			{
				...mockItems[0],
				title: undefined,
				caption: undefined,
			},
		];

		render(
			<ReviewList
				items={itemsWithoutCaption}
				selectedIds={[]}
				onSelectionChange={mockOnSelectionChange}
				onApprove={mockOnApprove}
				onReject={mockOnReject}
				onSchedule={mockOnSchedule}
			/>
		);

		expect(screen.getByText('No caption')).toBeInTheDocument();
	});

	it('should render action buttons for each item', () => {
		render(
			<ReviewList
				items={[mockItems[0]]}
				selectedIds={[]}
				onSelectionChange={mockOnSelectionChange}
				onApprove={mockOnApprove}
				onReject={mockOnReject}
				onSchedule={mockOnSchedule}
			/>
		);

		// In desktop view (lg:block), should have approve, reject, schedule buttons
		expect(screen.getAllByRole('button', { name: /approve/i }).length).toBeGreaterThan(0);
	});

	it('should display formatted date', () => {
		render(
			<ReviewList
				items={mockItems}
				selectedIds={[]}
				onSelectionChange={mockOnSelectionChange}
				onApprove={mockOnApprove}
				onReject={mockOnReject}
				onSchedule={mockOnSchedule}
			/>
		);

		expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
		expect(screen.getByText('Jan 14, 2024')).toBeInTheDocument();
	});
});
