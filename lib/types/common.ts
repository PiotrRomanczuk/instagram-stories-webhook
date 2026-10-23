export type MediaType = 'IMAGE' | 'VIDEO';
export type PostType = 'STORY' | 'FEED' | 'REEL' | 'TIKTOK';
export type PostStatus = 'pending' | 'processing' | 'published' | 'failed' | 'cancelled';
export type MemeStatus = 'pending' | 'approved' | 'rejected' | 'published' | 'scheduled';
export type UserRole = 'developer' | 'admin' | 'curator' | 'contributor' | 'user' | 'demo';

// Unified Content Hub types
export type ContentSource = 'submission' | 'direct';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';
export type PublishingStatus = 'draft' | 'scheduled' | 'processing' | 'published' | 'failed';

/**
 * Which publishing pipeline owns a content_items row.
 * - 'instagram'     — IG Graph API cron (default; the existing path)
 * - 'tiktok-device' — Phone-driven UI automation worker (Samsung S24 / uiautomator2)
 *
 * The official TikTok Content Posting API (lib/tiktok/publish.ts) does not flow
 * through content_items, so it has no value here.
 */
export type PublishingChannel = 'instagram' | 'tiktok-device';

// Video Processing Optimization types (INS-58)
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ProcessingBackend = 'browser' | 'railway' | 'server-ffmpeg' | 'none';
