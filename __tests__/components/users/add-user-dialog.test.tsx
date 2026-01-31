import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddUserDialog } from '@/app/components/users/add-user-dialog';

describe('AddUserDialog', () => {
	const mockOnOpenChange = vi.fn();
	const mockOnConfirm = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render dialog when open', () => {
		render(
			<AddUserDialog
				open={true}
				onOpenChange={mockOnOpenChange}
				onConfirm={mockOnConfirm}
			/>
		);

		expect(screen.getByRole('heading', { name: 'Add User' })).toBeInTheDocument();
		expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
	});

	it('should not render dialog when closed', () => {
		render(
			<AddUserDialog
				open={false}
				onOpenChange={mockOnOpenChange}
				onConfirm={mockOnConfirm}
			/>
		);

		expect(screen.queryByRole('heading', { name: 'Add User' })).not.toBeInTheDocument();
	});

	it('should require email to submit', () => {
		render(
			<AddUserDialog
				open={true}
				onOpenChange={mockOnOpenChange}
				onConfirm={mockOnConfirm}
			/>
		);

		const submitButton = screen.getByRole('button', { name: 'Add User' });
		expect(submitButton).toBeDisabled();
	});

	it('should enable submit button when email is provided', async () => {
		const user = userEvent.setup();

		render(
			<AddUserDialog
				open={true}
				onOpenChange={mockOnOpenChange}
				onConfirm={mockOnConfirm}
			/>
		);

		const emailInput = screen.getByLabelText(/email address/i);
		await user.type(emailInput, 'test@example.com');

		const submitButton = screen.getByRole('button', { name: 'Add User' });
		expect(submitButton).not.toBeDisabled();
	});

	it('should call onConfirm with email, role, and display name when submitted', async () => {
		const user = userEvent.setup();
		mockOnConfirm.mockResolvedValue(undefined);

		render(
			<AddUserDialog
				open={true}
				onOpenChange={mockOnOpenChange}
				onConfirm={mockOnConfirm}
			/>
		);

		const emailInput = screen.getByLabelText(/email address/i);
		await user.type(emailInput, 'test@example.com');

		const displayNameInput = screen.getByLabelText(/display name/i);
		await user.type(displayNameInput, 'Test User');

		const submitButton = screen.getByRole('button', { name: 'Add User' });
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(mockOnConfirm).toHaveBeenCalledWith('test@example.com', 'user', 'Test User');
		});
	});

	it('should close dialog on cancel', async () => {
		const user = userEvent.setup();

		render(
			<AddUserDialog
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
		mockOnConfirm.mockRejectedValue(new Error('User already exists'));

		render(
			<AddUserDialog
				open={true}
				onOpenChange={mockOnOpenChange}
				onConfirm={mockOnConfirm}
			/>
		);

		const emailInput = screen.getByLabelText(/email address/i);
		await user.type(emailInput, 'test@example.com');

		const submitButton = screen.getByRole('button', { name: 'Add User' });
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText('User already exists')).toBeInTheDocument();
		});
	});

	it('should show validation error for invalid email', async () => {
		const user = userEvent.setup();

		render(
			<AddUserDialog
				open={true}
				onOpenChange={mockOnOpenChange}
				onConfirm={mockOnConfirm}
			/>
		);

		const emailInput = screen.getByLabelText(/email address/i);
		await user.type(emailInput, 'invalid-email');

		const submitButton = screen.getByRole('button', { name: 'Add User' });
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
		});
	});

	it('should show role description based on selection', async () => {
		render(
			<AddUserDialog
				open={true}
				onOpenChange={mockOnOpenChange}
				onConfirm={mockOnConfirm}
			/>
		);

		// Default role is user
		expect(screen.getByText(/can submit content and view own submissions/i)).toBeInTheDocument();
	});

	it('should have optional display name field', () => {
		render(
			<AddUserDialog
				open={true}
				onOpenChange={mockOnOpenChange}
				onConfirm={mockOnConfirm}
			/>
		);

		expect(screen.getByLabelText(/display name \(optional\)/i)).toBeInTheDocument();
	});
});
