// Common types shared across the application
export type MediaType = 'IMAGE' | 'VIDEO';
export type PostType = 'STORY' | 'FEED' | 'REEL';
export type PostStatus = 'pending' | 'published' | 'failed' | 'cancelled';

export interface ScheduledPost {
    id: string;
    url: string;
    type: MediaType;
    postType?: PostType; // Added to support different Instagram post types
    caption?: string;    // Added for Feed/Reels
    scheduledTime: number; // Unix timestamp in milliseconds
    status: PostStatus;
    createdAt: number;
    publishedAt?: number;
    error?: string;
}

export interface TokenData {
    access_token: string;
    user_id?: string;
    expires_at?: number;
}
