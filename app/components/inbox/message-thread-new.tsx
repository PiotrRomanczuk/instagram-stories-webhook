'use client';

import { useState, useEffect, useRef } from 'react';
import type { InstagramConversation, InstagramMessage } from '@/lib/types/messaging';
import { MessageComposerNew } from './message-composer-new';
import { ChevronLeft, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface MessageThreadProps {
	conversation: InstagramConversation;
	onBack: () => void;
}

export function MessageThreadNew({ conversation, onBack }: MessageThreadProps) {
	const [messages, setMessages] = useState<InstagramMessage[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isSyncing, setIsSyncing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		fetchMessages();
		// eslint-disable-next-line react-hooks/exhaustive-deps
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
			<div className="px-4 py-3 border-b flex items-center justify-between">
				<div className="flex items-center gap-3">
					<Button variant="ghost" size="icon" onClick={onBack} aria-label="Go back to conversations">
						<ChevronLeft className="h-5 w-5" />
					</Button>
					<Avatar className="h-9 w-9">
						<AvatarImage
							src={conversation.participantProfilePic || undefined}
							alt={conversation.participantUsername || 'User'}
						/>
						<AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-semibold text-sm">
							{(conversation.participantUsername || 'U')[0].toUpperCase()}
						</AvatarFallback>
					</Avatar>
					<div>
						<h3 className="font-semibold text-sm">
							@{conversation.participantUsername || conversation.participantIgId}
						</h3>
						<p className="text-xs text-muted-foreground">Instagram User</p>
					</div>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={handleSync}
					disabled={isSyncing}
					aria-label={isSyncing ? 'Syncing messages' : 'Sync messages'}
				>
					<RefreshCw className={cn('mr-2 h-4 w-4', isSyncing && 'animate-spin')} />
					{isSyncing ? 'Syncing...' : 'Sync'}
				</Button>
			</div>

			{/* Messages */}
			<ScrollArea className="flex-1 px-4 py-4">
				{isLoading ? (
					<div className="flex items-center justify-center h-full">
						<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				) : error ? (
					<div className="flex items-center justify-center h-full">
						<p className="text-destructive font-medium">{error}</p>
					</div>
				) : messages.length === 0 ? (
					<div className="flex items-center justify-center h-full">
						<p className="text-muted-foreground">
							No messages yet. Start the conversation!
						</p>
					</div>
				) : (
					<div className="space-y-3">
						{messages.map((message) => (
							<div
								key={message.id}
								className={cn('flex', message.isFromUser ? 'justify-end' : 'justify-start')}
							>
								<div
									className={cn(
										'max-w-[70%] rounded-2xl px-4 py-2',
										message.isFromUser
											? 'bg-primary text-primary-foreground'
											: 'bg-muted'
									)}
								>
									{message.messageText && (
										<p className="text-sm">{message.messageText}</p>
									)}
									{message.attachments && message.attachments.length > 0 && (
										<div className="mt-2">
											{message.attachments.map((attachment, idx) => (
												<div key={idx}>
													{attachment.type === 'image' && (
														// eslint-disable-next-line @next/next/no-img-element
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
										className={cn(
											'text-xs mt-1',
											message.isFromUser
												? 'text-primary-foreground/70'
												: 'text-muted-foreground'
										)}
									>
										{formatTimestamp(message.createdAt)}
									</p>
								</div>
							</div>
						))}
						<div ref={messagesEndRef} />
					</div>
				)}
			</ScrollArea>

			{/* Message Composer */}
			<div className="border-t px-4 py-3">
				<MessageComposerNew
					conversationId={conversation.id}
					onMessageSent={handleMessageSent}
				/>
			</div>
		</div>
	);
}
