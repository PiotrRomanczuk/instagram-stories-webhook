import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditSubmissionDialog } from '@/app/components/submissions/edit-submission-dialog';
import { ContentItem } from '@/lib/types';

const createMockSubmission = (): ContentItem => ({
	id: '123',
	userId: 'user1',
	userEmail: 'user@example.com',
	mediaUrl: 'https://example.com/image.jpg',
	mediaType: 'IMAGE',
	source: 'submission',
	submissionStatus: 'pending',
	publishingStatus: 'draft',
	caption: 'Original caption',
	version: 1,
	createdAt: '2024-01-15T10:00:00Z',
	updatedAt: '2024-01-15T10:00:00Z',
});

describe('EditSubmissionDialog', () => {
	it('should not render image when submission is null', () => {
		render(
			<EditSubmissionDialog
				submission={null}
				open={true}
				onOpenChange={vi.fn()}
				onSave={vi.fn()}
			/>
		);

		// Dialog title is rendered, but no image since submission is null
		expect(screen.getByText('Edit Submission')).toBeInTheDocument();
		expect(screen.queryByRole('img')).not.toBeInTheDocument();
	});

	it('should render dialog when open with submission', () => {
		const submission = createMockSubmission();

		render(
			<EditSubmissionDialog
				submission={submission}
				open={true}
				onOpenChange={vi.fn()}
				onSave={vi.fn()}
			/>
		);

		expect(screen.getByText('Edit Submission')).toBeInTheDocument();
	});

	it('should show image preview', () => {
		const submission = createMockSubmission();

		render(
			<EditSubmissionDialog
				submission={submission}
				open={true}
				onOpenChange={vi.fn()}
				onSave={vi.fn()}
			/>
		);

		const img = screen.getByRole('img');
		expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
	});

	it('should populate caption from submission', () => {
		const submission = createMockSubmission();

		render(
			<EditSubmissionDialog
				submission={submission}
				open={true}
				onOpenChange={vi.fn()}
				onSave={vi.fn()}
			/>
		);

		const textarea = screen.getByRole('textbox');
		expect(textarea).toHaveValue('Original caption');
	});

	it('should update caption when typing', async () => {
		const user = userEvent.setup();
		const submission = createMockSubmission();

		render(
			<EditSubmissionDialog
				submission={submission}
				open={true}
				onOpenChange={vi.fn()}
				onSave={vi.fn()}
			/>
		);

		const textarea = screen.getByRole('textbox');
		await user.clear(textarea);
		await user.type(textarea, 'New caption');

		expect(textarea).toHaveValue('New caption');
	});

	it('should show character count', () => {
		const submission = createMockSubmission();

		render(
			<EditSubmissionDialog
				submission={submission}
				open={true}
				onOpenChange={vi.fn()}
				onSave={vi.fn()}
			/>
		);

		// Caption is "Original caption" which has 16 characters
		expect(screen.getByText('16/2200')).toBeInTheDocument();
	});

	it('should call onSave with updated caption', async () => {
		const user = userEvent.setup();
		const onSave = vi.fn().mockResolvedValue(undefined);
		const submission = createMockSubmission();

		render(
			<EditSubmissionDialog
				submission={submission}
				open={true}
				onOpenChange={vi.fn()}
				onSave={onSave}
			/>
		);

		const textarea = screen.getByRole('textbox');
		await user.clear(textarea);
		await user.type(textarea, 'Updated caption');

		const saveButton = screen.getByRole('button', { name: 'Save Changes' });
		await user.click(saveButton);

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith(submission, 'Updated caption');
		});
	});

	it('should call onOpenChange when cancel is clicked', async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn();
		const submission = createMockSubmission();

		render(
			<EditSubmissionDialog
				submission={submission}
				open={true}
				onOpenChange={onOpenChange}
				onSave={vi.fn()}
			/>
		);

		const cancelButton = screen.getByRole('button', { name: 'Cancel' });
		await user.click(cancelButton);

		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it('should show loading state while saving', async () => {
		const user = userEvent.setup();
		const onSave = vi.fn().mockImplementation(
			() => new Promise((resolve) => setTimeout(resolve, 100))
		);
		const submission = createMockSubmission();

		render(
			<EditSubmissionDialog
				submission={submission}
				open={true}
				onOpenChange={vi.fn()}
				onSave={onSave}
			/>
		);

		const saveButton = screen.getByRole('button', { name: 'Save Changes' });
		await user.click(saveButton);

		await waitFor(() => {
			expect(screen.getByText('Saving...')).toBeInTheDocument();
		});
	});
});
