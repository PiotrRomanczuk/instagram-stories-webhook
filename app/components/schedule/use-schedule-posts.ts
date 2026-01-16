import { useState, useEffect, useCallback } from 'react';
import { ScheduledPost } from '@/lib/types';
import { supabase } from '@/lib/supabase';

export function useSchedulePosts() {
    const [posts, setPosts] = useState<ScheduledPost[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPosts = useCallback(async () => {
        try {
            const res = await fetch('/api/schedule');
            const data = await res.json();
            setPosts(data.posts || []);
        } catch (error) {
            console.error('Error fetching posts:', error);
        } finally {
            setLoading(false);
        }
    }, []);

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

