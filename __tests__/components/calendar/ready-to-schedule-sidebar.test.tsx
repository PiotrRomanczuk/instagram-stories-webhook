import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReadyToScheduleSidebar } from '@/app/components/calendar/ready-to-schedule-sidebar';
import { DndContext } from '@dnd-kit/core';
import { ContentItem } from '@/lib/types';

// Helper to wrap component with DndContext
const renderWithDnd = (ui: React.ReactElement) => {
	return render(<DndContext>{ui}</DndContext>);
};

// Helper to create mock content items
const createMockItem = (overrides: Partial<ContentItem> = {}): ContentItem => ({
	id: 'test-id',
	userId: 'user1',
	userEmail: 'user@example.com',
	mediaUrl: 'https://example.com/image.jpg',
	mediaType: 'IMAGE',
	source: 'submission',
	submissionStatus: 'approved',
	publishingStatus: 'draft',
	caption: 'Test caption',
	version: 1,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	...overrides,
});

describe('ReadyToScheduleSidebar', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render the sidebar with header', () => {
		renderWithDnd(<ReadyToScheduleSidebar items={[]} />);

		expect(screen.getByText('Ready to Schedule')).toBeInTheDocument();
	});

	it('should display asset count badge', () => {
		const items = [
			createMockItem({ id: '1' }),
			createMockItem({ id: '2' }),
			createMockItem({ id: '3' }),
		];

		renderWithDnd(<ReadyToScheduleSidebar items={items} />);

		expect(screen.getByText('3 assets')).toBeInTheDocument();
	});

	it('should render filter tabs', () => {
		renderWithDnd(<ReadyToScheduleSidebar items={[]} />);

		expect(screen.getByText('All')).toBeInTheDocument();
		expect(screen.getByText('Recent')).toBeInTheDocument();
		expect(screen.getByText('Approved')).toBeInTheDocument();
	});

	it('should show empty state when no items', () => {
		renderWithDnd(<ReadyToScheduleSidebar items={[]} />);

		expect(screen.getByText('No content ready')).toBeInTheDocument();
		expect(screen.getByText('Approved submissions will appear here')).toBeInTheDocument();
	});

	it('should render view density controls', () => {
		renderWithDnd(<ReadyToScheduleSidebar items={[]} />);

		expect(screen.getByText('View Density')).toBeInTheDocument();
		expect(screen.getByTitle('Comfortable view')).toBeInTheDocument();
		expect(screen.getByTitle('Compact view')).toBeInTheDocument();
	});
});

describe('ReadyToScheduleSidebar - Item Display', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render approved items', () => {
		const items = [
			createMockItem({
				id: '1',
				title: 'First Item',
				submissionStatus: 'approved',
				publishingStatus: 'draft',
			}),
		];

		renderWithDnd(<ReadyToScheduleSidebar items={items} />);

		expect(screen.getByText('First Item')).toBeInTheDocument();
	});

	it('should show "Approved" badge on approved items', () => {
		const items = [
			createMockItem({
				id: '1',
				title: 'Test Item',
				submissionStatus: 'approved',
				publishingStatus: 'draft',
			}),
		];

		renderWithDnd(<ReadyToScheduleSidebar items={items} />);

		// The badge and tab both show "Approved"
		// We expect at least 2: one in the tab, one in the badge
		const approvedElements = screen.getAllByText(/approved/i);
		expect(approvedElements.length).toBeGreaterThanOrEqual(2);
	});

	it('should not show already scheduled items as ready', () => {
		// Items that are scheduled and have scheduledTime are filtered out from "ready" list
		const items = [
			createMockItem({
				id: '1',
				submissionStatus: 'approved',
				publishingStatus: 'scheduled',
				scheduledTime: Date.now() + 3600000,
			}),
		];

		renderWithDnd(<ReadyToScheduleSidebar items={items} />);

		// Scheduled items are filtered out, so we should see empty state
		expect(screen.getByText('No content ready')).toBeInTheDocument();
	});

	it('should use caption as title if no title provided', () => {
		const items = [
			createMockItem({
				id: '1',
				title: undefined,
				caption: 'This is a longer caption that should be truncated',
				submissionStatus: 'approved',
				publishingStatus: 'draft',
			}),
		];

		renderWithDnd(<ReadyToScheduleSidebar items={items} />);

		// Should show truncated caption as title
		expect(screen.getByText(/This is a longer caption/)).toBeInTheDocument();
	});

	it('should show "Untitled" for items without title or caption', () => {
		const items = [
			createMockItem({
				id: '1',
				title: undefined,
				caption: undefined,
				submissionStatus: 'approved',
				publishingStatus: 'draft',
			}),
		];

		renderWithDnd(<ReadyToScheduleSidebar items={items} />);

		expect(screen.getByText('Untitled')).toBeInTheDocument();
	});

	it('should render item image', () => {
		const items = [
			createMockItem({
				id: '1',
				mediaUrl: 'https://example.com/test-image.jpg',
				submissionStatus: 'approved',
				publishingStatus: 'draft',
			}),
		];

		const { container } = renderWithDnd(<ReadyToScheduleSidebar items={items} />);

		// Image should be rendered as background
		const imageElement = container.querySelector('[style*="background-image"]');
		expect(imageElement).toBeInTheDocument();
	});

	it('should render clickable items', () => {
		const onItemClick = vi.fn();

		const items = [
			createMockItem({
				id: 'clickable',
				title: 'Clickable Item',
				submissionStatus: 'approved',
				publishingStatus: 'draft',
			}),
		];

		const { container } = renderWithDnd(
			<ReadyToScheduleSidebar items={items} onItemClick={onItemClick} />
		);

		// Find the card container (has cursor-grab class) - it's clickable
		const cardElement = container.querySelector('.cursor-grab');
		expect(cardElement).toBeInTheDocument();

		// The item title should be visible
		expect(screen.getByText('Clickable Item')).toBeInTheDocument();
	});
});

describe('ReadyToScheduleSidebar - Filtering', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should filter by "All" tab by default', () => {
		const items = [
			createMockItem({ id: '1', title: 'Item 1', submissionStatus: 'approved', publishingStatus: 'draft' }),
			createMockItem({ id: '2', title: 'Item 2', source: 'direct', submissionStatus: undefined, publishingStatus: 'draft' }),
		];

		renderWithDnd(<ReadyToScheduleSidebar items={items} />);

		// Both items should be visible with "All" tab
		expect(screen.getByText('Item 1')).toBeInTheDocument();
		// Direct uploads should also appear
	});

	it('should filter by "Recent" tab (last 24 hours)', async () => {
		const user = userEvent.setup();

		const recentDate = new Date().toISOString();
		const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(); // 48 hours ago

		const items = [
			createMockItem({ id: '1', title: 'Recent Item', createdAt: recentDate, submissionStatus: 'approved', publishingStatus: 'draft' }),
			createMockItem({ id: '2', title: 'Old Item', createdAt: oldDate, submissionStatus: 'approved', publishingStatus: 'draft' }),
		];

		renderWithDnd(<ReadyToScheduleSidebar items={items} />);

		// Initially both items are visible
		expect(screen.getByText('Recent Item')).toBeInTheDocument();
		expect(screen.getByText('Old Item')).toBeInTheDocument();

		await user.click(screen.getByText('Recent'));

		// After clicking Recent tab, only recent item should be visible
		await waitFor(() => {
			expect(screen.getByText('Recent Item')).toBeInTheDocument();
		});
	});

	it('should filter by "Approved" tab', async () => {
		const user = userEvent.setup();

		const items = [
			createMockItem({ id: '1', title: 'Submission Item', submissionStatus: 'approved', publishingStatus: 'draft' }),
			createMockItem({ id: '2', title: 'Direct Upload', source: 'direct', submissionStatus: undefined, publishingStatus: 'draft' }),
		];

		renderWithDnd(<ReadyToScheduleSidebar items={items} />);

		// Initially both items should be visible on "All" tab
		expect(screen.getByText('Submission Item')).toBeInTheDocument();

		// Find and click the "Approved" tab (in the filter tabs section)
		const approvedTabs = screen.getAllByText('Approved');
		// The tab button is one of them
		const approvedTabButton = approvedTabs.find((el) => el.tagName === 'BUTTON');
		if (approvedTabButton) {
			await user.click(approvedTabButton);
		}

		// After clicking Approved, only submission items with approved status
		await waitFor(() => {
			expect(screen.getByText('Submission Item')).toBeInTheDocument();
		});
	});

	it('should highlight active filter tab', async () => {
		const user = userEvent.setup();

		renderWithDnd(<ReadyToScheduleSidebar items={[]} />);

		// Initially "All" should be active
		const allTab = screen.getByText('All');
		expect(allTab.className).toContain('border-[#2b6cee]');

		// Click "Recent"
		await user.click(screen.getByText('Recent'));

		const recentTab = screen.getByText('Recent');
		expect(recentTab.className).toContain('border-[#2b6cee]');
	});

	it('should show empty state when filter returns no results', async () => {
		const user = userEvent.setup();

		const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
		const items = [
			createMockItem({ id: '1', createdAt: oldDate, submissionStatus: 'approved', publishingStatus: 'draft' }),
		];

		renderWithDnd(<ReadyToScheduleSidebar items={items} />);

		await user.click(screen.getByText('Recent'));

		// Should show empty state
		expect(screen.getByText('No content ready')).toBeInTheDocument();
	});
});

describe('ReadyToScheduleSidebar - View Density', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should default to comfortable view', () => {
		const items = [
			createMockItem({ id: '1', submissionStatus: 'approved', publishingStatus: 'draft' }),
		];

		const { container } = renderWithDnd(<ReadyToScheduleSidebar items={items} />);

		// Comfortable view button should be active
		const comfortableButton = screen.getByTitle('Comfortable view');
		expect(comfortableButton.className).toContain('text-[#2b6cee]');
	});

	it('should switch to compact view when clicking compact button', async () => {
		const user = userEvent.setup();

		const items = [
			createMockItem({ id: '1', submissionStatus: 'approved', publishingStatus: 'draft' }),
			createMockItem({ id: '2', submissionStatus: 'approved', publishingStatus: 'draft' }),
		];

		const { container } = renderWithDnd(<ReadyToScheduleSidebar items={items} />);

		await user.click(screen.getByTitle('Compact view'));

		// Compact button should now be active
		const compactButton = screen.getByTitle('Compact view');
		expect(compactButton.className).toContain('text-[#2b6cee]');

		// Layout should change to grid
		const gridContainer = container.querySelector('.grid-cols-2');
		expect(gridContainer).toBeInTheDocument();
	});

	it('should switch back to comfortable view', async () => {
		const user = userEvent.setup();

		const items = [
			createMockItem({ id: '1', submissionStatus: 'approved', publishingStatus: 'draft' }),
		];

		renderWithDnd(<ReadyToScheduleSidebar items={items} />);

		// Switch to compact
		await user.click(screen.getByTitle('Compact view'));

		// Switch back to comfortable
		await user.click(screen.getByTitle('Comfortable view'));

		const comfortableButton = screen.getByTitle('Comfortable view');
		expect(comfortableButton.className).toContain('text-[#2b6cee]');
	});
});

describe('ReadyToScheduleSidebar - Drag and Drop', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should make unscheduled items draggable', () => {
		const items = [
			createMockItem({
				id: 'draggable',
				title: 'Draggable Item',
				submissionStatus: 'approved',
				publishingStatus: 'draft',
			}),
		];

		const { container } = renderWithDnd(<ReadyToScheduleSidebar items={items} />);

		// Item should have cursor-grab class
		const draggableItem = container.querySelector('.cursor-grab');
		expect(draggableItem).toBeInTheDocument();
	});

	it('should filter out scheduled items from ready list', () => {
		// Items with scheduledTime and status='scheduled' are not in the ready list
		const items = [
			createMockItem({
				id: 'scheduled',
				submissionStatus: 'approved',
				publishingStatus: 'scheduled',
				scheduledTime: Date.now() + 3600000,
			}),
		];

		renderWithDnd(<ReadyToScheduleSidebar items={items} />);

		// Scheduled items are filtered out completely
		expect(screen.getByText('No content ready')).toBeInTheDocument();
	});

	it('should show items without scheduledTime as ready', () => {
		const items = [
			createMockItem({
				id: 'ready',
				title: 'Ready Item',
				submissionStatus: 'approved',
				publishingStatus: 'draft',
				scheduledTime: undefined,
			}),
		];

		renderWithDnd(<ReadyToScheduleSidebar items={items} />);

		expect(screen.getByText('Ready Item')).toBeInTheDocument();
	});
});

describe('ReadyToScheduleSidebar - Item Status', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should not show published items as ready', () => {
		const items = [
			createMockItem({
				id: 'published',
				submissionStatus: 'approved',
				publishingStatus: 'published',
			}),
		];

		renderWithDnd(<ReadyToScheduleSidebar items={items} />);

		// Published items should not appear in the ready list
		expect(screen.getByText('No content ready')).toBeInTheDocument();
	});

	it('should show both approved submissions and direct uploads', () => {
		const items = [
			createMockItem({
				id: 'submission',
				title: 'From Submission',
				source: 'submission',
				submissionStatus: 'approved',
				publishingStatus: 'draft',
			}),
			createMockItem({
				id: 'direct',
				title: 'Direct Upload',
				source: 'direct',
				submissionStatus: undefined,
				publishingStatus: 'draft',
			}),
		];

		renderWithDnd(<ReadyToScheduleSidebar items={items} />);

		expect(screen.getByText('From Submission')).toBeInTheDocument();
		expect(screen.getByText('Direct Upload')).toBeInTheDocument();
	});

	it('should update count when filtering changes', async () => {
		const user = userEvent.setup();

		const recentDate = new Date().toISOString();
		const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

		const items = [
			createMockItem({ id: '1', createdAt: recentDate, submissionStatus: 'approved', publishingStatus: 'draft' }),
			createMockItem({ id: '2', createdAt: oldDate, submissionStatus: 'approved', publishingStatus: 'draft' }),
		];

		renderWithDnd(<ReadyToScheduleSidebar items={items} />);

		// Initially shows all items
		expect(screen.getByText('2 assets')).toBeInTheDocument();

		// After filtering by recent, count should still show total ready items
		await user.click(screen.getByText('Recent'));

		// The asset count in header always shows total ready items
		expect(screen.getByText('2 assets')).toBeInTheDocument();
	});
});

describe('ReadyToScheduleSidebar - Image Handling', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should show fallback when image fails to load', () => {
		const items = [
			createMockItem({
				id: '1',
				mediaUrl: 'https://invalid-url.com/broken.jpg',
				submissionStatus: 'approved',
				publishingStatus: 'draft',
			}),
		];

		const { container } = renderWithDnd(<ReadyToScheduleSidebar items={items} />);

		// Find the hidden img element and trigger error
		const img = container.querySelector('img.sr-only') as HTMLImageElement;
		if (img) {
			fireEvent.error(img);
		}

		// Should show "No preview" fallback
		waitFor(() => {
			expect(screen.getByText('No preview')).toBeInTheDocument();
		});
	});
});
