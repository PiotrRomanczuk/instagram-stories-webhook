import { supabaseAdmin } from './config/supabase-admin';
import { Logger } from './utils/logger';
import { createNotification } from './notifications';
import { generateImageHash, findDuplicateSubmission } from './media/phash';
import {
	MemeStatus,
	UserRole,
	AllowedUser,
	MemeSubmission,
	CreateMemeInput,
	MemeSubmissionRow,
	mapMemeSubmissionRow,
} from './types';

// Re-export types for backward compatibility
export type {
	MemeStatus,
	UserRole,
	AllowedUser,
	MemeSubmission,
	CreateMemeInput,
};

const MODULE = 'db:memes';

const ALLOWED_USER_COLUMNS = 'id, email, role, display_name, added_by, created_at';
const MEME_SUBMISSION_COLUMNS = 'id, user_id, user_email, media_url, storage_path, title, caption, status, rejection_reason, created_at, reviewed_at, reviewed_by, scheduled_time, scheduled_post_id, published_at, ig_media_id, phash';

// ============== ALLOWED USERS (WHITELIST) ==============

/**
 * Check if an email is in the allowed users whitelist
 */
export async function isEmailAllowed(email: string): Promise<boolean> {
	try {
		const { data, error } = await supabaseAdmin
			.from('email_whitelist')
			.select('email')
			.eq('email', email.toLowerCase())
			.single();

		if (error) {
			if (error.code === 'PGRST116') return false; // Not found
			Logger.error(
				MODULE,
				`Error checking allowed email: ${error.message}`,
				error,
			);
			return false;
		}

		return !!data;
	} catch (error) {
		Logger.error(MODULE, 'Exception in isEmailAllowed', error);
		return false;
	}
}

/**
 * Get user role from whitelist
 */
export async function getUserRole(email: string): Promise<UserRole | null> {
	try {
		const { data, error } = await supabaseAdmin
			.from('email_whitelist')
			.select('role')
			.eq('email', email.toLowerCase())
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			Logger.error(MODULE, `Error getting user role: ${error.message}`, error);
			return null;
		}

		return (data?.role as UserRole) || null;
	} catch (error) {
		Logger.error(MODULE, 'Exception in getUserRole', error);
		return null;
	}
}

/**
 * Get a single allowed user by email
 */
export async function getAllowedUserByEmail(
	email: string,
): Promise<AllowedUser | null> {
	try {
		const { data, error } = await supabaseAdmin
			.from('email_whitelist')
			.select(ALLOWED_USER_COLUMNS)
			.eq('email', email.toLowerCase())
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			Logger.error(
				MODULE,
				`Error fetching allowed user: ${error.message}`,
				error,
			);
			return null;
		}

		return data as AllowedUser;
	} catch (error) {
		Logger.error(MODULE, 'Exception in getAllowedUserByEmail', error);
		return null;
	}
}

/**
 * Get NextAuth user ID by email from next_auth schema
 */
export async function getNextAuthUserIdByEmail(
	email: string,
): Promise<string | null> {
	try {
		const { data, error } = await supabaseAdmin
			.schema('next_auth')
			.from('users')
			.select('id')
			.eq('email', email.toLowerCase())
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			Logger.error(
				MODULE,
				`Error fetching NextAuth user ID: ${error.message}`,
				error,
			);
			return null;
		}

		return data?.id || null;
	} catch (error) {
		Logger.error(MODULE, 'Exception in getNextAuthUserIdByEmail', error);
		return null;
	}
}

/**
 * Get all allowed users (admin only)
 */
export async function getAllowedUsers(): Promise<AllowedUser[]> {
	try {
		const { data, error } = await supabaseAdmin
			.from('email_whitelist')
			.select(ALLOWED_USER_COLUMNS)
			.order('created_at', { ascending: false });

		if (error) {
			Logger.error(
				MODULE,
				`Error fetching allowed users: ${error.message}`,
				error,
			);
			return [];
		}

		return data as AllowedUser[];
	} catch (error) {
		Logger.error(MODULE, 'Exception in getAllowedUsers', error);
		return [];
	}
}

/**
 * Add a user to the whitelist
 */
export async function addAllowedUser(
	user: Omit<AllowedUser, 'id' | 'created_at'>,
): Promise<AllowedUser | null> {
	try {
		const { data, error } = await supabaseAdmin
			.from('email_whitelist')
			.insert({
				email: user.email.toLowerCase(),
				role: user.role,
				display_name: user.display_name,
				added_by: user.added_by,
			})
			.select()
			.single();

		if (error) {
			Logger.error(
				MODULE,
				`Error adding allowed user: ${error.message}`,
				error,
			);
			return null;
		}

		Logger.info(MODULE, `✅ Added ${user.email} to whitelist as ${user.role}`);
		return data as AllowedUser;
	} catch (error) {
		Logger.error(MODULE, 'Exception in addAllowedUser', error);
		return null;
	}
}

/**
 * Remove a user from the whitelist
 */
export async function removeAllowedUser(email: string): Promise<boolean> {
	try {
		// Check if this is the last developer (system lockout protection)
		const { data: targetUser } = await supabaseAdmin
			.from('email_whitelist')
			.select('role')
			.eq('email', email.toLowerCase())
			.single();

		if (targetUser?.role === 'developer') {
			const { data: developers, error: countError } = await supabaseAdmin
				.from('email_whitelist')
				.select('id')
				.eq('role', 'developer');

			if (countError) {
				Logger.error(
					MODULE,
					`Error counting developers: ${countError.message}`,
					countError,
				);
				return false;
			}

			// Prevent removing the last developer
			if (developers && developers.length === 1) {
				Logger.error(MODULE, `Cannot remove ${email} - last developer`, {
					email,
				});
				throw new Error(
					'Cannot remove the last developer - system lockout protection',
				);
			}
		}

		const { error } = await supabaseAdmin
			.from('email_whitelist')
			.delete()
			.eq('email', email.toLowerCase());

		if (error) {
			Logger.error(
				MODULE,
				`Error removing allowed user: ${error.message}`,
				error,
			);
			return false;
		}

		Logger.info(MODULE, `🗑️ Removed ${email} from whitelist`);
		return true;
	} catch (error) {
		Logger.error(MODULE, 'Exception in removeAllowedUser', error);
		// Re-throw if it's our custom error
		if (error instanceof Error && error.message.includes('last developer')) {
			throw error;
		}
		return false;
	}
}

/**
 * Update user role
 */
export async function updateUserRole(
	email: string,
	role: UserRole,
): Promise<boolean> {
	try {
		// Prevent demoting the last developer (system lockout protection)
		if (role !== 'developer') {
			const { data: currentUser } = await supabaseAdmin
				.from('email_whitelist')
				.select('role')
				.eq('email', email.toLowerCase())
				.single();

			// Only check if the user is currently a developer
			if (currentUser?.role === 'developer') {
				const { data: developers, error: countError } = await supabaseAdmin
					.from('email_whitelist')
					.select('id')
					.eq('role', 'developer');

				if (countError) {
					Logger.error(
						MODULE,
						`Error counting developers: ${countError.message}`,
						countError,
					);
					return false;
				}

				// Prevent demoting the last developer
				if (developers && developers.length === 1) {
					Logger.error(MODULE, `Cannot demote ${email} - last developer`, {
						email,
						attemptedRole: role,
					});
					throw new Error(
						'Cannot demote the last developer - system lockout protection',
					);
				}
			}
		}

		const { error } = await supabaseAdmin
			.from('email_whitelist')
			.update({ role })
			.eq('email', email.toLowerCase());

		if (error) {
			Logger.error(MODULE, `Error updating user role: ${error.message}`, error);
			return false;
		}

		Logger.info(MODULE, `🔄 Updated ${email} role to ${role}`);
		return true;
	} catch (error) {
		Logger.error(MODULE, 'Exception in updateUserRole', error);
		// Re-throw if it's our custom error
		if (error instanceof Error && error.message.includes('last developer')) {
			throw error;
		}
		return false;
	}
}

// ============== MEME SUBMISSIONS ==============

/**
 * Create a new meme submission
 */
export async function createMemeSubmission(
	input: CreateMemeInput,
): Promise<MemeSubmission | null> {
	try {
		// Generate perceptual hash for images to detect duplicates
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

		Logger.info(MODULE, `📥 New meme submission from ${input.user_email}`, {
			id: data.id,
		});
		return data as MemeSubmission;
	} catch (error) {
		// Re-throw DUPLICATE_MEME errors so they can be handled by the API
		if (error instanceof Error && error.message === 'DUPLICATE_MEME') {
			throw error;
		}
		Logger.error(MODULE, 'Exception in createMemeSubmission', error);
		return null;
	}
}

/**
 * Get meme submissions with optional filters
 */
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

		// Date range filtering
		if (options?.dateFrom) {
			query = query.gte('created_at', options.dateFrom);
		}
		if (options?.dateTo) {
			// Add 1 day to dateTo to include the entire day
			const dateTo = new Date(options.dateTo);
			dateTo.setDate(dateTo.getDate() + 1);
			query = query.lt('created_at', dateTo.toISOString());
		}

		// Sorting
		const sort = options?.sort || 'newest';
		if (sort === 'oldest') {
			query = query.order('created_at', { ascending: true });
		} else if (sort === 'a-z') {
			query = query.order('title', { ascending: true });
		} else if (sort === 'z-a') {
			query = query.order('title', { ascending: false });
		} else {
			// Default to newest
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

/**
 * Get a single meme submission by ID
 */
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

/**
 * Update meme submission status (for admin review)
 */
export async function reviewMemeSubmission(
	id: string,
	adminUserId: string,
	action: 'approve' | 'reject',
	rejectionReason?: string,
): Promise<MemeSubmission | null> {
	try {
		const status: MemeStatus = action === 'approve' ? 'approved' : 'rejected';

		const { data, error } = await supabaseAdmin
			.from('meme_submissions')
			.update({
				status,
				reviewed_at: new Date().toISOString(),
				reviewed_by: adminUserId,
				rejection_reason: action === 'reject' ? rejectionReason : null,
			})
			.eq('id', id)
			.select()
			.single();

		if (error) {
			Logger.error(MODULE, `Error reviewing meme: ${error.message}`, error);
			return null;
		}

		Logger.info(MODULE, `📝 Meme ${id} ${status} by admin`, { adminUserId });

		// Create notification for the user
		await createNotification({
			userId: data.user_id,
			type: action === 'approve' ? 'meme_approved' : 'meme_rejected',
			title: action === 'approve' ? '🎉 Meme Approved!' : '❌ Meme Rejected',
			message:
				action === 'approve'
					? `Your meme "${data.title || 'Untitled'}" has been approved!`
					: `Your meme was rejected: ${rejectionReason}`,
			relatedType: 'meme',
			relatedId: id,
		});

		return data as MemeSubmission;
	} catch (error) {
		Logger.error(MODULE, 'Exception in reviewMemeSubmission', error);
		return null;
	}
}

/**
 * Mark meme as scheduled
 */
export async function scheduleMeme(
	id: string,
	scheduledTime: number,
	scheduledPostId: string,
): Promise<MemeSubmission | null> {
	try {
		const { data, error } = await supabaseAdmin
			.from('meme_submissions')
			.update({
				status: 'scheduled',
				scheduled_time: scheduledTime,
				scheduled_post_id: scheduledPostId,
			})
			.eq('id', id)
			.select()
			.single();

		if (error) {
			Logger.error(MODULE, `Error scheduling meme: ${error.message}`, error);
			return null;
		}

		Logger.info(
			MODULE,
			`📅 Meme ${id} scheduled for ${new Date(scheduledTime).toISOString()}`,
		);

		// Create notification for the user
		await createNotification({
			userId: data.user_id,
			type: 'meme_scheduled',
			title: '📅 Meme Scheduled',
			message: `Your meme "${data.title || 'Untitled'}" is scheduled for ${new Date(scheduledTime).toLocaleString()}`,
			relatedType: 'meme',
			relatedId: id,
		});

		return data as MemeSubmission;
	} catch (error) {
		Logger.error(MODULE, 'Exception in scheduleMeme', error);
		return null;
	}
}

/**
 * Mark meme as published
 */
export async function markMemePublished(
	id: string,
	igMediaId?: string,
): Promise<MemeSubmission | null> {
	try {
		const { data, error } = await supabaseAdmin
			.from('meme_submissions')
			.update({
				status: 'published',
				published_at: new Date().toISOString(),
				ig_media_id: igMediaId,
			})
			.eq('id', id)
			.select()
			.single();

		if (error) {
			Logger.error(
				MODULE,
				`Error marking meme published: ${error.message}`,
				error,
			);
			return null;
		}

		Logger.info(MODULE, `✅ Meme ${id} published to Instagram`, { igMediaId });

		// Create notification for the user
		await createNotification({
			userId: data.user_id,
			type: 'meme_published',
			title: '🚀 Meme Published!',
			message: `Your meme "${data.title || 'Untitled'}" is now live on Instagram!`,
			relatedType: 'meme',
			relatedId: id,
		});

		return data as MemeSubmission;
	} catch (error) {
		Logger.error(MODULE, 'Exception in markMemePublished', error);
		return null;
	}
}

/**
 * Delete a meme submission
 */
export async function deleteMemeSubmission(id: string): Promise<boolean> {
	try {
		// First get the submission to check for storage path
		const meme = await getMemeSubmission(id);

		if (meme?.storage_path) {
			// Delete from storage
			const { error: storageError } = await supabaseAdmin.storage
				.from('media')
				.remove([meme.storage_path]);

			if (storageError) {
				Logger.warn(
					MODULE,
					`Failed to delete storage file: ${storageError.message}`,
				);
			}
		}

		const { error } = await supabaseAdmin
			.from('meme_submissions')
			.delete()
			.eq('id', id);

		if (error) {
			Logger.error(MODULE, `Error deleting meme: ${error.message}`, error);
			return false;
		}

		Logger.info(MODULE, `🗑️ Deleted meme submission ${id}`);
		return true;
	} catch (error) {
		Logger.error(MODULE, 'Exception in deleteMemeSubmission', error);
		return false;
	}
}

/**
 * Get submission stats (for dashboard)
 */
export async function getMemeStats(): Promise<{
	total: number;
	pending: number;
	approved: number;
	published: number;
	rejected: number;
}> {
	try {
		const { data, error } = await supabaseAdmin
			.from('meme_submissions')
			.select('status');

		if (error) {
			Logger.error(
				MODULE,
				`Error fetching meme stats: ${error.message}`,
				error,
			);
			return { total: 0, pending: 0, approved: 0, published: 0, rejected: 0 };
		}

		const stats = {
			total: data.length,
			pending: data.filter((m) => m.status === 'pending').length,
			approved: data.filter(
				(m) => m.status === 'approved' || m.status === 'scheduled',
			).length,
			published: data.filter((m) => m.status === 'published').length,
			rejected: data.filter((m) => m.status === 'rejected').length,
		};

		return stats;
	} catch (error) {
		Logger.error(MODULE, 'Exception in getMemeStats', error);
		return { total: 0, pending: 0, approved: 0, published: 0, rejected: 0 };
	}
}

/**
 * Get user stats (submission counts) by email
 */
export async function getUserStatsByEmail(email: string) {
	try {
		const { data, error } = await supabaseAdmin
			.from('meme_submissions')
			.select('status, user_id, created_at')
			.eq('user_email', email.toLowerCase())
			.order('created_at', { ascending: false });

		if (error) {
			Logger.error(
				MODULE,
				`Error fetching user stats: ${error.message}`,
				error,
			);
			return { total: 0, statusCounts: {}, lastUserId: null, lastSubAt: null };
		}

		const statusCounts = (data || []).reduce(
			(acc: Record<string, number>, curr) => {
				acc[curr.status] = (acc[curr.status] || 0) + 1;
				return acc;
			},
			{},
		);

		// Get the most recent user_id if any (useful for linking to accounts table)
		const lastUserId = data && data.length > 0 ? data[0].user_id : null;
		const lastSubAt = data && data.length > 0 ? data[0].created_at : null;

		return {
			total: data?.length || 0,
			statusCounts,
			lastUserId,
			lastSubAt,
		};
	} catch (error) {
		Logger.error(MODULE, 'Exception in getUserStatsByEmail', error);
		return { total: 0, statusCounts: {}, lastUserId: null, lastSubAt: null };
	}
}

/**
 * Get user post stats (scheduled_posts) by email
 */
export async function getPostStatsByEmail(email: string) {
	try {
		const { data, error } = await supabaseAdmin
			.from('scheduled_posts')
			.select('status, user_id, created_at')
			.eq('user_email', email.toLowerCase())
			.order('created_at', { ascending: false });

		if (error) {
			Logger.error(
				MODULE,
				`Error fetching post stats: ${error.message}`,
				error,
			);
			return { total: 0, statusCounts: {}, lastPostAt: null };
		}

		const statusCounts = (data || []).reduce(
			(acc: Record<string, number>, curr) => {
				acc[curr.status] = (acc[curr.status] || 0) + 1;
				return acc;
			},
			{},
		);

		const lastPostAt = data && data.length > 0 ? data[0].created_at : null;

		return {
			total: data?.length || 0,
			statusCounts,
			lastPostAt,
		};
	} catch (error) {
		Logger.error(MODULE, 'Exception in getPostStatsByEmail', error);
		return { total: 0, statusCounts: {}, lastPostAt: null };
	}
}

/**
 * Count submissions by a user within a specific timeframe
 */
export async function countRecentSubmissions(
	userId: string,
	sinceMs: number,
): Promise<number> {
	try {
		const since = new Date(Date.now() - sinceMs).toISOString();
		const { count, error } = await supabaseAdmin
			.from('meme_submissions')
			.select('id', { count: 'exact', head: true })
			.eq('user_id', userId)
			.gte('created_at', since);

		if (error) {
			Logger.error(
				MODULE,
				`Error counting recent submissions: ${error.message}`,
				error,
			);
			return 0;
		}

		return count || 0;
	} catch (error) {
		Logger.error(MODULE, 'Exception in countRecentSubmissions', error);
		return 0;
	}
}
