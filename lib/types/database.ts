import { UserTag } from './posts';

export interface LinkedAccount {
	id?: string;
	user_id: string;
	provider: string;
	provider_account_id: string;
	access_token: string;
	refresh_token?: string;
	expires_at?: number;
	ig_user_id?: string;
	ig_username?: string;
	created_at?: string;
	updated_at?: string;
}

export interface DbScheduledPostUpdate {
	url?: string;
	type?: string;
	post_type?: string;
	caption?: string;
	scheduled_time?: number;
	status?: string;
	error?: string | null;
	published_at?: number | null;
	ig_media_id?: string;
	user_tags?: UserTag[];
	processing_started_at?: string | null;
	content_hash?: string;
	idempotency_key?: string;
	meme_id?: string;
	retry_count?: number;
}
