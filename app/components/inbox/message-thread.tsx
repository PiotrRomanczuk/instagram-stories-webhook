'use client';

import { useState, useEffect, useRef } from 'react';
import type { InstagramConversation, InstagramMessage } from '@/lib/types/messaging';
import { MessageComposer } from './message-composer';
import { ChevronLeft, RefreshCw } from 'lucide-react';

interface MessageThreadProps {
    conversation: InstagramConversation;
    onBack: () => void;
}

export function MessageThread({ conversation, onBack }: MessageThreadProps) {
    const [messages, setMessages] = useState<InstagramMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchMessages();
    }, [conversation.id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchMessages = async (sync = false) => {
        try {
            setIsLoading(true);
            setError(null);

            const url = sync
                ? `/api/messages/${conversation.id}?sync=true`
                : `/api/messages/${conversation.id}`;

            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch messages');
            }

            const data = await response.json();
            setMessages(data.messages || []);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            console.error('Error fetching messages:', err);
        } finally {
            setIsLoading(false);
            setIsSyncing(false);
        }
    };

    const handleSync = () => {
        setIsSyncing(true);
        fetchMessages(true);
    };

    const handleMessageSent = () => {
        // Refresh messages after sending
        fetchMessages();
    };

    const formatTimestamp = (date: Date) => {
        return new Date(date).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="flex flex-col h-[600px]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    {conversation.participantProfilePic ? (
                        <img
                            src={conversation.participantProfilePic}
                            alt={conversation.participantUsername || 'User'}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black">
                            {(conversation.participantUsername || 'U')[0].toUpperCase()}
                        </div>
                    )}
                    <div>
                        <h3 className="font-black text-slate-900">
                            @{conversation.participantUsername || conversation.participantIgId}
                        </h3>
                        <p className="text-xs text-slate-500">Instagram User</p>
                    </div>
                </div>
                <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-semibold hover:bg-indigo-100 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync'}
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-red-600 font-semibold">{error}</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-slate-500 font-medium">No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.isFromUser ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                                    message.isFromUser
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-100 text-slate-900'
                                }`}
                            >
                                {message.messageText && (
                                    <p className="text-sm font-medium">{message.messageText}</p>
                                )}
                                {message.attachments && message.attachments.length > 0 && (
                                    <div className="mt-2">
                                        {message.attachments.map((attachment, idx) => (
                                            <div key={idx}>
                                                {attachment.type === 'image' && (
                                                    <img
                                                        src={attachment.url}
                                                        alt="Attachment"
                                                        className="rounded-lg max-w-full"
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <p
                                    className={`text-xs mt-1 ${
                                        message.isFromUser ? 'text-indigo-200' : 'text-slate-500'
                                    }`}
                                >
                                    {formatTimestamp(message.createdAt)}
                                </p>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Composer */}
            <div className="border-t border-slate-100 px-6 py-4">
                <MessageComposer
                    conversationId={conversation.id}
                    onMessageSent={handleMessageSent}
                />
            </div>
        </div>
    );
}
