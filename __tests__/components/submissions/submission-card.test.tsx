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
	it('should render image', () => {
		const submission = createMockSubmission();
		render(<SubmissionCard submission={submission} />);

		const img = screen.getByRole('img');
		expect(img).toBeInTheDocument();
		expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
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

	it('should show caption preview', () => {
		const submission = createMockSubmission({ caption: 'Test caption text' });
		render(<SubmissionCard submission={submission} />);

		expect(screen.getByText('Test caption text')).toBeInTheDocument();
	});

	it('should show rejection reason for rejected submissions', () => {
		const submission = createMockSubmission({
			submissionStatus: 'rejected',
			rejectionReason: 'Not appropriate content',
		});
		render(<SubmissionCard submission={submission} />);

		expect(screen.getByText(/Not appropriate content/)).toBeInTheDocument();
	});

	it('should show date', () => {
		const submission = createMockSubmission();
		render(<SubmissionCard submission={submission} />);

		expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
	});

	it('should apply custom className', () => {
		const submission = createMockSubmission();
		const { container } = render(
			<SubmissionCard submission={submission} className="custom-class" />
		);

		expect(container.querySelector('.custom-class')).toBeInTheDocument();
	});
});
