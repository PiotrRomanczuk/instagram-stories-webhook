import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RejectDialog } from '@/app/components/review/reject-dialog';

describe('RejectDialog', () => {
	const mockOnOpenChange = vi.fn();
	const mockOnConfirm = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render dialog when open', () => {
		render(
			<RejectDialog
				open={true}
				onOpenChange={mockOnOpenChange}
				onConfirm={mockOnConfirm}
			/>
		);

		// Title appears as h2 in dialog header
		expect(screen.getByRole('heading', { name: 'Reject Submission' })).toBeInTheDocument();
		expect(screen.getByLabelText(/rejection reason/i)).toBeInTheDocument();
	});

	it('should not render dialog when closed', () => {
		render(
			<RejectDialog
				open={false}
				onOpenChange={mockOnOpenChange}
				onConfirm={mockOnConfirm}
			/>
		);

		expect(screen.queryByText('Reject Submission')).not.toBeInTheDocument();
	});

	it('should display item title in description when provided', () => {
		render(
			<RejectDialog
				open={true}
				onOpenChange={mockOnOpenChange}
				onConfirm={mockOnConfirm}
				itemTitle="My Awesome Meme"
			/>
		);

		expect(screen.getByText(/Rejecting "My Awesome Meme"/)).toBeInTheDocument();
	});

	it('should require a reason to submit', async () => {
		render(
			<RejectDialog
				open={true}
				onOpenChange={mockOnOpenChange}
				onConfirm={mockOnConfirm}
			/>
		);

		const submitButton = screen.getByRole('button', { name: /reject submission/i });
		expect(submitButton).toBeDisabled();
	});

	it('should enable submit button when reason is provided', async () => {
		const user = userEvent.setup();

		render(
			<RejectDialog
				open={true}
				onOpenChange={mockOnOpenChange}
				onConfirm={mockOnConfirm}
			/>
		);

		const textarea = screen.getByLabelText(/rejection reason/i);
		await user.type(textarea, 'Image quality is too low');

		const submitButton = screen.getByRole('button', { name: /reject submission/i });
		expect(submitButton).not.toBeDisabled();
	});

	it('should call onConfirm with reason when submitted', async () => {
		const user = userEvent.setup();
		mockOnConfirm.mockResolvedValue(undefined);

		render(
			<RejectDialog
				open={true}
				onOpenChange={mockOnOpenChange}
				onConfirm={mockOnConfirm}
			/>
		);

		const textarea = screen.getByLabelText(/rejection reason/i);
		await user.type(textarea, 'Image quality is too low');

		const submitButton = screen.getByRole('button', { name: /reject submission/i });
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(mockOnConfirm).toHaveBeenCalledWith('Image quality is too low');
		});
	});

	it('should close dialog on cancel', async () => {
		const user = userEvent.setup();

		render(
			<RejectDialog
				open={true}
				onOpenChange={mockOnOpenChange}
				onConfirm={mockOnConfirm}
			/>
		);

		const cancelButton = screen.getByRole('button', { name: /cancel/i });
		await user.click(cancelButton);

		expect(mockOnOpenChange).toHaveBeenCalledWith(false);
	});

	it('should show error message when onConfirm fails', async () => {
		const user = userEvent.setup();
		mockOnConfirm.mockRejectedValue(new Error('Network error'));

		render(
			<RejectDialog
				open={true}
				onOpenChange={mockOnOpenChange}
				onConfirm={mockOnConfirm}
			/>
		);

		const textarea = screen.getByLabelText(/rejection reason/i);
		await user.type(textarea, 'Some reason');

		const submitButton = screen.getByRole('button', { name: /reject submission/i });
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText('Network error')).toBeInTheDocument();
		});
	});

	it('should trim whitespace from reason', async () => {
		const user = userEvent.setup();
		mockOnConfirm.mockResolvedValue(undefined);

		render(
			<RejectDialog
				open={true}
				onOpenChange={mockOnOpenChange}
				onConfirm={mockOnConfirm}
			/>
		);

		const textarea = screen.getByLabelText(/rejection reason/i);
		await user.type(textarea, '  Image quality is too low  ');

		const submitButton = screen.getByRole('button', { name: /reject submission/i });
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(mockOnConfirm).toHaveBeenCalledWith('Image quality is too low');
		});
	});
});
