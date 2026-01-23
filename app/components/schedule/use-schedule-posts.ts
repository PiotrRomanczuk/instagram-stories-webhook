import { useState, useEffect, useCallback } from 'react';
import { ScheduledPostWithUser } from '@/lib/types';
import { supabase } from '@/lib/config/supabase';

interface UseSchedulePostsOptions {
    showAll?: boolean;
}

export function useSchedulePosts(options: UseSchedulePostsOptions = {}) {
    const [posts, setPosts] = useState<ScheduledPostWithUser[]>([]);
    const [loading, setLoading] = useState(true);
    const { showAll = false } = options;

    const fetchPosts = useCallback(async () => {
        try {
            const url = showAll ? '/api/schedule?all=true' : '/api/schedule';
            const res = await fetch(url);
            const data = await res.json();
            setPosts(data.posts || []);
        } catch (error) {
            console.error('Error fetching posts:', error);
        } finally {
            setLoading(false);
        }
    }, [showAll]);

    useEffect(() => {
        fetchPosts();

        // 🚀 Supabase Realtime Subscription
        // This provides instant updates when the background cron job publishes a post
        const channel = supabase
            .channel('scheduled_posts_changes')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen for INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'scheduled_posts',
                },
                (payload) => {
                    console.log('📡 Realtime update received:', payload.eventType);
                    fetchPosts();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchPosts]);

    return { posts, loading, fetchPosts };
}
