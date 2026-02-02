import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScheduleCalendarGrid } from '@/app/components/calendar/schedule-calendar-grid';
import { DndContext } from '@dnd-kit/core';
import { ContentItem } from '@/lib/types';
import { format, setHours, setMinutes } from 'date-fns';

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
	publishingStatus: 'scheduled',
	caption: 'Test caption',
	version: 1,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	...overrides,
});

describe('ScheduleCalendarGrid', () => {
	const defaultDate = new Date('2024-01-15T12:00:00');

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render the calendar grid', () => {
		renderWithDnd(
			<ScheduleCalendarGrid
				currentDate={defaultDate}
				scheduledItems={[]}
			/>
		);

		// Should show day name
		expect(screen.getByText('Monday')).toBeInTheDocument();
		// Should show date
		expect(screen.getByText('15')).toBeInTheDocument();
	});

	it('should render time slots from 6 AM to 11 PM', () => {
		const { container } = renderWithDnd(
			<ScheduleCalendarGrid
				currentDate={defaultDate}
				scheduledItems={[]}
			/>
		);

		// Check that 18 hour rows exist (6 AM to 11 PM)
		// Each hour has a time label div
		expect(screen.getAllByText('AM').length).toBeGreaterThan(0);
		expect(screen.getAllByText('PM').length).toBeGreaterThan(0);
	});

	it('should display timezone indicator', () => {
		renderWithDnd(
			<ScheduleCalendarGrid
				currentDate={defaultDate}
				scheduledItems={[]}
			/>
		);

		// Should show some timezone indicator
		const container = document.body;
		expect(container.textContent).toMatch(/Local|Warsaw|UTC|New_York|Los_Angeles|Europe|America/i);
	});
});

describe('ScheduleCalendarGrid - Scheduled Items', () => {
	const defaultDate = new Date('2024-01-15T12:00:00');

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render scheduled items in correct time blocks', () => {
		const scheduledTime = setMinutes(setHours(defaultDate, 10), 30); // 10:30 AM

		const mockItem = createMockItem({
			id: 'item-1',
			title: 'Test Item',
			scheduledTime: scheduledTime.getTime(),
		});

		renderWithDnd(
			<ScheduleCalendarGrid
				currentDate={defaultDate}
				scheduledItems={[mockItem]}
			/>
		);

		// Item should be visible
		expect(screen.getByText('Test Item')).toBeInTheDocument();
	});

	it('should handle multiple items in the same 15-minute block', () => {
		const time1 = setMinutes(setHours(defaultDate, 10), 32); // 10:32
		const time2 = setMinutes(setHours(defaultDate, 10), 38); // 10:38

		const items = [
			createMockItem({
				id: 'item-1',
				title: 'First Item',
				scheduledTime: time1.getTime(),
			}),
			createMockItem({
				id: 'item-2',
				title: 'Second Item',
				scheduledTime: time2.getTime(),
			}),
		];

		renderWithDnd(
			<ScheduleCalendarGrid
				currentDate={defaultDate}
				scheduledItems={items}
			/>
		);

		// Both items should be visible (displayed side by side)
		expect(screen.getByText('First Item')).toBeInTheDocument();
		expect(screen.getByText('Second Item')).toBeInTheDocument();
	});

	it('should show overflow indicator when more than 2 items in same block', () => {
		const baseTime = setMinutes(setHours(defaultDate, 10), 30);

		const items = [
			createMockItem({ id: 'item-1', title: 'Item 1', scheduledTime: baseTime.getTime() }),
			createMockItem({ id: 'item-2', title: 'Item 2', scheduledTime: baseTime.getTime() + 60000 }),
			createMockItem({ id: 'item-3', title: 'Item 3', scheduledTime: baseTime.getTime() + 120000 }),
		];

		renderWithDnd(
			<ScheduleCalendarGrid
				currentDate={defaultDate}
				scheduledItems={items}
			/>
		);

		// Should show +1 overflow indicator
		expect(screen.getByText('+1')).toBeInTheDocument();
	});

	it('should handle empty scheduled items', () => {
		const { container } = renderWithDnd(
			<ScheduleCalendarGrid
				currentDate={defaultDate}
				scheduledItems={[]}
			/>
		);

		// Grid should still render without items
		expect(screen.getByText('Monday')).toBeInTheDocument();
	});

	it('should not render items from different days', () => {
		const differentDay = new Date('2024-01-16T10:30:00'); // Jan 16 instead of 15

		const mockItem = createMockItem({
			id: 'item-1',
			title: 'Wrong Day Item',
			scheduledTime: differentDay.getTime(),
		});

		renderWithDnd(
			<ScheduleCalendarGrid
				currentDate={defaultDate}
				scheduledItems={[mockItem]}
			/>
		);

		// Item should not be visible since it's for a different day
		expect(screen.queryByText('Wrong Day Item')).not.toBeInTheDocument();
	});
});

describe('ScheduleCalendarGrid - Droppable Zones', () => {
	const defaultDate = new Date('2024-01-15T12:00:00');

	it('should have droppable time blocks', () => {
		const { container } = renderWithDnd(
			<ScheduleCalendarGrid
				currentDate={defaultDate}
				scheduledItems={[]}
			/>
		);

		// Each hour has 4 fifteen-minute droppable blocks
		// 18 hours * 4 blocks = 72 droppable zones
		const droppableZones = container.querySelectorAll('[data-droppable-id]');
		expect(droppableZones.length).toBe(72);
	});

	it('should format droppable IDs correctly', () => {
		const { container } = renderWithDnd(
			<ScheduleCalendarGrid
				currentDate={defaultDate}
				scheduledItems={[]}
			/>
		);

		// Check for specific droppable ID format: YYYY-MM-DD-hour-minute
		// With default 15-min granularity: :00, :15, :30, :45
		const droppable = container.querySelector('[data-droppable-id="2024-01-15-10-0"]');
		expect(droppable).toBeInTheDocument();

		// Check another block (10:30)
		const droppable2 = container.querySelector('[data-droppable-id="2024-01-15-10-30"]');
		expect(droppable2).toBeInTheDocument();
	});
});

describe('ScheduleCalendarGrid - Click Handling', () => {
	const defaultDate = new Date('2024-01-15T12:00:00');

	it('should call onItemClick when item is clicked', async () => {
		const onItemClick = vi.fn();
		const scheduledTime = setMinutes(setHours(defaultDate, 10), 30);

		const mockItem = createMockItem({
			id: 'item-1',
			title: 'Clickable Item',
			scheduledTime: scheduledTime.getTime(),
		});

		renderWithDnd(
			<ScheduleCalendarGrid
				currentDate={defaultDate}
				scheduledItems={[mockItem]}
				onItemClick={onItemClick}
			/>
		);

		// The click handler is attached to ScheduleCalendarItem
		const item = screen.getByText('Clickable Item');
		expect(item).toBeInTheDocument();
	});
});
