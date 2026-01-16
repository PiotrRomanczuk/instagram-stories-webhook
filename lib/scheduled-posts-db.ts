import { supabase } from './supabase';
import { ScheduledPost, MediaType, PostType } from './types';

export async function getScheduledPosts(): Promise<ScheduledPost[]> {
    const { data, error } = await supabase
        .from('scheduled_posts')
        .select('*')
        .order('scheduled_time', { ascending: true });

    if (error) {
        console.error('Supabase getScheduledPosts Error:', error);
        return [];
    }

    return (data || []).map(post => ({
        id: post.id,
        url: post.url,
        type: post.type as MediaType,
        postType: post.post_type as PostType,
        caption: post.caption,
        scheduledTime: Number(post.scheduled_time),
        status: post.status,
        createdAt: Number(post.created_at),
        publishedAt: post.published_at ? Number(post.published_at) : undefined,
        error: post.error
    }));
}

export async function addScheduledPost(post: Omit<ScheduledPost, 'id' | 'status' | 'createdAt'>): Promise<ScheduledPost> {
    const id = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = Date.now();

    const newRecord = {
        id,
        url: post.url,
        type: post.type,
        post_type: post.postType || 'STORY',
        caption: post.caption || '',
        scheduled_time: post.scheduledTime,
        status: 'pending',
        created_at: createdAt
    };

    const { error } = await supabase
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
    };
}

export async function updateScheduledPost(id: string, updates: Partial<ScheduledPost>): Promise<ScheduledPost | null> {
    // Map updates to DB column names
    interface DbScheduledPostUpdate {
        url?: string;
        type?: string;
        post_type?: string;
        caption?: string;
        scheduled_time?: number;
        status?: string;
        error?: string | null;
        published_at?: number | null;
        updated_at: string;
    }
    const dbUpdates: DbScheduledPostUpdate = {
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

    const { data, error } = await supabase
        .from('scheduled_posts')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Supabase updateScheduledPost Error:', error);
        return null;
    }

    return {
        id: data.id,
        url: data.url,
        type: data.type as MediaType,
        postType: data.post_type as PostType,
        caption: data.caption,
        scheduledTime: Number(data.scheduled_time),
        status: data.status,
        createdAt: Number(data.created_at),
        publishedAt: data.published_at ? Number(data.published_at) : undefined,
        error: data.error
    };
}

export async function deleteScheduledPost(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('scheduled_posts')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Supabase deleteScheduledPost Error:', error);
        return false;
    }

    return true;
}

export async function getPendingPosts(): Promise<ScheduledPost[]> {
    const now = Date.now();
    const { data, error } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_time', now);

    if (error) {
        console.error('Supabase getPendingPosts Error:', error);
        return [];
    }

    return (data || []).map(post => ({
        id: post.id,
        url: post.url,
        type: post.type as MediaType,
        postType: post.post_type as PostType,
        caption: post.caption,
        scheduledTime: Number(post.scheduled_time),
        status: post.status,
        createdAt: Number(post.created_at),
        publishedAt: post.published_at ? Number(post.published_at) : undefined,
        error: post.error
    }));
}

export async function getUpcomingPosts(): Promise<ScheduledPost[]> {
    const now = Date.now();
    const { data, error } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('status', 'pending')
        .gt('scheduled_time', now);

    if (error) {
        console.error('Supabase getUpcomingPosts Error:', error);
        return [];
    }

    return (data || []).map(post => ({
        id: post.id,
        url: post.url,
        type: post.type as MediaType,
        postType: post.post_type as PostType,
        caption: post.caption,
        scheduledTime: Number(post.scheduled_time),
        status: post.status,
        createdAt: Number(post.created_at),
        publishedAt: post.published_at ? Number(post.published_at) : undefined,
        error: post.error
    }));
}
