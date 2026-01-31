'use client';

import { useState, useEffect, useCallback } from 'react';
import { ConversationListNew } from './conversation-list-new';
import { MessageThreadNew } from './message-thread-new';
import type { InstagramConversation } from '@/lib/types/messaging';
import { RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Alert, AlertDescription } from '@/app/components/ui/alert';

export function InboxManagerNew() {
	const [conversations, setConversations] = useState<InstagramConversation[]>([]);
	const [selectedConversation, setSelectedConversation] =
		useState<InstagramConversation | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSyncing, setIsSyncing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchConversations = useCallback(async (sync = false) => {
		try {
			setIsLoading(true);
			setError(null);

			const url = sync ? '/api/messages/inbox?sync=true' : '/api/messages/inbox';

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
	}, []);

	useEffect(() => {
		fetchConversations();
	}, [fetchConversations]);

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
			<Card>
				<CardContent className="flex items-center justify-center py-24">
					<div className="text-center space-y-4">
						<Loader2 className="h-12 w-12 animate-spin text-muted-foreground mx-auto" />
						<p className="text-muted-foreground font-medium">Loading inbox...</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Card>
				<CardContent className="py-12">
					<Alert variant="destructive" className="max-w-md mx-auto">
						<AlertTriangle className="h-4 w-4" />
						<AlertDescription>{error}</AlertDescription>
					</Alert>
					<div className="flex justify-center mt-4">
						<Button variant="outline" onClick={() => fetchConversations()}>
							Try Again
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
				<CardTitle className="text-lg">
					{selectedConversation ? 'Conversation' : 'Conversations'}
				</CardTitle>
				<Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing}>
					<RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
					{isSyncing ? 'Syncing...' : 'Sync'}
				</Button>
			</CardHeader>
			<CardContent className="p-0">
				{selectedConversation ? (
					<MessageThreadNew
						conversation={selectedConversation}
						onBack={handleBackToList}
					/>
				) : (
					<ConversationListNew
						conversations={conversations}
						onSelectConversation={handleSelectConversation}
					/>
				)}
			</CardContent>
		</Card>
	);
}
