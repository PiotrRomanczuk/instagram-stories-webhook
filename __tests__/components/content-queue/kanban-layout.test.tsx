import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KanbanLayout } from '@/app/components/content-queue/kanban/kanban-layout';
import { ContentItem } from '@/lib/types/posts';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
	useSession: vi.fn(() => ({
		data: {
			user: {
				id: 'test-user-id',
				email: 'test@example.com',
				role: 'admin',
			},
		},
		status: 'authenticated',
	})),
}));

// Mock SWR
vi.mock('swr', () => ({
	default: vi.fn(),
}));

// Mock content modals
vi.mock('@/app/components/content/content-preview-modal', () => ({
	ContentPreviewModal: ({ item, onClose }: { item: ContentItem; onClose: () => void }) => (
		<div data-testid="preview-modal">
			<span>Preview: {item.title || item.id}</span>
			<button onClick={onClose}>Close</button>
		</div>
	),
}));

vi.mock('@/app/components/content/content-edit-modal', () => ({
	ContentEditModal: ({ item, onClose }: { item: ContentItem; onClose: () => void }) => (
		<div data-testid="edit-modal">
			<span>Edit: {item.title || item.id}</span>
			<button onClick={onClose}>Close</button>
		</div>
	),
}));

// Helper to create mock content items
function createMockItem(overrides: Partial<ContentItem> = {}): ContentItem {
	return {
		id: `test-${Math.random().toString(36).substring(2)}`,
		userId: 'user-123',
		userEmail: 'test@example.com',
		mediaUrl: 'https://example.com/image.jpg',
		mediaType: 'IMAGE',
		source: 'submission',
		submissionStatus: 'approved',
		publishingStatus: 'draft',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		version: 1,
		...overrides,
	};
}

describe('KanbanLayout', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('rendering', () => {
		it('renders without crashing', async () => {
			const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
			useSWR.mockReturnValue({
				data: { items: [] },
				error: null,
				isLoading: false,
				mutate: vi.fn(),
			});

			render(<KanbanLayout />);
			// Should render the main layout container
			expect(document.querySelector('.h-screen')).toBeInTheDocument();
		});

		it('shows loading skeleton when loading', async () => {
			const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
			useSWR.mockReturnValue({
				data: null,
				error: null,
				isLoading: true,
				mutate: vi.fn(),
			});

			const { container } = render(<KanbanLayout />);
			// Should show loading skeletons
			const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
			expect(skeletons.length).toBeGreaterThan(0);
		});

		it('shows empty state when no items', async () => {
			const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
			useSWR.mockReturnValue({
				data: { items: [] },
				error: null,
				isLoading: false,
				mutate: vi.fn(),
			});

			render(<KanbanLayout />);
			expect(screen.getByText('No content yet')).toBeInTheDocument();
			expect(
				screen.getByText('Create your first story to get started with the content queue.')
			).toBeInTheDocument();
		});
	});

	describe('kanban columns', () => {
		it('displays all five kanban columns', async () => {
			const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
			useSWR.mockReturnValue({
				data: {
					items: [createMockItem({ publishingStatus: 'draft' })],
				},
				error: null,
				isLoading: false,
				mutate: vi.fn(),
			});

			render(<KanbanLayout />);

			expect(screen.getByText('Draft')).toBeInTheDocument();
			expect(screen.getByText('Scheduled')).toBeInTheDocument();
			expect(screen.getByText('Processing')).toBeInTheDocument();
			expect(screen.getByText('Published')).toBeInTheDocument();
			expect(screen.getByText('Failed')).toBeInTheDocument();
		});

		it('groups items by publishing status', async () => {
			const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
			useSWR.mockReturnValue({
				data: {
					items: [
						createMockItem({ id: 'draft-1', publishingStatus: 'draft', title: 'Draft Item' }),
						createMockItem({ id: 'scheduled-1', publishingStatus: 'scheduled', title: 'Scheduled Item', scheduledTime: Date.now() + 3600000 }),
						createMockItem({ id: 'published-1', publishingStatus: 'published', title: 'Published Item' }),
					],
				},
				error: null,
				isLoading: false,
				mutate: vi.fn(),
			});

			render(<KanbanLayout />);

			// Check that items are displayed
			expect(screen.getByText('Draft Item')).toBeInTheDocument();
			expect(screen.getByText('Scheduled Item')).toBeInTheDocument();
			expect(screen.getByText('Published Item')).toBeInTheDocument();
		});

		it('shows item counts in column headers', async () => {
			const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
			useSWR.mockReturnValue({
				data: {
					items: [
						createMockItem({ id: 'draft-1', publishingStatus: 'draft' }),
						createMockItem({ id: 'draft-2', publishingStatus: 'draft' }),
						createMockItem({ id: 'scheduled-1', publishingStatus: 'scheduled', scheduledTime: Date.now() }),
					],
				},
				error: null,
				isLoading: false,
				mutate: vi.fn(),
			});

			render(<KanbanLayout />);

			// Draft column should show 2, Scheduled should show 1
			const countBadges = screen.getAllByText('2');
			expect(countBadges.length).toBeGreaterThan(0);
		});

		it('shows empty placeholder for columns with no items', async () => {
			const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
			useSWR.mockReturnValue({
				data: {
					items: [createMockItem({ publishingStatus: 'draft' })],
				},
				error: null,
				isLoading: false,
				mutate: vi.fn(),
			});

			render(<KanbanLayout />);

			// Columns without items should show placeholder text
			expect(screen.getByText('No scheduled items')).toBeInTheDocument();
			expect(screen.getByText('No processing items')).toBeInTheDocument();
			expect(screen.getByText('No published items')).toBeInTheDocument();
			expect(screen.getByText('No failed items')).toBeInTheDocument();
		});
	});

	describe('search functionality', () => {
		it('renders search input', async () => {
			const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
			useSWR.mockReturnValue({
				data: { items: [] },
				error: null,
				isLoading: false,
				mutate: vi.fn(),
			});

			render(<KanbanLayout />);
			const searchInput = screen.getByPlaceholderText(/search/i);
			expect(searchInput).toBeInTheDocument();
		});

		it('filters items based on search query', async () => {
			const user = userEvent.setup();
			const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
			useSWR.mockReturnValue({
				data: {
					items: [
						createMockItem({ id: '1', title: 'Apple Story', publishingStatus: 'draft' }),
						createMockItem({ id: '2', title: 'Banana Story', publishingStatus: 'draft' }),
					],
				},
				error: null,
				isLoading: false,
				mutate: vi.fn(),
			});

			render(<KanbanLayout />);

			const searchInput = screen.getByPlaceholderText(/search/i);
			await user.type(searchInput, 'Apple');

			await waitFor(() => {
				expect(screen.getByText('Apple Story')).toBeInTheDocument();
				expect(screen.queryByText('Banana Story')).not.toBeInTheDocument();
			});
		});
	});

	describe('sidebar', () => {
		it('renders sidebar with view options', async () => {
			const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
			useSWR.mockReturnValue({
				data: { items: [] },
				error: null,
				isLoading: false,
				mutate: vi.fn(),
			});

			render(<KanbanLayout />);
			// Sidebar should have view toggle buttons
			expect(screen.getByRole('button', { name: /kanban/i })).toBeInTheDocument();
		});
	});

	describe('create story button', () => {
		it('renders Create Story buttons', async () => {
			const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
			useSWR.mockReturnValue({
				data: { items: [] },
				error: null,
				isLoading: false,
				mutate: vi.fn(),
			});

			render(<KanbanLayout />);
			// In empty state, there are two Create Story buttons - one in header and one in empty state
			const buttons = screen.getAllByRole('button', { name: /create story/i });
			expect(buttons.length).toBeGreaterThanOrEqual(1);
		});

		it('shows Create Story button in header when items exist', async () => {
			const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
			useSWR.mockReturnValue({
				data: {
					items: [createMockItem({ publishingStatus: 'draft' })],
				},
				error: null,
				isLoading: false,
				mutate: vi.fn(),
			});

			render(<KanbanLayout />);
			// When items exist, only header has Create Story button
			const button = screen.getByRole('button', { name: /create story/i });
			expect(button).toBeInTheDocument();
		});
	});

	describe('drag and drop setup', () => {
		it('has drop zone placeholders in columns', async () => {
			const useSWR = (await import('swr')).default as unknown as ReturnType<typeof vi.fn>;
			useSWR.mockReturnValue({
				data: {
					items: [createMockItem({ publishingStatus: 'draft' })],
				},
				error: null,
				isLoading: false,
				mutate: vi.fn(),
			});

			render(<KanbanLayout />);
			// Drop zones should be present
			expect(screen.getByText('Drop here')).toBeInTheDocument();
		});
	});
});
