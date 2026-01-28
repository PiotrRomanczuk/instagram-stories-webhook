import { supabaseAdmin } from './config/supabase-admin';
import { Logger } from './utils/logger';
import {
    MemeStatus,
    UserRole,
    AllowedUser,
    MemeSubmission,
    CreateMemeInput,
    MemeSubmissionRow,
    mapMemeSubmissionRow
} from './types';

// Re-export types for backward compatibility
export type { MemeStatus, UserRole, AllowedUser, MemeSubmission, CreateMemeInput };

const MODULE = 'db:memes';

// ============== ALLOWED USERS (WHITELIST) ==============

/**
 * Check if an email is in the allowed users whitelist
 */
export async function isEmailAllowed(email: string): Promise<boolean> {
    try {
        const { data, error } = await supabaseAdmin
            .from('allowed_users')
            .select('id')
            .eq('email', email.toLowerCase())
            .single();

        if (error) {
            if (error.code === 'PGRST116') return false; // Not found
            Logger.error(MODULE, `Error checking allowed email: ${error.message}`, error);
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
            .from('allowed_users')
            .select('role')
            .eq('email', email.toLowerCase())
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            Logger.error(MODULE, `Error getting user role: ${error.message}`, error);
            return null;
        }

        return data?.role as UserRole || null;
    } catch (error) {
        Logger.error(MODULE, 'Exception in getUserRole', error);
        return null;
    }
}

/**
 * Get all allowed users (admin only)
 */
export async function getAllowedUsers(): Promise<AllowedUser[]> {
    try {
        const { data, error } = await supabaseAdmin
            .from('allowed_users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            Logger.error(MODULE, `Error fetching allowed users: ${error.message}`, error);
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
export async function addAllowedUser(user: Omit<AllowedUser, 'id' | 'created_at'>): Promise<AllowedUser | null> {
    try {
        const { data, error } = await supabaseAdmin
            .from('allowed_users')
            .insert({
                email: user.email.toLowerCase(),
                role: user.role,
                display_name: user.display_name,
                added_by: user.added_by
            })
            .select()
            .single();

        if (error) {
            Logger.error(MODULE, `Error adding allowed user: ${error.message}`, error);
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
            .from('allowed_users')
            .select('role')
            .eq('email', email.toLowerCase())
            .single();

        if (targetUser?.role === 'developer') {
            const { data: developers, error: countError } = await supabaseAdmin
                .from('allowed_users')
                .select('id')
                .eq('role', 'developer');

            if (countError) {
                Logger.error(MODULE, `Error counting developers: ${countError.message}`, countError);
                return false;
            }

            // Prevent removing the last developer
            if (developers && developers.length === 1) {
                Logger.error(MODULE, `Cannot remove ${email} - last developer`, { email });
                throw new Error('Cannot remove the last developer - system lockout protection');
            }
        }

        const { error } = await supabaseAdmin
            .from('allowed_users')
            .delete()
            .eq('email', email.toLowerCase());

        if (error) {
            Logger.error(MODULE, `Error removing allowed user: ${error.message}`, error);
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
export async function updateUserRole(email: string, role: UserRole): Promise<boolean> {
    try {
        // Prevent demoting the last developer (system lockout protection)
        if (role !== 'developer') {
            const { data: currentUser } = await supabaseAdmin
                .from('allowed_users')
                .select('role')
                .eq('email', email.toLowerCase())
                .single();

            // Only check if the user is currently a developer
            if (currentUser?.role === 'developer') {
                const { data: developers, error: countError } = await supabaseAdmin
                    .from('allowed_users')
                    .select('id')
                    .eq('role', 'developer');

                if (countError) {
                    Logger.error(MODULE, `Error counting developers: ${countError.message}`, countError);
                    return false;
                }

                // Prevent demoting the last developer
                if (developers && developers.length === 1) {
                    Logger.error(MODULE, `Cannot demote ${email} - last developer`, {
                        email,
                        attemptedRole: role
                    });
                    throw new Error('Cannot demote the last developer - system lockout protection');
                }
            }
        }

        const { error } = await supabaseAdmin
            .from('allowed_users')
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
export async function createMemeSubmission(input: CreateMemeInput): Promise<MemeSubmission | null> {
    try {
        const { data, error } = await supabaseAdmin
            .from('meme_submissions')
            .insert({
                user_id: input.user_id,
                user_email: input.user_email,
                media_url: input.media_url,
                storage_path: input.storage_path,
                title: input.title,
                caption: input.caption,
                status: 'pending'
            })
            .select()
            .single();

        if (error) {
            Logger.error(MODULE, `Error creating meme submission: ${error.message}`, error);
            return null;
        }

        Logger.info(MODULE, `📥 New meme submission from ${input.user_email}`, { id: data.id });
        return data as MemeSubmission;
    } catch (error) {
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
}): Promise<MemeSubmission[]> {
    try {
        let query = supabaseAdmin
            .from('meme_submissions')
            .select('*');

        if (options?.userId) {
            query = query.eq('user_id', options.userId);
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
            query = query.or(`title.ilike.%${searchTerm}%,caption.ilike.%${searchTerm}%`);
        }

        query = query.order('created_at', { ascending: false });

        if (options?.offset) {
            query = query.range(options.offset, options.offset + (options.limit || 12) - 1);
        } else if (options?.limit) {
            query = query.limit(options.limit);
        }

        const { data, error } = await query;

        if (error) {
            Logger.error(MODULE, `Error fetching meme submissions: ${error.message}`, error);
            return [];
        }

        return (data || []).map(row => mapMemeSubmissionRow(row as MemeSubmissionRow));
    } catch (error) {
        Logger.error(MODULE, 'Exception in getMemeSubmissions', error);
        return [];
    }
}

/**
 * Get a single meme submission by ID
 */
export async function getMemeSubmission(id: string): Promise<MemeSubmission | null> {
    try {
        const { data, error } = await supabaseAdmin
            .from('meme_submissions')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            Logger.error(MODULE, `Error fetching meme submission: ${error.message}`, error);
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
    rejectionReason?: string
): Promise<MemeSubmission | null> {
    try {
        const status: MemeStatus = action === 'approve' ? 'approved' : 'rejected';

        const { data, error } = await supabaseAdmin
            .from('meme_submissions')
            .update({
                status,
                reviewed_at: new Date().toISOString(),
                reviewed_by: adminUserId,
                rejection_reason: action === 'reject' ? rejectionReason : null
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            Logger.error(MODULE, `Error reviewing meme: ${error.message}`, error);
            return null;
        }

        Logger.info(MODULE, `📝 Meme ${id} ${status} by admin`, { adminUserId });
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
    scheduledPostId: string
): Promise<MemeSubmission | null> {
    try {
        const { data, error } = await supabaseAdmin
            .from('meme_submissions')
            .update({
                status: 'scheduled',
                scheduled_time: scheduledTime,
                scheduled_post_id: scheduledPostId
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            Logger.error(MODULE, `Error scheduling meme: ${error.message}`, error);
            return null;
        }

        Logger.info(MODULE, `📅 Meme ${id} scheduled for ${new Date(scheduledTime).toISOString()}`);
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
    igMediaId?: string
): Promise<MemeSubmission | null> {
    try {
        const { data, error } = await supabaseAdmin
            .from('meme_submissions')
            .update({
                status: 'published',
                published_at: new Date().toISOString(),
                ig_media_id: igMediaId
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            Logger.error(MODULE, `Error marking meme published: ${error.message}`, error);
            return null;
        }

        Logger.info(MODULE, `✅ Meme ${id} published to Instagram`, { igMediaId });
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
                Logger.warn(MODULE, `Failed to delete storage file: ${storageError.message}`);
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
            Logger.error(MODULE, `Error fetching meme stats: ${error.message}`, error);
            return { total: 0, pending: 0, approved: 0, published: 0, rejected: 0 };
        }

        const stats = {
            total: data.length,
            pending: data.filter(m => m.status === 'pending').length,
            approved: data.filter(m => m.status === 'approved' || m.status === 'scheduled').length,
            published: data.filter(m => m.status === 'published').length,
            rejected: data.filter(m => m.status === 'rejected').length
        };

        return stats;
    } catch (error) {
        Logger.error(MODULE, 'Exception in getMemeStats', error);
        return { total: 0, pending: 0, approved: 0, published: 0, rejected: 0 };
    }
}
