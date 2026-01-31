import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScheduledList } from '@/app/components/schedule/scheduled-list';
import { ContentItem } from '@/lib/types';

// Helper to create mock items with timestamps
const createMockItem = (overrides: Partial<ContentItem> = {}): ContentItem => ({
	id: '1',
	userId: 'user1',
	userEmail: 'user@example.com',
	mediaUrl: 'https://example.com/image.jpg',
	mediaType: 'IMAGE',
	source: 'submission',
	submissionStatus: 'approved',
	publishingStatus: 'scheduled',
	caption: 'Test caption',
	version: 1,
	createdAt: '2024-01-15T10:00:00Z',
	updatedAt: '2024-01-15T10:00:00Z',
	scheduledTime: Date.now() + 3600000, // 1 hour from now
	...overrides,
});

describe('ScheduledList', () => {
	const mockOnEdit = vi.fn();
	const mockOnCancel = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render items in a table', () => {
		const items = [createMockItem()];

		render(
			<ScheduledList
				items={items}
				onEdit={mockOnEdit}
				onCancel={mockOnCancel}
			/>
		);

		expect(screen.getByText('Test caption')).toBeInTheDocument();
	});

	it('should show empty state when no items', () => {
		render(
			<ScheduledList
				items={[]}
				onEdit={mockOnEdit}
				onCancel={mockOnCancel}
			/>
		);

		expect(screen.getByText('No scheduled posts')).toBeInTheDocument();
		expect(screen.getByText(/approved submissions will appear here/i)).toBeInTheDocument();
	});

	it('should show loading skeleton when isLoading is true', () => {
		const { container } = render(
			<ScheduledList
				items={[]}
				isLoading={true}
				onEdit={mockOnEdit}
				onCancel={mockOnCancel}
			/>
		);

		const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
		expect(skeletons.length).toBeGreaterThan(0);
	});

	it('should display table headers', () => {
		const items = [createMockItem()];

		render(
			<ScheduledList
				items={items}
				onEdit={mockOnEdit}
				onCancel={mockOnCancel}
			/>
		);

		const columnHeaders = screen.getAllByRole('columnheader');
		const headerTexts = columnHeaders.map((h) => h.textContent);

		expect(headerTexts).toContain('Preview');
		expect(headerTexts).toContain('Caption');
		expect(headerTexts).toContain('Scheduled For');
		expect(headerTexts).toContain('Status');
		expect(headerTexts).toContain('Actions');
	});

	it('should show scheduled badge for scheduled items', () => {
		const items = [createMockItem({ publishingStatus: 'scheduled' })];

		render(
			<ScheduledList
				items={items}
				onEdit={mockOnEdit}
				onCancel={mockOnCancel}
			/>
		);

		expect(screen.getByText('Scheduled')).toBeInTheDocument();
	});

	it('should show overdue badge for past-due scheduled items', () => {
		const items = [
			createMockItem({
				publishingStatus: 'scheduled',
				scheduledTime: Date.now() - 3600000, // 1 hour ago
			}),
		];

		render(
			<ScheduledList
				items={items}
				onEdit={mockOnEdit}
				onCancel={mockOnCancel}
			/>
		);

		expect(screen.getByText('Overdue')).toBeInTheDocument();
	});

	it('should show failed badge for failed items', () => {
		const items = [
			createMockItem({
				publishingStatus: 'failed',
				error: 'API rate limit exceeded',
			}),
		];

		render(
			<ScheduledList
				items={items}
				onEdit={mockOnEdit}
				onCancel={mockOnCancel}
			/>
		);

		expect(screen.getByText('Failed')).toBeInTheDocument();
		expect(screen.getByText(/API rate limit exceeded/)).toBeInTheDocument();
	});

	it('should show processing badge for processing items', () => {
		const items = [createMockItem({ publishingStatus: 'processing' })];

		render(
			<ScheduledList
				items={items}
				onEdit={mockOnEdit}
				onCancel={mockOnCancel}
			/>
		);

		expect(screen.getByText('Processing')).toBeInTheDocument();
	});

	it('should show "No caption" when item has no caption', () => {
		const items = [
			createMockItem({
				caption: undefined,
				title: undefined,
			}),
		];

		render(
			<ScheduledList
				items={items}
				onEdit={mockOnEdit}
				onCancel={mockOnCancel}
			/>
		);

		expect(screen.getByText('No caption')).toBeInTheDocument();
	});

	it('should have action menu for each item', () => {
		const items = [createMockItem()];

		render(
			<ScheduledList
				items={items}
				onEdit={mockOnEdit}
				onCancel={mockOnCancel}
			/>
		);

		// Table should have action column - find buttons in table rows
		const rows = screen.getAllByRole('row');
		// First row is header, second is the data row
		expect(rows.length).toBeGreaterThan(1);
		const dataRow = rows[1];
		const buttons = dataRow.querySelectorAll('button');
		expect(buttons.length).toBeGreaterThan(0);
	});

	it('should have dropdown trigger in action cell', () => {
		const items = [createMockItem({ id: 'test-id' })];

		render(
			<ScheduledList
				items={items}
				onEdit={mockOnEdit}
				onCancel={mockOnCancel}
			/>
		);

		// The dropdown trigger has a specific data attribute
		const dropdownTrigger = screen.getByRole('button', {
			name: '', // The button only contains an icon, no accessible name
		});
		// Check it has dropdown attributes
		expect(dropdownTrigger).toHaveAttribute('data-slot', 'dropdown-menu-trigger');
	});

	it('should open preview dialog when clicking preview button', async () => {
		const items = [createMockItem({ id: 'test-id', title: 'Preview Test' })];

		render(
			<ScheduledList
				items={items}
				onEdit={mockOnEdit}
				onCancel={mockOnCancel}
			/>
		);

		// Find preview button (first button in the row with the image)
		const rows = screen.getAllByRole('row');
		const dataRow = rows[1];
		const previewButton = dataRow.querySelector('button');
		fireEvent.click(previewButton!);

		// Dialog should open with the title
		await waitFor(() => {
			expect(screen.getByRole('heading', { name: 'Preview Test' })).toBeInTheDocument();
		});

		// Dialog should have edit and cancel buttons
		expect(screen.getByRole('button', { name: /edit schedule/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /cancel post/i })).toBeInTheDocument();
	});

	it('should call onEdit from preview dialog', async () => {
		const items = [createMockItem({ id: 'test-id', title: 'Edit Test' })];

		render(
			<ScheduledList
				items={items}
				onEdit={mockOnEdit}
				onCancel={mockOnCancel}
			/>
		);

		// Open preview dialog
		const rows = screen.getAllByRole('row');
		const dataRow = rows[1];
		const previewButton = dataRow.querySelector('button');
		fireEvent.click(previewButton!);

		// Wait for dialog
		await waitFor(() => {
			expect(screen.getByRole('heading', { name: 'Edit Test' })).toBeInTheDocument();
		});

		// Click edit schedule button
		fireEvent.click(screen.getByRole('button', { name: /edit schedule/i }));

		expect(mockOnEdit).toHaveBeenCalledWith('test-id');
	});
});
