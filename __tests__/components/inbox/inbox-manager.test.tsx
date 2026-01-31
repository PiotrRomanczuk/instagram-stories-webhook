import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InboxManagerNew } from '@/app/components/inbox/inbox-manager-new';
import type { InstagramConversation } from '@/lib/types/messaging';

const mockConversations: InstagramConversation[] = [
	{
		id: '1',
		userId: 'user1',
		igConversationId: 'ig1',
		participantIgId: 'participant1',
		participantUsername: 'john_doe',
		participantProfilePic: 'https://example.com/pic.jpg',
		lastMessageText: 'Hello there!',
		lastMessageAt: new Date('2024-01-15T10:00:00Z'),
		unreadCount: 3,
		isActive: true,
		createdAt: new Date('2024-01-01T10:00:00Z'),
		updatedAt: new Date('2024-01-15T10:00:00Z'),
	},
	{
		id: '2',
		userId: 'user1',
		igConversationId: 'ig2',
		participantIgId: 'participant2',
		participantUsername: 'jane_smith',
		participantProfilePic: null,
		lastMessageText: 'Great product!',
		lastMessageAt: new Date('2024-01-14T10:00:00Z'),
		unreadCount: 0,
		isActive: true,
		createdAt: new Date('2024-01-01T10:00:00Z'),
		updatedAt: new Date('2024-01-14T10:00:00Z'),
	},
];

describe('InboxManagerNew', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		global.fetch = vi.fn();
	});

	it('should show loading state initially', () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
			() => new Promise(() => {})
		);

		render(<InboxManagerNew />);

		expect(screen.getByText('Loading inbox...')).toBeInTheDocument();
	});

	it('should display conversations after loading', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ conversations: mockConversations }),
		});

		render(<InboxManagerNew />);

		await waitFor(() => {
			expect(screen.getByText('@john_doe')).toBeInTheDocument();
			expect(screen.getByText('@jane_smith')).toBeInTheDocument();
		});
	});

	it('should show error state on fetch failure', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: false,
			json: () => Promise.resolve({ error: 'Failed to load conversations' }),
		});

		render(<InboxManagerNew />);

		await waitFor(() => {
			expect(screen.getByText('Failed to load conversations')).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
		});
	});

	it('should have sync button in header', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ conversations: [] }),
		});

		render(<InboxManagerNew />);

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /sync/i })).toBeInTheDocument();
		});
	});

	it('should display "Conversations" title when viewing list', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ conversations: mockConversations }),
		});

		render(<InboxManagerNew />);

		await waitFor(() => {
			expect(screen.getByText('Conversations')).toBeInTheDocument();
		});
	});

	it('should switch to conversation view when selecting a conversation', async () => {
		const user = userEvent.setup();
		(global.fetch as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ conversations: mockConversations }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ messages: [] }),
			});

		render(<InboxManagerNew />);

		await waitFor(() => {
			expect(screen.getByText('@john_doe')).toBeInTheDocument();
		});

		await user.click(screen.getByText('@john_doe'));

		await waitFor(() => {
			expect(screen.getByText('Conversation')).toBeInTheDocument();
		});
	});

	it('should call API with sync parameter when sync button is clicked', async () => {
		const user = userEvent.setup();
		(global.fetch as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ conversations: mockConversations }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ conversations: mockConversations }),
			});

		render(<InboxManagerNew />);

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /sync/i })).toBeInTheDocument();
		});

		await user.click(screen.getByRole('button', { name: /sync/i }));

		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith('/api/messages/inbox?sync=true');
		});
	});
});
