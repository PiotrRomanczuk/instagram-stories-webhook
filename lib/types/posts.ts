import {
	MediaType,
	PostType,
	PostStatus,
	MemeStatus,
	UserRole,
	ContentSource,
	SubmissionStatus,
	PublishingStatus,
} from './common';

// Re-export common types for convenience
export type { MediaType, PostType, PostStatus, MemeStatus, UserRole, ContentSource, SubmissionStatus, PublishingStatus };

// ============== USER & AUTH TYPES ==============

export interface AllowedUser {
	id?: string;
	email: string;
	role: UserRole;
	display_name?: string;
	added_by?: string;
	created_at?: string;
}

// ============== UNIFIED CONTENT ITEM TYPES ==============

export interface UserTag {
	username: string;
	x: number;
	y: number;
}

export interface ContentItemDimensions {
	width: number;
	height: number;
}

/**
 * Unified content item combining meme submissions and scheduled posts
 * Supports workflow: submission -> review -> schedule -> publish
 *                    or direct -> schedule -> publish
 */
export interface ContentItem {
	// Identity
	id: string;
	userId: string;
	userEmail: string;

	// Media
	mediaUrl: string;
	mediaType: MediaType;
	storagePath?: string;
	dimensions?: ContentItemDimensions;
	thumbnailUrl?: string; // Video thumbnail

	// Video Metadata
	videoDuration?: number; // Duration in seconds
	videoCodec?: string; // e.g., 'h264', 'vp9'
	videoFramerate?: number; // e.g., 30.0
	needsProcessing?: boolean; // Whether video needs conversion

	// Content
	title?: string; // Optional, for submissions
	caption?: string; // Max 2200
	userTags?: UserTag[];
	hashtags?: string[];

	// Source & Workflow
	source: ContentSource;
	submissionStatus?: SubmissionStatus; // Only for submissions
	publishingStatus: PublishingStatus;

	// Review (for submissions only)
	rejectionReason?: string;
	reviewedAt?: string;
	reviewedBy?: string;

	// Scheduling
	scheduledTime?: number;
	processingStartedAt?: string;

	// Publishing
	publishedAt?: string;
	igMediaId?: string;
	error?: string;

	// Metadata
	contentHash?: string;
	idempotencyKey?: string;
	retryCount?: number;
	version: number;

	// Archive
	archivedAt?: string;

	// Timestamps
	createdAt: string;
	updatedAt: string;
}

/**
 * Input type for creating new content
 */
export interface CreateContentInput {
	source: ContentSource;
	mediaUrl: string;
	mediaType: MediaType;
	title?: string;
	caption?: string;
	userTags?: UserTag[];
	hashtags?: string[];
	scheduledTime?: number;
	storagePath?: string;
	dimensions?: ContentItemDimensions;
	thumbnailUrl?: string;
	videoDuration?: number;
	videoCodec?: string;
	videoFramerate?: number;
	needsProcessing?: boolean;
}

/**
 * Input type for updating content
 */
export interface UpdateContentInput {
	caption?: string;
	title?: string;
	userTags?: UserTag[];
	hashtags?: string[];
	scheduledTime?: number;
	publishingStatus?: PublishingStatus;
	version?: number; // For optimistic locking
}

/**
 * Database row type for content_items
 */
export interface ContentItemRow {
	id: string;
	user_id: string;
	user_email: string;
	media_url: string;
	media_type: string;
	storage_path?: string;
	dimensions?: string; // JSON stringified
	thumbnail_url?: string;
	video_duration?: number;
	video_codec?: string;
	video_framerate?: number;
	needs_processing?: boolean;
	title?: string;
	caption?: string;
	user_tags?: string; // JSON stringified
	hashtags?: string[];
	source: string;
	submission_status?: string;
	publishing_status: string;
	rejection_reason?: string;
	reviewed_at?: string;
	reviewed_by?: string;
	scheduled_time?: number | string;
	processing_started_at?: string;
	published_at?: string;
	ig_media_id?: string;
	error?: string;
	content_hash?: string;
	idempotency_key?: string;
	retry_count?: number;
	archived_at?: string;
	version: number;
	created_at: string;
	updated_at: string;
}

// ============== SCHEDULED POST TYPES ==============

export interface ScheduledPost {
	id: string;
	url: string;
	type: MediaType;
	postType?: PostType;
	caption?: string;
	scheduledTime: number; // Unix timestamp in milliseconds
	status: PostStatus;
	createdAt: number;
	publishedAt?: number;
	error?: string;
	igMediaId?: string;
	userTags?: UserTag[];
	processingStartedAt?: number;
	contentHash?: string;
	idempotencyKey?: string;
	memeId?: string;
	retryCount?: number;
}

export interface ScheduledPostWithUser extends ScheduledPost {
	userId: string;
	userEmail?: string;
}

// ============== MEME SUBMISSION TYPES ==============

export interface MemeSubmission {
	id?: string;
	user_id: string;
	user_email: string;
	media_url: string;
	storage_path?: string;
	title?: string;
	caption?: string;
	status: MemeStatus;
	rejection_reason?: string;
	created_at?: string;
	reviewed_at?: string;
	reviewed_by?: string;
	scheduled_time?: number;
	scheduled_post_id?: string;
	published_at?: string;
	ig_media_id?: string;
	version?: number;
}

export interface CreateMemeInput {
	user_id: string;
	user_email: string;
	media_url: string;
	storage_path?: string;
	title?: string;
	caption?: string;
}

// ============== DATABASE ROW TYPES ==============
// These represent the raw shapes from Supabase

export interface ScheduledPostRow {
	id: string;
	url: string;
	type: string;
	post_type?: string;
	caption?: string;
	scheduled_time: number | string;
	status: string;
	created_at: number | string;
	published_at?: number | string | null;
	error?: string | null;
	ig_media_id?: string;
	user_tags?: UserTag[];
	user_id: string;
	user_email?: string; // From joined users table
	processing_started_at?: string | null;
	content_hash?: string | null;
	idempotency_key?: string | null;
	meme_id?: string | null;
	retry_count?: number | null;
}

export interface MemeSubmissionRow {
	id: string;
	user_id: string;
	user_email: string;
	media_url: string;
	storage_path?: string;
	title?: string;
	caption?: string;
	status: string;
	rejection_reason?: string;
	created_at?: string;
	reviewed_at?: string;
	reviewed_by?: string;
	scheduled_time?: number | string | null;
	scheduled_post_id?: string;
	published_at?: string;
	ig_media_id?: string;
}

// ============== MAPPING UTILITIES ==============

/**
 * Maps a database row to a ScheduledPostWithUser object
 */
export function mapScheduledPostRow(
	row: ScheduledPostRow,
): ScheduledPostWithUser {
	return {
		id: row.id,
		url: row.url,
		type: row.type as MediaType,
		postType: row.post_type as PostType,
		caption: row.caption,
		scheduledTime: Number(row.scheduled_time),
		status: row.status as PostStatus,
		createdAt: Number(row.created_at),
		publishedAt: row.published_at ? Number(row.published_at) : undefined,
		error: row.error ?? undefined,
		igMediaId: row.ig_media_id,
		userTags: row.user_tags,
		userId: row.user_id,
		userEmail: row.user_email,
		processingStartedAt: row.processing_started_at
			? new Date(row.processing_started_at).getTime()
			: undefined,
		contentHash: row.content_hash ?? undefined,
		idempotencyKey: row.idempotency_key ?? undefined,
		memeId: row.meme_id ?? undefined,
		retryCount: row.retry_count ?? undefined,
	};
}

/**
 * Maps a database row to a MemeSubmission object
 */
export function mapMemeSubmissionRow(row: MemeSubmissionRow): MemeSubmission {
	return {
		id: row.id,
		user_id: row.user_id,
		user_email: row.user_email,
		media_url: row.media_url,
		storage_path: row.storage_path,
		title: row.title,
		caption: row.caption,
		status: row.status as MemeStatus,
		rejection_reason: row.rejection_reason,
		created_at: row.created_at,
		reviewed_at: row.reviewed_at,
		reviewed_by: row.reviewed_by,
		scheduled_time: row.scheduled_time ? Number(row.scheduled_time) : undefined,
		scheduled_post_id: row.scheduled_post_id,
		published_at: row.published_at,
		ig_media_id: row.ig_media_id,
	};
}

/**
 * Maps a database row to a ContentItem object
 */
export function mapContentItemRow(row: ContentItemRow): ContentItem {
	return {
		id: row.id,
		userId: row.user_id,
		userEmail: row.user_email,
		mediaUrl: row.media_url,
		mediaType: row.media_type as MediaType,
		storagePath: row.storage_path,
		dimensions: row.dimensions ? JSON.parse(row.dimensions) : undefined,
		thumbnailUrl: row.thumbnail_url,
		videoDuration: row.video_duration,
		videoCodec: row.video_codec,
		videoFramerate: row.video_framerate,
		needsProcessing: row.needs_processing,
		title: row.title,
		caption: row.caption,
		userTags: row.user_tags ? JSON.parse(row.user_tags) : undefined,
		hashtags: row.hashtags,
		source: row.source as ContentSource,
		submissionStatus: row.submission_status as SubmissionStatus | undefined,
		publishingStatus: row.publishing_status as PublishingStatus,
		rejectionReason: row.rejection_reason,
		reviewedAt: row.reviewed_at,
		reviewedBy: row.reviewed_by,
		scheduledTime: row.scheduled_time ? Number(row.scheduled_time) : undefined,
		processingStartedAt: row.processing_started_at,
		publishedAt: row.published_at,
		igMediaId: row.ig_media_id,
		error: row.error,
		contentHash: row.content_hash,
		idempotencyKey: row.idempotency_key,
		retryCount: row.retry_count,
		archivedAt: row.archived_at,
		version: row.version,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

// ============== PUBLISHING LOG TYPES ==============

export interface PublishingLog {
	id: string;
	userId: string;
	mediaUrl: string;
	mediaType: MediaType;
	postType: PostType;
	caption?: string;
	status: 'SUCCESS' | 'FAILED';
	igMediaId?: string;
	errorMessage?: string;
	createdAt: string;
}

export interface PublishingLogRow {
	id: string;
	user_id: string;
	media_url: string;
	media_type: string;
	post_type: string;
	caption?: string;
	status: string;
	ig_media_id?: string;
	error_message?: string;
	created_at: string;
}

/**
 * Maps a database row to a PublishingLog object
 */
export function mapPublishingLogRow(row: PublishingLogRow): PublishingLog {
	return {
		id: row.id,
		userId: row.user_id,
		mediaUrl: row.media_url,
		mediaType: row.media_type as MediaType,
		postType: row.post_type as PostType,
		caption: row.caption ?? undefined,
		status: row.status as 'SUCCESS' | 'FAILED',
		igMediaId: row.ig_media_id ?? undefined,
		errorMessage: row.error_message ?? undefined,
		createdAt: row.created_at,
	};
}
