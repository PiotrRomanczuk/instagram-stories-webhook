import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageThreadNew } from '@/app/components/inbox/message-thread-new';
import type { InstagramConversation, InstagramMessage } from '@/lib/types/messaging';

const mockConversation: InstagramConversation = {
	id: '1',
	userId: 'user1',
	igConversationId: 'ig1',
	participantIgId: 'participant1',
	participantUsername: 'john_doe',
	participantProfilePic: 'https://example.com/pic.jpg',
	lastMessageText: 'Hello there!',
	lastMessageAt: new Date('2024-01-15T10:00:00Z'),
	unreadCount: 0,
	isActive: true,
	createdAt: new Date('2024-01-01T10:00:00Z'),
	updatedAt: new Date('2024-01-15T10:00:00Z'),
};

const mockMessages: InstagramMessage[] = [
	{
		id: 'm1',
		conversationId: '1',
		igMessageId: 'ig_m1',
		senderIgId: 'participant1',
		recipientIgId: 'user1',
		messageText: 'Hi there!',
		messageType: 'text',
		attachments: null,
		isFromUser: false,
		igCreatedTime: 1705312800,
		createdAt: new Date('2024-01-15T10:00:00Z'),
	},
	{
		id: 'm2',
		conversationId: '1',
		igMessageId: 'ig_m2',
		senderIgId: 'user1',
		recipientIgId: 'participant1',
		messageText: 'Hello! How can I help?',
		messageType: 'text',
		attachments: null,
		isFromUser: true,
		igCreatedTime: 1705312860,
		createdAt: new Date('2024-01-15T10:01:00Z'),
	},
];

describe('MessageThreadNew', () => {
	const mockOnBack = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		global.fetch = vi.fn();
	});

	it('should show loading state initially', () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
			() => new Promise(() => {})
		);

		render(<MessageThreadNew conversation={mockConversation} onBack={mockOnBack} />);

		// Loading spinner should be present (it's a Loader2 icon)
		expect(document.querySelector('.animate-spin')).toBeInTheDocument();
	});

	it('should display conversation header with participant info', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ messages: [] }),
		});

		render(<MessageThreadNew conversation={mockConversation} onBack={mockOnBack} />);

		await waitFor(() => {
			expect(screen.getByText('@john_doe')).toBeInTheDocument();
			expect(screen.getByText('Instagram User')).toBeInTheDocument();
		});
	});

	it('should call onBack when back button is clicked', async () => {
		const user = userEvent.setup();
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ messages: [] }),
		});

		render(<MessageThreadNew conversation={mockConversation} onBack={mockOnBack} />);

		await waitFor(() => {
			expect(screen.queryByText('Loading inbox...')).not.toBeInTheDocument();
		});

		const backButton = screen.getByRole('button', { name: /go back/i });
		await user.click(backButton);

		expect(mockOnBack).toHaveBeenCalled();
	});

	it('should display messages when loaded', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ messages: mockMessages }),
		});

		render(<MessageThreadNew conversation={mockConversation} onBack={mockOnBack} />);

		await waitFor(() => {
			expect(screen.getByText('Hi there!')).toBeInTheDocument();
			expect(screen.getByText('Hello! How can I help?')).toBeInTheDocument();
		});
	});

	it('should show empty state when no messages', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ messages: [] }),
		});

		render(<MessageThreadNew conversation={mockConversation} onBack={mockOnBack} />);

		await waitFor(() => {
			expect(
				screen.getByText('No messages yet. Start the conversation!')
			).toBeInTheDocument();
		});
	});

	it('should show error message on fetch failure', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: false,
			json: () => Promise.resolve({ error: 'Failed to load messages' }),
		});

		render(<MessageThreadNew conversation={mockConversation} onBack={mockOnBack} />);

		await waitFor(() => {
			expect(screen.getByText('Failed to load messages')).toBeInTheDocument();
		});
	});

	it('should have sync button', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ messages: [] }),
		});

		render(<MessageThreadNew conversation={mockConversation} onBack={mockOnBack} />);

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /sync/i })).toBeInTheDocument();
		});
	});

	it('should render message composer', async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ messages: [] }),
		});

		render(<MessageThreadNew conversation={mockConversation} onBack={mockOnBack} />);

		await waitFor(() => {
			expect(screen.getByPlaceholderText(/Type a message/i)).toBeInTheDocument();
		});
	});
});
