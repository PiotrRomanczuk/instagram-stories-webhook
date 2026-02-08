'use client';

import type { InstagramConversation } from '@/lib/types/messaging';
import { MessageCircle, Clock } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';

interface ConversationListProps {
    conversations: InstagramConversation[];
    onSelectConversation: (conversation: InstagramConversation) => void;
}

export function ConversationList({ conversations, onSelectConversation }: ConversationListProps) {
    if (conversations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="bg-slate-100 rounded-full p-6 mb-4">
                    <MessageCircle className="w-12 h-12 text-slate-400" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">No conversations yet</h3>
                <p className="text-slate-500 font-medium max-w-md">
                    When customers send you messages on Instagram, they&apos;ll appear here.
                    Click &quot;Sync&quot; to fetch latest conversations.
                </p>
            </div>
        );
    }

    const formatTimestamp = (date: Date | null) => {
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
    };

    return (
        <div className="divide-y divide-slate-100">
            {conversations.map((conversation) => (
                <button
                    key={conversation.id}
                    onClick={() => onSelectConversation(conversation)}
                    className="w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
                >
                    {/* Profile Picture */}
                    <div className="flex-shrink-0">
                        <Avatar className="w-12 h-12">
                            <AvatarImage
                                src={conversation.participantProfilePic || undefined}
                                alt={conversation.participantUsername || 'User'}
                            />
                            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-black text-lg">
                                {(conversation.participantUsername || 'U')[0].toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    </div>

                    {/* Conversation Info */}
                    <div className="flex-grow min-w-0">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="font-black text-slate-900">
                                @{conversation.participantUsername || conversation.participantIgId}
                            </h3>
                            <div className="flex items-center gap-1 text-xs text-slate-400">
                                <Clock className="w-3 h-3" />
                                <span>{formatTimestamp(conversation.lastMessageAt)}</span>
                            </div>
                        </div>
                        <p className="text-sm text-slate-600 truncate">
                            {conversation.lastMessageText || 'No messages yet'}
                        </p>
                    </div>

                    {/* Unread Badge */}
                    {conversation.unreadCount > 0 && (
                        <div className="flex-shrink-0">
                            <Badge className="bg-indigo-600 text-white text-xs font-black rounded-full w-6 h-6 flex items-center justify-center p-0">
                                {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                            </Badge>
                        </div>
                    )}
                </button>
            ))}
        </div>
    );
}
