'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';

interface MessageComposerProps {
    conversationId: string;
    onMessageSent: () => void;
}

export function MessageComposer({ conversationId, onMessageSent }: MessageComposerProps) {
    const [messageText, setMessageText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!messageText.trim() || isSending) return;

        try {
            setIsSending(true);
            setError(null);

            const response = await fetch('/api/messages/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    conversationId,
                    messageText: messageText.trim(),
                    messageType: 'text',
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();

                // Handle rate limit error
                if (response.status === 429) {
                    throw new Error(errorData.error || 'Rate limit exceeded. Please wait before sending more messages.');
                }

                throw new Error(errorData.error || 'Failed to send message');
            }

            // Clear input and notify parent
            setMessageText('');
            onMessageSent();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            console.error('Error sending message:', err);

            // Auto-clear error after 5 seconds
            setTimeout(() => setError(null), 5000);
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend(e);
        }
    };

    return (
        <div className="space-y-2">
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600 font-medium">
                    {error}
                </div>
            )}

            <form onSubmit={handleSend} className="flex items-end gap-2">
                <div className="flex-grow">
                    <textarea
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Type a message... (Press Enter to send, Shift+Enter for new line)"
                        rows={2}
                        maxLength={1000}
                        disabled={isSending}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                        {messageText.length}/1000 characters
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={!messageText.trim() || isSending}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    <Send className="w-4 h-4" />
                    {isSending ? 'Sending...' : 'Send'}
                </button>
            </form>

            <p className="text-xs text-slate-400">
                💡 Rate limit: 200 messages per hour per Instagram account
            </p>
        </div>
    );
}
