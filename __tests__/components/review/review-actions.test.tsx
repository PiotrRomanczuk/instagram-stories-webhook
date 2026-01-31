import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReviewActions } from '@/app/components/review/review-actions';

describe('ReviewActions', () => {
	const mockOnApprove = vi.fn();
	const mockOnReject = vi.fn();
	const mockOnSchedule = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render all action buttons in full mode', () => {
		render(
			<ReviewActions
				itemId="123"
				onApprove={mockOnApprove}
				onReject={mockOnReject}
				onSchedule={mockOnSchedule}
			/>
		);

		expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /schedule/i })).toBeInTheDocument();
	});

	it('should call onApprove when approve button is clicked', async () => {
		mockOnApprove.mockResolvedValue(undefined);

		render(
			<ReviewActions
				itemId="123"
				onApprove={mockOnApprove}
				onReject={mockOnReject}
				onSchedule={mockOnSchedule}
			/>
		);

		fireEvent.click(screen.getByRole('button', { name: /approve/i }));

		await waitFor(() => {
			expect(mockOnApprove).toHaveBeenCalledWith('123');
		});
	});

	it('should call onReject when reject button is clicked', () => {
		render(
			<ReviewActions
				itemId="123"
				onApprove={mockOnApprove}
				onReject={mockOnReject}
				onSchedule={mockOnSchedule}
			/>
		);

		fireEvent.click(screen.getByRole('button', { name: /reject/i }));
		expect(mockOnReject).toHaveBeenCalledWith('123');
	});

	it('should call onSchedule when schedule button is clicked', () => {
		render(
			<ReviewActions
				itemId="123"
				onApprove={mockOnApprove}
				onReject={mockOnReject}
				onSchedule={mockOnSchedule}
			/>
		);

		fireEvent.click(screen.getByRole('button', { name: /schedule/i }));
		expect(mockOnSchedule).toHaveBeenCalledWith('123');
	});

	it('should disable all buttons when disabled prop is true', () => {
		render(
			<ReviewActions
				itemId="123"
				onApprove={mockOnApprove}
				onReject={mockOnReject}
				onSchedule={mockOnSchedule}
				disabled
			/>
		);

		expect(screen.getByRole('button', { name: /approve/i })).toBeDisabled();
		expect(screen.getByRole('button', { name: /reject/i })).toBeDisabled();
		expect(screen.getByRole('button', { name: /schedule/i })).toBeDisabled();
	});

	it('should render dropdown menu in compact mode', () => {
		render(
			<ReviewActions
				itemId="123"
				onApprove={mockOnApprove}
				onReject={mockOnReject}
				onSchedule={mockOnSchedule}
				compact
			/>
		);

		// In compact mode, only "Actions" button should be visible
		expect(screen.getByRole('button', { name: /actions/i })).toBeInTheDocument();
	});

	it('should show loading state while approving', async () => {
		// Make the approve function hang
		mockOnApprove.mockImplementation(() => new Promise(() => {}));

		render(
			<ReviewActions
				itemId="123"
				onApprove={mockOnApprove}
				onReject={mockOnReject}
				onSchedule={mockOnSchedule}
			/>
		);

		const approveButton = screen.getByRole('button', { name: /approve/i });
		fireEvent.click(approveButton);

		// Button should be disabled during approval
		await waitFor(() => {
			expect(approveButton).toBeDisabled();
		});
	});
});
