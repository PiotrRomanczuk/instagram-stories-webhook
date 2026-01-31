import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConversationListNew } from '@/app/components/inbox/conversation-list-new';
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

describe('ConversationListNew', () => {
	const mockOnSelectConversation = vi.fn();

	it('should render empty state when no conversations', () => {
		render(
			<ConversationListNew
				conversations={[]}
				onSelectConversation={mockOnSelectConversation}
			/>
		);

		expect(screen.getByText('No conversations yet')).toBeInTheDocument();
		expect(
			screen.getByText(/When customers send you messages on Instagram/i)
		).toBeInTheDocument();
	});

	it('should render conversations list', () => {
		render(
			<ConversationListNew
				conversations={mockConversations}
				onSelectConversation={mockOnSelectConversation}
			/>
		);

		expect(screen.getByText('@john_doe')).toBeInTheDocument();
		expect(screen.getByText('@jane_smith')).toBeInTheDocument();
		expect(screen.getByText('Hello there!')).toBeInTheDocument();
		expect(screen.getByText('Great product!')).toBeInTheDocument();
	});

	it('should display unread badge for unread conversations', () => {
		render(
			<ConversationListNew
				conversations={mockConversations}
				onSelectConversation={mockOnSelectConversation}
			/>
		);

		// Should show unread count for first conversation
		expect(screen.getByText('3')).toBeInTheDocument();
	});

	it('should call onSelectConversation when conversation is clicked', async () => {
		const user = userEvent.setup();

		render(
			<ConversationListNew
				conversations={mockConversations}
				onSelectConversation={mockOnSelectConversation}
			/>
		);

		await user.click(screen.getByText('@john_doe'));

		expect(mockOnSelectConversation).toHaveBeenCalledWith(mockConversations[0]);
	});

	it('should show fallback avatar when no profile picture', () => {
		render(
			<ConversationListNew
				conversations={mockConversations}
				onSelectConversation={mockOnSelectConversation}
			/>
		);

		// Second conversation has no profile picture, should show fallback with first letter
		const fallbacks = screen.getAllByText('J');
		expect(fallbacks.length).toBeGreaterThan(0);
	});

	it('should show 9+ for more than 9 unread messages', () => {
		const manyUnread: InstagramConversation[] = [
			{
				...mockConversations[0],
				unreadCount: 15,
			},
		];

		render(
			<ConversationListNew
				conversations={manyUnread}
				onSelectConversation={mockOnSelectConversation}
			/>
		);

		expect(screen.getByText('9+')).toBeInTheDocument();
	});
});
