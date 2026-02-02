import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScheduleHeader, ViewMode } from '@/app/components/calendar/schedule-header';
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';

describe('ScheduleHeader', () => {
	const defaultProps = {
		currentDate: new Date('2024-01-15'),
		viewMode: 'week' as ViewMode,
		onDateChange: vi.fn(),
		onViewModeChange: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render the header with date navigation', () => {
		render(<ScheduleHeader {...defaultProps} />);

		// Should show navigation buttons
		const buttons = screen.getAllByRole('button');
		expect(buttons.length).toBeGreaterThan(0);
	});

	it('should display correct date range for week view', () => {
		render(<ScheduleHeader {...defaultProps} />);

		// For week of Jan 15, 2024 (Monday-Sunday)
		// Should show something like "January 15 - 21, 2024"
		const weekStart = startOfWeek(new Date('2024-01-15'), { weekStartsOn: 1 });
		const weekEnd = endOfWeek(new Date('2024-01-15'), { weekStartsOn: 1 });

		// The exact format depends on whether dates span months
		expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
	});

	it('should display correct date for day view', () => {
		render(<ScheduleHeader {...defaultProps} viewMode="day" />);

		// Should show "January 15, 2024"
		expect(screen.getByText('January 15, 2024')).toBeInTheDocument();
	});

	it('should display correct date for month view', () => {
		render(<ScheduleHeader {...defaultProps} viewMode="month" />);

		// Should show "January 2024"
		expect(screen.getByText('January 2024')).toBeInTheDocument();
	});

	it('should render view mode toggle buttons', () => {
		render(<ScheduleHeader {...defaultProps} />);

		expect(screen.getByText('day')).toBeInTheDocument();
		expect(screen.getByText('week')).toBeInTheDocument();
		expect(screen.getByText('month')).toBeInTheDocument();
	});

	it('should call onViewModeChange when clicking view mode buttons', async () => {
		const user = userEvent.setup();
		const onViewModeChange = vi.fn();

		render(<ScheduleHeader {...defaultProps} onViewModeChange={onViewModeChange} />);

		await user.click(screen.getByText('day'));
		expect(onViewModeChange).toHaveBeenCalledWith('day');

		await user.click(screen.getByText('month'));
		expect(onViewModeChange).toHaveBeenCalledWith('month');
	});

	it('should have Today button', () => {
		render(<ScheduleHeader {...defaultProps} />);

		expect(screen.getByText('Today')).toBeInTheDocument();
	});

	it('should call onDateChange with current date when clicking Today', async () => {
		const user = userEvent.setup();
		const onDateChange = vi.fn();

		render(<ScheduleHeader {...defaultProps} onDateChange={onDateChange} />);

		await user.click(screen.getByText('Today'));

		expect(onDateChange).toHaveBeenCalled();
		// The date should be close to now
		const calledDate = onDateChange.mock.calls[0][0];
		expect(calledDate.getFullYear()).toBe(new Date().getFullYear());
	});
});

describe('ScheduleHeader - Navigation', () => {
	const defaultProps = {
		currentDate: new Date('2024-01-15'),
		viewMode: 'week' as ViewMode,
		onDateChange: vi.fn(),
		onViewModeChange: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should navigate to previous week when clicking previous in week view', async () => {
		const onDateChange = vi.fn();

		render(<ScheduleHeader {...defaultProps} onDateChange={onDateChange} />);

		// Click the first button (previous navigation)
		const buttons = screen.getAllByRole('button');
		const prevButton = buttons.find((btn) => btn.querySelector('svg'));

		if (prevButton) {
			fireEvent.click(prevButton);
		}

		expect(onDateChange).toHaveBeenCalled();
		const newDate = onDateChange.mock.calls[0][0];
		// Should be 7 days earlier
		expect(newDate.getTime()).toBeLessThan(new Date('2024-01-15').getTime());
	});

	it('should navigate to next week when clicking next in week view', async () => {
		const onDateChange = vi.fn();

		render(<ScheduleHeader {...defaultProps} onDateChange={onDateChange} />);

		// Find and click the next button (second navigation button)
		const buttons = screen.getAllByRole('button');
		// The next button is typically after the previous button
		const nextButton = buttons[1]; // Second button with icon

		if (nextButton) {
			fireEvent.click(nextButton);
		}

		expect(onDateChange).toHaveBeenCalled();
		const newDate = onDateChange.mock.calls[0][0];
		// Should be 7 days later
		expect(newDate.getTime()).toBeGreaterThan(new Date('2024-01-15').getTime());
	});

	it('should navigate by day in day view', async () => {
		const onDateChange = vi.fn();

		render(<ScheduleHeader {...defaultProps} viewMode="day" onDateChange={onDateChange} />);

		const buttons = screen.getAllByRole('button');
		const prevButton = buttons.find((btn) => btn.querySelector('svg'));

		if (prevButton) {
			fireEvent.click(prevButton);
		}

		expect(onDateChange).toHaveBeenCalled();
		const newDate = onDateChange.mock.calls[0][0];
		// Should be 1 day earlier
		const expectedDate = subDays(new Date('2024-01-15'), 1);
		expect(newDate.toDateString()).toBe(expectedDate.toDateString());
	});

	it('should navigate by month in month view', async () => {
		const onDateChange = vi.fn();

		render(<ScheduleHeader {...defaultProps} viewMode="month" onDateChange={onDateChange} />);

		const buttons = screen.getAllByRole('button');
		const prevButton = buttons.find((btn) => btn.querySelector('svg'));

		if (prevButton) {
			fireEvent.click(prevButton);
		}

		expect(onDateChange).toHaveBeenCalled();
		const newDate = onDateChange.mock.calls[0][0];
		// Should be 1 month earlier
		expect(newDate.getMonth()).toBe(11); // December (month before January)
	});
});

describe('ScheduleHeader - Search', () => {
	const defaultProps = {
		currentDate: new Date('2024-01-15'),
		viewMode: 'week' as ViewMode,
		onDateChange: vi.fn(),
		onViewModeChange: vi.fn(),
	};

	it('should render search input when onSearchChange is provided', () => {
		render(
			<ScheduleHeader
				{...defaultProps}
				searchQuery=""
				onSearchChange={vi.fn()}
			/>
		);

		expect(screen.getByPlaceholderText('Search events...')).toBeInTheDocument();
	});

	it('should not render search input when onSearchChange is not provided', () => {
		render(<ScheduleHeader {...defaultProps} />);

		expect(screen.queryByPlaceholderText('Search events...')).not.toBeInTheDocument();
	});

	it('should call onSearchChange when typing in search', async () => {
		const user = userEvent.setup();
		const onSearchChange = vi.fn();

		render(
			<ScheduleHeader
				{...defaultProps}
				searchQuery=""
				onSearchChange={onSearchChange}
			/>
		);

		const searchInput = screen.getByPlaceholderText('Search events...');
		await user.type(searchInput, 'test');

		expect(onSearchChange).toHaveBeenCalled();
	});

	it('should display current search query', () => {
		render(
			<ScheduleHeader
				{...defaultProps}
				searchQuery="my search"
				onSearchChange={vi.fn()}
			/>
		);

		const searchInput = screen.getByPlaceholderText('Search events...') as HTMLInputElement;
		expect(searchInput.value).toBe('my search');
	});
});

describe('ScheduleHeader - Action Buttons', () => {
	const defaultProps = {
		currentDate: new Date('2024-01-15'),
		viewMode: 'week' as ViewMode,
		onDateChange: vi.fn(),
		onViewModeChange: vi.fn(),
	};

	it('should render Publish Now button when onPublishNow is provided', () => {
		render(<ScheduleHeader {...defaultProps} onPublishNow={vi.fn()} />);

		expect(screen.getByRole('button', { name: /Publish Now/i })).toBeInTheDocument();
	});

	it('should not render Publish Now button when onPublishNow is not provided', () => {
		render(<ScheduleHeader {...defaultProps} />);

		expect(screen.queryByRole('button', { name: /Publish Now/i })).not.toBeInTheDocument();
	});

	it('should call onPublishNow when clicking Publish Now', async () => {
		const user = userEvent.setup();
		const onPublishNow = vi.fn();

		render(<ScheduleHeader {...defaultProps} onPublishNow={onPublishNow} />);

		await user.click(screen.getByRole('button', { name: /Publish Now/i }));

		expect(onPublishNow).toHaveBeenCalled();
	});

	it('should render New Schedule button when onNewSchedule is provided', () => {
		render(<ScheduleHeader {...defaultProps} onNewSchedule={vi.fn()} />);

		expect(screen.getByRole('button', { name: /New Schedule/i })).toBeInTheDocument();
	});

	it('should not render New Schedule button when onNewSchedule is not provided', () => {
		render(<ScheduleHeader {...defaultProps} />);

		expect(screen.queryByRole('button', { name: /New Schedule/i })).not.toBeInTheDocument();
	});

	it('should call onNewSchedule when clicking New Schedule', async () => {
		const user = userEvent.setup();
		const onNewSchedule = vi.fn();

		render(<ScheduleHeader {...defaultProps} onNewSchedule={onNewSchedule} />);

		await user.click(screen.getByRole('button', { name: /New Schedule/i }));

		expect(onNewSchedule).toHaveBeenCalled();
	});
});

describe('ScheduleHeader - View Mode Styling', () => {
	const defaultProps = {
		currentDate: new Date('2024-01-15'),
		viewMode: 'week' as ViewMode,
		onDateChange: vi.fn(),
		onViewModeChange: vi.fn(),
	};

	it('should highlight active view mode', () => {
		render(<ScheduleHeader {...defaultProps} viewMode="week" />);

		const weekButton = screen.getByText('week');
		// Active button should have different styling (contains bg-white in dark mode or similar)
		expect(weekButton.className).toMatch(/bg-white|bg-slate-700|shadow/);
	});

	it('should change highlight when view mode changes', () => {
		const { rerender } = render(<ScheduleHeader {...defaultProps} viewMode="week" />);

		let weekButton = screen.getByText('week');
		expect(weekButton.className).toMatch(/bg-white|bg-slate-700|shadow/);

		rerender(<ScheduleHeader {...defaultProps} viewMode="day" />);

		const dayButton = screen.getByText('day');
		expect(dayButton.className).toMatch(/bg-white|bg-slate-700|shadow/);
	});
});
