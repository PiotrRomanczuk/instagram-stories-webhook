// Common types shared across the application
export type MediaType = 'IMAGE' | 'VIDEO';
export type PostStatus = 'pending' | 'published' | 'failed' | 'cancelled';

export interface ScheduledPost {
    id: string;
    url: string;
    type: MediaType;
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
