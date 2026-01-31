import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageComposerNew } from '@/app/components/inbox/message-composer-new';

describe('MessageComposerNew', () => {
	const mockOnMessageSent = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		global.fetch = vi.fn();
	});

	it('should render textarea and send button', () => {
		render(
			<MessageComposerNew conversationId="123" onMessageSent={mockOnMessageSent} />
		);

		expect(
			screen.getByPlaceholderText(/Type a message/i)
		).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
	});

	it('should disable send button when message is empty', () => {
		render(
			<MessageComposerNew conversationId="123" onMessageSent={mockOnMessageSent} />
		);

		const sendButton = screen.getByRole('button', { name: /send/i });
		expect(sendButton).toBeDisabled();
	});

	it('should enable send button when message is typed', async () => {
		const user = userEvent.setup();

		render(
			<MessageComposerNew conversationId="123" onMessageSent={mockOnMessageSent} />
		);

		const textarea = screen.getByPlaceholderText(/Type a message/i);
		await user.type(textarea, 'Hello');

		const sendButton = screen.getByRole('button', { name: /send/i });
		expect(sendButton).not.toBeDisabled();
	});

	it('should show character count', async () => {
		const user = userEvent.setup();

		render(
			<MessageComposerNew conversationId="123" onMessageSent={mockOnMessageSent} />
		);

		expect(screen.getByText('0/1000 characters')).toBeInTheDocument();

		const textarea = screen.getByPlaceholderText(/Type a message/i);
		await user.type(textarea, 'Hello');

		expect(screen.getByText('5/1000 characters')).toBeInTheDocument();
	});

	it('should send message on form submit', async () => {
		const user = userEvent.setup();
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ success: true }),
		});

		render(
			<MessageComposerNew conversationId="123" onMessageSent={mockOnMessageSent} />
		);

		const textarea = screen.getByPlaceholderText(/Type a message/i);
		await user.type(textarea, 'Hello there!');

		const sendButton = screen.getByRole('button', { name: /send/i });
		await user.click(sendButton);

		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith('/api/messages/send', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					conversationId: '123',
					messageText: 'Hello there!',
					messageType: 'text',
				}),
			});
		});

		await waitFor(() => {
			expect(mockOnMessageSent).toHaveBeenCalled();
		});
	});

	it('should clear textarea after successful send', async () => {
		const user = userEvent.setup();
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ success: true }),
		});

		render(
			<MessageComposerNew conversationId="123" onMessageSent={mockOnMessageSent} />
		);

		const textarea = screen.getByPlaceholderText(/Type a message/i) as HTMLTextAreaElement;
		await user.type(textarea, 'Hello there!');

		const sendButton = screen.getByRole('button', { name: /send/i });
		await user.click(sendButton);

		await waitFor(() => {
			expect(textarea.value).toBe('');
		});
	});

	it('should show error message on failed send', async () => {
		const user = userEvent.setup();
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: false,
			json: () => Promise.resolve({ error: 'Network error' }),
		});

		render(
			<MessageComposerNew conversationId="123" onMessageSent={mockOnMessageSent} />
		);

		const textarea = screen.getByPlaceholderText(/Type a message/i);
		await user.type(textarea, 'Hello');

		const sendButton = screen.getByRole('button', { name: /send/i });
		await user.click(sendButton);

		await waitFor(() => {
			expect(screen.getByText('Network error')).toBeInTheDocument();
		});
	});

	it('should show rate limit message', () => {
		render(
			<MessageComposerNew conversationId="123" onMessageSent={mockOnMessageSent} />
		);

		expect(
			screen.getByText(/Rate limit: 200 messages per hour/i)
		).toBeInTheDocument();
	});
});
