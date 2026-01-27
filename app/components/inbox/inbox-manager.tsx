'use client';

import { useState, useEffect } from 'react';
import { ConversationList } from './conversation-list';
import { MessageThread } from './message-thread';
import type { InstagramConversation } from '@/lib/types/messaging';
import { RefreshCw } from 'lucide-react';

export function InboxManager() {
    const [conversations, setConversations] = useState<InstagramConversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<InstagramConversation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch conversations on mount
    useEffect(() => {
        fetchConversations();
    }, []);

    const fetchConversations = async (sync = false) => {
        try {
            setIsLoading(true);
            setError(null);

            const url = sync
                ? '/api/messages/inbox?sync=true'
                : '/api/messages/inbox';

            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch conversations');
            }

            const data = await response.json();
            setConversations(data.conversations || []);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            console.error('Error fetching conversations:', err);
        } finally {
            setIsLoading(false);
            setIsSyncing(false);
        }
    };

    const handleSync = () => {
        setIsSyncing(true);
        fetchConversations(true);
    };

    const handleSelectConversation = (conversation: InstagramConversation) => {
        setSelectedConversation(conversation);
    };

    const handleBackToList = () => {
        setSelectedConversation(null);
        fetchConversations(); // Refresh to update unread counts
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
                    <p className="text-slate-500 font-medium">Loading inbox...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
                <p className="text-red-600 font-semibold">{error}</p>
                <button
                    onClick={() => fetchConversations()}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest">
                    {selectedConversation ? 'Conversation' : 'Conversations'}
                </h2>
                <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-semibold hover:bg-indigo-100 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync'}
                </button>
            </div>

            {selectedConversation ? (
                <MessageThread
                    conversation={selectedConversation}
                    onBack={handleBackToList}
                />
            ) : (
                <ConversationList
                    conversations={conversations}
                    onSelectConversation={handleSelectConversation}
                />
            )}
        </div>
    );
}
