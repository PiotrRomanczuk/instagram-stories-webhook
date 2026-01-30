import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubmissionList } from '@/app/components/submissions/submission-list';
import { ContentItem } from '@/lib/types';

const createMockSubmission = (
	overrides: Partial<ContentItem> = {}
): ContentItem => ({
	id: '123',
	userId: 'user1',
	userEmail: 'user@example.com',
	mediaUrl: 'https://example.com/image.jpg',
	mediaType: 'IMAGE',
	source: 'submission',
	submissionStatus: 'pending',
	publishingStatus: 'draft',
	version: 1,
	createdAt: '2024-01-15T10:00:00Z',
	updatedAt: '2024-01-15T10:00:00Z',
	...overrides,
});

describe('SubmissionList', () => {
	it('should show empty state when no submissions', () => {
		render(<SubmissionList submissions={[]} />);

		expect(screen.getByText('No submissions')).toBeInTheDocument();
		expect(
			screen.getByText("You haven't submitted anything yet.")
		).toBeInTheDocument();
	});

	it('should render submissions in grid view by default', () => {
		const submissions = [
			createMockSubmission({ id: '1' }),
			createMockSubmission({ id: '2' }),
		];

		render(<SubmissionList submissions={submissions} />);

		const images = screen.getAllByRole('img');
		expect(images.length).toBe(2);
	});

	it('should show loading skeletons when isLoading', () => {
		const { container } = render(
			<SubmissionList submissions={[]} isLoading />
		);

		const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
		expect(skeletons.length).toBeGreaterThan(0);
	});

	it('should toggle between grid and table view', async () => {
		const user = userEvent.setup();
		const submissions = [createMockSubmission({ id: '1' })];

		const { container } = render(<SubmissionList submissions={submissions} />);

		// The toggle group items are rendered as buttons
		const buttons = container.querySelectorAll('[data-slot="toggle-group-item"]');
		expect(buttons.length).toBe(2);

		// Find toggle buttons by their data-slot attribute and aria-label
		const gridButton = container.querySelector('[aria-label="Grid view"]');
		const tableButton = container.querySelector('[aria-label="Table view"]');

		expect(gridButton).toBeInTheDocument();
		expect(tableButton).toBeInTheDocument();

		// Grid view should be active initially
		expect(gridButton).toHaveAttribute('data-state', 'on');

		// Switch to table view
		if (tableButton) {
			await user.click(tableButton);
		}

		// Table should be visible
		await waitFor(() => {
			expect(screen.getByRole('table')).toBeInTheDocument();
		});
	});

	it('should show caption in table view', async () => {
		const user = userEvent.setup();
		const submissions = [
			createMockSubmission({ id: '1', caption: 'Test caption' }),
		];

		const { container } = render(<SubmissionList submissions={submissions} />);

		// Switch to table view
		const tableButton = container.querySelector('[aria-label="Table view"]');
		if (tableButton) {
			await user.click(tableButton);
		}

		await waitFor(() => {
			expect(screen.getByText('Test caption')).toBeInTheDocument();
		});
	});

	it('should call onEdit when edit button is clicked in table view', async () => {
		const user = userEvent.setup();
		const onEdit = vi.fn();
		const submission = createMockSubmission({ id: '1', submissionStatus: 'pending' });

		const { container } = render(<SubmissionList submissions={[submission]} onEdit={onEdit} />);

		// Switch to table view
		const tableButton = container.querySelector('[aria-label="Table view"]');
		if (tableButton) {
			await user.click(tableButton);
		}

		await waitFor(() => {
			expect(screen.getByRole('table')).toBeInTheDocument();
		});

		const editButton = screen.getByRole('button', { name: 'Edit' });
		await user.click(editButton);

		expect(onEdit).toHaveBeenCalledWith(submission);
	});

	it('should not show edit button for non-pending submissions in table view', async () => {
		const user = userEvent.setup();
		const submission = createMockSubmission({
			id: '1',
			submissionStatus: 'approved',
		});

		const { container } = render(<SubmissionList submissions={[submission]} onEdit={vi.fn()} />);

		// Switch to table view
		const tableButton = container.querySelector('[aria-label="Table view"]');
		if (tableButton) {
			await user.click(tableButton);
		}

		await waitFor(() => {
			expect(screen.getByRole('table')).toBeInTheDocument();
		});

		expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
	});

	it('should apply custom className when submissions exist', () => {
		const submission = createMockSubmission({ id: '1' });
		const { container } = render(
			<SubmissionList submissions={[submission]} className="custom-class" />
		);

		expect(container.querySelector('.custom-class')).toBeInTheDocument();
	});
});
