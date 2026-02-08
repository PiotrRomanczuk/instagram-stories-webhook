'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { Textarea } from '@/app/components/ui/textarea';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription } from '@/app/components/ui/alert';

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

                if (response.status === 429) {
                    throw new Error(errorData.error || 'Rate limit exceeded. Please wait before sending more messages.');
                }

                throw new Error(errorData.error || 'Failed to send message');
            }

            setMessageText('');
            onMessageSent();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            console.error('Error sending message:', err);

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
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <form onSubmit={handleSend} className="flex items-end gap-2">
                <div className="flex-grow">
                    <Textarea
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Type a message... (Press Enter to send, Shift+Enter for new line)"
                        rows={2}
                        maxLength={1000}
                        disabled={isSending}
                        className="resize-none"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                        {messageText.length}/1000 characters
                    </p>
                </div>

                <Button
                    type="submit"
                    disabled={!messageText.trim() || isSending}
                >
                    <Send className="w-4 h-4" />
                    {isSending ? 'Sending...' : 'Send'}
                </Button>
            </form>

            <p className="text-xs text-slate-400">
                Rate limit: 200 messages per hour per Instagram account
            </p>
        </div>
    );
}
