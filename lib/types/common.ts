export type MediaType = 'IMAGE' | 'VIDEO';
export type PostType = 'STORY' | 'FEED' | 'REEL';
export type PostStatus = 'pending' | 'processing' | 'published' | 'failed' | 'cancelled';
export type MemeStatus = 'pending' | 'approved' | 'rejected' | 'published' | 'scheduled';
export type UserRole = 'developer' | 'admin' | 'user';

// Unified Content Hub types
export type ContentSource = 'submission' | 'direct';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';
export type PublishingStatus = 'draft' | 'scheduled' | 'processing' | 'published' | 'failed';

export interface TokenData {
    access_token: string;
    user_id?: string;
    expires_at?: number;
}
