'use client';

import type { InstagramConversation } from '@/lib/types/messaging';
import { MessageCircle, Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { ScrollArea } from '@/app/components/ui/scroll-area';

interface ConversationListProps {
	conversations: InstagramConversation[];
	onSelectConversation: (conversation: InstagramConversation) => void;
}

function formatTimestamp(date: Date | null) {
	if (!date) return 'No messages';
	const now = new Date();
	const diff = now.getTime() - new Date(date).getTime();
	const minutes = Math.floor(diff / 60000);
	const hours = Math.floor(diff / 3600000);
	const days = Math.floor(diff / 86400000);

	if (minutes < 1) return 'Just now';
	if (minutes < 60) return `${minutes}m ago`;
	if (hours < 24) return `${hours}h ago`;
	if (days < 7) return `${days}d ago`;
	return new Date(date).toLocaleDateString();
}

export function ConversationListNew({
	conversations,
	onSelectConversation,
}: ConversationListProps) {
	if (conversations.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-24 text-center">
				<div className="rounded-full bg-muted p-6 mb-4">
					<MessageCircle className="h-12 w-12 text-muted-foreground" />
				</div>
				<h3 className="text-xl font-semibold mb-2">No conversations yet</h3>
				<p className="text-muted-foreground max-w-md">
					When customers send you messages on Instagram, they&apos;ll appear here.
					Click &quot;Sync&quot; to fetch latest conversations.
				</p>
			</div>
		);
	}

	return (
		<ScrollArea className="h-[500px]">
			<div className="divide-y">
				{conversations.map((conversation) => (
					<button
						key={conversation.id}
						onClick={() => onSelectConversation(conversation)}
						className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
					>
						<Avatar className="h-11 w-11 flex-shrink-0">
							<AvatarImage
								src={conversation.participantProfilePic || undefined}
								alt={conversation.participantUsername || 'User'}
							/>
							<AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-semibold">
								{(conversation.participantUsername || 'U')[0].toUpperCase()}
							</AvatarFallback>
						</Avatar>

						<div className="flex-grow min-w-0">
							<div className="flex items-center justify-between mb-0.5">
								<h3 className="font-semibold text-sm truncate">
									@{conversation.participantUsername || conversation.participantIgId}
								</h3>
								<div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
									<Clock className="h-3 w-3" />
									<span>{formatTimestamp(conversation.lastMessageAt)}</span>
								</div>
							</div>
							<p className="text-sm text-muted-foreground truncate">
								{conversation.lastMessageText || 'No messages yet'}
							</p>
						</div>

						{conversation.unreadCount > 0 && (
							<Badge variant="default" className="flex-shrink-0">
								{conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
							</Badge>
						)}
					</button>
				))}
			</div>
		</ScrollArea>
	);
}
