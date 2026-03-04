export type MediaType = 'IMAGE' | 'VIDEO';
export type PostType = 'STORY' | 'FEED' | 'REEL';
export type PostStatus = 'pending' | 'processing' | 'published' | 'failed' | 'cancelled';
export type MemeStatus = 'pending' | 'approved' | 'rejected' | 'published' | 'scheduled';
export type UserRole = 'developer' | 'admin' | 'user' | 'demo';

// Unified Content Hub types
export type ContentSource = 'submission' | 'direct';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';
export type PublishingStatus = 'draft' | 'scheduled' | 'processing' | 'published' | 'failed';

// Video Processing Optimization types (INS-58)
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ProcessingBackend = 'browser' | 'railway' | 'server-ffmpeg' | 'none';
