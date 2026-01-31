import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScheduleDialog } from '@/app/components/review/schedule-dialog';

describe('ScheduleDialog', () => {
	const mockOnOpenChange = vi.fn();
	const mockOnConfirm = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render dialog when open', () => {
		render(
			<ScheduleDialog
				open={true}
				onOpenChange={mockOnOpenChange}
				onConfirm={mockOnConfirm}
			/>
		);

		expect(screen.getByRole('heading', { name: 'Schedule Post' })).toBeInTheDocument();
	});

	it('should not render dialog when closed', () => {
		render(
			<ScheduleDialog
				open={false}
				onOpenChange={mockOnOpenChange}
				onConfirm={mockOnConfirm}
			/>
		);

		expect(screen.queryByRole('heading', { name: 'Schedule Post' })).not.toBeInTheDocument();
	});

	it('should display "Approve & Schedule" title when needsApproval is true', () => {
		render(
			<ScheduleDialog
				open={true}
				onOpenChange={mockOnOpenChange}
				onConfirm={mockOnConfirm}
				needsApproval
			/>
		);

		expect(screen.getByRole('heading', { name: 'Approve & Schedule' })).toBeInTheDocument();
	});

	it('should display item title in description when provided', () => {
		render(
			<ScheduleDialog
				open={true}
				onOpenChange={mockOnOpenChange}
				onConfirm={mockOnConfirm}
				itemTitle="My Cool Post"
			/>
		);

		expect(screen.getByText(/Schedule "My Cool Post"/)).toBeInTheDocument();
	});

	it('should have specific time mode and queue mode options', () => {
		render(
			<ScheduleDialog
				open={true}
				onOpenChange={mockOnOpenChange}
				onConfirm={mockOnConfirm}
			/>
		);

		expect(screen.getByText('Specific Time')).toBeInTheDocument();
		expect(screen.getByText('Add to Queue')).toBeInTheDocument();
	});

	it('should show queue interval options when queue mode is selected', async () => {
		const user = userEvent.setup();

		render(
			<ScheduleDialog
				open={true}
				onOpenChange={mockOnOpenChange}
				onConfirm={mockOnConfirm}
			/>
		);

		// Click on "Add to Queue" radio option
		const queueOption = screen.getByText('Add to Queue');
		await user.click(queueOption);

		// Should show interval selector
		await waitFor(() => {
			expect(screen.getByText('Publish in')).toBeInTheDocument();
		});
	});

	it('should disable schedule button when no date is selected in specific mode', () => {
		render(
			<ScheduleDialog
				open={true}
				onOpenChange={mockOnOpenChange}
				onConfirm={mockOnConfirm}
			/>
		);

		// Find the schedule button - in specific mode without date, should be disabled
		const scheduleButtons = screen.getAllByRole('button');
		const scheduleButton = scheduleButtons.find((btn) => btn.textContent === 'Schedule');
		expect(scheduleButton).toBeDisabled();
	});

	it('should call onConfirm with scheduled time when queue mode is submitted', async () => {
		const user = userEvent.setup();
		mockOnConfirm.mockResolvedValue(undefined);

		render(
			<ScheduleDialog
				open={true}
				onOpenChange={mockOnOpenChange}
				onConfirm={mockOnConfirm}
			/>
		);

		// Switch to queue mode
		const queueOption = screen.getByText('Add to Queue');
		await user.click(queueOption);

		// Wait for the mode to change and find the schedule button
		await waitFor(() => {
			const scheduleButtons = screen.getAllByRole('button');
			const scheduleButton = scheduleButtons.find((btn) => btn.textContent === 'Schedule');
			expect(scheduleButton).not.toBeDisabled();
		});

		const scheduleButtons = screen.getAllByRole('button');
		const scheduleButton = scheduleButtons.find((btn) => btn.textContent === 'Schedule');
		fireEvent.click(scheduleButton!);

		await waitFor(() => {
			expect(mockOnConfirm).toHaveBeenCalled();
			// Should be a future timestamp
			const scheduledTime = mockOnConfirm.mock.calls[0][0];
			expect(scheduledTime).toBeGreaterThan(Date.now());
		});
	});

	it('should close dialog on cancel', async () => {
		const user = userEvent.setup();

		render(
			<ScheduleDialog
				open={true}
				onOpenChange={mockOnOpenChange}
				onConfirm={mockOnConfirm}
			/>
		);

		const cancelButton = screen.getByRole('button', { name: /cancel/i });
		await user.click(cancelButton);

		expect(mockOnOpenChange).toHaveBeenCalledWith(false);
	});

	it('should show date picker in specific mode', () => {
		render(
			<ScheduleDialog
				open={true}
				onOpenChange={mockOnOpenChange}
				onConfirm={mockOnConfirm}
			/>
		);

		expect(screen.getByText('Date')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /pick a date/i })).toBeInTheDocument();
	});

	it('should show hour and minute selectors in specific mode', () => {
		render(
			<ScheduleDialog
				open={true}
				onOpenChange={mockOnOpenChange}
				onConfirm={mockOnConfirm}
			/>
		);

		expect(screen.getByText('Hour')).toBeInTheDocument();
		expect(screen.getByText('Minute')).toBeInTheDocument();
	});
});
