'use client';

import { useState, useEffect } from 'react';
import { ConversationList } from './conversation-list';
import { MessageThread } from './message-thread';
import type { InstagramConversation } from '@/lib/types/messaging';
import { RefreshCw } from 'lucide-react';
import { Spinner } from '@/app/components/ui/spinner';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';

export function InboxManager() {
    const [conversations, setConversations] = useState<InstagramConversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<InstagramConversation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
        fetchConversations();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="text-center space-y-4">
                    <Spinner className="mx-auto" />
                    <p className="text-slate-500 font-medium">Loading inbox...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive" className="rounded-2xl p-6 text-center">
                <AlertDescription className="font-semibold">{error}</AlertDescription>
                <Button
                    onClick={() => fetchConversations()}
                    variant="destructive"
                    className="mt-4"
                >
                    Try Again
                </Button>
            </Alert>
        );
    }

    return (
        <Card className="rounded-2xl overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest">
                    {selectedConversation ? 'Conversation' : 'Conversations'}
                </h2>
                <Button
                    onClick={handleSync}
                    disabled={isSyncing}
                    variant="ghost"
                    size="sm"
                    className="text-indigo-600 hover:bg-indigo-100"
                >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync'}
                </Button>
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
        </Card>
    );
}
