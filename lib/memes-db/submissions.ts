/**
 * Meme submission CRUD operations
 */

import { supabaseAdmin } from '../config/supabase-admin';
import { Logger } from '../utils/logger';
import { generateImageHash, findDuplicateSubmission } from '../media/phash';
import {
	MemeStatus,
	MemeSubmission,
	CreateMemeInput,
	MemeSubmissionRow,
	mapMemeSubmissionRow,
} from '../types';

const MODULE = 'db:memes';

/** Explicit column list for meme_submissions queries — avoids select('*') */
const MEME_SUBMISSION_COLUMNS = 'id, user_id, user_email, media_url, storage_path, title, caption, status, rejection_reason, created_at, reviewed_at, reviewed_by, scheduled_time, scheduled_post_id, published_at, ig_media_id';

export async function createMemeSubmission(
	input: CreateMemeInput,
): Promise<MemeSubmission | null> {
	try {
		let phash: string | null = null;
		if (input.media_url && !input.media_url.toLowerCase().endsWith('.mp4')) {
			phash = await generateImageHash(input.media_url);
			if (phash) {
				const existingId = await findDuplicateSubmission(phash);
				if (existingId) {
					Logger.warn(
						MODULE,
						`Duplicate meme detected: ${input.media_url} matches existing submission ${existingId}`,
					);
					throw new Error('DUPLICATE_MEME');
				}
			}
		}

		const { data, error } = await supabaseAdmin
			.from('meme_submissions')
			.insert({
				user_id: input.user_id,
				user_email: input.user_email,
				media_url: input.media_url,
				storage_path: input.storage_path,
				title: input.title,
				caption: input.caption,
				status: 'pending',
				phash: phash,
			})
			.select()
			.single();

		if (error) {
			Logger.error(
				MODULE,
				`Error creating meme submission: ${error.message}`,
				error,
			);
			return null;
		}

		Logger.info(MODULE, `New meme submission from ${input.user_email}`, {
			id: data.id,
		});
		return data as MemeSubmission;
	} catch (error) {
		if (error instanceof Error && error.message === 'DUPLICATE_MEME') {
			throw error;
		}
		Logger.error(MODULE, 'Exception in createMemeSubmission', error);
		return null;
	}
}

export async function getMemeSubmissions(options?: {
	userId?: string;
	status?: MemeStatus | MemeStatus[];
	limit?: number;
	offset?: number;
	search?: string;
	sort?: string;
	dateFrom?: string;
	dateTo?: string;
	userEmail?: string;
}): Promise<MemeSubmission[]> {
	try {
		let query = supabaseAdmin.from('meme_submissions').select(MEME_SUBMISSION_COLUMNS);

		if (options?.userId) {
			query = query.eq('user_id', options.userId);
		}

		if (options?.userEmail) {
			query = query.eq('user_email', options.userEmail.toLowerCase());
		}

		if (options?.status) {
			if (Array.isArray(options.status)) {
				query = query.in('status', options.status);
			} else {
				query = query.eq('status', options.status);
			}
		}

		if (options?.search) {
			const searchTerm = options.search.toLowerCase();
			query = query.or(
				`title.ilike.%${searchTerm}%,caption.ilike.%${searchTerm}%,user_email.ilike.%${searchTerm}%`,
			);
		}

		if (options?.dateFrom) {
			query = query.gte('created_at', options.dateFrom);
		}
		if (options?.dateTo) {
			const dateTo = new Date(options.dateTo);
			dateTo.setDate(dateTo.getDate() + 1);
			query = query.lt('created_at', dateTo.toISOString());
		}

		const sort = options?.sort || 'newest';
		if (sort === 'oldest') {
			query = query.order('created_at', { ascending: true });
		} else if (sort === 'a-z') {
			query = query.order('title', { ascending: true });
		} else if (sort === 'z-a') {
			query = query.order('title', { ascending: false });
		} else {
			query = query.order('created_at', { ascending: false });
		}

		if (options?.offset) {
			query = query.range(
				options.offset,
				options.offset + (options.limit || 12) - 1,
			);
		} else if (options?.limit) {
			query = query.limit(options.limit);
		}

		const { data, error } = await query;

		if (error) {
			Logger.error(
				MODULE,
				`Error fetching meme submissions: ${error.message}`,
				error,
			);
			return [];
		}

		return (data || []).map((row) =>
			mapMemeSubmissionRow(row as MemeSubmissionRow),
		);
	} catch (error) {
		Logger.error(MODULE, 'Exception in getMemeSubmissions', error);
		return [];
	}
}

export async function getMemeSubmission(
	id: string,
): Promise<MemeSubmission | null> {
	try {
		const { data, error } = await supabaseAdmin
			.from('meme_submissions')
			.select(MEME_SUBMISSION_COLUMNS)
			.eq('id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			Logger.error(
				MODULE,
				`Error fetching meme submission: ${error.message}`,
				error,
			);
			return null;
		}

		return mapMemeSubmissionRow(data as MemeSubmissionRow);
	} catch (error) {
		Logger.error(MODULE, 'Exception in getMemeSubmission', error);
		return null;
	}
}
