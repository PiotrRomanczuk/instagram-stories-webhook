import {
	MediaType,
	PostType,
	PostStatus,
	MemeStatus,
	UserRole,
} from './common';

// Re-export common types for convenience
export type { MediaType, PostType, PostStatus, MemeStatus, UserRole };

// ============== USER & AUTH TYPES ==============

export interface AllowedUser {
	id?: string;
	email: string;
	role: UserRole;
	display_name?: string;
	added_by?: string;
	created_at?: string;
}

// ============== SCHEDULED POST TYPES ==============

export interface UserTag {
	username: string;
	x: number;
	y: number;
}

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
