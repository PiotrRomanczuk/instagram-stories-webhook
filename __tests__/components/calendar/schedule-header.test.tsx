import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScheduleHeader, ViewMode } from '@/app/components/calendar/schedule-header';
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';

describe('ScheduleHeader', () => {
	const defaultProps = {
		currentDate: new Date('2024-01-15'),
		viewMode: 'day' as ViewMode,
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

	it('should display correct date for day view', () => {
		render(<ScheduleHeader {...defaultProps} viewMode="day" />);

		// Should show "January 15, 2024"
		expect(screen.getByText('January 15, 2024')).toBeInTheDocument();
	});

	it('should show Day label in view mode indicator', () => {
		render(<ScheduleHeader {...defaultProps} />);

		// View mode toggle renders day/week/month buttons (hidden on mobile via sm:flex)
		expect(screen.getByRole('button', { name: 'day', hidden: true })).toBeInTheDocument();
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
		viewMode: 'day' as ViewMode,
		onDateChange: vi.fn(),
		onViewModeChange: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should navigate to previous day when clicking previous', async () => {
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
		// Should be 1 day earlier
		expect(newDate.getTime()).toBeLessThan(new Date('2024-01-15').getTime());
	});

	it('should navigate to next day when clicking next', async () => {
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
		// Should be 1 day later
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
});

describe('ScheduleHeader - Search', () => {
	const defaultProps = {
		currentDate: new Date('2024-01-15'),
		viewMode: 'day' as ViewMode,
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
		viewMode: 'day' as ViewMode,
		onDateChange: vi.fn(),
		onViewModeChange: vi.fn(),
	};

	it('should not render Publish Now button in MVP mode', () => {
		render(<ScheduleHeader {...defaultProps} onPublishNow={vi.fn()} />);

		expect(screen.queryByRole('button', { name: /Publish Now/i })).not.toBeInTheDocument();
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
