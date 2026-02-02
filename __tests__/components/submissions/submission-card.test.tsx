import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubmissionCard } from '@/app/components/submissions/submission-card';
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

describe('SubmissionCard', () => {
	it('should render with image element', () => {
		const submission = createMockSubmission();
		render(<SubmissionCard submission={submission} />);

		// The card uses an img element with object-contain
		const img = screen.getByRole('img', { name: /Submission/i });
		expect(img).toBeInTheDocument();
		expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
		expect(img).toHaveClass('object-contain');
	});

	it('should show pending status badge', () => {
		const submission = createMockSubmission({ submissionStatus: 'pending' });
		render(<SubmissionCard submission={submission} />);

		expect(screen.getByText('Pending')).toBeInTheDocument();
	});

	it('should show approved status badge', () => {
		const submission = createMockSubmission({ submissionStatus: 'approved' });
		render(<SubmissionCard submission={submission} />);

		expect(screen.getByText('Approved')).toBeInTheDocument();
	});

	it('should show rejected status badge', () => {
		const submission = createMockSubmission({ submissionStatus: 'rejected' });
		render(<SubmissionCard submission={submission} />);

		expect(screen.getByText('Rejected')).toBeInTheDocument();
	});

	it('should show published status badge', () => {
		const submission = createMockSubmission({ publishingStatus: 'published' });
		render(<SubmissionCard submission={submission} />);

		expect(screen.getByText('Published')).toBeInTheDocument();
	});

	it('should show scheduled status badge', () => {
		const submission = createMockSubmission({ publishingStatus: 'scheduled' });
		render(<SubmissionCard submission={submission} />);

		expect(screen.getByText('Scheduled')).toBeInTheDocument();
	});

	it('should show username extracted from email', () => {
		const submission = createMockSubmission({ userEmail: 'testuser@example.com' });
		render(<SubmissionCard submission={submission} />);

		expect(screen.getByText('@testuser')).toBeInTheDocument();
	});

	it('should show relative time text', () => {
		const submission = createMockSubmission();
		render(<SubmissionCard submission={submission} />);

		// Text should contain "Submitted" and a relative time
		expect(screen.getByText(/Submitted/)).toBeInTheDocument();
	});

	it('should apply custom className', () => {
		const submission = createMockSubmission();
		const { container } = render(
			<SubmissionCard submission={submission} className="custom-class" />
		);

		expect(container.querySelector('.custom-class')).toBeInTheDocument();
	});

	it('should show placeholder when image URL is invalid', () => {
		const submission = createMockSubmission({ mediaUrl: 'blob:invalid' });
		render(<SubmissionCard submission={submission} />);

		expect(screen.getByText('Image unavailable')).toBeInTheDocument();
	});

	it('should have view button in hover overlay', () => {
		const submission = createMockSubmission({ submissionStatus: 'pending' });
		render(<SubmissionCard submission={submission} />);

		expect(screen.getByRole('button', { name: 'View' })).toBeInTheDocument();
	});

	it('should have edit button for pending submissions', () => {
		const submission = createMockSubmission({ submissionStatus: 'pending' });
		render(<SubmissionCard submission={submission} onEdit={vi.fn()} />);

		expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
	});

	it('should not have edit button for approved submissions', () => {
		const submission = createMockSubmission({ submissionStatus: 'approved' });
		render(<SubmissionCard submission={submission} onEdit={vi.fn()} />);

		expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
	});

	it('should have delete button when onDelete is provided', () => {
		const submission = createMockSubmission({ submissionStatus: 'pending' });
		render(<SubmissionCard submission={submission} onDelete={vi.fn()} />);

		expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
	});

	it('should show analytics button for published submissions', () => {
		const submission = createMockSubmission({ publishingStatus: 'published' });
		render(<SubmissionCard submission={submission} />);

		expect(screen.getByRole('button', { name: 'View analytics' })).toBeInTheDocument();
	});
});
