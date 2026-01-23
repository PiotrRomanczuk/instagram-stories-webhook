import { supabaseAdmin } from '@/lib/config/supabase-admin';
import {
    ScheduledPost,
    ScheduledPostWithUser,
    DbScheduledPostUpdate,
    ScheduledPostRow,
    mapScheduledPostRow
} from '@/lib/types';

export async function getScheduledPosts(userId?: string): Promise<ScheduledPost[]> {
    let query = supabaseAdmin
        .from('scheduled_posts')
        .select('*');

    if (userId) {
        query = query.eq('user_id', userId);
    }

    const { data, error } = await query.order('scheduled_time', { ascending: true });

    if (error) {
        console.error('Supabase getScheduledPosts Error:', error);
        return [];
    }

    return (data || []).map(post => mapScheduledPostRow(post as ScheduledPostRow));
}

/**
 * Get all scheduled posts (admin only) with user email
 */
export async function getAllScheduledPosts(): Promise<ScheduledPost[]> {
    // First get all posts
    const { data: posts, error } = await supabaseAdmin
        .from('scheduled_posts')
        .select('*')
        .order('scheduled_time', { ascending: true });

    if (error) {
        console.error('Supabase getAllScheduledPosts Error:', error);
        return [];
    }

    if (!posts || posts.length === 0) {
        return [];
    }

    // Get unique user IDs
    const userIds = [...new Set(posts.map(p => p.user_id))];
    
    // Fetch user emails
    const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .in('id', userIds);

    // Create a map of user_id to email
    const userEmailMap = new Map<string, string>();
    users?.forEach(u => userEmailMap.set(u.id, u.email));

    // Map posts with user emails
    return posts.map(post => {
        const row = post as ScheduledPostRow;
        row.user_email = userEmailMap.get(row.user_id);
        return mapScheduledPostRow(row);
    });
}

export async function addScheduledPost(
    post: Omit<ScheduledPost, 'id' | 'status' | 'createdAt'> & { userId: string }
): Promise<ScheduledPostWithUser> {
    const id = `post_${crypto.randomUUID()}`;
    const createdAt = Date.now();


    const newRecord = {
        id,
        url: post.url,
        type: post.type,
        post_type: post.postType || 'STORY',
        caption: post.caption || '',
        scheduled_time: post.scheduledTime,
        status: 'pending',
        created_at: createdAt,
        user_id: post.userId, // Set the user_id
        user_tags: post.userTags || [],
        meme_id: post.memeId
    };

    const { error } = await supabaseAdmin
        .from('scheduled_posts')
        .insert(newRecord);

    if (error) {
        console.error('Supabase addScheduledPost Error:', error);
        throw new Error('Failed to save scheduled post to database');
    }

    return {
        ...post,
        id,
        status: 'pending',
        createdAt
    } as ScheduledPostWithUser;
}

export async function updateScheduledPost(id: string, updates: Partial<ScheduledPost>): Promise<ScheduledPost | null> {
    // Map updates to DB column names
    const dbUpdates: DbScheduledPostUpdate & { updated_at: string } = {
        updated_at: new Date().toISOString()
    };
    if (updates.url) dbUpdates.url = updates.url;
    if (updates.type) dbUpdates.type = updates.type;
    if (updates.postType) dbUpdates.post_type = updates.postType;
    if (updates.caption !== undefined) dbUpdates.caption = updates.caption;
    if (updates.scheduledTime) dbUpdates.scheduled_time = updates.scheduledTime;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.error !== undefined) dbUpdates.error = updates.error;
    if (updates.publishedAt !== undefined) dbUpdates.published_at = updates.publishedAt;
    if (updates.igMediaId) dbUpdates.ig_media_id = updates.igMediaId;
    if (updates.userTags) dbUpdates.user_tags = updates.userTags;
    if (updates.processingStartedAt !== undefined) {
        dbUpdates.processing_started_at = updates.processingStartedAt
            ? new Date(updates.processingStartedAt).toISOString()
            : null;
    }
    if (updates.contentHash) dbUpdates.content_hash = updates.contentHash;
    if (updates.idempotencyKey) dbUpdates.idempotency_key = updates.idempotencyKey;
    if (updates.memeId) dbUpdates.meme_id = updates.memeId;
    if (updates.retryCount !== undefined) dbUpdates.retry_count = updates.retryCount;

    const { data, error } = await supabaseAdmin
        .from('scheduled_posts')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Supabase updateScheduledPost Error:', error);
        return null;
    }

    return mapScheduledPostRow(data as ScheduledPostRow);
}

export async function deleteScheduledPost(id: string): Promise<boolean> {
    const { error } = await supabaseAdmin
        .from('scheduled_posts')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Supabase deleteScheduledPost Error:', error);
        return false;
    }

    return true;
}

export async function getPendingPosts(): Promise<ScheduledPostWithUser[]> {
    const now = Date.now();
    const { data, error } = await supabaseAdmin
        .from('scheduled_posts')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_time', now);

    if (error) {
        console.error('Supabase getPendingPosts Error:', error);
        return [];
    }

    return (data || []).map(post => mapScheduledPostRow(post as ScheduledPostRow));
}

export async function getUpcomingPosts(userId?: string): Promise<ScheduledPost[]> {
    const now = Date.now();
    let query = supabaseAdmin
        .from('scheduled_posts')
        .select('*')
        .eq('status', 'pending')
        .gt('scheduled_time', now);

    if (userId) {
        query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Supabase getUpcomingPosts Error:', error);
        return [];
    }

    return (data || []).map(post => mapScheduledPostRow(post as ScheduledPostRow));
}

/**
 * Acquire a processing lock on a scheduled post
 * Returns true if lock was acquired, false if already being processed
 */
export async function acquireProcessingLock(postId: string): Promise<boolean> {
    const now = new Date();
    const lockTimeout = 5 * 60 * 1000; // 5 minutes
    const timeoutThreshold = new Date(Date.now() - lockTimeout);

    // Step 1: Fetch current state of the post
    const { data: post, error: fetchError } = await supabaseAdmin
        .from('scheduled_posts')
        .select('status, processing_started_at')
        .eq('id', postId)
        .single();

    if (fetchError || !post) {
        console.log(`[Lock] Post ${postId} not found`);
        return false;
    }

    const status = post.status;
    const processingStartedAt = post.processing_started_at ? new Date(post.processing_started_at) : null;

    // Step 2: Determine if we can acquire the lock
    const canAcquire =
        status === 'pending' ||
        (status === 'processing' && processingStartedAt && processingStartedAt < timeoutThreshold);

    if (!canAcquire) {
        console.log(`[Lock] Cannot acquire lock for ${postId}: status=${status}, processing_started_at=${processingStartedAt?.toISOString()}, threshold=${timeoutThreshold.toISOString()}`);
        return false;
    }

    // Step 3: Acquire the lock
    const { error: updateError } = await supabaseAdmin
        .from('scheduled_posts')
        .update({
            status: 'processing',
            processing_started_at: now.toISOString()
        })
        .eq('id', postId);

    if (updateError) {
        console.error(`[Lock] Failed to acquire lock for ${postId}:`, updateError);
        return false;
    }

    console.log(`[Lock] ✅ Acquired lock for ${postId}`);
    return true;
}

/**
 * Release a processing lock on a scheduled post
 * Used when processing fails and we want to allow retry
 */
export async function releaseProcessingLock(postId: string): Promise<boolean> {
    const { error } = await supabaseAdmin
        .from('scheduled_posts')
        .update({
            status: 'pending',
            processing_started_at: null
        })
        .eq('id', postId);

    if (error) {
        console.error('Error releasing processing lock:', error);
        return false;
    }

    return true;
}
