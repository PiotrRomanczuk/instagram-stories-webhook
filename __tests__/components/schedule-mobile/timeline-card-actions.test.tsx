import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { TimelineCardActions } from '@/app/components/schedule-mobile/timeline-card-actions';
import { ContentItem } from '@/lib/types/posts';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('sonner', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

vi.mock('@/app/components/content/content-edit-modal', () => ({
	ContentEditModal: ({ onClose, onSave }: any) => (
		<div data-testid="edit-modal">
			<button onClick={onClose}>Close</button>
			<button onClick={onSave}>Save</button>
		</div>
	),
}));

vi.mock('@/app/components/ui/confirmation-dialog', () => ({
	ConfirmationDialog: ({ isOpen, onClose, onConfirm, confirmLabel, cancelLabel }: any) =>
		isOpen ? (
			<div data-testid="confirmation-dialog">
				<button onClick={onClose}>{cancelLabel || 'Cancel'}</button>
				<button onClick={() => onConfirm?.()}>{confirmLabel || 'Confirm'}</button>
			</div>
		) : null,
}));

const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('TimelineCardActions', () => {
	const mockContentItem: ContentItem = {
		id: 'test-id',
		userId: 'user-123',
		userEmail: 'test@example.com',
		mediaUrl: 'https://example.com/image.jpg',
		mediaType: 'IMAGE',
		publishingStatus: 'scheduled',
		source: 'direct',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		version: 1,
		scheduledTime: Date.now() + 3600000,
	};

	const mockOnUpdate = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		mockFetch.mockReset();
	});

	it('renders action buttons for scheduled posts', () => {
		render(<TimelineCardActions item={mockContentItem} onUpdate={mockOnUpdate} />);

		expect(screen.getByText('Edit')).toBeInTheDocument();
		expect(screen.getByText('Reschedule')).toBeInTheDocument();
		expect(screen.getByText('Cancel')).toBeInTheDocument();
	});

	it('does not render for published posts', () => {
		const publishedItem = { ...mockContentItem, publishingStatus: 'published' as const };
		const { container } = render(
			<TimelineCardActions item={publishedItem} onUpdate={mockOnUpdate} />,
		);

		expect(container.firstChild).toBeNull();
	});

	it('opens edit modal when Edit button is clicked', () => {
		render(<TimelineCardActions item={mockContentItem} onUpdate={mockOnUpdate} />);

		fireEvent.click(screen.getByText('Edit'));

		expect(screen.getByTestId('edit-modal')).toBeInTheDocument();
	});

	it('opens edit modal when Reschedule button is clicked', () => {
		render(<TimelineCardActions item={mockContentItem} onUpdate={mockOnUpdate} />);

		fireEvent.click(screen.getByText('Reschedule'));

		expect(screen.getByTestId('edit-modal')).toBeInTheDocument();
	});

	it('opens confirmation dialog when Cancel button is clicked', () => {
		render(<TimelineCardActions item={mockContentItem} onUpdate={mockOnUpdate} />);

		fireEvent.click(screen.getByText('Cancel'));

		expect(screen.getByTestId('confirmation-dialog')).toBeInTheDocument();
	});

	it.skip('deletes post successfully', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ message: 'Deleted' }),
		});

		render(<TimelineCardActions item={mockContentItem} onUpdate={mockOnUpdate} />);

		// Open confirmation dialog by clicking Cancel button
		await act(async () => {
			fireEvent.click(screen.getByText('Cancel'));
		});

		// Wait for dialog to appear
		expect(screen.getByTestId('confirmation-dialog')).toBeInTheDocument();

		// Confirm deletion using the actual button label "Delete Post"
		await act(async () => {
			fireEvent.click(screen.getByText('Delete Post'));
		});

		// Wait for all promises to resolve
		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(`/api/content/${mockContentItem.id}`, {
				method: 'DELETE',
			});
			expect(toast.success).toHaveBeenCalledWith('Post deleted successfully');
			expect(mockOnUpdate).toHaveBeenCalled();
		}, { timeout: 5000 });
	});

	it.skip('handles delete error', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: false,
			json: async () => ({ error: 'Failed to delete' }),
		});

		render(<TimelineCardActions item={mockContentItem} onUpdate={mockOnUpdate} />);

		// Open confirmation dialog
		await act(async () => {
			fireEvent.click(screen.getByText('Cancel'));
		});

		// Wait for dialog
		expect(screen.getByTestId('confirmation-dialog')).toBeInTheDocument();

		// Confirm deletion using actual button label
		await act(async () => {
			fireEvent.click(screen.getByText('Delete Post'));
		});

		// Wait for all async operations
		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(`/api/content/${mockContentItem.id}`, {
				method: 'DELETE',
			});
			expect(toast.error).toHaveBeenCalled();
		}, { timeout: 5000 });
	});

	it('stops event propagation on button clicks', () => {
		const onClick = vi.fn();
		const { container } = render(
			<div onClick={onClick}>
				<TimelineCardActions item={mockContentItem} onUpdate={mockOnUpdate} />
			</div>,
		);

		const editButton = screen.getByText('Edit');
		fireEvent.click(editButton);

		// Parent onClick should not be called
		expect(onClick).not.toHaveBeenCalled();
	});
});
